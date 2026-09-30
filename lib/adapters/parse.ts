import { extraerTextoPdf } from '@/lib/pdf/extract';
import { segmentar } from '@/lib/pipeline/segment';
import type { DocumentoParseado } from '@/lib/adapters/types';

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
