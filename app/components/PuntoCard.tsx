import { Insignia } from '@/app/components/Insignia';
import { ETIQUETA_TEMA, ETIQUETA_TIPO, formatearImporte, formatearPorcentaje } from '@/lib/web/labels';
import { REPO_URL } from '@/lib/web/repo';
import type { Punto } from '@/lib/schemas';

export function PuntoCard({
  punto,
  municipioId,
  sesionId,
  fuenteUrl,
}: {
  punto: Punto;
  municipioId: string;
  sesionId: string;
  fuenteUrl: string;
}) {
  const reportar = new URL(`${REPO_URL}/issues/new`);
  reportar.searchParams.set(
    'title',
    `Clasificación errónea: ${municipioId}/${sesionId} punto ${punto.orden}`,
  );
  reportar.searchParams.set(
    'body',
    [
      `Punto: ${punto.id}`,
      `Título: ${punto.titulo}`,
      `Fuente: ${fuenteUrl}`,
      '',
      'Qué creo que está mal y por qué (añade tu explicación):',
    ].join('\n'),
  );

  return (
    <article
      id={`punto-${punto.orden}`}
      className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="max-w-prose text-base font-semibold leading-snug">
          <span className="mr-2 text-stone-500 dark:text-stone-400">{punto.orden}.</span>
          {punto.titulo}
        </h3>
        <div className="flex flex-wrap items-center gap-1">
          {punto.impacto !== null && (
            <Insignia tono={punto.impacto >= 4 ? 'aviso' : 'neutro'}>
              Impacto vecinal {punto.impacto}/5
            </Insignia>
          )}
          {punto.tipo_punto !== null && <Insignia tono="info">{ETIQUETA_TIPO[punto.tipo_punto]}</Insignia>}
          {punto.sensible && <Insignia tono="peligro">Punto reservado por privacidad</Insignia>}
          {punto.revision_manual && <Insignia tono="aviso">Clasificación a revisar</Insignia>}
        </div>
      </div>

      {!punto.sensible && punto.texto_redactado && punto.texto_redactado !== punto.titulo && (
        <p className="mt-3 max-w-prose whitespace-pre-line text-sm text-stone-700 dark:text-stone-300">
          {punto.texto_redactado}
        </p>
      )}

      {punto.sensible && (
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          Este punto trata datos personales o casos individuales. Por privacidad solo se muestra su
          categoría general; el detalle consta en el documento oficial.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
        {punto.temas.map((tema) => (
          <Insignia key={tema}>{ETIQUETA_TEMA[tema]}</Insignia>
        ))}
        {punto.afecta_vecinos_prob !== null && (
          <Insignia tono={punto.afecta_vecinos_prob >= 0.5 ? 'ok' : 'neutro'}>
            {punto.afecta_vecinos_prob >= 0.5 ? 'Afecta a vecinos' : 'No afecta directamente'}{' '}
            (prob. {formatearPorcentaje(punto.afecta_vecinos_prob)})
          </Insignia>
        )}
        {punto.importe_eur !== null && (
          <span className="font-medium">Importe detectado: {formatearImporte(punto.importe_eur)}</span>
        )}
        {punto.confianza_min !== null && (
          <span title="Confianza mínima de la clasificación automática">
            Confianza {formatearPorcentaje(punto.confianza_min)}
          </span>
        )}
        {punto.clasificado_con === null && <span>Pendiente de clasificación automática</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <a
          className="underline underline-offset-2"
          href={fuenteUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ver documento original (PDF)
        </a>
        <a
          className="underline underline-offset-2"
          href={reportar.toString()}
          target="_blank"
          rel="noopener noreferrer"
          title="Abre un formulario de incidencia en GitHub con este punto precargado"
        >
          Reportar clasificación errónea
        </a>
      </div>
    </article>
  );
}
