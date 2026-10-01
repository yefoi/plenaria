import type { Metadata } from 'next';
import { Insignia } from '@/app/components/Insignia';
import { Aviso, Dato } from '@/app/components/ui';
import { MUNICIPIOS } from '@/lib/config';
import { repositorio } from '@/lib/web/data';

export const metadata: Metadata = {
  title: 'Fuentes y estado',
};

export const dynamic = 'force-dynamic';

export default async function PaginaFuentes() {
  const repo = repositorio();
  const estados = await Promise.all(
    MUNICIPIOS.map(async (m) => ({
      municipio: m,
      fuentes: await repo.obtenerFuentes(m.id),
      sesiones: (await repo.listarSesiones(m.id)).length,
    })),
  );

  const conDatos = estados.filter((e) => e.sesiones > 0);
  const sinDatos = estados.filter((e) => e.sesiones === 0);
  const conErrores = estados.filter((e) => e.fuentes && e.fuentes.errores.length > 0);

  return (
    <article className="max-w-4xl space-y-12">
      <header className="border-b border-linea pb-6">
        <p className="eyebrow">Trazabilidad</p>
        <h1 className="mt-2 text-3xl font-semibold text-marca-fuerte sm:text-4xl">
          Fuentes y estado de la ingesta
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-apagado">
          Estado del último procesamiento de cada adaptador. Los errores se listan para revisión
          manual. No es una página de monitorización en tiempo real.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato valor={estados.length} etiqueta="Adaptadores" />
          <Dato valor={conDatos.length} etiqueta="Con datos" />
          <Dato valor={sinDatos.length} etiqueta="Sin datos" />
          <Dato valor={conErrores.length} etiqueta="Con errores" />
        </div>
      </header>

      {sinDatos.length > 0 && (
        <Aviso tono="aviso" titulo={`${sinDatos.length} municipios sin datos todavía`}>
          {sinDatos.map((e) => e.municipio.nombre).join(', ')}. Para añadir uno hace falta que su
          portal de transparencia enlace las actas o extractos en un formato descargable.
        </Aviso>
      )}

      <section className="space-y-4">
        <h2 className="text-xl text-marca-fuerte">Municipios</h2>
        <ul className="grid gap-3">
          {estados.map(({ municipio, fuentes, sesiones }) => (
            <li key={municipio.id} className="tarjeta p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="font-serif text-lg font-semibold text-marca-fuerte">
                  {municipio.nombre}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Insignia tono="info">{municipio.fuente_tipo}</Insignia>
                  <Insignia tono={sesiones > 0 ? 'ok' : 'neutro'}>
                    {sesiones} {sesiones === 1 ? 'sesión' : 'sesiones'}
                  </Insignia>
                </div>
              </div>

              {!fuentes ? (
                <p className="mt-3 text-sm text-apagado">
                  Sin datos de ingesta todavía. Ejecuta <code>npm run ingest</code>.
                </p>
              ) : (
                <>
                  <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-linea pt-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="eyebrow">Última actualización</dt>
                      <dd className="mt-1 tabular-nums text-apagado">{fuentes.actualizado_en}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Última sesión detectada</dt>
                      <dd className="mt-1 tabular-nums text-apagado">
                        {fuentes.ultima_sesion_fecha ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Última descarga de documentos</dt>
                      <dd className="mt-1 tabular-nums text-apagado">
                        {fuentes.ultima_descarga ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow">Sesiones en la última ejecución</dt>
                      <dd className="mt-1 tabular-nums text-apagado">
                        {fuentes.sesiones_procesadas}
                      </dd>
                    </div>
                    {Object.keys(fuentes.robots).length > 0 && (
                      <div className="sm:col-span-2">
                        <dt className="eyebrow">robots.txt</dt>
                        <dd className="mt-1.5">
                          <ul className="grid gap-1">
                            {Object.entries(fuentes.robots).map(([origin, estado]) => (
                              <li
                                key={origin}
                                className="flex flex-wrap items-center gap-x-2 text-sm"
                              >
                                <code>{origin}</code>
                                <span className="text-tenue">{estado}</span>
                              </li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    )}
                  </dl>

                  {fuentes.errores.length > 0 && (
                    <div className="mt-4 border-t border-linea pt-4">
                      <h4 className="text-sm font-semibold text-peligro-texto">
                        Errores de la última ejecución
                      </h4>
                      <ul className="mt-2 grid gap-1.5 text-sm text-apagado">
                        {fuentes.errores.map((error, i) => (
                          <li key={i} className="flex gap-2.5">
                            <span
                              aria-hidden="true"
                              className="mt-2 size-1.5 shrink-0 rounded-full bg-peligro-linea"
                            />
                            <span className="break-words leading-relaxed">{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="tarjeta space-y-3 p-5">
        <h2 className="text-xl text-marca-fuerte">Notas sobre las fuentes</h2>
        <ul className="grid gap-2.5 text-sm text-apagado">
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-marca" />
            <span className="leading-relaxed">
              El catálogo «Actes del Ple» de la AOC se publica con licencia CC0 y enlaces directos a
              los documentos. Se descarga por la ruta masiva pública, no por la API interna (que el{' '}
              <code>robots.txt</code> del portal reserva).
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-marca" />
            <span className="leading-relaxed">
              El <code>robots.txt</code> de <code>media.seu-e.cat</code> contiene una línea
              malformada («*/acteca») que los intérpretes estándar ignoran; si el operador publica
              una regla válida que excluya los PDFs, el adaptador dejará de descargarlos y lo
              indicará aquí.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-marca" />
            <span className="leading-relaxed">
              El identificador de agente incluye propósito y contacto, y se respetan las pausas entre
              peticiones.
            </span>
          </li>
        </ul>
      </section>
    </article>
  );
}
