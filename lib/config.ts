import { MARCA } from '@/lib/brand';
import type { Municipio } from '@/lib/schemas';

export const UMBRAL_CONFIANZA = 0.7;

export const MAX_LLAMADAS_CLASIFICACION = 60;

export const RESUMEN_MODELO_HABILITADO = false;

export const USER_AGENT_POR_DEFECTO = `${MARCA.agente} (${MARCA.nombreLocal}; proyecto informativo sin ánimo de lucro; contacto: configurar PLENARIA_USER_AGENT)`;

export function userAgent(): string {
  return process.env.PLENARIA_USER_AGENT?.trim() || USER_AGENT_POR_DEFECTO;
}

export const MUNICIPIOS: Municipio[] = [
  {
    id: 'hospitalet-de-llobregat',
    nombre: "L'Hospitalet de Llobregat",
    provincia: 'Barcelona',
    fuente_tipo: 'ckan-seu-e',
    fuente_config: {
      codi_ens: '810170005',
      csv_url: 'https://dadesobertes.seu-e.cat/csv/agn-ag-actes-de-ple.csv',
      formato: 'extracte-acords',
      idioma: 'ca',
    },
  },
  {
    id: 'toledo',
    nombre: 'Toledo',
    provincia: 'Toledo',
    fuente_tipo: 'pdf-transparencia',
    fuente_config: {
      listado_url:
        'https://www.toledo.es/toledo-abierto/transparencia-activa-e-informacion-sobre-la-corporacion-municipal/actas_pleno_ayto/',
      patron_pdf: '(^|/)acta[^/]*\\.pdf$',
      formato: 'auto',
      idioma: 'es',
    },
  },
];

export function municipioPorId(id: string): Municipio | undefined {
  return MUNICIPIOS.find((m) => m.id === id);
}
