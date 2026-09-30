export interface ReglasRobots {
  reglas: { permitido: boolean; patron: string }[];
  crawlDelaySegundos: number | null;
}

export function parsearRobots(texto: string, userAgent: string): ReglasRobots {
  const token = userAgent.toLowerCase().split(/[\s/]/)[0] ?? '';
  const grupos: { agentes: string[]; reglas: ReglasRobots['reglas']; crawlDelay: number | null }[] = [];
  let actual: (typeof grupos)[number] | null = null;
  let leyendoAgentes = false;

  for (const lineaCruda of texto.split(/\r?\n/)) {
    const linea = lineaCruda.replace(/#.*$/, '').trim();
    if (!linea) continue;
    const sep = linea.indexOf(':');
    if (sep === -1) continue;
    const campo = linea.slice(0, sep).trim().toLowerCase();
    const valor = linea.slice(sep + 1).trim();

    if (campo === 'user-agent') {
      if (!leyendoAgentes || !actual) {
        actual = { agentes: [], reglas: [], crawlDelay: null };
        grupos.push(actual);
      }
      actual.agentes.push(valor.toLowerCase());
      leyendoAgentes = true;
      continue;
    }

    if (!actual) continue;
    leyendoAgentes = false;

    if (campo === 'disallow' || campo === 'allow') {
      if (valor === '' && campo === 'disallow') continue;
      actual.reglas.push({ permitido: campo === 'allow', patron: valor });
    } else if (campo === 'crawl-delay') {
      const n = Number.parseFloat(valor);
      if (Number.isFinite(n) && n >= 0) actual.crawlDelay = n;
    }
  }

  const especificos = grupos.filter((g) =>
    g.agentes.some((a) => a !== '*' && (token.startsWith(a) || a === token)),
  );
  const generales = grupos.filter((g) => g.agentes.includes('*'));
  const elegidos = especificos.length > 0 ? especificos : generales;

  const reglas = elegidos.flatMap((g) => g.reglas);
  const delays = elegidos
    .map((g) => g.crawlDelay)
    .filter((d): d is number => d !== null);
  return {
    reglas,
    crawlDelaySegundos: delays.length > 0 ? Math.max(...delays) : null,
  };
}

function patronARegex(patron: string): RegExp {
  const ancladoFin = patron.endsWith('$');
  const cuerpo = ancladoFin ? patron.slice(0, -1) : patron;
  const escapado = cuerpo.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escapado}${ancladoFin ? '$' : ''}`);
}

export function rutaPermitida(reglas: ReglasRobots, ruta: string): boolean {
  let mejor: { permitido: boolean; longitud: number } | null = null;
  for (const regla of reglas.reglas) {
    if (regla.patron === '') continue;
    const re = patronARegex(regla.patron);
    if (re.test(ruta)) {
      const longitud = regla.patron.replace(/[*$]/g, '').length;
      if (!mejor || longitud > mejor.longitud || (longitud === mejor.longitud && regla.permitido)) {
        mejor = { permitido: regla.permitido, longitud };
      }
    }
  }
  return mejor ? mejor.permitido : true;
}
