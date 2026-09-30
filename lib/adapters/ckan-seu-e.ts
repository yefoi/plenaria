import fs from 'node:fs/promises';
import path from 'node:path';
import { parsearDocumentoPdf } from '@/lib/adapters/parse';
import { descargar } from '@/lib/http/fetcher';
import type { Municipio } from '@/lib/schemas';
import { csvAFilasObjeto } from '@/lib/utils/csv';
import { log } from '@/lib/utils/log';
import {
  tipoDesdeTexto,
  type ContenidoSesion,
  type DocumentoParseado,
  type ReferenciaSesion,
  type SourceAdapter,
} from '@/lib/adapters/types';

const COLUMNA_ENLACE = 'ENLLAÇ_ACTA';
const COLUMNAS_REQUERIDAS = ['DATA_ACORD', 'TIPUS', COLUMNA_ENLACE, 'CODI_ACTA', 'CODI_ENS'];

export class CkanSeuEAdapter implements SourceAdapter {
  nombre = 'ckan-seu-e';
  private readonly codiEns: string;
  private readonly csvUrl: string;
  private readonly formato: string;
  private readonly cacheDir: string;

  constructor(municipio: Municipio, cacheDir: string) {
    const config = municipio.fuente_config as {
      codi_ens?: string;
      csv_url?: string;
      formato?: string;
    };
    if (!config.codi_ens || !config.csv_url) {
      throw new Error('El municipio ckan-seu-e necesita codi_ens y csv_url en fuente_config');
    }
    this.codiEns = config.codi_ens;
    this.csvUrl = config.csv_url;
    this.formato = config.formato ?? 'auto';
    this.cacheDir = cacheDir;
  }

  private get dirCache(): string {
    return path.join(this.cacheDir, this.nombre);
  }

  private async descargarCsv(): Promise<string> {
    await fs.mkdir(this.dirCache, { recursive: true });
    const rutaCsv = path.join(this.dirCache, 'agn-ag-actes-de-ple.csv');
    const rutaMeta = path.join(this.dirCache, 'agn-ag-actes-de-ple.meta.json');

    let meta: { etag?: string; lastModified?: string } = {};
    try {
      meta = JSON.parse(await fs.readFile(rutaMeta, 'utf8'));
    } catch {
      meta = {};
    }

    const cabeceras: Record<string, string> = {};
    if (meta.etag) cabeceras['if-none-match'] = meta.etag;
    if (meta.lastModified) cabeceras['if-modified-since'] = meta.lastModified;

    try {
      const res = await descargar(this.csvUrl, { cabeceras, timeoutMs: 180000 });
      if (res.notModified) {
        log('info', 'CSV sin cambios (304); se usa la copia en caché');
        return fs.readFile(rutaCsv, 'utf8');
      }
      await fs.writeFile(rutaCsv, res.buffer);
      await fs.writeFile(
        rutaMeta,
        JSON.stringify({ etag: res.etag, lastModified: res.lastModified, descargado_en: new Date().toISOString() }, null, 2),
      );
      log('info', `CSV actualizado (${Math.round(res.buffer.length / 1024 / 1024)} MB)`);
      return res.buffer.toString('utf8');
    } catch (err) {
      try {
        const cache = await fs.readFile(rutaCsv, 'utf8');
        log('aviso', `No se pudo descargar el CSV; se usa la caché local: ${(err as Error).message}`);
        return cache;
      } catch {
        throw err;
      }
    }
  }

  async discover(): Promise<ReferenciaSesion[]> {
    const texto = await this.descargarCsv();
    const filas = csvAFilasObjeto(texto);
    if (filas.length === 0) throw new Error('CSV vacío o ilegible');
    const columnas = Object.keys(filas[0]);
    for (const columna of COLUMNAS_REQUERIDAS) {
      if (!columnas.includes(columna)) {
        throw new Error(
          `El CSV cambió de formato: falta la columna ${columna}. Columnas actuales: ${columnas.join(', ')}`,
        );
      }
    }
    const referencias: ReferenciaSesion[] = [];
    for (const fila of filas) {
      if (fila.CODI_ENS !== this.codiEns) continue;
      const fecha = fila.DATA_ACORD.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
      const enlace = fila[COLUMNA_ENLACE];
      if (!enlace || !fila.CODI_ACTA) continue;
      referencias.push({
        id: fila.CODI_ACTA,
        fecha,
        tipo: tipoDesdeTexto(fila.TIPUS ?? ''),
        urlDocumento: enlace,
        metadata: { tipus: fila.TIPUS ?? '' },
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
    return parsearDocumentoPdf(contenido.buffer, this.formato);
  }
}
