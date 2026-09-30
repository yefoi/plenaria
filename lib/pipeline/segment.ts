export interface PuntoSegmentado {
  orden: number;
  titulo: string;
  resultado: string | null;
  referencia: string | null;
}

export type MetodoSegmentacion = 'extracte-acords' | 'acta-numerada' | 'documento-unico';

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
    .replace(/^[\-•]\s*/, '')
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

function esNumeroDePersona(titulo: string): boolean {
  return INICIO_PERSONA.test(titulo);
}

export function segmentarActaNumerada(texto: string): ResultadoSegmentacion {
  const lineas = limpiarLineas(texto);

  interface Candidato {
    idx: number;
    numero: number;
    titulo: string;
  }
  const candidatos: Candidato[] = [];
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/^(\d{1,3})\.\s*(.+)$/);
    if (!m) continue;
    const titulo = m[2].trim();
    if (titulo.length < 10) continue;
    if (esNumeroDePersona(titulo)) continue;
    if (/^(p[aá]gina|p[aà]g\.)/i.test(titulo)) continue;
    candidatos.push({ idx: i, numero: Number(m[1]), titulo });
  }

  let mejorRun: Candidato[] = [];
  for (let k = 0; k < candidatos.length; k++) {
    if (candidatos[k].numero !== 1) continue;
    const run: Candidato[] = [candidatos[k]];
    for (let j = k + 1; j < candidatos.length; j++) {
      if (candidatos[j].numero === run.at(-1)!.numero + 1) run.push(candidatos[j]);
    }
    if (run.length > mejorRun.length) mejorRun = run;
  }

  if (mejorRun.length < 3) {
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

  const indicesSeleccionados = new Map(mejorRun.map((c) => [c.idx, c]));
  const puntos: PuntoSegmentado[] = [];
  for (let k = 0; k < mejorRun.length; k++) {
    const actual = mejorRun[k];
    const fin = k + 1 < mejorRun.length ? mejorRun[k + 1].idx : lineas.length;
    const tituloPartes: string[] = [actual.titulo];
    let enTitulo = true;
    for (let i = actual.idx + 1; i < fin; i++) {
      const linea = lineas[i];
      if (indicesSeleccionados.has(i)) break;
      const sub = linea.match(/^(\d{1,3})\.[a-z]\)\s*(.+)$/i);
      if (sub && Number(sub[1]) === actual.numero) {
        tituloPartes.push(sub[2]);
        enTitulo = true;
        continue;
      }
      if (enTitulo && linea.length >= 14 && linea === linea.toUpperCase() && !/^\d/.test(linea)) {
        tituloPartes.push(linea);
        continue;
      }
      enTitulo = false;
    }
    puntos.push({
      orden: actual.numero,
      titulo: unirTitulo(tituloPartes).slice(0, 900),
      resultado: null,
      referencia: null,
    });
  }

  const consecutivos = puntos.every((p, idx) => p.orden === idx + 1);
  if (puntos.length >= 3 && consecutivos) {
    return { puntos, metodo: 'acta-numerada', segmentacionPobre: false };
  }
  return { puntos, metodo: 'acta-numerada', segmentacionPobre: true };
}

export function segmentar(texto: string, formato?: string): ResultadoSegmentacion {
  if (formato === 'extracte-acords' || /extracte dels acords/i.test(texto.slice(0, 2000))) {
    const r = segmentarExtracteAcords(texto);
    if (!r.segmentacionPobre) return r;
    const alt = segmentarActaNumerada(texto);
    if (!alt.segmentacionPobre) return alt;
    return {
      puntos: [{ orden: 1, titulo: texto.split('\n').slice(0, 3).join(' ').slice(0, 300), resultado: null, referencia: null }],
      metodo: 'documento-unico',
      segmentacionPobre: true,
    };
  }
  const r = segmentarActaNumerada(texto);
  if (!r.segmentacionPobre) return r;
  return {
    puntos: [{ orden: 1, titulo: texto.split('\n').slice(0, 3).join(' ').slice(0, 300), resultado: null, referencia: null }],
    metodo: 'documento-unico',
    segmentacionPobre: true,
  };
}
