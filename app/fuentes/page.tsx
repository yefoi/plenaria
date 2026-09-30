import type { Metadata } from 'next';
import { Insignia } from '@/app/components/Insignia';
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

  return (
    <article className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Fuentes y estado de la ingesta</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Estado del último procesamiento de cada adaptador. Los errores se listan para revisión
          manual. No es una página de monitorización en tiempo real.
        </p>
      </header>

      {estados.map(({ municipio, fuentes, sesiones }) => (
        <section
          key={municipio.id}
          className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
        >
          <h2 className="text-lg font-semibold">{municipio.nombre}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Insignia tono="info">{municipio.fuente_tipo}</Insignia>
            <span>{sesiones} sesiones procesadas</span>
          </div>
          {!fuentes ? (
            <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
              Sin datos de ingesta todavía. Ejecuta <code>npm run ingest</code>.
            </p>
          ) : (
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium">Última actualización</dt>
                <dd>{fuentes.actualizado_en}</dd>
              </div>
              <div>
                <dt className="font-medium">Última sesión detectada</dt>
                <dd>{fuentes.ultima_sesion_fecha ?? '-'}</dd>
              </div>
              <div>
                <dt className="font-medium">Última descarga de documentos</dt>
                <dd>{fuentes.ultima_descarga ?? '-'}</dd>
              </div>
              <div>
                <dt className="font-medium">Sesiones procesadas en la última ejecución</dt>
                <dd>{fuentes.sesiones_procesadas}</dd>
              </div>
              {Object.keys(fuentes.robots).length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="font-medium">robots.txt</dt>
                  <dd>
                    <ul className="list-disc pl-5">
                      {Object.entries(fuentes.robots).map(([origin, estado]) => (
                        <li key={origin}>
                          <code>{origin}</code>: {estado}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
          )}
          {fuentes && fuentes.errores.length > 0 && (
            <div className="mt-3">
              <h3 className="font-medium text-red-800 dark:text-red-300">Errores de la última ejecución</h3>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {fuentes.errores.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}

      <section className="space-y-2 text-sm">
        <h2 className="text-lg font-semibold">Notas sobre las fuentes</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            El catálogo «Actes del Ple» de la AOC se publica con licencia CC0 y enlaces directos a
            los documentos. Se descarga por la ruta masiva pública, no por la API interna (que el
            <code> robots.txt</code> del portal reserva).
          </li>
          <li>
            El <code>robots.txt</code> de <code>media.seu-e.cat</code> contiene una línea malformada
            («*/acteca») que los intérpretes estándar ignoran; si el operador publica una regla
            válida que excluya los PDFs, el adaptador dejará de descargarlos y lo indicará aquí.
          </li>
          <li>El identificador de agente incluye propósito y contacto, y se respetan las pausas entre peticiones.</li>
        </ul>
      </section>
    </article>
  );
}
