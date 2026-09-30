interface CategoriaSensible {
  id: string;
  tituloGenerico: string;
  patron: RegExp;
}

const CATEGORIAS: CategoriaSensible[] = [
  {
    id: 'sanciones',
    tituloGenerico: 'Punto sancionador',
    patron:
      /\b(sanci[oó]|sanci[oó]ns|sanciones|expedient sancionador|infracci[oó]|infraccions|infracci[oó]n)\b/i,
  },
  {
    id: 'ayudas_individuales',
    tituloGenerico: 'Ayuda individual',
    patron: /\b(ajut individual|ajuda individual|ajuts individuals|ayuda individual|ayudas individuales)\b/i,
  },
  {
    id: 'expropiaciones',
    tituloGenerico: 'Punto de expropiación',
    patron: /\bexpropia/i,
  },
  {
    id: 'responsabilidad_patrimonial',
    tituloGenerico: 'Punto de responsabilidad patrimonial',
    patron: /\bresponsabilitat patrimonial\b|\bresponsabilidad patrimonial\b/i,
  },
  {
    id: 'menores',
    tituloGenerico: 'Punto sobre menores',
    patron: /\b(menor d'edat|menors d'edat|menor de edad|menores de edad)\b/i,
  },
  {
    id: 'servicios_sociales',
    tituloGenerico: 'Punto de servicios sociales',
    patron: /\b(serveis socials|servicios sociales|servei social|ajuts d'urg[eè]ncia|emerg[eè]ncia social)\b/i,
  },
  {
    id: 'personal',
    tituloGenerico: 'Punto de personal',
    patron:
      /\b(compatibilitat|nomenament|cessament|personal eventual|personal funcionari|personal laboral|plantilla de personal|relaci[oó] de llocs de treball|RLLT|funcionari|funcionària|funcionario|funcionaria|retribucions|retribuciones)\b/i,
  },
];

export function esSensible(titulo: string, texto = ''): boolean {
  return categorizarSensible(titulo, texto) !== null;
}

export function categorizarSensible(titulo: string, texto = ''): CategoriaSensible | null {
  const contenido = `${titulo}\n${texto}`;
  for (const categoria of CATEGORIAS) {
    if (categoria.patron.test(contenido)) return categoria;
  }
  return null;
}

export function tituloGenericoSensible(titulo: string, texto = ''): string {
  return categorizarSensible(titulo, texto)?.tituloGenerico ?? 'Punto reservado';
}
