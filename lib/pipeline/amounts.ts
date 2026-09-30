const PATRON_MILLONES =
  /(\d+(?:[.,]\d+)?)\s*(millones|milions|mil)\s+(?:de\s+)?(?:euros?|€)/gi;

const PATRON_EURO = /(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+)\s*(?:€|euros?\b)/gi;

export function normalizarNumeroEspanol(crudo: string): number | null {
  let s = crudo.trim();
  if (s === '') return null;
  const tienePunto = s.includes('.');
  const tieneComa = s.includes(',');

  if (tienePunto && tieneComa) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (tieneComa) {
    s = s.replace(',', '.');
  } else if (tienePunto) {
    const partes = s.split('.');
    const ultima = partes.at(-1)!;
    if (ultima.length === 3 && partes.length > 1) {
      s = s.replace(/\./g, '');
    } else if (ultima.length > 3) {
      return null;
    }
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function extraerImportes(texto: string): number[] {
  const importes: number[] = [];
  for (const m of texto.matchAll(PATRON_MILLONES)) {
    const valor = normalizarNumeroEspanol(m[1]);
    if (valor === null) continue;
    const unidad = m[2].toLowerCase();
    const factor = unidad === 'mil' ? 1e3 : 1e6;
    importes.push(valor * factor);
  }
  for (const m of texto.matchAll(PATRON_EURO)) {
    const valor = normalizarNumeroEspanol(m[1]);
    if (valor === null) continue;
    if (importes.includes(valor)) continue;
    importes.push(valor);
  }
  return importes;
}

export function importePrincipal(texto: string): number | null {
  const importes = extraerImportes(texto);
  if (importes.length === 0) return null;
  return Math.max(...importes);
}
