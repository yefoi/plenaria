import mammoth from 'mammoth';
import { extraerTextoPdf, normalizarTexto } from '@/lib/pdf/extract';
import { segmentar } from '@/lib/pipeline/segment';
import type { DocumentoParseado } from '@/lib/adapters/types';

function esZip(buffer: Uint8Array): boolean {
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

export async function parsearDocumentoWord(buffer: Uint8Array, formato: string): Promise<DocumentoParseado> {
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  const texto = normalizarTexto(value);
  const segmentacion = segmentar(texto, formato);
  return {
    texto,
    paginas: 0,
    puntos: segmentacion.puntos,
    metodoSegmentacion: segmentacion.metodo,
    segmentacionPobre: segmentacion.segmentacionPobre,
    requiereOcr: texto.length < 200,
  };
}

export async function parsearDocumentoPdf(buffer: Uint8Array, formato: string): Promise<DocumentoParseado> {
  const pdf = await extraerTextoPdf(buffer);
  if (pdf.requiereOcr) {
    return {
      texto: '',
      paginas: pdf.paginas,
      puntos: [],
      metodoSegmentacion: 'documento-unico',
      segmentacionPobre: true,
      requiereOcr: true,
    };
  }
  const segmentacion = segmentar(pdf.texto, formato);
  return {
    texto: pdf.texto,
    paginas: pdf.paginas,
    puntos: segmentacion.puntos,
    metodoSegmentacion: segmentacion.metodo,
    segmentacionPobre: segmentacion.segmentacionPobre,
    requiereOcr: false,
  };
}

export async function parsearDocumento(buffer: Uint8Array, formato: string): Promise<DocumentoParseado> {
  if (esZip(buffer)) {
    try {
      return await parsearDocumentoWord(buffer, formato);
    } catch {
      // Si no es un .docx válido, se intenta como PDF para dar un error coherente.
    }
  }
  return parsearDocumentoPdf(buffer, formato);
}
