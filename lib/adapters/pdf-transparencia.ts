import * as cheerio from 'cheerio';
import { parsearDocumento } from '@/lib/adapters/parse';
import { descargar } from '@/lib/http/fetcher';
import type { Municipio } from '@/lib/schemas';
import { hashCorto } from '@/lib/utils/hash';
import {
  tipoDesdeTexto,
  type ContenidoSesion,
  type DocumentoParseado,
  type ReferenciaSesion,
  type SourceAdapter,
} from '@/lib/adapters/types';

export interface EnlacePdf {
  url: string;
  texto: string;
}

export function extraerEnlacesPdf(html: string, patron: RegExp, baseUrl: string | null): EnlacePdf[] {
  const $ = cheerio.load(html);
  const enlaces: EnlacePdf[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const url = baseUrl ? new URL(href, baseUrl).toString() : href;
    if (!patron.test(url)) return;
    enlaces.push({ url, texto: $(el).text().trim() });
  });
  return enlaces;
}

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

export function fechaDesdeUrl(url: string, patronFecha?: RegExp): string | null {
  if (patronFecha) {
    const m = url.match(patronFecha);
    if (m) return m[1];
  }
  const m0 = url.match(/(\d{1,2})[- ]de[- ]([a-záéíóúñ]+)[- ]de[- ](\d{4})/i);
  if (m0 && MESES_ES[m0[2].toLowerCase()]) {
    return `${m0[3]}-${MESES_ES[m0[2].toLowerCase()]}-${m0[1].padStart(2, '0')}`;
  }
  const m0b = url.match(/(\d{1,2})[-_ ]([a-záéíóúñ]+)[-_ ](\d{4})/i);
  if (m0b && MESES_ES[m0b[2].toLowerCase()]) {
    return `${m0b[3]}-${MESES_ES[m0b[2].toLowerCase()]}-${m0b[1].padStart(2, '0')}`;
  }
  const m1 = url.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  const m2 = url.match(/(\d{2})[._-](\d{2})[._-](\d{4})/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  const m3 = url.match(/(\d{2})[._-](\d{2})[._-](\d{2})(?!\d)/);
  if (m3) return `20${m3[3]}-${m3[2]}-${m3[1]}`;
  return null;
}

export class PdfTransparenciaAdapter implements SourceAdapter {
  nombre = 'pdf-transparencia';
  private readonly listadoUrl: string;
  private readonly patron: RegExp;
  private readonly patronFecha: RegExp | undefined;
  private readonly formato: string;

  constructor(municipio: Municipio) {
    const config = municipio.fuente_config as {
      listado_url?: string;
      patron_pdf?: string;
      patron_fecha?: string;
      formato?: string;
    };
    if (!config.listado_url || !config.patron_pdf) {
      throw new Error('El municipio pdf-transparencia necesita listado_url y patron_pdf');
    }
    this.listadoUrl = config.listado_url;
    this.patron = new RegExp(config.patron_pdf, 'i');
    this.patronFecha = config.patron_fecha ? new RegExp(config.patron_fecha) : undefined;
    this.formato = config.formato ?? 'auto';
  }

  async discover(): Promise<ReferenciaSesion[]> {
    const res = await descargar(this.listadoUrl, { timeoutMs: 60000 });
    const html = res.buffer.toString('utf8');
    const enlaces = extraerEnlacesPdf(html, this.patron, this.listadoUrl);
    const referencias: ReferenciaSesion[] = [];
    for (const enlace of enlaces) {
      const fecha = fechaDesdeUrl(enlace.url, this.patronFecha);
      if (!fecha) continue;
      referencias.push({
        id: hashCorto(enlace.url),
        fecha,
        tipo: tipoDesdeTexto(enlace.texto || enlace.url),
        urlDocumento: enlace.url,
        metadata: { texto_enlace: enlace.texto },
      });
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
    const res = await descargar(referencia.urlDocumento, { pausaMs: 2000, timeoutMs: 120000 });
    return {
      referencia,
      buffer: new Uint8Array(res.buffer),
      contentType: res.contentType,
      urlFinal: res.urlFinal,
    };
  }

  async parse(contenido: ContenidoSesion): Promise<DocumentoParseado> {
    return parsearDocumento(contenido.buffer, this.formato);
  }
}
