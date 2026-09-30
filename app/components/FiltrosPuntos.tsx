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
    <nav aria-label="Filtros de puntos" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">Filtrar:</span>
        <Link
          href={url(null, afectaActivo)}
          className={`rounded-full border px-3 py-1 ${temaActivo === null ? 'border-sky-600 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100' : 'border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'}`}
        >
          Todos los temas
        </Link>
        <Link
          href={url(temaActivo, !afectaActivo)}
          className={`rounded-full border px-3 py-1 ${afectaActivo ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100' : 'border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'}`}
          aria-pressed={afectaActivo}
        >
          Solo afecta a vecinos
        </Link>
      </div>
      <ul className="flex flex-wrap gap-2 text-sm">
        {temasDisponibles.map((tema) => (
          <li key={tema}>
            <Link
              href={url(tema === temaActivo ? null : tema, afectaActivo)}
              className={`rounded-full border px-3 py-1 ${tema === temaActivo ? 'border-sky-600 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100' : 'border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'}`}
              aria-pressed={tema === temaActivo}
            >
              {ETIQUETA_TEMA[tema]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
