import mapa from '@/lib/mapa/espana.json';

export interface ProvinciaMapa {
  id: string;
  nombre: string;
  d: string;
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

export function MapaEspana({
  provinciaActiva,
  provinciasConDatos,
  basePath = '/',
}: {
  provinciaActiva: string | null;
  provinciasConDatos: string[];
  basePath?: string;
}) {
  const conDatos = new Set(provinciasConDatos);

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
        viewBox={mapa.viewBox}
        role="img"
        aria-label="Mapa de España por provincias. Las provincias en verde tienen municipios con datos; haz clic para filtrar."
        className="h-auto w-full"
      >
        {PROVINCIAS_MAPA.map((provincia) => (
          <a
            key={provincia.id}
            href={enlaceProvincia(provincia.id)}
            aria-label={`${provincia.nombre}${conDatos.has(provincia.id) ? ' (con datos)' : ''}`}
          >
            <path d={provincia.d} className={claseProvincia(provincia.id)} strokeWidth={2}>
              <title>
                {provincia.nombre}
                {conDatos.has(provincia.id) ? ' · con datos' : ''}
              </title>
            </path>
          </a>
        ))}
        {PINES_MAPA.map((pin) => (
          <a
            key={pin.municipio_id}
            href={`/m/${pin.municipio_id}`}
            aria-label={`Ir al municipio de ${pin.nombre}`}
          >
            <circle
              cx={pin.x}
              cy={pin.y}
              r={10}
              strokeWidth={2.5}
              className="fill-rose-600 stroke-white transition-colors hover:fill-rose-500 dark:stroke-stone-950"
            >
              <title>{pin.nombre}</title>
            </circle>
          </a>
        ))}
      </svg>
      <figcaption className="mt-2 text-center text-xs text-stone-500 dark:text-stone-400">
        Cartografía: IGN (CC BY 4.0), vía es-atlas. Verde: provincia con datos. Puntos rojos: municipios
        procesados.
      </figcaption>
    </figure>
  );
}
