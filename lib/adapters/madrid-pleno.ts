import * as cheerio from 'cheerio';
import { parsearDocumentoPdf } from '@/lib/adapters/parse';
import { descargar } from '@/lib/http/fetcher';
import type { Municipio } from '@/lib/schemas';
import { hashCorto } from '@/lib/utils/hash';
import { log } from '@/lib/utils/log';
import {
  type ContenidoSesion,
  type DocumentoParseado,
  type ReferenciaSesion,
  type SourceAdapter,
} from '@/lib/adapters/types';

const PATRON_SESION = /\/Pleno\/(\d{1,2})-de-([a-z]+)-de-(\d{4})(-Extraordinaria)?\//i;
const PATRON_ACUERDOS = /\/AC_[^/"]*\.pdf$/i;

const MESES_ES: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

export interface EnlaceSesion {
  url: string;
  texto: string;
  fecha: string;
  tipo: 'ordinaria' | 'extraordinaria';
}

export function extraerSesionesMadrid(html: string, baseUrl: string): EnlaceSesion[] {
  const $ = cheerio.load(html);
  const sesiones: EnlaceSesion[] = [];
  const vistos = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const url = new URL(href, baseUrl);
    const m = url.pathname.match(PATRON_SESION);
    if (!m) return;
    const mes = MESES_ES[m[2].toLowerCase()];
    if (!mes) return;
    const clave = url.pathname;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    sesiones.push({
      url: url.toString(),
      texto: $(el).text().trim(),
      fecha: `${m[3]}-${mes}-${m[1].padStart(2, '0')}`,
      tipo: m[4] ? 'extraordinaria' : 'ordinaria',
    });
  });
  return sesiones;
}

export function extraerAcuerdos(html: string, baseUrl: string): string | null {
  const $ = cheerio.load(html);
  let encontrado: string | null = null;
  $('a[href]').each((_, el) => {
    if (encontrado) return;
    const href = $(el).attr('href');
    if (!href) return;
    const url = new URL(href, baseUrl);
    if (PATRON_ACUERDOS.test(url.pathname)) encontrado = url.toString();
  });
  return encontrado;
}

export class MadridPlenoAdapter implements SourceAdapter {
  nombre = 'madrid-pleno';
  private readonly listadoUrl: string;
  private readonly urlBasePdf: string;
  private readonly maxSesiones: number;

  constructor(municipio: Municipio) {
    const config = municipio.fuente_config as {
      listado_url?: string;
      url_base_pdf?: string;
      max_sesiones?: number;
    };
    if (!config.listado_url || !config.url_base_pdf) {
      throw new Error('El municipio madrid-pleno necesita listado_url y url_base_pdf');
    }
    this.listadoUrl = config.listado_url;
    this.urlBasePdf = config.url_base_pdf;
    this.maxSesiones = config.max_sesiones ?? 3;
  }

  async discover(): Promise<ReferenciaSesion[]> {
    const listado = await descargar(this.listadoUrl, { timeoutMs: 60000 });
    const sesiones = extraerSesionesMadrid(listado.buffer.toString('utf8'), this.listadoUrl);
    const referencias: ReferenciaSesion[] = [];

    for (const sesion of sesiones) {
      if (referencias.length >= this.maxSesiones) break;
      try {
        const pagina = await descargar(sesion.url, { timeoutMs: 60000, pausaMs: 2000 });
        const acuerdos = extraerAcuerdos(pagina.buffer.toString('utf8'), sesion.url);
        if (!acuerdos) continue;
        const espejo = new URL(new URL(acuerdos).pathname, this.urlBasePdf).toString();
        referencias.push({
          id: hashCorto(espejo),
          fecha: sesion.fecha,
          tipo: sesion.tipo,
          urlDocumento: espejo,
          metadata: { pagina_sesion: sesion.url, texto_enlace: sesion.texto },
        });
      } catch (err) {
        log('aviso', `No se pudo leer la sesión de Madrid ${sesion.fecha}: ${(err as Error).message}`);
      }
    }

    return referencias.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  }

  async fetch(referencia: ReferenciaSesion, bufferLocal?: Uint8Array): Promise<ContenidoSesion> {
    if (bufferLocal) {
      return {
        referencia,
        buffer: bufferLocal,
        contentType: 'application/pdf',
        urlFinal: referencia.urlDocumento,
      };
    }
    const res = await descargar(referencia.urlDocumento, { pausaMs: 2000, timeoutMs: 180000 });
    return {
      referencia,
      buffer: new Uint8Array(res.buffer),
      contentType: res.contentType,
      urlFinal: res.urlFinal,
    };
  }

  async parse(contenido: ContenidoSesion): Promise<DocumentoParseado> {
    return parsearDocumentoPdf(contenido.buffer, 'auto');
  }
}
