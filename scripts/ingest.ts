import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ManualAdapter } from '@/lib/adapters/manual';
import { crearAdaptador } from '@/lib/adapters/registry';
import { tipoDesdeTexto } from '@/lib/adapters/types';
import { MUNICIPIOS, municipioPorId } from '@/lib/config';
import { cargarRobots } from '@/lib/http/fetcher';
import { descargar } from '@/lib/http/fetcher';
import { procesarSesion } from '@/lib/pipeline/procesar';
import { crearRepositorio } from '@/lib/repo/repository';
import { parsearArgs } from '@/lib/utils/args';
import { fechaISO } from '@/lib/utils/dates';
import { hashCorto, sha256 } from '@/lib/utils/hash';
import { log } from '@/lib/utils/log';
import type { FuentesStatus, Municipio } from '@/lib/schemas';

function uso(): never {
  console.error(
    [
      'Uso:',
      '  npm run ingest -- --municipio <id> [--limit 3] [--desde AAAA-MM-DD]',
      '  npm run ingest -- --municipio <id> --pdf <ruta> [--fecha AAAA-MM-DD] [--tipo ordinaria] [--formato auto]',
      '  npm run ingest -- --municipio <id> --url <url>   [--fecha AAAA-MM-DD] [--tipo ordinaria]',
      '',
      'Municipios registrados: ' + MUNICIPIOS.map((m) => m.id).join(', '),
    ].join('\n'),
  );
  process.exit(1);
}

async function municipioDeArgumentos(args: Record<string, string | boolean>): Promise<Municipio> {
  const id = args.municipio as string | undefined;
  if (!id) uso();
  const registrado = municipioPorId(id);
  if (registrado) return registrado;
  if (args.pdf || args.url) {
    return {
      id,
      nombre: (args.nombre as string) ?? id,
      provincia: (args.provincia as string) ?? '',
      fuente_tipo: 'manual',
      fuente_config: { formato: (args.formato as string) ?? 'auto' },
    };
  }
  uso();
}

async function ingestaManual(
  municipio: Municipio,
  args: Record<string, string | boolean>,
): Promise<void> {
  const repo = crearRepositorio();
  const fecha = (args.fecha as string) ?? fechaISO(new Date());
  const tipo = tipoDesdeTexto((args.tipo as string) ?? 'ordinària');
  const adapter = new ManualAdapter(
    (args.formato as string) ?? (municipio.fuente_config.formato as string) ?? 'auto',
  );

  let buffer: Uint8Array;
  let fuenteUrl: string;
  if (args.pdf) {
    const ruta = path.resolve(args.pdf as string);
    buffer = new Uint8Array(await fs.readFile(ruta));
    fuenteUrl = pathToFileURL(ruta).toString();
  } else {
    const res = await descargar(args.url as string, { timeoutMs: 120000 });
    buffer = new Uint8Array(res.buffer);
    fuenteUrl = res.urlFinal;
  }

  const referencia = adapter.agregar({ fecha, tipo, urlDocumento: fuenteUrl }, buffer);
  const contenido = await adapter.fetch(referencia);
  const parseado = await adapter.parse(contenido);
  const hash = sha256(buffer);
  const existentes = await repo.listarSesiones(municipio.id);
  const porFecha = existentes.find((s) => s.fecha === fecha);
  const sesionId = porFecha && porFecha.fuente_url !== fuenteUrl
    ? `${fecha}--${hashCorto(referencia.id, 8)}`
    : fecha;

  const doc = procesarSesion({
    municipio,
    referencia,
    parseado,
    hashContenido: hash,
    sesionId,
    fuenteUrl,
  });
  await repo.guardarSesion(doc);
  log('info', `Sesión manual guardada: ${municipio.id}/${sesionId} (${doc.puntos.length} puntos, estado ${doc.sesion.estado_ingesta})`);
}

async function ingestaAutomatica(
  municipio: Municipio,
  args: Record<string, string | boolean>,
): Promise<void> {
  const repo = crearRepositorio();
  const adapter = crearAdaptador(municipio);
  const limite = Number(args.limit ?? 3);
  const desde = args.desde as string | undefined;

  const refs = await adapter.discover();
  log('info', `Descubiertas ${refs.length} sesiones en ${municipio.id}; se procesan ${Math.min(limite, refs.length)}`);

  const candidatas = refs
    .filter((r) => !desde || r.fecha >= desde)
    .slice(0, limite);

  const errores: string[] = [];
  let procesadas = 0;
  let sinCambios = 0;
  let ultimaDescarga: string | null = null;

  for (const ref of candidatas) {
    try {
      const contenido = await adapter.fetch(ref);
      ultimaDescarga = new Date().toISOString();
      const hash = sha256(contenido.buffer);
      const existentes = await repo.listarSesiones(municipio.id);
      const porUrl = existentes.find(
        (s) => s.fuente_url === contenido.urlFinal || s.fuente_url === ref.urlDocumento,
      );
      if (porUrl && !args.reprocesar) {
        const actual = await repo.obtenerSesion(municipio.id, porUrl.id);
        if (actual?.sesion.hash_contenido === hash) {
          log('info', `Sin cambios: ${municipio.id}/${ref.fecha} (${ref.id.slice(0, 8)})`);
          sinCambios++;
          continue;
        }
      }
      const porFecha = existentes.find((s) => s.fecha === ref.fecha);
      const sesionId = porFecha && porFecha.fuente_url !== contenido.urlFinal && porFecha.fuente_url !== ref.urlDocumento
        ? `${ref.fecha}--${hashCorto(ref.id, 8)}`
        : ref.fecha;

      const parseado = await adapter.parse(contenido);
      const doc = procesarSesion({
        municipio,
        referencia: { ...ref, urlDocumento: contenido.urlFinal },
        parseado,
        hashContenido: hash,
        sesionId,
        fuenteUrl: contenido.urlFinal,
      });
      await repo.guardarSesion(doc);
      procesadas++;
      log(
        'info',
        `Guardada ${municipio.id}/${sesionId}: ${doc.puntos.length} puntos, estado ${doc.sesion.estado_ingesta}`,
      );
    } catch (err) {
      const mensaje = `${ref.fecha} ${ref.urlDocumento}: ${(err as Error).message}`;
      errores.push(mensaje);
      log('error', `Fallo al procesar sesión`, mensaje);
    }
  }

  const robots: Record<string, string> = {};
  const csvUrl = municipio.fuente_config.csv_url as string | undefined;
  for (const url of [csvUrl, candidatas[0]?.urlDocumento].filter((u): u is string => Boolean(u))) {
    const u = new URL(url);
    const reglas = await cargarRobots(u.origin);
    robots[u.origin] = reglas ? 'robots.txt leído con parser estándar' : 'robots.txt no disponible';
  }

  const status: FuentesStatus = {
    municipio_id: municipio.id,
    fuente_tipo: municipio.fuente_tipo,
    actualizado_en: new Date().toISOString(),
    ultima_descarga: ultimaDescarga,
    ultima_sesion_fecha: refs[0]?.fecha ?? null,
    sesiones_procesadas: procesadas,
    errores,
    robots,
  };
  await repo.guardarFuentes(status);
  log('info', `Ingesta terminada: ${procesadas} procesadas, ${sinCambios} sin cambios, ${errores.length} errores`);

  if (errores.length > 0 && args.estricto) process.exit(1);
}

async function main(): Promise<void> {
  const args = parsearArgs(process.argv.slice(2));
  const municipio = await municipioDeArgumentos(args);
  if (args.pdf || args.url) {
    await ingestaManual(municipio, args);
  } else {
    await ingestaAutomatica(municipio, args);
  }
}

main().catch((err) => {
  log('error', 'Ingesta abortada', (err as Error).message);
  process.exit(1);
});
