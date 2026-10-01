export interface PuntoSegmentado {
  orden: number;
  titulo: string;
  resultado: string | null;
  referencia: string | null;
}

export type MetodoSegmentacion =
  | 'extracte-acords'
  | 'extracte-resultats'
  | 'acta-numerada'
  | 'acta-guiones'
  | 'puntos-numerados'
  | 'punto-unico'
  | 'documento-unico';

export interface ResultadoSegmentacion {
  puntos: PuntoSegmentado[];
  metodo: MetodoSegmentacion;
  segmentacionPobre: boolean;
}

const RESULTADOS = new Set([
  'aprovat',
  'aprovada',
  'aprovada parcialment per punts',
  'assabentat',
  'assabentada',
  'rebutjat',
  'rebutjada',
  'retirat',
  'retirada',
  'acceptat',
  'acceptada',
  'desistit',
  'desistida',
  'aprobado',
  'aprobada',
  'rechazado',
  'rechazada',
]);

const RUIDO_ENCABEZADO =
  /^(?:codi de verificaci[oó]|procediment\s|expedient n[uú]m\.|sessi[oó]\s|data sessi[oó]|[aà]rea\s|unitat\s|p[aá]gina\s|\d+\/\d+$|document n[uú]m\.|extracte dels acords\b.*$)/i;

function esLineaRuido(linea: string): boolean {
  const t = linea.trim();
  if (t === '') return false;
  if (/^\d+\s*\/\s*\d+$/.test(t)) return true;
  if (/^codi de verificaci[oó]/i.test(t)) return true;
  if (/^F_[A-Z]+_\d+$/i.test(t)) return true;
  if (/^lloc de signatura/i.test(t)) return true;
  if (RUIDO_ENCABEZADO.test(t) && t === t.toUpperCase()) return true;
  return false;
}

function limpiarLineas(texto: string): string[] {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => !esLineaRuido(l));
}

function esReferencia(linea: string): boolean {
  return /^\((?:AJT|RES|DEC|SG|EXP)[/\.\s]/i.test(linea) && /\d/.test(linea);
}

function extraerResultado(linea: string): string | null | undefined {
  const m = linea.match(/^\(([^)]{2,60})\)$/);
  if (!m) {
    if (/^(APROVAT|ASSABENTAT|REBUTJAT)$/i.test(linea)) return linea.toUpperCase().toLowerCase();
    return undefined;
  }
  const interior = m[1].trim().toLowerCase();
  if (RESULTADOS.has(interior)) return interior;
  return undefined;
}

function unirTitulo(lineas: string[]): string {
  return lineas
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\-–—•]\s*/, '')
    .trim();
}

export function segmentarExtracteAcords(texto: string): ResultadoSegmentacion {
  const lineas = limpiarLineas(texto);
  const puntos: PuntoSegmentado[] = [];
  let esperado = 1;
  let i = 0;

  while (i < lineas.length) {
    const m = lineas[i].match(/^(\d{1,3})\.\s+(.+)$/);
    if (m && Number(m[1]) === esperado) {
      const tituloLineas: string[] = [m[2]];
      let j = i + 1;
      let referencia: string | null = null;
      let resultado: string | null = null;
      let vistoMeta = false;
      while (j < lineas.length && j - i < 12) {
        const siguiente = lineas[j];
        if (/^\d{1,3}\.\s+/.test(siguiente) && Number(siguiente.match(/^(\d{1,3})\./)![1]) === esperado + 1) break;
        if (siguiente === '') break;
        const res = extraerResultado(siguiente);
        if (res !== undefined) {
          resultado = res;
          vistoMeta = true;
          j++;
          continue;
        }
        if (esReferencia(siguiente)) {
          if (!referencia) referencia = siguiente.slice(1, -1);
          vistoMeta = true;
          j++;
          continue;
        }
        if (vistoMeta) break;
        if (siguiente.length >= 8 && siguiente === siguiente.toUpperCase()) {
          tituloLineas.push(siguiente);
          j++;
          continue;
        }
        break;
      }
      puntos.push({
        orden: esperado,
        titulo: unirTitulo(tituloLineas),
        resultado,
        referencia,
      });
      esperado++;
      i = j;
      continue;
    }
    i++;
  }

  if (puntos.length >= 3 && puntos.every((p, idx) => p.orden === idx + 1)) {
    return { puntos, metodo: 'extracte-acords', segmentacionPobre: false };
  }
  return { puntos, metodo: 'extracte-acords', segmentacionPobre: true };
}

const INICIO_PERSONA = /^(D\.|Dª|Dña|Doña|Don\b|Sr\.|Sra\.|Srta\.|Ilmo\.|Ilma\.)/;
const FIRMA_MAYUSCULAS = /^[A-ZÀ-Ü][A-ZÀ-Ü\s.]{6,}\([A-ZÀ-Ü\s]+\)/;
const ENCABEZADO_SECCION =
  /^(antecedents|antecedentes|normativa|consideracions|consideraciones|fonaments|fundamentos|informes?|conclusions?|conclusiones|disposicions?|disposiciones|altre\s|otros?\s)/i;

function esNumeroDePersona(titulo: string): boolean {
  const limpio = titulo.replace(/^[\-–—]\s*/, '');
  return INICIO_PERSONA.test(limpio) || FIRMA_MAYUSCULAS.test(limpio);
}

function mejorIntervalo(
  porNumero: Map<number, { idx: number; titulo: string }>,
): { inicio: number; fin: number } | null {
  let mejor: { inicio: number; fin: number } | null = null;
  for (const inicio of [1, 2]) {
    if (!porNumero.has(inicio)) continue;
    let fin = inicio;
    while (porNumero.has(fin + 1)) fin++;
    if (!mejor || fin - inicio > mejor.fin - mejor.inicio) mejor = { inicio, fin };
  }
  if (mejor && mejor.inicio === 1) {
    const c1 = porNumero.get(1)!;
    const c2 = porNumero.get(2);
    if (c2 && c1.idx > c2.idx) mejor = { inicio: 2, fin: mejor.fin };
  }
  return mejor;
}

function extenderTitulo(lines: string[], desde: number, limite = 6): string[] {
  const partes: string[] = [];
  for (let i = desde + 1; i < lines.length && partes.length < limite; i++) {
    const linea = lines[i];
    if (/^\d{1,3}\.(?!\d)\s*\S/.test(linea)) break;
    if (/^Expedient:/i.test(linea)) continue;
    if (
      linea === linea.toUpperCase() ||
      ENCABEZADO_SECCION.test(linea) ||
      /^(dades|assist|acta\b|certific|document|signatures)/i.test(linea) ||
      /^(favorable|desfavorable|abstenci|tipus de votaci|resultat|aprovat|rebutjat|unanimitat)/i.test(linea) ||
      linea.length > 200
    ) {
      break;
    }
    partes.push(linea);
  }
  return partes;
}

export function segmentarActaNumerada(texto: string): ResultadoSegmentacion {
  const lineas = limpiarLineas(texto);
  const porNumero = new Map<number, { idx: number; titulo: string }>();
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/^(\d{1,3})\.(?!\d)\s*(.+)$/);
    if (!m) continue;
    const titulo = m[2].trim();
    if (titulo.length < 10) continue;
    if (/^\d/.test(titulo)) continue;
    if (esNumeroDePersona(titulo)) continue;
    if (ENCABEZADO_SECCION.test(titulo)) continue;
    if (/^(p[aá]gina|p[aà]g\.)/i.test(titulo)) continue;
    const numero = Number(m[1]);
    if (numero < 1 || numero > 200) continue;
    if (!porNumero.has(numero)) porNumero.set(numero, { idx: i, titulo });
  }

  const intervalo = mejorIntervalo(porNumero);
  const esCorta = texto.length < 8000 && /extraordin/i.test(texto);
  const longitud = intervalo ? intervalo.fin - intervalo.inicio + 1 : 0;
  const aceptable = intervalo && (longitud >= 3 || (esCorta && longitud >= 2));

  if (!aceptable) {
    const c1 = porNumero.get(1);
    const c2 = porNumero.get(2);
    const saltoGrande = !c2 || c2.idx - (c1?.idx ?? 0) > 40;
    const esSesionSingular = /ordre del dia|sessi[oó]|ple\b/i.test(texto) && texto.length > 1500;
    if (c1 && saltoGrande && esSesionSingular) {
      const partes = [c1.titulo, ...extenderTitulo(lineas, c1.idx)];
      return {
        puntos: [
          {
            orden: 1,
            titulo: unirTitulo(partes).slice(0, 900),
            resultado: null,
            referencia: null,
          },
        ],
        metodo: 'acta-numerada',
        segmentacionPobre: false,
      };
    }
    return {
      puntos: [
        {
          orden: 1,
          titulo: lineas.slice(0, 3).join(' ').slice(0, 300),
          resultado: null,
          referencia: null,
        },
      ],
      metodo: 'acta-numerada',
      segmentacionPobre: true,
    };
  }

  const seleccionados = new Map<number, { idx: number; titulo: string }>();
  for (let n = intervalo!.inicio; n <= intervalo!.fin; n++) {
    seleccionados.set(n, porNumero.get(n)!);
  }
  const indicesSeleccionados = new Set([...seleccionados.values()].map((c) => c.idx));

  const puntos: PuntoSegmentado[] = [];
  for (let n = intervalo!.inicio; n <= intervalo!.fin; n++) {
    const actual = seleccionados.get(n)!;
    const tituloPartes: string[] = [actual.titulo];
    let enTitulo = true;
    for (let i = actual.idx + 1; i < lineas.length; i++) {
      const linea = lineas[i];
      if (indicesSeleccionados.has(i)) break;
      const sub = linea.match(/^(\d{1,3})\.[a-z]\)\s*(.+)$/i);
      if (sub && Number(sub[1]) === n) {
        tituloPartes.push(sub[2]);
        enTitulo = true;
        continue;
      }
      if (/^\d{1,3}\.(?!\d)\s*\S/.test(linea)) continue;
      if (enTitulo && linea.length >= 14 && linea === linea.toUpperCase() && !/^\d/.test(linea)) {
        tituloPartes.push(linea);
        continue;
      }
      enTitulo = false;
    }
    puntos.push({
      orden: n,
      titulo: unirTitulo(tituloPartes).slice(0, 900),
      resultado: null,
      referencia: null,
    });
  }

  return { puntos, metodo: 'acta-numerada', segmentacionPobre: false };
}

const RESULTADOS_TABLA = new Set([
  'aprovat',
  'aprovada',
  'aprovat per unanimitat',
  'en resten assabentats',
  'assabentat',
  'assabentada',
  'rebutjat',
  'rebutjada',
  'retirat',
  'retirada',
  'desistit',
  'acceptat',
  'acceptada',
  'aprobado',
  'aprobada',
  'rechazado',
  'rechazada',
  'no aprovat',
  'pendent',
]);

const RUIDO_TABLA =
  /^(expedient n[uú]m\.|codi de verificaci[oó]|actsextr|v\.\s*\d{4}\/\d{2}|assumptes tractats|resultat|extractes? del ple\b|extractos? del pleno\b)/i;

function esResultadoTabla(linea: string): string | null {
  const limpia = linea.trim().replace(/[.·]+$/, '').toLowerCase();
  return RESULTADOS_TABLA.has(limpia) ? limpia : null;
}

const RESULTADO_AL_FINAL = new RegExp(
  `^(.*\\S)\\s+(${[...RESULTADOS_TABLA].sort((a, b) => b.length - a.length).join('|')})\\s*[.·]*$`,
  'i',
);

function partirResultadoAlFinal(linea: string): { texto: string; resultado: string } | null {
  const m = linea.match(RESULTADO_AL_FINAL);
  if (!m) return null;
  return { texto: m[1].trim(), resultado: m[2].toLowerCase() };
}

export function segmentarExtractePerResultats(texto: string): ResultadoSegmentacion | null {
  const lineas = limpiarLineas(texto);
  const inicio = lineas.findIndex((l) => /assumptes tractats|resultat\b/i.test(l));
  if (inicio === -1) return null;

  const puntos: PuntoSegmentado[] = [];
  let acumulado: string[] = [];

  const cerrar = (resultado: string): void => {
    if (acumulado.length > 0) {
      const titulo = unirTitulo(acumulado);
      if (titulo.length >= 10) {
        puntos.push({
          orden: puntos.length + 1,
          titulo: titulo.slice(0, 600),
          resultado,
          referencia: null,
        });
      }
    }
    acumulado = [];
  };

  for (let i = inicio + 1; i < lineas.length; i++) {
    const linea = lineas[i];
    if (RUIDO_TABLA.test(linea)) continue;
    const alFinal = partirResultadoAlFinal(linea);
    if (alFinal) {
      if (alFinal.texto.length > 0) acumulado.push(alFinal.texto);
      cerrar(alFinal.resultado);
      continue;
    }
    const resultado = esResultadoTabla(linea);
    if (resultado) {
      cerrar(resultado);
      continue;
    }
    acumulado.push(linea);
  }

  if (puntos.length >= 3) {
    return { puntos, metodo: 'extracte-resultats', segmentacionPobre: false };
  }
  return null;
}

const PATRON_GUION = /^(\d{1,3})\.\s*[-–—]\s+(.+)$/;

export function segmentarActaConGuiones(texto: string): ResultadoSegmentacion | null {
  const lineas = limpiarLineas(texto);
  const porNumero = new Map<number, { idx: number; titulo: string }>();
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(PATRON_GUION);
    if (!m) continue;
    const numero = Number(m[1]);
    if (numero < 1 || numero > 200) continue;
    const titulo = m[2].trim();
    if (titulo.length < 10 || esNumeroDePersona(titulo)) continue;
    if (ENCABEZADO_SECCION.test(titulo)) continue;
    if (!porNumero.has(numero)) porNumero.set(numero, { idx: i, titulo });
  }

  const c1 = porNumero.get(1);
  const c2 = porNumero.get(2);
  const inicio = c2 && (!c1 || c1.idx > c2.idx) ? 2 : 1;

  const run: { numero: number; idx: number; titulo: string }[] = [];
  let ultimoIdx = -1;
  for (let n = inicio; porNumero.has(n); n++) {
    const c = porNumero.get(n)!;
    if (c.idx < ultimoIdx) break;
    run.push({ numero: n, ...c });
    ultimoIdx = c.idx;
  }

  if (run.length === 1 && run[0].numero === 1) {
    const pareceCertificado = /acord adoptat|acuerdo adoptado|sessi[oó]\s+extraordin/i.test(texto);
    if (pareceCertificado && texto.length < 5000) {
      return {
        puntos: [
          {
            orden: 1,
            titulo: unirTitulo([run[0].titulo]).slice(0, 600),
            resultado: null,
            referencia: null,
          },
        ],
        metodo: 'acta-guiones',
        segmentacionPobre: false,
      };
    }
    return null;
  }

  const esCorta = texto.length < 8000 && /extraordin/i.test(texto);
  if (run.length < 3 && !(esCorta && run.length >= 2)) return null;

  const puntos = run.map((actual) => {
    const partes = [actual.titulo];
    for (let i = actual.idx + 1; i < Math.min(actual.idx + 6, lineas.length); i++) {
      const linea = lineas[i];
      if (PATRON_GUION.test(linea) || /^\d{1,3}\.\s+\S/.test(linea)) break;
      if (linea.length >= 14 && linea === linea.toUpperCase() && !/^\d/.test(linea)) {
        partes.push(linea);
        continue;
      }
      break;
    }
    return {
      orden: actual.numero,
      titulo: unirTitulo(partes).slice(0, 900),
      resultado: null,
      referencia: null,
    };
  });
  return { puntos, metodo: 'acta-guiones', segmentacionPobre: false };
}

const PATRON_PUNTO = /^Punto\s+(\d{1,3})\.\s*(.+)$/i;
const RUIDO_PAGINA = /^(ACUERDOS ADOPTADOS|Secretaría General|Pleno sesión \()/i;
const CABECERA_SECCION = /^(§|\(Subapartado|Preguntas$|Mociones$|Declaraciones|Interpelaciones|Ruegos)/i;

export function segmentarPuntos(texto: string): ResultadoSegmentacion | null {
  const lineas = limpiarLineas(texto);
  const porNumero = new Map<number, { idx: number; titulo: string }>();
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(PATRON_PUNTO);
    if (!m) continue;
    const numero = Number(m[1]);
    if (numero < 1 || numero > 400) continue;
    if (!porNumero.has(numero)) porNumero.set(numero, { idx: i, titulo: m[2].trim() });
  }

  let fin = 0;
  while (porNumero.has(fin + 1)) fin++;
  if (fin < 3) return null;

  const puntos: PuntoSegmentado[] = [];
  for (let n = 1; n <= fin; n++) {
    const actual = porNumero.get(n)!;
    const siguiente = porNumero.get(n + 1);
    const limite = siguiente ? siguiente.idx : lineas.length;
    const partes = [actual.titulo];
    let longitud = actual.titulo.length;
    for (let i = actual.idx + 1; i < limite && longitud < 900; i++) {
      const linea = lineas[i];
      if (RUIDO_PAGINA.test(linea)) continue;
      if (CABECERA_SECCION.test(linea)) break;
      partes.push(linea);
      longitud += linea.length + 1;
    }
    puntos.push({
      orden: n,
      titulo: unirTitulo(partes).slice(0, 900),
      resultado: null,
      referencia: null,
    });
  }

  return { puntos, metodo: 'puntos-numerados', segmentacionPobre: false };
}

export function segmentarPuntoUnico(texto: string): ResultadoSegmentacion | null {
  if (texto.length > 120000) return null;
  const lineas = limpiarLineas(texto);
  const idx = lineas.findIndex((l, i) => i < 120 && /^[ÚU]nic\.\s*[-–—]\s+\S/i.test(l));
  if (idx === -1) return null;
  const m = lineas[idx].match(/^[ÚU]nic\.\s*[-–—]\s+(.+)$/i)!;
  const partes = [m[1].trim()];
  for (let i = idx + 1; i < Math.min(idx + 8, lineas.length); i++) {
    const linea = lineas[i];
    if (linea.length >= 8 && linea === linea.toUpperCase() && !/^\d/.test(linea)) {
      partes.push(linea);
      continue;
    }
    break;
  }
  const titulo = unirTitulo(partes).slice(0, 900);
  if (titulo.length < 15) return null;
  return {
    puntos: [{ orden: 1, titulo, resultado: null, referencia: null }],
    metodo: 'punto-unico',
    segmentacionPobre: false,
  };
}

export function segmentarEpigrafeUnico(texto: string): ResultadoSegmentacion | null {
  if (texto.length > 12000) return null;
  if (!/sessi[oó]|ple\b|extraordin/i.test(texto)) return null;
  const lineas = limpiarLineas(texto);
  const epigrafes = lineas.filter((l) =>
    /^[A-ZÀ-Ü0-9][A-ZÀ-Ü0-9 ,.'’()\-]{7,}?\.\-\s*$/.test(l),
  );
  if (epigrafes.length !== 1) return null;
  const titulo = epigrafes[0].replace(/\.\-\s*$/, '').trim();
  return {
    puntos: [{ orden: 1, titulo: titulo.slice(0, 300), resultado: null, referencia: null }],
    metodo: 'punto-unico',
    segmentacionPobre: false,
  };
}

function tituloRespaldo(lineas: string[]): string {
  const actaPle = lineas.find((l) => /^que el ple\b/i.test(l) && l.length > 20);
  if (actaPle) return actaPle.slice(0, 300);
  const epigrafe = lineas
    .slice(0, 120)
    .find((l) => /^[A-ZÀ-Ü0-9][A-ZÀ-Ü0-9 ,.'’()\-]{7,}?\.\-\s*$/.test(l));
  if (epigrafe) return epigrafe.replace(/\.\-\s*$/, '').slice(0, 300);
  const numerada = lineas.find((l) => {
    const m = l.match(/^\d{1,3}\.\s*(.+)$/);
    if (!m) return false;
    const titulo = m[1].trim();
    return titulo.length >= 12 && !esNumeroDePersona(titulo) && !ENCABEZADO_SECCION.test(titulo);
  });
  return (numerada ?? lineas.slice(0, 3).join(' ')).slice(0, 300);
}

export function segmentar(texto: string, formato?: string): ResultadoSegmentacion {
  const esExtracte =
    formato === 'extracte-acords' ||
    /extracte dels acords|extractes? del ple|extractos? del pleno/i.test(texto.slice(0, 2000));

  if (esExtracte) {
    const extracte = segmentarExtracteAcords(texto);
    if (!extracte.segmentacionPobre) return extracte;
    const conGuiones = segmentarActaConGuiones(texto);
    if (conGuiones) return conGuiones;
    const porResultados = segmentarExtractePerResultats(texto);
    if (porResultados) return porResultados;
  } else {
    const puntos = segmentarPuntos(texto);
    if (puntos) return puntos;
    const numerada = segmentarActaNumerada(texto);
    if (!numerada.segmentacionPobre) return numerada;
    const conGuiones = segmentarActaConGuiones(texto);
    if (conGuiones) return conGuiones;
    const porResultados = segmentarExtractePerResultats(texto);
    if (porResultados) return porResultados;
    const unico = segmentarPuntoUnico(texto);
    if (unico) return unico;
    const epigrafe = segmentarEpigrafeUnico(texto);
    if (epigrafe) return epigrafe;
  }

  return {
    puntos: [
      {
        orden: 1,
        titulo: tituloRespaldo(limpiarLineas(texto)),
        resultado: null,
        referencia: null,
      },
    ],
    metodo: 'documento-unico',
    segmentacionPobre: true,
  };
}
