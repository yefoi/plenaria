import mapa from '@/lib/mapa/espana.json';

export interface ProvinciaMapa {
  id: string;
  nombre: string;
  d: string;
  bbox: number[];
}

export interface PinMapa {
  municipio_id: string;
  nombre: string;
  provincia_id: string;
  x: number;
  y: number;
}

export const PROVINCIAS_MAPA = mapa.provincias as ProvinciaMapa[];
export const PINES_MAPA = mapa.pines as PinMapa[];

export interface GrupoPines {
  x: number;
  y: number;
  provincia_id: string;
  pines: PinMapa[];
}

export function agruparPines(pines: PinMapa[], umbral: number, provinciaFiltro: string | null): GrupoPines[] {
  const visibles = provinciaFiltro ? pines.filter((p) => p.provincia_id === provinciaFiltro) : pines;
  const grupos: GrupoPines[] = [];
  for (const pin of visibles) {
    const grupo = grupos.find((g) => Math.hypot(g.x - pin.x, g.y - pin.y) < umbral);
    if (grupo) {
      grupo.pines.push(pin);
      grupo.x = grupo.pines.reduce((acc, p) => acc + p.x, 0) / grupo.pines.length;
      grupo.y = grupo.pines.reduce((acc, p) => acc + p.y, 0) / grupo.pines.length;
    } else {
      grupos.push({ x: pin.x, y: pin.y, provincia_id: pin.provincia_id, pines: [pin] });
    }
  }
  return grupos;
}

function viewBoxDeProvincia(provincia: ProvinciaMapa): string {
  const [x0, y0, x1, y1] = provincia.bbox;
  const margenX = (x1 - x0) * 0.12;
  const margenY = (y1 - y0) * 0.12;
  const ancho = x1 - x0 + margenX * 2;
  const alto = y1 - y0 + margenY * 2;
  return `${Number((x0 - margenX).toFixed(1))} ${Number((y0 - margenY).toFixed(1))} ${Number(ancho.toFixed(1))} ${Number(alto.toFixed(1))}`;
}

export function MapaEspana({
  provinciaActiva,
  provinciasConDatos,
  basePath = '/',
  municipioDestacado = null,
}: {
  provinciaActiva: string | null;
  provinciasConDatos: string[];
  basePath?: string;
  municipioDestacado?: string | null;
}) {
  const conDatos = new Set(provinciasConDatos);

  const zoom = provinciaActiva
    ? PROVINCIAS_MAPA.find((p) => p.id === provinciaActiva) ?? null
    : null;
  const viewBox = zoom ? viewBoxDeProvincia(zoom) : mapa.viewBox;
  const [minX, , anchoVista] = viewBox.split(' ').map(Number);
  const escala = anchoVista / 964;
  const radioPin = Math.min(10, Math.max(2.4, anchoVista / 96));
  const radioGrupo = Math.min(16, Math.max(3.6, anchoVista / 64));
  const tamanoTexto = Math.min(11, Math.max(3.4, anchoVista / 88));

  const grupos = agruparPines(PINES_MAPA, anchoVista / 40, zoom ? zoom.id : null);

  const enlaceProvincia = (id: string) =>
    provinciaActiva === id ? basePath : `${basePath}?provincia=${id}`;

  const claseProvincia = (id: string) => {
    const base = 'stroke-white dark:stroke-stone-950 transition-colors';
    if (provinciaActiva === id) {
      return `${base} fill-sky-400 dark:fill-sky-700`;
    }
    if (conDatos.has(id)) {
      return `${base} fill-emerald-300 hover:fill-emerald-400 dark:fill-emerald-800 dark:hover:fill-emerald-700`;
    }
    return `${base} fill-stone-200 hover:fill-stone-300 dark:fill-stone-800 dark:hover:fill-stone-700`;
  };

  return (
    <figure className="mx-auto max-w-2xl">
      <svg
        viewBox={viewBox}
        role="img"
        aria-label={
          zoom
            ? `Mapa de la provincia de ${zoom.nombre}. Muestra los municipios procesados y permite volver al mapa completo.`
            : 'Mapa de España por provincias. Las provincias en verde tienen municipios con datos; haz clic para verlos ampliados.'
        }
        className="h-auto w-full"
      >
        {PROVINCIAS_MAPA.map((provincia) => (
          <a
            key={provincia.id}
            href={enlaceProvincia(provincia.id)}
            aria-label={`${provincia.nombre}${conDatos.has(provincia.id) ? ' (con datos)' : ''}`}
          >
            <path d={provincia.d} className={claseProvincia(provincia.id)} strokeWidth={zoom ? 0.8 : 2}>
              <title>
                {provincia.nombre}
                {conDatos.has(provincia.id) ? ' · con datos' : ''}
              </title>
            </path>
          </a>
        ))}
        {grupos.map((grupo) => {
          const clave = grupo.pines.map((p) => p.municipio_id).join('-');
          if (grupo.pines.length === 1) {
            const pin = grupo.pines[0];
            const destacado = pin.municipio_id === municipioDestacado;
            return (
              <a
                key={clave}
                href={`/m/${pin.municipio_id}`}
                aria-label={`${destacado ? 'Municipio actual: ' : 'Ir al municipio de '}${pin.nombre}`}
              >
                <circle
                  cx={pin.x}
                  cy={pin.y}
                  r={destacado ? radioPin * 1.5 : radioPin}
                  strokeWidth={destacado ? radioPin * 0.4 : radioPin * 0.25}
                  className={`stroke-white transition-colors dark:stroke-stone-950 ${
                    destacado ? 'fill-sky-600' : 'fill-rose-600 hover:fill-rose-500'
                  }`}
                >
                  <title>{destacado ? `${pin.nombre} (municipio de esta página)` : pin.nombre}</title>
                </circle>
              </a>
            );
          }
          const nombres = grupo.pines.map((p) => p.nombre);
          return (
            <a
              key={clave}
              href={enlaceProvincia(grupo.provincia_id)}
              aria-label={`${nombres.length} municipios en esta zona: ${nombres.join(', ')}. Ver en la lista.`}
            >
              <circle
                cx={grupo.x}
                cy={grupo.y}
                r={radioGrupo}
                strokeWidth={radioGrupo * 0.25}
                className="fill-amber-500 stroke-white transition-colors hover:fill-amber-400 dark:stroke-stone-950"
              >
                <title>{`${nombres.length} municipios: ${nombres.join(', ')}`}</title>
              </circle>
              <text
                x={grupo.x}
                y={grupo.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={tamanoTexto}
                className="pointer-events-none fill-white font-semibold"
              >
                {nombres.length}
              </text>
            </a>
          );
        })}
        {zoom && (
          <a href={basePath} aria-label="Volver al mapa completo de España">
            <g transform={`translate(${minX + anchoVista * 0.02}, ${Number(viewBox.split(' ')[1]) + anchoVista * 0.02})`}>
              <rect
                width={anchoVista * 0.28}
                height={anchoVista * 0.075}
                rx={anchoVista * 0.012}
                className="fill-white/90 stroke-stone-300 dark:fill-stone-900/90 dark:stroke-stone-700"
                strokeWidth={anchoVista * 0.004}
              />
              <text
                x={anchoVista * 0.14}
                y={anchoVista * 0.0455}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={tamanoTexto * 0.95}
                className="fill-stone-800 dark:fill-stone-100"
              >
                ← España
              </text>
            </g>
          </a>
        )}
      </svg>
      <figcaption className="mt-2 text-center text-xs text-stone-500 dark:text-stone-400">
        Cartografía: IGN (CC BY 4.0), vía es-atlas. Verde: provincia con datos; ámbar con número:
        varios municipios agrupados. {zoom ? 'Haz clic en «← España» para alejar.' : 'Haz clic en una provincia para ampliarla.'}
      </figcaption>
    </figure>
  );
}
