import Link from 'next/link';
import { ETIQUETA_TEMA } from '@/lib/web/labels';
import type { Tema } from '@/lib/schemas';

export function FiltrosPuntos({
  basePath,
  temasDisponibles,
  temaActivo,
  afectaActivo,
}: {
  basePath: string;
  temasDisponibles: Tema[];
  temaActivo: string | null;
  afectaActivo: boolean;
}) {
  const url = (tema: string | null, afecta: boolean) => {
    const params = new URLSearchParams();
    if (tema) params.set('tema', tema);
    if (afecta) params.set('afecta', '1');
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <nav aria-label="Filtros de puntos" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow pr-1">Filtrar</span>
        <Link
          href={url(null, afectaActivo)}
          aria-pressed={temaActivo === null}
          className={`chip ${temaActivo === null ? 'chip-activo' : ''}`}
        >
          Todos los temas
        </Link>
        <Link
          href={url(temaActivo, !afectaActivo)}
          aria-pressed={afectaActivo}
          className={`chip ${afectaActivo ? 'border-ok-linea bg-ok-fondo font-medium text-ok-texto' : ''}`}
        >
          Solo afecta a vecinos
        </Link>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {temasDisponibles.map((tema) => (
          <li key={tema}>
            <Link
              href={url(tema === temaActivo ? null : tema, afectaActivo)}
              aria-pressed={tema === temaActivo}
              className={`chip ${tema === temaActivo ? 'chip-activo' : ''}`}
            >
              {ETIQUETA_TEMA[tema]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
