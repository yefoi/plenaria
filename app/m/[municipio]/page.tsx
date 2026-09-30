import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FiltrosPuntos } from '@/app/components/FiltrosPuntos';
import { Insignia } from '@/app/components/Insignia';
import { PuntoCard } from '@/app/components/PuntoCard';
import { TimelineSesiones } from '@/app/components/TimelineSesiones';
import { municipioPorId } from '@/lib/config';
import { TEMAS, type Tema } from '@/lib/schemas';
import { fechaLargaEspanol } from '@/lib/utils/dates';
import { repositorio } from '@/lib/web/data';
import { ETIQUETA_ESTADO } from '@/lib/web/labels';

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

  const afectan = doc?.puntos.filter((p) => (p.afecta_vecinos_prob ?? 0) >= 0.5).length ?? 0;
  const destacados = (doc?.puntos ?? []).filter((p) => (p.impacto ?? 0) >= 4).slice(0, 5);

  return (
    <div>
      <nav aria-label="Migas de pan" className="text-sm">
        <Link className="underline underline-offset-2" href="/">
          Inicio
        </Link>{' '}
        / <span>{municipio.nombre}</span>
      </nav>

      <header className="mt-3">
        <h1 className="text-2xl font-bold tracking-tight">{municipio.nombre}</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          {municipio.provincia} · fuente: {municipio.fuente_tipo}
        </p>
      </header>

      {digest && (
        <section
          aria-labelledby="resumen-semanal"
          className="mt-6 rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
        >
          <h2 id="resumen-semanal" className="text-lg font-semibold">
            Resumen semanal ({digest.semana_iso})
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm text-stone-700 dark:text-stone-300">
            {digest.resumen}
          </p>
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            Generado con plantilla determinista a partir de los datos publicados. No es un texto
            redactado por un modelo.
          </p>
        </section>
      )}

      {!doc ? (
        <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Este municipio aún no tiene sesiones procesadas.
        </p>
      ) : (
        <>
          <section aria-labelledby="ultimo-pleno" className="mt-6 rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <h2 id="ultimo-pleno" className="text-lg font-semibold">
              Pleno del {fechaLargaEspanol(doc.sesion.fecha)}
            </h2>
            <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
              Este pleno trató {doc.puntos.length} puntos; {afectan} afectan directamente a vecinos.
              {destacados.length > 0 && ' Los de mayor impacto: '}
              {destacados.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && '; '}
                  <a className="underline underline-offset-2" href={`#punto-${p.orden}`}>
                    {p.titulo.slice(0, 60)}
                    {p.titulo.length > 60 ? '…' : ''}
                  </a>
                </span>
              ))}
              {destacados.length > 0 && '.'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <Insignia tono="info">{ETIQUETA_ESTADO[doc.sesion.estado_ingesta]}</Insignia>
              <a
                className="underline underline-offset-2"
                href={doc.sesion.fuente_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Documento original (PDF)
              </a>
              <Link className="underline underline-offset-2" href={`/m/${municipio.id}/${doc.sesion.id}`}>
                Ver todos los puntos
              </Link>
              <a className="underline underline-offset-2" href={`/m/${municipio.id}/rss.xml`}>
                RSS (impacto alto)
              </a>
            </div>
          </section>

          <section aria-labelledby="titulo-puntos" className="mt-8 space-y-4">
            <h2 id="titulo-puntos" className="text-lg font-semibold">
              Puntos del último pleno
            </h2>
            <FiltrosPuntos
              basePath={`/m/${municipio.id}`}
              temasDisponibles={temasDisponibles}
              temaActivo={temaActivo}
              afectaActivo={afectaActivo}
            />
            {puntos.length === 0 ? (
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Ningún punto coincide con el filtro.
              </p>
            ) : (
              <div className="space-y-3">
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
          </section>
        </>
      )}

      <TimelineSesiones municipioId={municipio.id} sesiones={sesiones} />
    </div>
  );
}
