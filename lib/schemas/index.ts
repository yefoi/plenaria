import { z } from 'zod';

export const TIPOS_PUNTO = [
  'aprobacion_acta',
  'acuerdo',
  'mocion',
  'ruego_pregunta',
  'dacion_cuenta',
  'otro',
] as const;

export const TEMAS = [
  'urbanismo_licencias',
  'vivienda',
  'presupuesto_impuestos',
  'contratacion_obras',
  'servicios_publicos',
  'movilidad_trafico',
  'seguridad',
  'cultura_deporte_educacion',
  'servicios_sociales',
  'personal',
  'medio_ambiente',
  'mociones_grupos',
  'organizacion_institucional',
  'otros',
] as const;

export const TIPOS_SESION = [
  'ordinaria',
  'extraordinaria',
  'extraordinaria_urgente',
  'otra',
] as const;

export const ESTADOS_INGESTA = [
  'descubierta',
  'descargada',
  'extraida',
  'segmentada',
  'redactada',
  'clasificada',
  'publicada',
  'sin_cambios',
  'requiere_ocr',
  'segmentacion_pobre',
  'error',
] as const;

export const FUENTES_TIPO = ['ckan-seu-e', 'pdf-transparencia', 'portal-sesiones', 'manual'] as const;

export const temaSchema = z.enum(TEMAS);
export const tipoPuntoSchema = z.enum(TIPOS_PUNTO);
export const tipoSesionSchema = z.enum(TIPOS_SESION);
export const estadoIngestaSchema = z.enum(ESTADOS_INGESTA);

export const municipioSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  provincia: z.string().min(1),
  fuente_tipo: z.enum(FUENTES_TIPO),
  fuente_config: z.record(z.string(), z.unknown()),
});

export const sesionSchema = z.object({
  id: z.string().min(1),
  municipio_id: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: tipoSesionSchema,
  fuente_url: z.string().url(),
  hash_contenido: z.string().min(8),
  estado_ingesta: estadoIngestaSchema,
  actualizada_en: z.string(),
});

export const clasificadoConSchema = z.object({
  modelo: z.string().min(1),
  version: z.string(),
  hash_instrucciones: z.string().min(8),
  fecha: z.string(),
});

export const puntoSchema = z.object({
  id: z.string().min(1),
  sesion_id: z.string().min(1),
  orden: z.number().int().min(1),
  titulo: z.string().min(1),
  resultado: z.string().nullable().default(null),
  texto_redactado: z.string(),
  importe_eur: z.number().nullable(),
  sensible: z.boolean(),
  tipo_punto: tipoPuntoSchema.nullable(),
  temas: z.array(temaSchema),
  afecta_vecinos_prob: z.number().min(0).max(1).nullable(),
  impacto: z.number().int().min(1).max(5).nullable(),
  confianza_min: z.number().min(0).max(1).nullable(),
  revision_manual: z.boolean(),
  clasificado_con: clasificadoConSchema.nullable(),
});

export const documentoSesionSchema = z.object({
  version: z.literal(1),
  municipio: municipioSchema,
  sesion: sesionSchema,
  puntos: z.array(puntoSchema),
});

export const digestSchema = z.object({
  municipio_id: z.string().min(1),
  semana_iso: z.string().regex(/^\d{4}-W\d{2}$/),
  puntos_destacados: z.array(z.string()),
  generado_en: z.string(),
  resumen: z.string(),
});

export const fuentesStatusSchema = z.object({
  municipio_id: z.string(),
  fuente_tipo: z.string(),
  actualizado_en: z.string(),
  ultima_descarga: z.string().nullable(),
  ultima_sesion_fecha: z.string().nullable(),
  sesiones_procesadas: z.number().int().min(0),
  errores: z.array(z.string()),
  robots: z.record(z.string(), z.string()),
});

export type Municipio = z.infer<typeof municipioSchema>;
export type Sesion = z.infer<typeof sesionSchema>;
export type Punto = z.infer<typeof puntoSchema>;
export type DocumentoSesion = z.infer<typeof documentoSesionSchema>;
export type Digest = z.infer<typeof digestSchema>;
export type FuentesStatus = z.infer<typeof fuentesStatusSchema>;
export type Tema = (typeof TEMAS)[number];
export type TipoPunto = (typeof TIPOS_PUNTO)[number];
export type TipoSesion = (typeof TIPOS_SESION)[number];
export type EstadoIngesta = (typeof ESTADOS_INGESTA)[number];
export type ClasificadoCon = z.infer<typeof clasificadoConSchema>;
