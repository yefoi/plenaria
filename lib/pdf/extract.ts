import { extractText, getDocumentProxy, getMeta } from 'unpdf';

export interface TextoPdf {
  texto: string;
  paginas: number;
  titulo: string | null;
  requiereOcr: boolean;
}

const MAPA_MOJIBAKE: Record<string, string> = {
  '!': ' ',
  'Û': 'ó',
  'Ë': 'è',
  '‡': 'à',
  'Ú': 'ò',
  '∑': '·',
  'Ä': '€',
  'Õ': 'í',
  '˙': 'ú',
  'Ì': 'í',
  '”': 'Ó',
  '“': 'Ò',
};

export function repararMojibake(texto: string): string {
  const marcas = (texto.match(/[ÛË‡∑ÄÕ˙Ì“”]/g) ?? []).length;
  const exclamaciones = (texto.match(/[A-Za-zÀ-ÿ]![A-Za-zÀ-ÿ]/g) ?? []).length;
  if (marcas < 3 && exclamaciones < 10) return texto;
  return texto.replace(/[!ÛË‡Ú∑ÄÕ˙Ì“”]/g, (c) => MAPA_MOJIBAKE[c] ?? c);
}

export function pareceTextoInutilizable(texto: string): boolean {
  if (texto.length < 200) return true;
  const utiles = (texto.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9 .,;:!?'"()\[\]{}\-\/&%€\n\t]/gu) ?? []).length;
  return utiles / texto.length < 0.6;
}

export function normalizarTexto(raw: string): string {
  const limpio = repararMojibake(raw);
  return limpio
    .replace(/\uf0b7/g, '•')
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
    requiereOcr: totalPages > 0 && (texto.length < 200 || pareceTextoInutilizable(texto)),
  };
}
