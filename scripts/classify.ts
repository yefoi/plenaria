import { CacheClasificaciones } from '@/lib/classify/cache';
import { ClienteClassifier } from '@/lib/classify/classifier';
import { crearEvaluadorJev, jevConfigurado } from '@/lib/classify/jev';
import { clasificarDocumento, type ClientesClasificacion } from '@/lib/classify/pipeline';
import { MUNICIPIOS, municipioPorId } from '@/lib/config';
import { crearRepositorio } from '@/lib/repo/repository';
import type { Municipio } from '@/lib/schemas';
import { parsearArgs } from '@/lib/utils/args';
import { log } from '@/lib/utils/log';

async function procesarMunicipio(
  municipio: Municipio,
  clientes: ClientesClasificacion,
  args: Record<string, string | boolean>,
  limite: number,
  cache: CacheClasificaciones,
): Promise<number> {
  const repo = crearRepositorio();
  const resumenes = await repo.listarSesiones(municipio.id);
  const candidatas = args.sesion ? resumenes.filter((s) => s.id === args.sesion) : resumenes;
  const aClasificar: string[] = [];
  for (const resumen of candidatas) {
    if (aClasificar.length >= limite) break;
    const doc = await repo.obtenerSesion(municipio.id, resumen.id);
    if (!doc || doc.puntos.length === 0) continue;
    const yaClasificado = doc.puntos.every((p) => p.clasificado_con !== null);
    if (yaClasificado && !args.reprocesar) continue;
    aClasificar.push(resumen.id);
  }
  if (aClasificar.length === 0) return 0;

  let total = 0;
  for (const sesionId of aClasificar) {
    const doc = await repo.obtenerSesion(municipio.id, sesionId);
    if (!doc) continue;
    try {
      const { doc: clasificado, avisos, llamadasJev } = await clasificarDocumento(doc, clientes, {
        cache,
      });
      await repo.guardarSesion(clasificado);
      total += clasificado.puntos.length;
      log(
        'info',
        `Clasificada ${municipio.id}/${sesionId}: ${clasificado.puntos.length} puntos, ${llamadasJev} llamadas jev`,
      );
      for (const aviso of avisos) log('aviso', `${municipio.id}/${sesionId}: ${aviso}`);
    } catch (err) {
      log('error', `Fallo al clasificar ${municipio.id}/${sesionId}`, (err as Error).message);
    }
  }
  return total;
}

async function main(): Promise<void> {
  const args = parsearArgs(process.argv.slice(2));

  let objetivos: Municipio[];
  if (args.todos) {
    objetivos = MUNICIPIOS;
  } else {
    const municipioId = args.municipio as string | undefined;
    if (!municipioId) {
      console.error(
        'Uso: npm run classify -- --municipio <id> [--limit 5] [--sesion <id>] [--sin-jev] [--reprocesar]\n' +
          '     npm run classify -- --todos [--limit 1] [--sin-jev] [--reprocesar]',
      );
      process.exit(1);
    }
    const municipio = municipioPorId(municipioId);
    if (!municipio) {
      console.error(`Municipio no registrado: ${municipioId}`);
      process.exit(1);
    }
    objetivos = [municipio];
  }

  const limite = Number(args.limit ?? 5);
  const usarJev = !args['sin-jev'] && jevConfigurado();
  if (!usarJev) {
    log(
      'aviso',
      'TYPESAFE_AI_API_KEY no configurada (o --sin-jev): se omite la pasada jev; los puntos quedarán sin impacto',
    );
  }

  const clientes: ClientesClasificacion = {
    classifier: new ClienteClassifier(),
    jev: usarJev ? crearEvaluadorJev() : undefined,
  };
  const cache = CacheClasificaciones.porDefecto();
  await cache.cargar();

  let totalPuntos = 0;
  for (const municipio of objetivos) {
    try {
      totalPuntos += await procesarMunicipio(municipio, clientes, args, limite, cache);
    } catch (err) {
      log('error', `Clasificación de ${municipio.id} fallida`, (err as Error).message);
    }
  }

  await cache.persistir();
  if (totalPuntos === 0) log('info', 'No hay sesiones pendientes de clasificar');

  const stats = clientes.classifier.estadisticas;
  log('info', `classifier.dev: ${stats.peticiones} peticiones, ${stats.decisiones} decisiones estimadas`);
}

main().catch((err) => {
  log('error', 'Clasificación abortada', (err as Error).message);
  process.exit(1);
});
