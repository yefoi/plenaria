import Link from 'next/link';
import { Insignia } from '@/app/components/Insignia';
import { Seccion, EnlaceExterno } from '@/app/components/ui';
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
    <Seccion
      id="sesiones"
      eyebrow="Historial"
      titulo="Sesiones procesadas"
      descripcion={`${sesiones.length} ${sesiones.length === 1 ? 'sesión' : 'sesiones'} con acta o extracto publicado en el portal oficial.`}
    >
      <ol className="grid gap-2">
        {sesiones.map((s) => (
          <li key={s.id}>
            <div className="tarjeta-clic flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 text-sm">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                <Link
                  href={`/m/${municipioId}/${s.id}`}
                  className="font-serif font-semibold text-marca-fuerte hover:underline"
                >
                  {fechaLargaEspanol(s.fecha)}
                </Link>
                <Insignia>{s.tipo}</Insignia>
                <span className="tabular-nums text-apagado">{s.num_puntos} puntos</span>
                {s.max_impacto !== null && s.max_impacto >= 4 && (
                  <Insignia tono="aviso">Impacto máx. {s.max_impacto}/5</Insignia>
                )}
                {s.estado_ingesta !== 'clasificada' && (
                  <Insignia tono="aviso">{ETIQUETA_ESTADO[s.estado_ingesta] ?? s.estado_ingesta}</Insignia>
                )}
              </div>
              <EnlaceExterno href={s.fuente_url} className="shrink-0 text-apagado">
                Documento original
              </EnlaceExterno>
            </div>
          </li>
        ))}
      </ol>
    </Seccion>
  );
}
