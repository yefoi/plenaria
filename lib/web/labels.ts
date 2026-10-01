import type { Tema, TipoPunto } from '@/lib/schemas';

export const ETIQUETA_TEMA: Record<Tema, string> = {
  urbanismo_licencias: 'Urbanismo y licencias',
  vivienda: 'Vivienda',
  presupuesto_impuestos: 'Presupuesto e impuestos',
  contratacion_obras: 'Contratación y obras',
  servicios_publicos: 'Servicios públicos',
  movilidad_trafico: 'Movilidad y tráfico',
  seguridad: 'Seguridad',
  cultura_deporte_educacion: 'Cultura, deporte y educación',
  servicios_sociales: 'Servicios sociales',
  personal: 'Personal',
  medio_ambiente: 'Medio ambiente',
  mociones_grupos: 'Mociones',
  organizacion_institucional: 'Organización institucional',
  otros: 'Otros',
};

export const ETIQUETA_TIPO: Record<TipoPunto, string> = {
  aprobacion_acta: 'Aprobación de acta',
  acuerdo: 'Acuerdo',
  mocion: 'Moción',
  ruego_pregunta: 'Ruego o pregunta',
  dacion_cuenta: 'Dación de cuenta',
  otro: 'Otro',
};

export const ETIQUETA_ESTADO: Record<string, string> = {
  descubierta: 'Descubierta',
  descargada: 'Descargada',
  extraida: 'Extraída',
  segmentada: 'Segmentada',
  redactada: 'Pendiente de clasificar',
  clasificada: 'Clasificada',
  publicada: 'Publicada',
  sin_cambios: 'Sin cambios',
  requiere_ocr: 'Requiere OCR (no procesada)',
  segmentacion_pobre: 'Segmentación dudosa',
  error: 'Error',
};

export function etiquetaResultado(resultado: string): string {
  const r = resultado.toLowerCase();
  if (r.includes('parcialment')) return 'Aprobado parcialmente';
  if (r.startsWith('aprov') || r.startsWith('aprob')) return 'Aprobado';
  if (r.startsWith('rebutj') || r.startsWith('rechaz')) return 'Rechazado';
  if (r.includes('assabent')) return 'Dado por enterado';
  if (r.startsWith('retirat') || r.startsWith('retirad')) return 'Retirado';
  if (r.startsWith('acceptat') || r.startsWith('aceptad')) return 'Aceptado';
  if (r.startsWith('desistit') || r.startsWith('desistid')) return 'Desistido';
  if (r.includes('pendent') || r.includes('pendiente')) return 'Pendiente';
  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
}

export function tonoResultado(resultado: string): 'ok' | 'peligro' | 'neutro' {
  const r = resultado.toLowerCase();
  if (r.startsWith('aprov') || r.startsWith('aprob') || r.startsWith('acceptat') || r.startsWith('aceptad')) {
    return 'ok';
  }
  if (r.startsWith('rebutj') || r.startsWith('rechaz') || r.startsWith('no aprov')) return 'peligro';
  return 'neutro';
}

export function formatearImporte(valor: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(valor);
}

export function formatearPorcentaje(valor: number): string {
  return `${Math.round(valor * 100)}%`;
}
