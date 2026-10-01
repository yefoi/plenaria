import Link from 'next/link';
import { ListaMunicipios, type MunicipioLista } from '@/app/components/ListaMunicipios';
import { MapaEspana, PINES_MAPA, PROVINCIAS_MAPA } from '@/app/components/MapaEspana';
import { Aviso, Dato, EnlaceExterno, Seccion } from '@/app/components/ui';
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
  let puntosTotales = 0;

  for (const m of MUNICIPIOS) {
    const sesiones = await repo.listarSesiones(m.id);
    municipios.push({
      id: m.id,
      nombre: m.nombre,
      provincia: m.provincia,
      sesiones: sesiones.length,
      ultimaFecha: sesiones[0]?.fecha ?? null,
    });
    puntosTotales += sesiones.reduce((acc, s) => acc + s.num_puntos, 0);
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
    <div className="space-y-16">
      <section aria-labelledby="titulo-intro">
        <p className="eyebrow">Vigía de plenos municipales</p>
        <h1
          id="titulo-intro"
          className="mt-3 max-w-3xl text-4xl leading-[1.08] font-semibold text-marca-fuerte sm:text-[2.75rem]"
        >
          Los plenos municipales, punto por punto
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-apagado">
          Resúmenes legibles y filtrables de las sesiones plenarias: qué se aprobó, qué temas
          trata y cuánto puede afectar a la vida diaria de los vecinos. Cada punto enlaza a su
          documento original.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-apagado">
          Sin valoraciones políticas y sin atribución de votos. Los datos personales se redactan
          antes de publicar nada, y{' '}
          <Link className="enlace-subrayado text-marca" href="/metodologia">
            la metodología completa
          </Link>{' '}
          está publicada y es auditable.
        </p>

        <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato valor={municipios.length} etiqueta="Municipios" detalle="con datos publicados" />
          <Dato valor={totalSesiones} etiqueta="Sesiones" detalle="actas y extractos" />
          <Dato valor={puntosTotales} etiqueta="Puntos" detalle="acuerdos indexados" />
          <Dato valor={provinciasConDatos.length} etiqueta="Provincias" detalle="representadas" />
        </div>
      </section>

      <Seccion
        id="mapa"
        eyebrow="Cobertura geográfica"
        titulo="Elige municipio en el mapa"
        descripcion={`${provinciasConDatos.length} provincias con municipios procesados. Pulsa una provincia para ampliarla.`}
      >
        <div className="tarjeta p-4 sm:p-6">
          <MapaEspana provinciaActiva={provinciaActiva} provinciasConDatos={provinciasConDatos} />
        </div>
        {provinciaActiva && nombreProvincia && (
          <p className="mt-4 text-sm text-apagado">
            Mostrando solo la provincia de <strong className="text-texto">{nombreProvincia}</strong>.{' '}
            <Link className="enlace-subrayado text-marca" href="/">
              Quitar el filtro
            </Link>
          </p>
        )}
      </Seccion>

      <ListaMunicipios municipios={municipiosVisibles} />

      {provinciaActiva && municipiosVisibles.length === 0 && (
        <Aviso tono="aviso">
          Todavía no hay municipios con datos en esta provincia.{' '}
          <EnlaceExterno href={solicitud.toString()} className="font-medium">
            Solicita que añadamos uno
          </EnlaceExterno>
          .
        </Aviso>
      )}

      <Seccion
        id="ultimos"
        eyebrow="Novedad"
        titulo="Últimos plenos procesados"
        descripcion="Sesiones más recientes, ordenadas por fecha de la sesión."
      >
        {ultimos.length === 0 ? (
          <p className="tarjeta p-5 text-sm text-apagado">
            Todavía no hay plenos procesados. Ejecuta <code>npm run ingest</code> para empezar.
          </p>
        ) : (
          <ol className="grid gap-2">
            {ultimos.slice(0, 8).map(({ municipioId, municipioNombre, sesion }) => (
              <li key={`${municipioId}-${sesion.id}`}>
                <div className="tarjeta-clic flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-3 text-sm">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <Link
                      href={`/m/${municipioId}/${sesion.id}`}
                      className="font-serif font-semibold text-marca-fuerte hover:underline"
                    >
                      {municipioNombre}
                    </Link>
                    <span className="text-apagado">{fechaLargaEspanol(sesion.fecha)}</span>
                    <span className="tabular-nums text-tenue">
                      {sesion.num_puntos} {sesion.num_puntos === 1 ? 'punto' : 'puntos'}
                    </span>
                    {sesion.max_impacto !== null && sesion.max_impacto >= 4 && (
                      <span className="rounded-full bg-aviso-fondo px-2 py-0.5 text-xs font-medium text-aviso-texto">
                        impacto destacado {sesion.max_impacto}/5
                      </span>
                    )}
                  </div>
                  <Link
                    className="shrink-0 text-xs text-apagado hover:text-marca-fuerte hover:underline"
                    href={`/m/${municipioId}`}
                  >
                    Ficha del municipio
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Seccion>
    </div>
  );
}
