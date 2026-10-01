import { Insignia } from '@/app/components/Insignia';
import { EnlaceExterno } from '@/app/components/ui';
import {
  ETIQUETA_TEMA,
  ETIQUETA_TIPO,
  etiquetaResultado,
  formatearImporte,
  formatearPorcentaje,
  tonoResultado,
} from '@/lib/web/labels';
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

  const impacto = punto.impacto;
  const destacado = impacto !== null && impacto >= 4;

  return (
    <article
      id={`punto-${punto.orden}`}
      className={`tarjeta scroll-mt-24 p-5 transition-shadow hover:shadow-media ${
        destacado ? 'border-l-4 border-l-aviso-linea' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h3 className="flex min-w-0 items-baseline gap-2.5 font-serif text-[1.0625rem] leading-snug text-marca-fuerte">
          <span className="shrink-0 font-sans text-sm font-semibold tabular-nums text-tenue">
            {punto.orden}.
          </span>
          <span className="max-w-prose">{punto.titulo}</span>
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          {impacto !== null && (
            <Insignia
              tono={destacado ? 'aviso' : 'neutro'}
              title={`Impacto vecinal estimado de 1 a 5 según los criterios de /metodologia`}
            >
              Impacto {impacto}/5
            </Insignia>
          )}
          {punto.tipo_punto !== null && <Insignia tono="info">{ETIQUETA_TIPO[punto.tipo_punto]}</Insignia>}
          {punto.resultado !== null && !punto.sensible && (
            <Insignia tono={tonoResultado(punto.resultado)}>{etiquetaResultado(punto.resultado)}</Insignia>
          )}
          {punto.sensible && <Insignia tono="peligro">Reservado por privacidad</Insignia>}
          {punto.revision_manual && <Insignia tono="aviso">A revisar</Insignia>}
        </div>
      </div>

      {!punto.sensible && punto.texto_redactado && punto.texto_redactado !== punto.titulo && (
        <p className="mt-3.5 max-w-prose whitespace-pre-line text-[0.9375rem] leading-relaxed text-apagado">
          {punto.texto_redactado}
        </p>
      )}

      {punto.sensible && (
        <p className="mt-3.5 max-w-prose border-l-2 border-peligro-linea pl-3 text-sm leading-relaxed text-apagado">
          Este punto trata datos personales o casos individuales. Por privacidad solo se muestra su
          categoría general; el detalle consta en el documento oficial.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-linea pt-3 text-xs text-tenue">
        {punto.temas.map((tema) => (
          <span
            key={tema}
            className="rounded bg-marca-tenue px-1.5 py-0.5 font-medium text-marca"
          >
            {ETIQUETA_TEMA[tema]}
          </span>
        ))}
        {punto.afecta_vecinos_prob !== null && (
          <span className="tabular-nums">
            Afectación a vecinos {formatearPorcentaje(punto.afecta_vecinos_prob)}
          </span>
        )}
        {punto.importe_eur !== null && (
          <span className="font-semibold text-apagado">Importe {formatearImporte(punto.importe_eur)}</span>
        )}
        {punto.confianza_min !== null && (
          <span title="Confianza mínima de la clasificación automática">
            Confianza {formatearPorcentaje(punto.confianza_min)}
          </span>
        )}
        {punto.clasificado_con === null && <span>Pendiente de clasificación automática</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <EnlaceExterno href={fuenteUrl} className="font-medium">
          Documento original
        </EnlaceExterno>
        <a
          className="text-apagado hover:text-marca-fuerte hover:underline"
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
