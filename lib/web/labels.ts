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
