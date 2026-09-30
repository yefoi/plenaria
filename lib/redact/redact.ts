export interface ResultadoRedaccion {
  texto: string;
  reemplazos: Record<string, number>;
}

interface Regla {
  tipo: string;
  patron: RegExp;
  marcador: string;
}

const ROLES_PUBLICOS =
  /\b(alcalde|alcaldesa|alcaldia|alcaldía|president|presidenta|regidor|regidora|secretari|secretaria|secretària|interventor|interventora|s[íi]ndic|s[íi]ndica|tinent|tinenta|portaveu|batlle|concejal|concejala|diputat|diputada|delegat|delegada)\b/i;

const REGLAS: Regla[] = [
  {
    tipo: 'email',
    patron: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    marcador: '[EMAIL]',
  },
  {
    tipo: 'iban',
    patron: /\b(?:ES|FR|DE|PT|IT|AD|GB|NL|LU|BE|CH|AT|IE)\d{2}(?:[ -]?[A-Z0-9]{4}){2,7}(?:[ -]?[A-Z0-9]{1,4})?\b/g,
    marcador: '[IBAN]',
  },
  {
    tipo: 'nie',
    patron: /\b[XYZ][ -]?\d{7}[ -]?[A-Za-z]\b/g,
    marcador: '[NIE]',
  },
  {
    tipo: 'dni',
    patron: /\b\d{8}[ -]?[A-Za-z]\b/g,
    marcador: '[DNI]',
  },
  {
    tipo: 'cif',
    patron: /\b[ABCDEFGHJNPQRSUVW][ -]?\d{7}[ -]?[0-9A-J]\b/g,
    marcador: '[CIF]',
  },
  {
    tipo: 'telefono',
    patron:
      /\b(?:\+34[ .-]?)?(?:[6789]\d{2}[ .-]?\d{2}[ .-]?\d{2}[ .-]?\d{2}|[6789]\d{2}[ .-]?\d{3}[ .-]?\d{3})\b/g,
    marcador: '[TELÉFONO]',
  },
  {
    tipo: 'matricula',
    patron: /\b\d{4}[ -]?[BCDFGHJKLMNPRSTVWXYZ]{3}\b/g,
    marcador: '[MATRÍCULA]',
  },
  {
    tipo: 'matricula',
    patron: /\b[A-Z]{1,2}[ -]?\d{4}[ -]?[A-Z]{1,2}\b/g,
    marcador: '[MATRÍCULA]',
  },
  {
    tipo: 'direccion',
    patron:
      /\b(?:carrer|calle|c\/|avinguda|avenida|avda\.?|plaça|plaza|passeig|paseo|carretera|ctra\.?|camí|camino|ronda|travessia|travesía)\s+(?:\p{L}+['’\-]?\s*){1,6},?\s*(?:n[úu]m\.?\s*)?\d{1,4}\b/giu,
    marcador: '[DIRECCIÓN]',
  },
];

const HONORIFICOS = /\b(Sr|Sra|Srta|Senyor|Senyora|SENYOR|SENYORA|Don|Doña|Dª|D)\.?\s+/gu;

const CONECTORES = new Set([
  'i', 'y', 'e', 'de', 'del', 'dels', 'de la', 'de les', 'la', 'les', 'el', 'els', 'van', 'von', 'da', 'dos', 'das',
]);

const ES_HONORIFICO = /^(?:Sr|Sra|Srta|Senyor|Senyora|Don|Doña|D|Dª)\.?$/i;
const ES_INICIAL = /^\p{Lu}\.$/u;
const ES_PALABRA_NOMBRE = /^\p{Lu}[\p{Ll}'’\-]*\.?$/u;

interface CoincidenciaNombre {
  inicio: number;
  trasHonorifico: number;
  longitudNombre: number;
}

function limpiarToken(token: string): string {
  return token.replace(/[^\p{L}'’\-\.]+$/u, '');
}

function longitudNombre(resto: string): number {
  const tokens = [...resto.matchAll(/\S+/g)];
  if (tokens.length === 0) return 0;

  let iniciales = 0;
  let finIniciales = 0;
  for (const t of tokens) {
    const limpio = limpiarToken(t[0]);
    if (!ES_INICIAL.test(limpio)) break;
    iniciales++;
    finIniciales = (t.index ?? 0) + limpio.length;
  }
  if (iniciales >= 2) return finIniciales;

  let palabrasNombre = 0;
  let finUltimo = 0;
  let anteriorFueNombre = false;
  for (const t of tokens) {
    const limpio = limpiarToken(t[0]);
    if (ES_HONORIFICO.test(limpio)) break;
    if (ES_PALABRA_NOMBRE.test(limpio) || (ES_INICIAL.test(limpio) && anteriorFueNombre)) {
      palabrasNombre++;
      finUltimo = (t.index ?? 0) + limpio.length;
      anteriorFueNombre = true;
      continue;
    }
    if (CONECTORES.has(limpio.toLowerCase())) {
      anteriorFueNombre = false;
      continue;
    }
    break;
  }
  if (palabrasNombre < 2) return 0;
  return finUltimo;
}

function buscarNombres(texto: string): CoincidenciaNombre[] {
  const encontrados: CoincidenciaNombre[] = [];
  for (const m of texto.matchAll(HONORIFICOS)) {
    const inicio = m.index ?? 0;
    const trasHonorifico = inicio + m[0].length;
    const resto = texto.slice(trasHonorifico);
    const longitud = longitudNombre(resto);
    if (longitud === 0) continue;
    const candidato = resto.slice(0, longitud);
    if (ROLES_PUBLICOS.test(candidato)) continue;
    encontrados.push({ inicio, trasHonorifico, longitudNombre: longitud });
  }
  return encontrados;
}

function reglaNombres(texto: string, contadores: Record<string, number>): string {
  const coincidencias = buscarNombres(texto);
  let resultado = '';
  let ultimo = 0;
  for (const c of coincidencias) {
    if (c.inicio < ultimo) continue;
    resultado += texto.slice(ultimo, c.trasHonorifico) + '[NOMBRE]';
    ultimo = c.trasHonorifico + c.longitudNombre;
    contadores.nombre = (contadores.nombre ?? 0) + 1;
  }
  resultado += texto.slice(ultimo);
  return resultado;
}

export function redactar(texto: string): ResultadoRedaccion {
  const contadores: Record<string, number> = {};
  let t = texto;
  for (const regla of REGLAS) {
    t = t.replace(regla.patron, () => {
      contadores[regla.tipo] = (contadores[regla.tipo] ?? 0) + 1;
      return regla.marcador;
    });
  }
  t = reglaNombres(t, contadores);
  return { texto: t, reemplazos: contadores };
}

export const MARCADORES = [
  '[EMAIL]',
  '[IBAN]',
  '[NIE]',
  '[DNI]',
  '[CIF]',
  '[TELÉFONO]',
  '[MATRÍCULA]',
  '[DIRECCIÓN]',
  '[NOMBRE]',
] as const;

export function contienePosibleDatoPersonal(texto: string): string[] {
  const encontrados: string[] = [];
  for (const regla of REGLAS) {
    const re = new RegExp(regla.patron.source, regla.patron.flags);
    if (re.test(texto)) encontrados.push(regla.tipo);
  }
  if (buscarNombres(texto).length > 0) {
    encontrados.push('nombre');
  }
  return [...new Set(encontrados)];
}
