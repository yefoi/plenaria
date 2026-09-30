import { construirDigest, type SesionParaDigest } from '@/lib/digest/weekly';
import { MUNICIPIOS, municipioPorId, RESUMEN_MODELO_HABILITADO } from '@/lib/config';
import { crearRepositorio } from '@/lib/repo/repository';
import { parsearArgs } from '@/lib/utils/args';
import { semanaISO } from '@/lib/utils/dates';
import { log } from '@/lib/utils/log';

async function main(): Promise<void> {
  const args = parsearArgs(process.argv.slice(2));
  const municipios = args.municipio ? [municipioPorId(args.municipio as string)] : MUNICIPIOS;
  if (municipios.some((m) => !m)) {
    console.error(`Municipio no registrado: ${args.municipio}`);
    process.exit(1);
  }

  if (RESUMEN_MODELO_HABILITADO) {
    log('aviso', 'El interruptor de resumen por modelo está activado; el script usa la plantilla determinista salvo que se configure un proveedor en código.');
  }

  const repo = crearRepositorio();
  for (const municipio of municipios) {
    if (!municipio) continue;
    const resumenes = await repo.listarSesiones(municipio.id);
    const documentos: SesionParaDigest[] = [];
    for (const resumen of resumenes) {
      const doc = await repo.obtenerSesion(municipio.id, resumen.id);
      if (doc && doc.puntos.length > 0) {
        documentos.push({ id: doc.sesion.id, fecha: doc.sesion.fecha, puntos: doc.puntos });
      }
    }

    const porSemana = new Map<string, SesionParaDigest[]>();
    for (const doc of documentos) {
      const semana = semanaISO(doc.fecha);
      const lista = porSemana.get(semana) ?? [];
      lista.push(doc);
      porSemana.set(semana, lista);
    }

    const semanas = args.semana ? [args.semana as string] : [...porSemana.keys()];
    if (args.todas) {
      for (const semana of semanas.sort()) {
        const sesiones = porSemana.get(semana) ?? [];
        if (sesiones.length === 0) continue;
        const digest = construirDigest(municipio.id, municipio.nombre, sesiones);
        await repo.guardarDigest(digest);
        log('info', `Digest ${semana} guardado para ${municipio.id} (${sesiones.length} sesiones)`);
      }
    } else {
      const semana = (args.semana as string) ?? semanaISO(new Date().toISOString().slice(0, 10));
      const sesiones = porSemana.get(semana) ?? [];
      if (sesiones.length === 0) {
        log('info', `Sin sesiones en la semana ${semana} para ${municipio.id}`);
        continue;
      }
      const digest = construirDigest(municipio.id, municipio.nombre, sesiones);
      await repo.guardarDigest(digest);
      log('info', `Digest ${semana} guardado para ${municipio.id}`);
    }
  }
}

main().catch((err) => {
  log('error', 'Digest abortado', (err as Error).message);
  process.exit(1);
});
