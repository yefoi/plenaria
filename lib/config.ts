import { MARCA } from '@/lib/brand';
import type { Municipio } from '@/lib/schemas';

export const UMBRAL_CONFIANZA = 0.7;

export const MAX_LLAMADAS_CLASIFICACION = 60;

export const RESUMEN_MODELO_HABILITADO = false;

export const USER_AGENT_POR_DEFECTO = `${MARCA.agente} (${MARCA.nombreLocal}; proyecto informativo sin ánimo de lucro; contacto: configurar PLENARIA_USER_AGENT)`;

export function userAgent(): string {
  return process.env.PLENARIA_USER_AGENT?.trim() || USER_AGENT_POR_DEFECTO;
}

function ckanSeuE(
  id: string,
  nombre: string,
  provincia: string,
  codiEns: string,
  formato = 'auto',
): Municipio {
  return {
    id,
    nombre,
    provincia,
    fuente_tipo: 'ckan-seu-e',
    fuente_config: {
      codi_ens: codiEns,
      csv_url: 'https://dadesobertes.seu-e.cat/csv/agn-ag-actes-de-ple.csv',
      formato,
      idioma: 'ca',
    },
  };
}

export const MUNICIPIOS: Municipio[] = [
  ckanSeuE('hospitalet-de-llobregat', "L'Hospitalet de Llobregat", 'Barcelona', '810170005', 'extracte-acords'),
  ckanSeuE('girona', 'Girona', 'Girona', '1707920002'),
  ckanSeuE('tarragona', 'Tarragona', 'Tarragona', '4314820002'),
  ckanSeuE('salt', 'Salt', 'Girona', '1715570005'),
  ckanSeuE('martorell', 'Martorell', 'Barcelona', '811410007'),
  ckanSeuE('el-masnou', 'El Masnou', 'Barcelona', '811890004'),
  ckanSeuE('rubi', 'Rubí', 'Barcelona', '818460009'),
  ckanSeuE('cambrils', 'Cambrils', 'Tarragona', '4303850006'),
  ckanSeuE('vilafranca-del-penedes', 'Vilafranca del Penedès', 'Barcelona', '830540003'),
  ckanSeuE('blanes', 'Blanes', 'Girona', '1702370005'),
  ckanSeuE('vic', 'Vic', 'Barcelona', '829810007'),
  ckanSeuE('reus', 'Reus', 'Tarragona', '4312330008'),
  ckanSeuE('sant-cugat-del-valles', 'Sant Cugat del Vallès', 'Barcelona', '820550006'),
  ckanSeuE('palau-solita-i-plegamans', 'Palau-solità i Plegamans', 'Barcelona', '815680001'),
  ckanSeuE('la-seu-d-urgell', "La Seu d'Urgell", 'Lleida', '2520380001'),
  ckanSeuE('montgat', 'Montgat', 'Barcelona', '812650006'),
  ckanSeuE('torroella-de-montgri', 'Torroella de Montgrí', 'Girona', '1719970005'),
  ckanSeuE('deltebre', 'Deltebre', 'Tarragona', '4390180001'),
  ckanSeuE('la-bisbal-d-emporda', "La Bisbal d'Empordà", 'Girona', '1702210007'),
  ckanSeuE('sant-joan-de-vilatorrada', 'Sant Joan de Vilatorrada', 'Barcelona', '821880001'),
  ckanSeuE('ripoll', 'Ripoll', 'Girona', '1714790004'),
  ckanSeuE('premia-de-dalt', 'Premià de Dalt', 'Barcelona', '823030008'),
  ckanSeuE('alcarras', 'Alcarràs', 'Lleida', '2501170005'),
  ckanSeuE('sant-vicenc-de-castellet', 'Sant Vicenç de Castellet', 'Barcelona', '826280001'),
  ckanSeuE('masquefa', 'Masquefa', 'Barcelona', '811920002'),
  ckanSeuE('alcanar', 'Alcanar', 'Tarragona', '4300430008'),
  ckanSeuE('puigcerda', 'Puigcerdà', 'Girona', '1714110007'),
  ckanSeuE('caldes-de-malavella', 'Caldes de Malavella', 'Girona', '1703350006'),
  ckanSeuE('macanet-de-la-selva', 'Maçanet de la Selva', 'Girona', '1710300000'),
  ckanSeuE('santpedor', 'Santpedor', 'Barcelona', '819230008'),
  ckanSeuE('roda-de-ter', 'Roda de Ter', 'Barcelona', '818310007'),
  ckanSeuE('teia', 'Teià', 'Barcelona', '828190004'),
  ckanSeuE('moia', 'Moià', 'Barcelona', '813850006'),
  ckanSeuE('barcelona', 'Barcelona', 'Barcelona', '801930008'),
  ckanSeuE('badalona', 'Badalona', 'Barcelona', '801550006'),
  ckanSeuE('lleida', 'Lleida', 'Lleida', '2512070005'),
  ckanSeuE('mataro', 'Mataró', 'Barcelona', '812130008'),
  ckanSeuE('manresa', 'Manresa', 'Barcelona', '811360009'),
  ckanSeuE('vilanova-i-la-geltru', 'Vilanova i la Geltrú', 'Barcelona', '830730008'),
  ckanSeuE('viladecans', 'Viladecans', 'Barcelona', '830150006'),
  ckanSeuE('mollet-del-valles', 'Mollet del Vallès', 'Barcelona', '812490004'),
  ckanSeuE('figueres', 'Figueres', 'Girona', '1706690004'),
  ckanSeuE('sant-feliu-de-llobregat', 'Sant Feliu de Llobregat', 'Barcelona', '821140003'),
  ckanSeuE('salou', 'Salou', 'Tarragona', '4390570005'),
  ckanSeuE('sant-vicenc-dels-horts', 'Sant Vicenç dels Horts', 'Barcelona', '826340003'),
  ckanSeuE('santa-perpetua-de-mogoda', 'Santa Perpètua de Mogoda', 'Barcelona', '826060009'),
  ckanSeuE('valls', 'Valls', 'Tarragona', '4316130008'),
  ckanSeuE('manlleu', 'Manlleu', 'Barcelona', '811200000'),
  ckanSeuE('vilassar-de-mar', 'Vilassar de Mar', 'Barcelona', '821910007'),
  ckanSeuE('calella', 'Calella', 'Barcelona', '803510007'),
  ckanSeuE('roses', 'Roses', 'Girona', '1715230008'),
  ckanSeuE('malgrat-de-mar', 'Malgrat de Mar', 'Barcelona', '811080001'),
  ckanSeuE('tarrega', 'Tàrrega', 'Lleida', '2521730008'),
  ckanSeuE('palamos', 'Palamós', 'Girona', '1711810007'),
  ckanSeuE('torredembarra', 'Torredembarra', 'Tarragona', '4315360009'),
  ckanSeuE('berga', 'Berga', 'Barcelona', '802290004'),
  ckanSeuE('montornes-del-valles', 'Montornès del Vallès', 'Barcelona', '813630008'),
  ckanSeuE('llica-d-amunt', "Lliçà d'Amunt", 'Barcelona', '810750006'),
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
  {
    id: 'madrid',
    nombre: 'Madrid',
    provincia: 'Madrid',
    fuente_tipo: 'portal-sesiones',
    fuente_config: {
      listado_url:
        'https://www.madrid.es/portales/munimadrid/es/Inicio/El-Ayuntamiento/El-Pleno/Actividad-del-Pleno-y-las-Comisiones/Pleno/Sesiones-del-Pleno/?vgnextchannel=8e9858f5c050e210VgnVCM2000000c205a0aRCRD&vgnextfmt=default&vgnextoid=122481276d58c010VgnVCM100000d90ca8c0RCRD',
      patron_sesion: 'Pleno/\\d{1,2}-de-[a-z]+-de-\\d{4}',
      patrones_pdf: ['AC_[^/]*\\.pdf$', 'DS_[^/]*\\.pdf$'],
      tipo_por_defecto: 'ordinaria',
      url_base_pdf: 'https://transparencia.madrid.es',
      max_sesiones: 3,
      idioma: 'es',
    },
  },
  {
    id: 'mostoles',
    nombre: 'Móstoles',
    provincia: 'Madrid',
    fuente_tipo: 'portal-sesiones',
    fuente_config: {
      listado_url:
        'https://www.mostoles.es/es/ayuntamiento/organizacion-municipal-organos-gobierno-personal/plenos-municipales/sesiones-pleno-municipal',
      patron_sesion: 'sesion-pleno-[^/]+$',
      patrones_pdf: ['Acta de Pleno', 'Extracto de Pleno'],
      tipo_por_defecto: 'ordinaria',
      max_sesiones: 3,
      idioma: 'es',
    },
  },
];

export function municipioPorId(id: string): Municipio | undefined {
  return MUNICIPIOS.find((m) => m.id === id);
}
