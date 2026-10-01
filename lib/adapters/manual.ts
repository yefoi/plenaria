import { parsearDocumento } from '@/lib/adapters/parse';
import type {
  ContenidoSesion,
  DocumentoParseado,
  ReferenciaSesion,
  SourceAdapter,
} from '@/lib/adapters/types';
import { hashCorto } from '@/lib/utils/hash';

export class ManualAdapter implements SourceAdapter {
  nombre = 'manual';
  private readonly entradas = new Map<string, { referencia: ReferenciaSesion; buffer: Uint8Array }>();

  constructor(private readonly formato: string = 'auto') {}

  agregar(referencia: Omit<ReferenciaSesion, 'id'>, buffer: Uint8Array): ReferenciaSesion {
    const completa: ReferenciaSesion = { ...referencia, id: hashCorto(buffer) };
    this.entradas.set(completa.id, { referencia: completa, buffer });
    return completa;
  }

  async discover(): Promise<ReferenciaSesion[]> {
    return [...this.entradas.values()].map((e) => e.referencia);
  }

  async fetch(referencia: ReferenciaSesion, bufferLocal?: Uint8Array): Promise<ContenidoSesion> {
    const entrada = this.entradas.get(referencia.id);
    const buffer = bufferLocal ?? entrada?.buffer;
    if (!buffer) throw new Error(`El adaptador manual no tiene contenido para ${referencia.id}`);
    return {
      referencia,
      buffer,
      contentType: 'application/pdf',
      urlFinal: referencia.urlDocumento,
    };
  }

  async parse(contenido: ContenidoSesion): Promise<DocumentoParseado> {
    return parsearDocumento(contenido.buffer, this.formato);
  }
}
