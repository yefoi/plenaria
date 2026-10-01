import * as cheerio from 'cheerio';
import { parsearDocumento } from '@/lib/adapters/parse';
import { descargar } from '@/lib/http/fetcher';
import { fechaDesdeUrl } from '@/lib/adapters/pdf-transparencia';
import type { Municipio, TipoSesion } from '@/lib/schemas';
import { hashCorto } from '@/lib/utils/hash';
import { log } from '@/lib/utils/log';
import {
  tipoDesdeTexto,
  type ContenidoSesion,
  type DocumentoParseado,
  type ReferenciaSesion,
  type SourceAdapter,
} from '@/lib/adapters/types';

export interface SesionWeb {
  url: string;
  texto: string;
  fecha: string;
  tipo: TipoSesion;
}

export function extraerSesionesWeb(
  html: string,
  patronSesion: RegExp,
  baseUrl: string,
): { url: string; texto: string }[] {
  const $ = cheerio.load(html);
  const sesiones: { url: string; texto: string }[] = [];
  const vistos = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const url = new URL(href, baseUrl);
    if (!patronSesion.test(url.pathname)) return;
    if (vistos.has(url.pathname)) return;
    vistos.add(url.pathname);
    sesiones.push({ url: url.toString(), texto: $(el).text().trim() });
  });
  return sesiones;
}

export function extraerDocumentoWeb(
  html: string,
  patronesPdf: RegExp[],
  baseUrl: string,
): string | null {
  const $ = cheerio.load(html);
  const documentos: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const url = new URL(href, baseUrl);
    documentos.push(url.toString());
  });
  for (const patron of patronesPdf) {
    for (const documento of documentos) {
      const ruta = decodeURIComponent(new URL(documento).pathname);
      if (patron.test(ruta)) return documento;
    }
  }
  return null;
}

export class PortalSesionesAdapter implements SourceAdapter {
  nombre = 'portal-sesiones';
  private readonly listadoUrl: string;
  private readonly patronSesion: RegExp;
  private readonly patronesPdf: RegExp[];
  private readonly tipoPorDefecto: TipoSesion;
  private readonly urlBasePdf: string | null;
  private readonly maxSesiones: number;

  constructor(municipio: Municipio) {
    const config = municipio.fuente_config as {
      listado_url?: string;
      patron_sesion?: string;
      patrones_pdf?: string[];
      tipo_por_defecto?: TipoSesion;
      url_base_pdf?: string;
      max_sesiones?: number;
    };
    if (!config.listado_url || !config.patron_sesion || !config.patrones_pdf?.length) {
      throw new Error('El municipio portal-sesiones necesita listado_url, patron_sesion y patrones_pdf');
    }
    this.listadoUrl = config.listado_url;
    this.patronSesion = new RegExp(config.patron_sesion, 'i');
    this.patronesPdf = config.patrones_pdf.map((p) => new RegExp(p, 'i'));
    this.tipoPorDefecto = config.tipo_por_defecto ?? 'otra';
    this.urlBasePdf = config.url_base_pdf ?? null;
    this.maxSesiones = config.max_sesiones ?? 3;
  }

  async discover(): Promise<ReferenciaSesion[]> {
    const listado = await descargar(this.listadoUrl, { timeoutMs: 60000 });
    const sesiones = extraerSesionesWeb(listado.buffer.toString('utf8'), this.patronSesion, this.listadoUrl);
    const referencias: ReferenciaSesion[] = [];
    const maxPaginas = Math.min(sesiones.length, this.maxSesiones * 4);
    let visitadas = 0;

    for (const sesion of sesiones) {
      if (referencias.length >= this.maxSesiones || visitadas >= maxPaginas) break;
      visitadas++;
      try {
        const pagina = await descargar(sesion.url, { timeoutMs: 60000, pausaMs: 2000 });
        const documento = extraerDocumentoWeb(pagina.buffer.toString('utf8'), this.patronesPdf, sesion.url);
        if (!documento) continue;
        const fecha = fechaDesdeUrl(decodeURIComponent(documento)) ?? fechaDesdeUrl(sesion.url);
        if (!fecha) {
          log('aviso', `Sin fecha reconocible en ${sesion.url}`);
          continue;
        }
        const urlFinal = this.urlBasePdf
          ? new URL(new URL(documento).pathname, this.urlBasePdf).toString()
          : documento;
        const tipoDetectado = tipoDesdeTexto(`${sesion.url} ${sesion.texto}`);
        referencias.push({
          id: hashCorto(urlFinal),
          fecha,
          tipo: tipoDetectado === 'otra' ? this.tipoPorDefecto : tipoDetectado,
          urlDocumento: urlFinal,
          metadata: { pagina_sesion: sesion.url, texto_enlace: sesion.texto },
        });
      } catch (err) {
        log('aviso', `No se pudo leer una sesión de ${this.listadoUrl}: ${(err as Error).message}`);
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
    return parsearDocumento(contenido.buffer, 'auto');
  }
}
