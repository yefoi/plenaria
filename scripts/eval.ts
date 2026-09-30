import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { ClienteClassifier } from '@/lib/classify/classifier';
import { crearEvaluadorJev, jevConfigurado, type EvaluadorJev } from '@/lib/classify/jev';
import { UMBRAL_CONFIANZA } from '@/lib/config';
import { parsearArgs } from '@/lib/utils/args';
import { log } from '@/lib/utils/log';
import { TEMAS, TIPOS_PUNTO } from '@/lib/schemas';

const puntoGoldenSchema = z.object({
  id: z.string(),
  fuente: z.string(),
  orden: z.number(),
  titulo: z.string(),
  texto_redactado: z.string(),
  esperado: z.object({
    temas: z.array(z.enum(TEMAS)),
    tipo: z.enum(TIPOS_PUNTO),
    afecta_vecinos: z.boolean(),
    impacto: z.number().int().min(1).max(5),
  }),
});

const goldenSchema = z.object({
  version: z.string(),
  estado: z.string(),
  nota: z.string(),
  umbrales_ci: z.object({
    tipo_accuracy: z.number(),
    tema_f1_micro: z.number(),
    afecta_accuracy: z.number(),
    impacto_mae: z.number(),
  }),
  puntos: z.array(puntoGoldenSchema),
});

type PuntoGolden = z.infer<typeof puntoGoldenSchema>;
type Golden = z.infer<typeof goldenSchema>;

interface MetricasTipo {
  total: number;
  aciertos: number;
  accuracy: number;
}

interface MetricasTema {
  f1Micro: number;
  precisionMicro: number;
  recallMicro: number;
  exactos: number;
  aciertoPrincipal: number;
  total: number;
}

interface MetricasJev {
  evaluados: number;
  afectaAciertos: number;
  afectaAccuracy: number;
  impactoMae: number;
}

function evaluarTipo(
  esperados: PuntoGolden[],
  obtenidos: Map<string, { tipo_punto: string | null; confianza: number | null }>,
): { metrica: MetricasTipo; confusiones: [string, string][] } {
  let aciertos = 0;
  const confusiones: [string, string][] = [];
  for (const p of esperados) {
    const obtenido = obtenidos.get(p.id);
    if (obtenido?.tipo_punto === p.esperado.tipo) aciertos++;
    else confusiones.push([p.esperado.tipo, obtenido?.tipo_punto ?? 'sin_clasificar']);
  }
  return {
    metrica: { total: esperados.length, aciertos, accuracy: aciertos / esperados.length },
    confusiones,
  };
}

function evaluarTemas(
  esperados: PuntoGolden[],
  obtenidos: Map<string, { temas: string[] }>,
): MetricasTema {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let exactos = 0;
  let principal = 0;
  for (const p of esperados) {
    const predichos = new Set(obtenidos.get(p.id)?.temas ?? []);
    const reales = new Set<string>(p.esperado.temas);
    for (const t of predichos) {
      if (reales.has(t)) tp++;
      else fp++;
    }
    for (const t of reales) {
      if (!predichos.has(t)) fn++;
    }
    if (predichos.size === reales.size && [...reales].every((t) => predichos.has(t))) exactos++;
    if (predichos.has(p.esperado.temas[0])) principal++;
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return {
    f1Micro: f1,
    precisionMicro: precision,
    recallMicro: recall,
    exactos,
    aciertoPrincipal: principal / esperados.length,
    total: esperados.length,
  };
}

function evaluarCalibracion(
  esperados: PuntoGolden[],
  obtenidos: Map<string, { tipo_punto: string | null; confianza: number | null }>,
): { rango: string; n: number; accuracy: number }[] {
  const buckets = [
    { rango: 'confianza >= 0.9', min: 0.9, max: 1.01 },
    { rango: '0.7 <= confianza < 0.9', min: 0.7, max: 0.9 },
    { rango: 'confianza < 0.7', min: -1, max: 0.7 },
    { rango: 'sin confianza (smart)', min: -2, max: -1 },
  ];
  return buckets.map((b) => {
    const enBucket = esperados.filter((p) => {
      const c = obtenidos.get(p.id)?.confianza ?? null;
      if (c === null) return b.min === -2;
      return c >= b.min && c < b.max;
    });
    const aciertos = enBucket.filter(
      (p) => obtenidos.get(p.id)?.tipo_punto === p.esperado.tipo,
    ).length;
    return {
      rango: b.rango,
      n: enBucket.length,
      accuracy: enBucket.length === 0 ? 0 : aciertos / enBucket.length,
    };
  });
}

async function evaluarJev(
  golden: PuntoGolden[],
  evaluador: EvaluadorJev,
): Promise<MetricasJev> {
  let evaluados = 0;
  let aciertos = 0;
  let sumaError = 0;
  for (const p of golden) {
    try {
      const juicio = await evaluador({
        titulo: p.titulo,
        texto: p.texto_redactado,
        tipo_punto: null,
        temas: p.esperado.temas,
        importe_eur: null,
      });
      evaluados++;
      const afectaPredicha = juicio.afecta_vecinos_prob >= 0.5;
      if (afectaPredicha === p.esperado.afecta_vecinos) aciertos++;
      sumaError += Math.abs(juicio.impacto - p.esperado.impacto);
    } catch (err) {
      log('aviso', `jev falló con ${p.id}: ${(err as Error).message}`);
    }
  }
  return {
    evaluados,
    afectaAciertos: aciertos,
    afectaAccuracy: evaluados === 0 ? 0 : aciertos / evaluados,
    impactoMae: evaluados === 0 ? 0 : sumaError / evaluados,
  };
}

function informeMarkdown(
  golden: Golden,
  tipo: MetricasTipo,
  temas: MetricasTema,
  calibracion: { rango: string; n: number; accuracy: number }[],
  confusiones: [string, string][],
  jev: MetricasJev | null,
  erroresTema: string[],
): string {
  const lineas: string[] = [];
  lineas.push(`# Informe de evaluación (${new Date().toISOString().slice(0, 10)})`);
  lineas.push('');
  lineas.push(`Conjunto: v${golden.version} (${golden.estado}). ${golden.puntos.length} puntos.`);
  lineas.push('');
  lineas.push('## Resultados');
  lineas.push('');
  lineas.push(`- Tipo de punto: exactitud ${(tipo.accuracy * 100).toFixed(1)}% (${tipo.aciertos}/${tipo.total})`);
  lineas.push(
    `- Tema: F1 micro ${(temas.f1Micro * 100).toFixed(1)}% · precisión ${(temas.precisionMicro * 100).toFixed(1)}% · recall ${(temas.recallMicro * 100).toFixed(1)}%`,
  );
  lineas.push(`- Tema principal acertado: ${(temas.aciertoPrincipal * 100).toFixed(1)}%`);
  lineas.push(`- Conjunto de temas exacto: ${temas.exactos}/${temas.total}`);
  if (jev) {
    lineas.push(
      `- Afecta a vecinos: ${(jev.afectaAccuracy * 100).toFixed(1)}% (${jev.afectaAciertos}/${jev.evaluados})`,
    );
    lineas.push(`- Impacto: error medio absoluto ${jev.impactoMae.toFixed(2)}`);
  } else {
    lineas.push('- Afecta a vecinos e impacto: no evaluados (falta TYPESAFE_AI_API_KEY)');
  }
  lineas.push('');
  lineas.push('## Calibración de la confianza (tipo)');
  lineas.push('');
  lineas.push('| Rango | n | Exactitud |');
  lineas.push('| --- | --- | --- |');
  for (const b of calibracion) lineas.push(`| ${b.rango} | ${b.n} | ${(b.accuracy * 100).toFixed(0)}% |`);
  lineas.push('');
  lineas.push('## Errores más frecuentes (tipo esperado → obtenido)');
  lineas.push('');
  const conteo = new Map<string, number>();
  for (const [e, o] of confusiones) {
    const clave = `${e} → ${o}`;
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }
  const top = [...conteo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [clave, n] of top) lineas.push(`- ${clave}: ${n}`);
  if (erroresTema.length > 0) {
    lineas.push('');
    lineas.push('## Temas esperados no detectados (muestra)');
    lineas.push('');
    for (const e of erroresTema.slice(0, 10)) lineas.push(`- ${e}`);
  }
  lineas.push('');
  return lineas.join('\n');
}

async function main(): Promise<void> {
  const args = parsearArgs(process.argv.slice(2));
  const rutaGolden = path.join(process.cwd(), 'eval', 'golden.json');
  const golden = goldenSchema.parse(JSON.parse(fs.readFileSync(rutaGolden, 'utf8')));

  const cliente = new ClienteClassifier();
  const items = golden.puntos.map((p) => ({ id: p.id, texto: p.texto_redactado }));
  log('info', `Evaluando ${items.length} puntos del conjunto dorado (${golden.estado})`);
  const clasificaciones = await cliente.clasificarLote(items, UMBRAL_CONFIANZA);

  const paraTipo = new Map<string, { tipo_punto: string | null; confianza: number | null }>();
  const paraTemas = new Map<string, { temas: string[] }>();
  for (const p of golden.puntos) {
    const c = clasificaciones.get(p.id);
    paraTipo.set(p.id, { tipo_punto: c?.tipo.tipo ?? null, confianza: c?.tipo.confianza ?? null });
    paraTemas.set(p.id, { temas: c?.temas.temas ?? [] });
  }

  const { metrica: tipo, confusiones } = evaluarTipo(golden.puntos, paraTipo);
  const temas = evaluarTemas(golden.puntos, paraTemas);
  const calibracion = evaluarCalibracion(golden.puntos, paraTipo);
  const erroresTema: string[] = [];
  for (const p of golden.puntos) {
    const predichos = new Set(paraTemas.get(p.id)?.temas ?? []);
    const faltantes = p.esperado.temas.filter((t) => !predichos.has(t));
    if (faltantes.length > 0) erroresTema.push(`${p.id}: faltan ${faltantes.join(', ')} (${p.titulo.slice(0, 70)})`);
  }

  let jev: MetricasJev | null = null;
  if (jevConfigurado()) {
    log('info', 'Evaluando también la pasada jev (afecta a vecinos e impacto)');
    jev = await evaluarJev(golden.puntos, crearEvaluadorJev());
  }

  const informe = informeMarkdown(golden, tipo, temas, calibracion, confusiones, jev, erroresTema);
  fs.writeFileSync(path.join(process.cwd(), 'eval', 'informe-eval.md'), informe, 'utf8');
  console.log(informe);

  const umbrales = golden.umbrales_ci;
  const fallos: string[] = [];
  if (tipo.accuracy < umbrales.tipo_accuracy) fallos.push(`tipo ${tipo.accuracy.toFixed(2)} < ${umbrales.tipo_accuracy}`);
  if (temas.f1Micro < umbrales.tema_f1_micro) fallos.push(`tema F1 ${temas.f1Micro.toFixed(2)} < ${umbrales.tema_f1_micro}`);
  if (jev) {
    if (jev.afectaAccuracy < umbrales.afecta_accuracy) fallos.push(`afecta ${jev.afectaAccuracy.toFixed(2)} < ${umbrales.afecta_accuracy}`);
    if (jev.impactoMae > umbrales.impacto_mae) fallos.push(`impacto MAE ${jev.impactoMae.toFixed(2)} > ${umbrales.impacto_mae}`);
  }
  const stats = cliente.estadisticas;
  log('info', `classifier.dev: ${stats.peticiones} peticiones, ${stats.decisiones} decisiones estimadas`);

  if (fallos.length > 0) {
    log('aviso', `Umbrales incumplidos: ${fallos.join('; ')}`);
    if (args.ci) process.exit(1);
  } else {
    log('info', 'Todos los umbrales de CI se cumplen');
  }
}

main().catch((err) => {
  log('error', 'Evaluación abortada', (err as Error).message);
  process.exit(1);
});
