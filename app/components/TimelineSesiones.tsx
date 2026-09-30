import Link from 'next/link';
import { Insignia } from '@/app/components/Insignia';
import { ETIQUETA_ESTADO } from '@/lib/web/labels';
import { fechaLargaEspanol } from '@/lib/utils/dates';
import type { ResumenSesion } from '@/lib/repo/repository';

export function TimelineSesiones({
  municipioId,
  sesiones,
}: {
  municipioId: string;
  sesiones: ResumenSesion[];
}) {
  return (
    <section aria-labelledby="titulo-sesiones" className="mt-10">
      <h2 id="titulo-sesiones" className="text-lg font-semibold">
        Sesiones procesadas
      </h2>
      <ol className="mt-3 space-y-2">
        {sesiones.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Link className="font-medium underline underline-offset-2" href={`/m/${municipioId}/${s.id}`}>
                {fechaLargaEspanol(s.fecha)}
              </Link>
              <Insignia>{s.tipo}</Insignia>
              <span className="text-stone-600 dark:text-stone-400">{s.num_puntos} puntos</span>
              {s.max_impacto !== null && <Insignia tono="aviso">Impacto máx. {s.max_impacto}/5</Insignia>}
              {s.estado_ingesta !== 'clasificada' && (
                <Insignia tono="aviso">{ETIQUETA_ESTADO[s.estado_ingesta] ?? s.estado_ingesta}</Insignia>
              )}
            </div>
            <a
              className="underline underline-offset-2"
              href={s.fuente_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              PDF original
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
