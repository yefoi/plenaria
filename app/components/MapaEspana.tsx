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

export function agruparPines(
  pines: PinMapa[],
  umbral: number,
  provinciaFiltro: string | null,
): GrupoPines[] {
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

const LEYENDA = [
  { clase: 'bg-tinta-300 dark:bg-tinta-700', texto: 'Provincia con municipios procesados' },
  { clase: 'bg-papel-200 dark:bg-[#232c38]', texto: 'Provincia sin datos todavía' },
  { clase: 'bg-granate-600', texto: 'Municipio' },
  { clase: 'bg-ambar-500', texto: 'Varios municipios agrupados' },
];

export function MapaEspana({
  provinciaActiva,
  provinciasConDatos,
  basePath = '/',
  municipioDestacado = null,
  compacto = false,
}: {
  provinciaActiva: string | null;
  provinciasConDatos: string[];
  basePath?: string;
  municipioDestacado?: string | null;
  compacto?: boolean;
}) {
  const conDatos = new Set(provinciasConDatos);

  const zoom = provinciaActiva
    ? PROVINCIAS_MAPA.find((p) => p.id === provinciaActiva) ?? null
    : null;
  const viewBox = zoom ? viewBoxDeProvincia(zoom) : mapa.viewBox;
  const [, yVista, anchoVista] = viewBox.split(' ').map(Number);

  const anchoRender = compacto ? 300 : 860;
  const unidadesPorPx = anchoVista / anchoRender;
  const radioPin = Math.max(1.1, (compacto ? 4.5 : 7) * unidadesPorPx);
  const radioGrupo = Math.max(1.8, (compacto ? 9 : 11) * unidadesPorPx);
  const tamanoTexto = radioGrupo * (compacto ? 0.85 : 0.9);
  const grosor = Math.max(0.4, unidadesPorPx * 1.5);
  const agrupar = (compacto ? 22 : 30) * unidadesPorPx;

  const grupos = agruparPines(PINES_MAPA, agrupar, zoom ? zoom.id : null);

  const enlaceProvincia = (id: string) =>
    provinciaActiva === id ? basePath : `${basePath}?provincia=${id}`;

  const claseProvincia = (id: string) => {
    const base = 'stroke-superficie transition-colors duration-200';
    if (provinciaActiva === id) {
      return `${base} fill-tinta-500 hover:fill-tinta-600 dark:fill-tinta-500 dark:hover:fill-tinta-400`;
    }
    if (conDatos.has(id)) {
      return `${base} fill-tinta-300 hover:fill-tinta-400 dark:fill-tinta-700 dark:hover:fill-tinta-600`;
    }
    return `${base} fill-papel-200 hover:fill-papel-300 dark:fill-[#232c38] dark:hover:fill-[#2b3644]`;
  };

  return (
    <figure className="w-full">
      <svg
        viewBox={viewBox}
        role="img"
        aria-label={
          zoom
            ? `Mapa de la provincia de ${zoom.nombre}. Cada círculo es un municipio con datos procesados; los grupos agrupan municipios cercanos.`
            : 'Mapa de España por provincias. Las provincias resaltadas tienen municipios con datos procesados.'
        }
        className="h-auto w-full drop-shadow-sm"
      >
        {PROVINCIAS_MAPA.map((provincia) => (
          <a
            key={provincia.id}
            href={enlaceProvincia(provincia.id)}
            aria-label={`${provincia.nombre}${conDatos.has(provincia.id) ? ' (con datos)' : ''}`}
          >
            <path
              d={provincia.d}
              className={claseProvincia(provincia.id)}
              strokeWidth={compacto ? grosor * 0.7 : grosor}
            >
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
                {destacado && (
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r={radioPin * 2.1}
                    className="fill-marca/20 stroke-marca/40"
                    strokeWidth={radioPin * 0.3}
                  />
                )}
                <circle
                  cx={pin.x}
                  cy={pin.y}
                  r={destacado ? radioPin * 1.35 : radioPin}
                  strokeWidth={radioPin * 0.3}
                  className={`stroke-superficie transition-colors ${
                    destacado ? 'fill-marca' : 'fill-granate-600 hover:fill-granate-500'
                  }`}
                >
                  <title>
                    {destacado ? `${pin.nombre} (municipio de esta página)` : pin.nombre}
                  </title>
                </circle>
              </a>
            );
          }
          const nombres = grupo.pines.map((p) => p.nombre);
          return (
            <a
              key={clave}
              href={enlaceProvincia(grupo.provincia_id)}
              aria-label={`${nombres.length} municipios agrupados aquí: ${nombres.join(', ')}. Ver en la lista.`}
            >
              <circle
                cx={grupo.x}
                cy={grupo.y}
                r={radioGrupo}
                strokeWidth={radioGrupo * 0.22}
                className="fill-ambar-500 stroke-superficie transition-colors hover:fill-ambar-600"
              >
                <title>{`${nombres.length} municipios: ${nombres.join(', ')}`}</title>
              </circle>
              <text
                x={grupo.x}
                y={grupo.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={tamanoTexto}
                className="pointer-events-none fill-ambar-950 font-bold tabular-nums"
              >
                {nombres.length}
              </text>
            </a>
          );
        })}

        {zoom && (
          <a href={basePath} aria-label="Volver al mapa completo de España">
            <g
              transform={`translate(${
                viewBox.split(' ').map(Number)[0] + anchoVista * 0.025
              }, ${yVista + anchoVista * 0.025})`}
            >
              <rect
                width={anchoVista * 0.26}
                height={anchoVista * 0.072}
                rx={anchoVista * 0.036}
                className="fill-superficie-2 stroke-linea-fuerte"
                strokeWidth={grosor}
              />
              <text
                x={anchoVista * 0.13}
                y={anchoVista * 0.037}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={tamanoTexto}
                className="fill-marca font-semibold"
              >
                {'← España'}
              </text>
            </g>
          </a>
        )}
      </svg>

      {!compacto && (
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {LEYENDA.map((item) => (
            <li key={item.texto} className="flex items-center gap-1.5 text-xs text-apagado">
              <span aria-hidden="true" className={`size-3 rounded-full ${item.clase}`} />
              {item.texto}
            </li>
          ))}
        </ul>
      )}

      <figcaption className="mt-3 text-center text-xs text-tenue">
        Cartografía: Instituto Geográfico Nacional (CC BY 4.0), vía es-atlas.{' '}
        {zoom
          ? 'Pulsa «← España» para volver al mapa completo.'
          : 'Pulsa una provincia para ampliarla.'}
      </figcaption>
    </figure>
  );
}
