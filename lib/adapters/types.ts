import type { PuntoSegmentado } from '@/lib/pipeline/segment';
import type { MetodoSegmentacion } from '@/lib/pipeline/segment';
import type { TipoSesion } from '@/lib/schemas';

export interface ReferenciaSesion {
  id: string;
  fecha: string;
  tipo: TipoSesion;
  urlDocumento: string;
  metadata?: Record<string, string>;
}

export interface ContenidoSesion {
  referencia: ReferenciaSesion;
  buffer: Uint8Array;
  contentType: string | null;
  urlFinal: string;
}

export interface DocumentoParseado {
  texto: string;
  paginas: number;
  puntos: PuntoSegmentado[];
  metodoSegmentacion: MetodoSegmentacion;
  segmentacionPobre: boolean;
  requiereOcr: boolean;
}

export interface SourceAdapter {
  nombre: string;
  discover(): Promise<ReferenciaSesion[]>;
  fetch(referencia: ReferenciaSesion, bufferLocal?: Uint8Array): Promise<ContenidoSesion>;
  parse(contenido: ContenidoSesion): Promise<DocumentoParseado>;
}

export function tipoDesdeTexto(crudo: string): TipoSesion {
  const t = crudo.toLowerCase();
  if (t.includes('urgent')) return 'extraordinaria_urgente';
  if (t.includes('extraordinar')) return 'extraordinaria';
  if (t.includes('ordin')) return 'ordinaria';
  return 'otra';
}
