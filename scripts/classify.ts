import { ClienteClassifier } from '@/lib/classify/classifier';
import { crearEvaluadorJev, jevConfigurado } from '@/lib/classify/jev';
import { clasificarDocumento } from '@/lib/classify/pipeline';
import { municipioPorId } from '@/lib/config';
import { crearRepositorio } from '@/lib/repo/repository';
import { parsearArgs } from '@/lib/utils/args';
import { log } from '@/lib/utils/log';

async function main(): Promise<void> {
  const args = parsearArgs(process.argv.slice(2));
  const municipioId = args.municipio as string | undefined;
  if (!municipioId) {
    console.error('Uso: npm run classify -- --municipio <id> [--limit 5] [--sesion <id>] [--sin-jev] [--reprocesar]');
    process.exit(1);
  }
  const municipio = municipioPorId(municipioId);
  if (!municipio) {
    console.error(`Municipio no registrado: ${municipioId}`);
    process.exit(1);
  }

  const limite = Number(args.limit ?? 5);
  const usarJev = !args['sin-jev'] && jevConfigurado();
  if (!usarJev) {
    log('aviso', 'TYPESAFE_AI_API_KEY no configurada (o --sin-jev): se omite la pasada jev; los puntos quedarán sin impacto');
  }

  const repo = crearRepositorio();
  const resumenes = await repo.listarSesiones(municipio.id);
  const candidatas = args.sesion
    ? resumenes.filter((s) => s.id === args.sesion)
    : resumenes;
  const aClasificar: string[] = [];
  for (const resumen of candidatas) {
    if (aClasificar.length >= limite) break;
    const doc = await repo.obtenerSesion(municipio.id, resumen.id);
    if (!doc || doc.puntos.length === 0) continue;
    const yaClasificado = doc.puntos.every((p) => p.clasificado_con !== null);
    if (yaClasificado && !args.reprocesar) continue;
    aClasificar.push(resumen.id);
  }

  if (aClasificar.length === 0) {
    log('info', 'No hay sesiones pendientes de clasificar');
    return;
  }

  const clientes = {
    classifier: new ClienteClassifier(),
    jev: usarJev ? crearEvaluadorJev() : undefined,
  };

  for (const sesionId of aClasificar) {
    const doc = await repo.obtenerSesion(municipio.id, sesionId);
    if (!doc) continue;
    try {
      const { doc: clasificado, avisos, llamadasJev } = await clasificarDocumento(doc, clientes);
      await repo.guardarSesion(clasificado);
      log(
        'info',
        `Clasificada ${municipio.id}/${sesionId}: ${clasificado.puntos.length} puntos, ${llamadasJev} llamadas jev`,
      );
      for (const aviso of avisos) log('aviso', aviso);
    } catch (err) {
      log('error', `Fallo al clasificar ${municipio.id}/${sesionId}`, (err as Error).message);
    }
  }

  const stats = clientes.classifier.estadisticas;
  log('info', `classifier.dev: ${stats.peticiones} peticiones, ${stats.decisiones} decisiones estimadas`);
}

main().catch((err) => {
  log('error', 'Clasificación abortada', (err as Error).message);
  process.exit(1);
});
