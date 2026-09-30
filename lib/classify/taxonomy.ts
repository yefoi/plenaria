import { sha256 } from '@/lib/utils/hash';
import { TEMAS, TIPOS_PUNTO, type Tema, type TipoPunto } from '@/lib/schemas';

export const VERSION_TAXONOMIA = '2026-09-30.1';

export const DESCRIPCION_TEMAS: Record<Tema, string> = {
  urbanismo_licencias: 'Urbanismo, planeamiento, licencias de obra y disciplina urbanística',
  vivienda: 'Vivienda, alquiler, ayudas a la vivienda y patrimonio municipal del suelo',
  presupuesto_impuestos: 'Presupuestos, ordenanzas fiscales, tasas, impuestos y modificaciones de crédito',
  contratacion_obras: 'Contratos, licitaciones, obras públicas y concesiones',
  servicios_publicos: 'Servicios públicos municipales: limpieza, agua, residuos, alumbrado, parques y jardines',
  movilidad_trafico: 'Movilidad, tráfico, aparcamiento, transporte público y accesibilidad viaria',
  seguridad: 'Seguridad ciudadana, policía local, protección civil y emergencias',
  cultura_deporte_educacion: 'Cultura, deportes, educación, fiestas y equipamientos deportivos o culturales',
  servicios_sociales: 'Servicios sociales, dependencia, igualdad, infancia y atención a colectivos vulnerables',
  personal: 'Personal municipal, plantilla, retribuciones, contratación laboral y relaciones de puestos de trabajo',
  medio_ambiente: 'Medio ambiente, sostenibilidad, cambio climático, contaminación y residuos',
  mociones_grupos: 'Mociones e iniciativas presentadas por grupos municipales (contenido general)',
  organizacion_institucional: 'Organización municipal, reglamentos, ordenanzas no fiscales, hermanamientos y protocolo',
  otros: 'Cualquier asunto que no encaje claramente en el resto de temas',
};

export const DESCRIPCION_TIPOS: Record<TipoPunto, string> = {
  aprobacion_acta: 'Lectura y aprobación del acta de la sesión anterior',
  acuerdo: 'Acuerdo o resolución del pleno con efectos administrativos o jurídicos',
  mocion: 'Moción o declaración institucional presentada por grupos municipales',
  ruego_pregunta: 'Ruego, pregunta o intervención de control de la oposición',
  dacion_cuenta: 'Informe o decreto del que el pleno se da por enterado, sin votación',
  otro: 'Asunto que no encaja en el resto de tipos',
};

export const INSTRUCCIONES_TEMA = [
  'Son puntos de un pleno municipal español (textos en catalán o castellano).',
  'Clasifica el tema por su contenido material, con independencia de quién lo presente.',
  'Puede asignarse más de un tema si el punto lo justifica; si duda, usa "otros".',
  'No valores políticamente el punto ni atribuyas posiciones a grupos o personas.',
  '',
  ...TEMAS.map((t) => `- ${t}: ${DESCRIPCION_TEMAS[t]}`),
].join('\n');

export const INSTRUCCIONES_TIPO = [
  'Son puntos de un pleno municipal español (textos en catalán o castellano).',
  'Clasifica cada punto en una sola categoría según su forma y efecto administrativo.',
  'No valores políticamente el punto ni atribuyas posiciones a grupos o personas.',
  '',
  ...TIPOS_PUNTO.map((t) => `- ${t}: ${DESCRIPCION_TIPOS[t]}`),
].join('\n');

export const CRITERIOS_AFECTA_VECINOS = {
  instructions:
    '¿El punto tiene efecto directo y concreto en la vida diaria o el bolsillo de los residentes del municipio, y no es un mero trámite interno?',
  true: 'Efecto directo y perceptible para los vecinos: servicios, impuestos, movilidad, vivienda, obras en la calle, ayudas, sanciones generales o normas de aplicación cotidiana.',
  false: 'Trámite interno, organizativo, protocolario o de gestión administrativa sin efecto directo perceptible para los vecinos.',
};

export const CRITERIOS_IMPACTO = [
  'Trámite interno sin efecto perceptible para los vecinos',
  'Efecto menor sobre pocos vecinos o muy indirecto',
  'Efecto moderado: afecta a un barrio o a un servicio concreto',
  'Efecto relevante sobre un número amplio de vecinos o con coste apreciable',
  'Efecto muy relevante: afecta a la mayoría de vecinos o supone un importe elevado o un cambio difícil de revertir',
];

export const CRITERIOS_IMPACTO_INSTRUCTIONS = [
  'Puntúa el impacto vecinal del punto de 1 a 5 con criterios explícitos.',
  'Considera: alcance (a cuántos vecinos afecta), importe si consta en el texto (a mayor importe, mayor impacto), irreversibilidad de la decisión y plazo de aplicación.',
  'No puntúes el mérito político ni la oportunidad de la medida, solo su efecto práctico para los vecinos.',
].join(' ');

export const CRITERIOS_PLAZO_CIUDADANO = {
  instructions:
    '¿El punto abre un plazo de alegaciones, información pública, subvenciones o una convocatoria a la que un vecino pueda responder o presentarse?',
  true: 'Abre plazo de alegaciones o información pública, aprueba bases de subvenciones o ayudas, convoca procesos participativos o plazas a las que los vecinos pueden optar.',
  false: 'No abre ningún plazo ni procedimiento al que un vecino pueda responder o presentarse.',
};

const PAYLOAD_TAXONOMIA = {
  version: VERSION_TAXONOMIA,
  temas: DESCRIPCION_TEMAS,
  tipos: DESCRIPCION_TIPOS,
  instrucciones_tema: INSTRUCCIONES_TEMA,
  instrucciones_tipo: INSTRUCCIONES_TIPO,
  afecta_vecinos: CRITERIOS_AFECTA_VECINOS,
  impacto: CRITERIOS_IMPACTO,
  impacto_instrucciones: CRITERIOS_IMPACTO_INSTRUCTIONS,
  plazo_ciudadano: CRITERIOS_PLAZO_CIUDADANO,
};

export function hashInstrucciones(): string {
  return sha256(JSON.stringify(PAYLOAD_TAXONOMIA)).slice(0, 16);
}
