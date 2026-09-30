import { extractText, getDocumentProxy, getMeta } from 'unpdf';

export interface TextoPdf {
  texto: string;
  paginas: number;
  titulo: string | null;
  requiereOcr: boolean;
}

export function normalizarTexto(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extraerTextoPdf(buffer: Uint8Array): Promise<TextoPdf> {
  const pdf = await getDocumentProxy(buffer);
  const meta = await getMeta(pdf).catch(() => null);
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  const texto = normalizarTexto(text);
  const titulo = (meta?.info as { Title?: string } | undefined)?.Title?.trim() || null;
  return {
    texto,
    paginas: totalPages,
    titulo,
    requiereOcr: totalPages > 0 && texto.length < 200,
  };
}
