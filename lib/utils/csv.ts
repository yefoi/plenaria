export function parsearCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }
    if (c === '"') {
      entreComillas = true;
    } else if (c === ',') {
      fila.push(campo);
      campo = '';
    } else if (c === '\n') {
      fila.push(campo.replace(/\r$/, ''));
      filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo !== '' || fila.length > 0) {
    fila.push(campo.replace(/\r$/, ''));
    filas.push(fila);
  }
  return filas;
}

export function csvAFilasObjeto(texto: string): Record<string, string>[] {
  const filas = parsearCsv(texto);
  if (filas.length === 0) return [];
  const cabecera = filas[0].map((h) => h.replace(/^\uFEFF/, '').trim());
  const objetos: Record<string, string>[] = [];
  for (let i = 1; i < filas.length; i++) {
    const fila = filas[i];
    if (fila.length === 1 && fila[0] === '') continue;
    const obj: Record<string, string> = {};
    cabecera.forEach((nombre, idx) => {
      obj[nombre] = fila[idx] ?? '';
    });
    objetos.push(obj);
  }
  return objetos;
}
