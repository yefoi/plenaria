import fs from 'node:fs';
import path from 'node:path';
import { segmentar } from '@/lib/pipeline/segment';
import { redactar } from '@/lib/redact/redact';
import type { Tema, TipoPunto } from '@/lib/schemas';

interface Anotacion {
  temas: Tema[];
  tipo: TipoPunto;
  afecta_vecinos: boolean;
  impacto: number;
}

const ANOTACIONES: Record<string, Anotacion> = {
  'sesion-2026-09-23:1': { temas: ['organizacion_institucional'], tipo: 'aprobacion_acta', afecta_vecinos: false, impacto: 1 },
  'sesion-2026-09-23:2': { temas: ['organizacion_institucional'], tipo: 'dacion_cuenta', afecta_vecinos: false, impacto: 1 },
  'sesion-2026-09-23:3': { temas: ['organizacion_institucional'], tipo: 'dacion_cuenta', afecta_vecinos: false, impacto: 1 },
  'sesion-2026-09-23:4': { temas: ['organizacion_institucional'], tipo: 'dacion_cuenta', afecta_vecinos: false, impacto: 1 },
  'sesion-2026-09-23:8': { temas: ['presupuesto_impuestos'], tipo: 'dacion_cuenta', afecta_vecinos: false, impacto: 2 },
  'sesion-2026-09-23:11': { temas: ['presupuesto_impuestos'], tipo: 'acuerdo', afecta_vecinos: false, impacto: 2 },
  'sesion-2026-09-23:12': { temas: ['presupuesto_impuestos'], tipo: 'acuerdo', afecta_vecinos: false, impacto: 2 },
  'sesion-2026-09-23:13': { temas: ['presupuesto_impuestos'], tipo: 'acuerdo', afecta_vecinos: true, impacto: 3 },
  'sesion-2026-09-23:16': { temas: ['presupuesto_impuestos'], tipo: 'acuerdo', afecta_vecinos: false, impacto: 2 },
  'sesion-2026-09-23:17': { temas: ['organizacion_institucional'], tipo: 'dacion_cuenta', afecta_vecinos: false, impacto: 1 },
  'sesion-2026-09-23:18': { temas: ['organizacion_institucional'], tipo: 'dacion_cuenta', afecta_vecinos: false, impacto: 1 },
  'sesion-2026-09-23:19': { temas: ['organizacion_institucional'], tipo: 'ruego_pregunta', afecta_vecinos: false, impacto: 2 },
  'sesion-2026-09-23:20': { temas: ['seguridad', 'mociones_grupos'], tipo: 'mocion', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-09-23:21': { temas: ['urbanismo_licencias', 'mociones_grupos'], tipo: 'mocion', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-09-23:22': { temas: ['servicios_publicos', 'mociones_grupos'], tipo: 'mocion', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-09-23:26': { temas: ['organizacion_institucional', 'mociones_grupos'], tipo: 'mocion', afecta_vecinos: true, impacto: 3 },
  'sesion-2026-09-23:31': { temas: ['vivienda', 'mociones_grupos'], tipo: 'mocion', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-09-23:33': { temas: ['servicios_publicos', 'mociones_grupos'], tipo: 'mocion', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-09-23:34': { temas: ['medio_ambiente', 'mociones_grupos'], tipo: 'mocion', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-09-23:35': { temas: ['otros'], tipo: 'ruego_pregunta', afecta_vecinos: true, impacto: 2 },
  'sesion-2026-07-29:1': { temas: ['organizacion_institucional'], tipo: 'aprobacion_acta', afecta_vecinos: false, impacto: 1 },
  'sesion-2026-07-29:13': { temas: ['urbanismo_licencias'], tipo: 'acuerdo', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-07-29:14': { temas: ['cultura_deporte_educacion'], tipo: 'acuerdo', afecta_vecinos: true, impacto: 3 },
  'sesion-2026-07-29:15': { temas: ['urbanismo_licencias'], tipo: 'acuerdo', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-07-29:16': { temas: ['urbanismo_licencias'], tipo: 'acuerdo', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-07-29:17': { temas: ['urbanismo_licencias'], tipo: 'acuerdo', afecta_vecinos: false, impacto: 2 },
  'sesion-2026-07-29:19': { temas: ['presupuesto_impuestos'], tipo: 'dacion_cuenta', afecta_vecinos: false, impacto: 2 },
  'sesion-2026-07-29:20': { temas: ['presupuesto_impuestos'], tipo: 'dacion_cuenta', afecta_vecinos: true, impacto: 3 },
  'sesion-2026-07-29:21': { temas: ['presupuesto_impuestos'], tipo: 'dacion_cuenta', afecta_vecinos: true, impacto: 3 },
  'sesion-2026-07-29:22': { temas: ['presupuesto_impuestos'], tipo: 'acuerdo', afecta_vecinos: true, impacto: 3 },
  'sesion-2026-07-29:23': { temas: ['presupuesto_impuestos'], tipo: 'acuerdo', afecta_vecinos: false, impacto: 2 },
  'sesion-2026-07-29:25': { temas: ['servicios_publicos'], tipo: 'acuerdo', afecta_vecinos: true, impacto: 3 },
  'sesion-2026-07-29:30': { temas: ['organizacion_institucional'], tipo: 'dacion_cuenta', afecta_vecinos: false, impacto: 1 },
  'sesion-2026-07-29:32': { temas: ['servicios_sociales'], tipo: 'ruego_pregunta', afecta_vecinos: true, impacto: 3 },
  'sesion-2026-07-29:34': { temas: ['otros'], tipo: 'ruego_pregunta', afecta_vecinos: true, impacto: 2 },
  'sesion-2026-06-30:1': { temas: ['organizacion_institucional'], tipo: 'aprobacion_acta', afecta_vecinos: false, impacto: 1 },
  'sesion-2026-06-30:3': { temas: ['contratacion_obras', 'urbanismo_licencias'], tipo: 'acuerdo', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-06-30:4': { temas: ['urbanismo_licencias'], tipo: 'acuerdo', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-06-30:6': { temas: ['presupuesto_impuestos'], tipo: 'acuerdo', afecta_vecinos: false, impacto: 2 },
  'sesion-2026-06-30:7': { temas: ['presupuesto_impuestos'], tipo: 'acuerdo', afecta_vecinos: false, impacto: 2 },
  'sesion-2026-06-30:9': { temas: ['presupuesto_impuestos'], tipo: 'dacion_cuenta', afecta_vecinos: true, impacto: 3 },
  'sesion-2026-06-30:11': { temas: ['cultura_deporte_educacion'], tipo: 'acuerdo', afecta_vecinos: true, impacto: 3 },
  'sesion-2026-06-30:14': { temas: ['organizacion_institucional'], tipo: 'acuerdo', afecta_vecinos: false, impacto: 2 },
  'sesion-2026-06-30:17': { temas: ['otros'], tipo: 'ruego_pregunta', afecta_vecinos: true, impacto: 2 },
  'sesion-2026-06-30:24': { temas: ['servicios_sociales', 'mociones_grupos'], tipo: 'mocion', afecta_vecinos: true, impacto: 3 },
  'sesion-2026-06-30:25': { temas: ['cultura_deporte_educacion', 'mociones_grupos'], tipo: 'mocion', afecta_vecinos: true, impacto: 3 },
  'sesion-2026-06-30:27': { temas: ['cultura_deporte_educacion', 'servicios_publicos', 'mociones_grupos'], tipo: 'mocion', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-06-30:29': { temas: ['urbanismo_licencias', 'mociones_grupos'], tipo: 'mocion', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-06-30:31': { temas: ['presupuesto_impuestos', 'mociones_grupos'], tipo: 'mocion', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-06-30:34': { temas: ['medio_ambiente', 'servicios_publicos', 'mociones_grupos'], tipo: 'mocion', afecta_vecinos: true, impacto: 4 },
  'sesion-2026-06-30:38': { temas: ['medio_ambiente', 'mociones_grupos'], tipo: 'mocion', afecta_vecinos: true, impacto: 4 },
};

const SESIONES = ['sesion-2026-09-23', 'sesion-2026-07-29', 'sesion-2026-06-30'];

const puntos: unknown[] = [];
for (const sesion of SESIONES) {
  const textoCrudo = fs.readFileSync(
    path.join(process.cwd(), 'fixtures', 'hospitalet-llobregat', `${sesion}.txt`),
    'utf8',
  );
  const segmentacion = segmentar(textoCrudo, 'extracte-acords');
  for (const punto of segmentacion.puntos) {
    const anotacion = ANOTACIONES[`${sesion}:${punto.orden}`];
    if (!anotacion) continue;
    const { texto } = redactar(punto.titulo);
    puntos.push({
      id: `${sesion}-${String(punto.orden).padStart(2, '0')}`,
      fuente: `fixtures/hospitalet-llobregat/${sesion}.txt`,
      orden: punto.orden,
      titulo: texto,
      texto_redactado: texto,
      esperado: {
        temas: anotacion.temas,
        tipo: anotacion.tipo,
        afecta_vecinos: anotacion.afecta_vecinos,
        impacto: anotacion.impacto,
      },
    });
  }
}

const golden = {
  version: '2026-09-30.1',
  estado: 'provisional',
  nota:
    'Primera versión propuesta por el agente a partir de 3 sesiones reales del piloto. ' +
    'Las etiquetas las revisará una persona; hasta entonces el conjunto es provisional y los umbrales de CI deben leerse con cautela. ' +
    'Los puntos sensibles (personal, sanciones individuales) se excluyen a propósito.',
  umbrales_ci: {
    tipo_accuracy: 0.7,
    tema_f1_micro: 0.6,
    afecta_accuracy: 0.65,
    impacto_mae: 1.0,
  },
  puntos,
};

fs.mkdirSync(path.join(process.cwd(), 'eval'), { recursive: true });
fs.writeFileSync(
  path.join(process.cwd(), 'eval', 'golden.json'),
  JSON.stringify(golden, null, 2) + '\n',
  'utf8',
);
console.log(`Golden generado con ${puntos.length} puntos en eval/golden.json`);
