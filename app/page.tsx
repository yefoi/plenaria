import Link from 'next/link';
import { ListaMunicipios, type MunicipioLista } from '@/app/components/ListaMunicipios';
import { MUNICIPIOS } from '@/lib/config';
import { repositorio } from '@/lib/web/data';
import { fechaLargaEspanol } from '@/lib/utils/dates';
import type { ResumenSesion } from '@/lib/repo/repository';

export const dynamic = 'force-dynamic';

export default async function PaginaInicio() {
  const repo = repositorio();
  const municipios: MunicipioLista[] = [];
  const ultimos: { municipioId: string; municipioNombre: string; sesion: ResumenSesion }[] = [];

  for (const m of MUNICIPIOS) {
    const sesiones = await repo.listarSesiones(m.id);
    municipios.push({
      id: m.id,
      nombre: m.nombre,
      provincia: m.provincia,
      sesiones: sesiones.length,
      ultimaFecha: sesiones[0]?.fecha ?? null,
    });
    for (const s of sesiones.slice(0, 4)) {
      ultimos.push({ municipioId: m.id, municipioNombre: m.nombre, sesion: s });
    }
  }
  ultimos.sort((a, b) => (a.sesion.fecha < b.sesion.fecha ? 1 : -1));

  return (
    <div className="space-y-10">
      <section aria-labelledby="titulo-intro">
        <h1 id="titulo-intro" className="text-2xl font-bold tracking-tight">
          Los plenos municipales, punto por punto
        </h1>
        <p className="mt-3 max-w-2xl text-stone-700 dark:text-stone-300">
          Resúmenes legibles y filtrables de las sesiones plenarias: qué se aprobó, qué temas
          trata y cuánto puede afectar a la vida diaria de los vecinos. Cada punto enlaza a su
          documento original. Sin valoraciones políticas y con los datos personales redactados.
        </p>
      </section>

      <ListaMunicipios municipios={municipios} />

      <section aria-labelledby="titulo-ultimos">
        <h2 id="titulo-ultimos" className="text-lg font-semibold">
          Últimos plenos procesados
        </h2>
        {ultimos.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
            Todavía no hay plenos procesados. Ejecuta <code>npm run ingest</code> para empezar.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {ultimos.map(({ municipioId, municipioNombre, sesion }) => (
              <li
                key={`${municipioId}-${sesion.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    className="font-medium underline underline-offset-2"
                    href={`/m/${municipioId}/${sesion.id}`}
                  >
                    {municipioNombre}
                  </Link>
                  <span>{fechaLargaEspanol(sesion.fecha)}</span>
                  <span className="text-stone-600 dark:text-stone-400">
                    {sesion.num_puntos} puntos
                  </span>
                  {sesion.max_impacto !== null && sesion.max_impacto >= 4 && (
                    <span className="text-amber-800 dark:text-amber-300">
                      impacto destacado {sesion.max_impacto}/5
                    </span>
                  )}
                </div>
                <Link className="underline underline-offset-2" href={`/m/${municipioId}`}>
                  Ver municipio
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
