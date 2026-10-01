import Link from 'next/link';
import { ListaMunicipios, type MunicipioLista } from '@/app/components/ListaMunicipios';
import { MapaEspana, PINES_MAPA, PROVINCIAS_MAPA } from '@/app/components/MapaEspana';
import { MUNICIPIOS } from '@/lib/config';
import { repositorio } from '@/lib/web/data';
import { REPO_URL } from '@/lib/web/repo';
import { fechaLargaEspanol } from '@/lib/utils/dates';
import type { ResumenSesion } from '@/lib/repo/repository';

export const dynamic = 'force-dynamic';

export default async function PaginaInicio({
  searchParams,
}: {
  searchParams: Promise<{ provincia?: string }>;
}) {
  const { provincia } = await searchParams;
  const idsProvincias = new Set(PROVINCIAS_MAPA.map((p) => p.id));
  const provinciaActiva = provincia && idsProvincias.has(provincia) ? provincia : null;
  const provinciaDe = new Map(PINES_MAPA.map((p) => [p.municipio_id, p.provincia_id]));

  const repo = repositorio();
  const municipios: MunicipioLista[] = [];
  const ultimos: { municipioId: string; municipioNombre: string; sesion: ResumenSesion }[] = [];

  for (const m of MUNICIPIOS) {
    const sesiones = await repo.listarSesiones(m.id);
    municipios.push({
      id: m.id,
      nombre: m.nombre,
      provincia: m.provincia,
      sesiones: sesiones.length,
      ultimaFecha: sesiones[0]?.fecha ?? null,
    });
    for (const s of sesiones.slice(0, 3)) {
      ultimos.push({ municipioId: m.id, municipioNombre: m.nombre, sesion: s });
    }
  }
  municipios.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  ultimos.sort((a, b) => (a.sesion.fecha < b.sesion.fecha ? 1 : -1));

  const municipiosVisibles = provinciaActiva
    ? municipios.filter((m) => provinciaDe.get(m.id) === provinciaActiva)
    : municipios;
  const provinciasConDatos = [
    ...new Set(
      municipios
        .filter((m) => m.sesiones > 0)
        .map((m) => provinciaDe.get(m.id))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const nombreProvincia = provinciaActiva
    ? PROVINCIAS_MAPA.find((p) => p.id === provinciaActiva)?.nombre ?? null
    : null;
  const totalSesiones = municipios.reduce((acc, m) => acc + m.sesiones, 0);

  const solicitud = new URL(`${REPO_URL}/issues/new`);
  solicitud.searchParams.set(
    'title',
    `Solicitar municipio${nombreProvincia ? `: ${nombreProvincia}` : ''}`,
  );
  solicitud.searchParams.set(
    'body',
    [
      'Municipio y provincia:',
      '',
      'Enlace a la web del ayuntamiento o al portal de transparencia (con actas o extractos de plenos):',
      '',
    ].join('\n'),
  );

  return (
    <div className="space-y-10">
      <section aria-labelledby="titulo-intro">
        <h1 id="titulo-intro" className="text-2xl font-bold tracking-tight">
          Los plenos municipales, punto por punto
        </h1>
        <p className="mt-3 max-w-2xl text-stone-700 dark:text-stone-300">
          Resúmenes legibles y filtrables de las sesiones plenarias: qué se aprobó, qué temas
          trata y cuánto puede afectar a la vida diaria de los vecinos. Cada punto enlaza a su
          documento original. Sin valoraciones políticas y con los datos personales redactados.
        </p>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Cobertura actual: {municipios.length} municipios, {totalSesiones} sesiones procesadas.
        </p>
      </section>

      <section aria-labelledby="titulo-mapa" className="space-y-4">
        <h2 id="titulo-mapa" className="text-lg font-semibold">
          Elige municipio en el mapa
        </h2>
        <MapaEspana provinciaActiva={provinciaActiva} provinciasConDatos={provinciasConDatos} />
        {provinciaActiva && nombreProvincia && (
          <p className="text-center text-sm">
            Filtrando por la provincia de <strong>{nombreProvincia}</strong>.{' '}
            <Link className="underline underline-offset-2" href="/">
              Quitar filtro
            </Link>
          </p>
        )}
      </section>

      <ListaMunicipios municipios={municipiosVisibles} />

      {provinciaActiva && municipiosVisibles.length === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Todavía no hay municipios con datos en esta provincia.{' '}
          <a
            className="underline underline-offset-2"
            href={solicitud.toString()}
            target="_blank"
            rel="noopener noreferrer"
          >
            Solicita que añadamos uno
          </a>
          .
        </div>
      )}

      <section aria-labelledby="titulo-ultimos">
        <h2 id="titulo-ultimos" className="text-lg font-semibold">
          Últimos plenos procesados
        </h2>
        {ultimos.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
            Todavía no hay plenos procesados. Ejecuta <code>npm run ingest</code> para empezar.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {ultimos.slice(0, 8).map(({ municipioId, municipioNombre, sesion }) => (
              <li
                key={`${municipioId}-${sesion.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    className="font-medium underline underline-offset-2"
                    href={`/m/${municipioId}/${sesion.id}`}
                  >
                    {municipioNombre}
                  </Link>
                  <span>{fechaLargaEspanol(sesion.fecha)}</span>
                  <span className="text-stone-600 dark:text-stone-400">
                    {sesion.num_puntos} puntos
                  </span>
                  {sesion.max_impacto !== null && sesion.max_impacto >= 4 && (
                    <span className="text-amber-800 dark:text-amber-300">
                      impacto destacado {sesion.max_impacto}/5
                    </span>
                  )}
                </div>
                <Link className="underline underline-offset-2" href={`/m/${municipioId}`}>
                  Ver municipio
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
