import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FiltrosPuntos } from '@/app/components/FiltrosPuntos';
import { Insignia } from '@/app/components/Insignia';
import { MapaEspana, PINES_MAPA } from '@/app/components/MapaEspana';
import { PuntoCard } from '@/app/components/PuntoCard';
import { TimelineSesiones } from '@/app/components/TimelineSesiones';
import { Aviso, Boton, Dato, EnlaceExterno, Migas, Seccion } from '@/app/components/ui';
import { municipioPorId } from '@/lib/config';
import { TEMAS, type Tema } from '@/lib/schemas';
import { fechaLargaEspanol } from '@/lib/utils/dates';
import { repositorio } from '@/lib/web/data';
import { ETIQUETA_ESTADO, formatearImporte } from '@/lib/web/labels';

export const dynamic = 'force-dynamic';

export default async function PaginaMunicipio({
  params,
  searchParams,
}: {
  params: Promise<{ municipio: string }>;
  searchParams: Promise<{ tema?: string; afecta?: string }>;
}) {
  const { municipio: municipioId } = await params;
  const { tema, afecta } = await searchParams;
  const municipio = municipioPorId(municipioId);
  if (!municipio) notFound();

  const repo = repositorio();
  const sesiones = await repo.listarSesiones(municipio.id);
  const ultima = sesiones[0] ?? null;
  const doc = ultima ? await repo.obtenerSesion(municipio.id, ultima.id) : null;
  const digest = await repo.obtenerUltimoDigest(municipio.id);
  const pinMunicipio = PINES_MAPA.find((p) => p.municipio_id === municipio.id) ?? null;

  const temaActivo = tema && (TEMAS as readonly string[]).includes(tema) ? (tema as Tema) : null;
  const afectaActivo = afecta === '1';

  let puntos = doc?.puntos ?? [];
  const temasDisponibles = [...new Set(puntos.flatMap((p) => p.temas))].sort();
  if (temaActivo) puntos = puntos.filter((p) => p.temas.includes(temaActivo));
  if (afectaActivo) puntos = puntos.filter((p) => (p.afecta_vecinos_prob ?? 0) >= 0.5);
  puntos = [...puntos].sort((a, b) => {
    const ia = a.impacto ?? 0;
    const ib = b.impacto ?? 0;
    if (ia !== ib) return ib - ia;
    return a.orden - b.orden;
  });

  const conImpacto = (doc?.puntos ?? []).filter((p) => p.impacto !== null);
  const impactoCalculado = conImpacto.length > 0;
  const afectan = doc?.puntos.filter((p) => (p.afecta_vecinos_prob ?? 0) >= 0.5).length ?? 0;
  const destacados = (doc?.puntos ?? []).filter((p) => (p.impacto ?? 0) >= 4).slice(0, 5);
  const conImporte = (doc?.puntos ?? []).filter((p) => p.importe_eur !== null);
  const sumaImportes = conImporte.reduce((acc, p) => acc + (p.importe_eur ?? 0), 0);
  const temasDistintos = temasDisponibles.length;

  return (
    <div className="space-y-12">
      <Migas pasos={[{ texto: 'Inicio', href: '/' }, { texto: municipio.nombre }]} />

      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="eyebrow">{municipio.provincia}</p>
          <h1 className="mt-2 text-3xl font-semibold text-marca-fuerte sm:text-4xl">
            {municipio.nombre}
          </h1>
          <p className="mt-3 max-w-2xl text-apagado">
            {doc
              ? `Último pleno: ${fechaLargaEspanol(doc.sesion.fecha)}. Cada punto procede del acta o extracto oficial y enlaza a su documento.`
              : 'Todavía no hay sesiones procesadas para este municipio.'}
          </p>
        </div>
        {sesiones.length >= 2 && (
          <Boton href={`/m/${municipio.id}/comparar`} variante="primario">
            Comparar sesiones
          </Boton>
        )}
      </header>

      {doc && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Dato valor={doc.puntos.length} etiqueta="Puntos" detalle="en el último pleno" />
          {impactoCalculado ? (
            <>
              <Dato
                valor={afectan}
                etiqueta="Afectan a vecinos"
                detalle={`de ${conImpacto.length} puntos evaluados`}
              />
              <Dato
                valor={destacados.length}
                etiqueta="De impacto alto"
                detalle="impacto 4 o 5 de 5"
              />
            </>
          ) : (
            <>
              <Dato valor={temasDistintos} etiqueta="Temas" detalle="detectados por el clasificador" />
              <Dato
                valor={conImporte.length}
                etiqueta="Con importe"
                detalle={
                  sumaImportes > 0
                    ? `${formatearImporte(sumaImportes)} detectados en el texto`
                    : 'ningún importe en el extracto'
                }
              />
            </>
          )}
          <Dato valor={sesiones.length} etiqueta="Sesiones" detalle="procesadas en total" />
        </div>
      )}

      {doc && !impactoCalculado && (
        <Aviso tono="info">
          La estimación de impacto vecinal (1 a 5) necesita la segunda pasada de clasificación, que
          requiere una clave de <code>TYPESAFE_AI_API_KEY</code>. Mientras no esté disponible, los
          puntos de estas sesiones se publican sin esa puntuación en lugar de mostrar un cero.
        </Aviso>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-12">
          {digest && (
            <Seccion
              id="resumen-semanal"
              eyebrow="Resumen"
              titulo={`Semana ${digest.semana_iso}`}
            >
              <div className="tarjeta p-5">
                <p className="whitespace-pre-line leading-relaxed text-apagado">{digest.resumen}</p>
                <p className="mt-3 border-t border-linea pt-3 text-xs text-tenue">
                  Generado con plantilla determinista a partir de los datos publicados. No es un
                  texto redactado por un modelo.
                </p>
              </div>
            </Seccion>
          )}

          {!doc ? (
            <Aviso tono="aviso">
              Este municipio aún no tiene sesiones procesadas.{' '}
              <Link className="enlace-subrayado font-medium" href="/fuentes">
                Ver el estado de la ingesta
              </Link>
              .
            </Aviso>
          ) : (
            <>
              <Seccion
                id="ultimo-pleno"
                eyebrow="Última sesión"
                titulo={`Pleno del ${fechaLargaEspanol(doc.sesion.fecha)}`}
                acciones={
                  <>
                    <Boton href={`/m/${municipio.id}/${doc.sesion.id}`} variante="secundario">
                      Ver todos los puntos
                    </Boton>
                    <Boton
                      href={`/m/${municipio.id}/rss.xml`}
                      variante="sutil"
                      title="RSS con los puntos de impacto alto de este municipio"
                    >
                      RSS
                    </Boton>
                  </>
                }
              >
                <div className="tarjeta p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Insignia tono="info">{ETIQUETA_ESTADO[doc.sesion.estado_ingesta]}</Insignia>
                    <Insignia>{doc.sesion.tipo}</Insignia>
                    <EnlaceExterno href={doc.sesion.fuente_url} className="text-sm text-apagado">
                      Documento original
                    </EnlaceExterno>
                  </div>
                  <p className="mt-3 leading-relaxed text-apagado">
                    Este pleno trató {doc.puntos.length}{' '}
                    {doc.puntos.length === 1 ? 'punto' : 'puntos'}
                    {impactoCalculado ? `; ${afectan} afectan directamente a vecinos.` : '.'}
                  </p>
                  {destacados.length > 0 && (
                    <div className="mt-4 border-t border-linea pt-4">
                      <p className="eyebrow">Los de mayor impacto vecinal</p>
                      <ol className="mt-2 grid gap-1.5">
                        {destacados.map((p) => (
                          <li key={p.id} className="flex gap-2.5 text-sm">
                            <span className="shrink-0 font-semibold tabular-nums text-tenue">
                              {p.orden}.
                            </span>
                            <a
                              className="text-marca hover:underline"
                              href={`#punto-${p.orden}`}
                              title={p.titulo}
                            >
                              {p.titulo.length > 80 ? `${p.titulo.slice(0, 80)}…` : p.titulo}
                            </a>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </Seccion>

              <Seccion
                id="titulo-puntos"
                eyebrow="Detalle"
                titulo="Puntos del último pleno"
                descripcion={
                  temaActivo || afectaActivo
                    ? `${puntos.length} de ${doc.puntos.length} puntos con el filtro aplicado.`
                    : `${puntos.length} puntos, ordenados por impacto vecinal.`
                }
              >
                <div className="tarjeta mb-5 p-4">
                  <FiltrosPuntos
                    basePath={`/m/${municipio.id}`}
                    temasDisponibles={temasDisponibles}
                    temaActivo={temaActivo}
                    afectaActivo={afectaActivo}
                  />
                </div>
                {puntos.length === 0 ? (
                  <p className="tarjeta p-5 text-sm text-apagado">
                    Ningún punto coincide con el filtro.{' '}
                    <Link className="enlace-subrayado text-marca" href={`/m/${municipio.id}`}>
                      Quitar el filtro
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {puntos.map((punto) => (
                      <PuntoCard
                        key={punto.id}
                        punto={punto}
                        municipioId={municipio.id}
                        sesionId={doc.sesion.id}
                        fuenteUrl={doc.sesion.fuente_url}
                      />
                    ))}
                  </div>
                )}
              </Seccion>
            </>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          {pinMunicipio && (
            <section aria-labelledby="ubicacion" className="tarjeta p-4">
              <h2 id="ubicacion" className="eyebrow">
                Dónde está
              </h2>
              <div className="mt-3">
                <MapaEspana
                  provinciaActiva={pinMunicipio.provincia_id}
                  provinciasConDatos={[...new Set(PINES_MAPA.map((p) => p.provincia_id))]}
                  municipioDestacado={municipio.id}
                  compacto
                />
              </div>
            </section>
          )}
          <section aria-labelledby="enlaces-municipio" className="tarjeta p-4 text-sm">
            <h2 id="enlaces-municipio" className="eyebrow">
              Sigue este municipio
            </h2>
            <ul className="mt-3 grid gap-2">
              <li>
                <Link
                  className="text-marca hover:underline"
                  href={`/m/${municipio.id}/rss.xml`}
                >
                  RSS de impacto alto
                </Link>
              </li>
              {doc && (
                <li>
                  <EnlaceExterno href={doc.sesion.fuente_url}>Documento original del pleno</EnlaceExterno>
                </li>
              )}
              <li>
                <Link className="text-marca hover:underline" href="/fuentes">
                  Estado de las fuentes
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <TimelineSesiones municipioId={municipio.id} sesiones={sesiones} />
    </div>
  );
}
