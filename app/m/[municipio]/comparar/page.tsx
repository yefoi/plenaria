import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Insignia } from '@/app/components/Insignia';
import { municipioPorId } from '@/lib/config';
import { TEMAS, type DocumentoSesion, type Tema } from '@/lib/schemas';
import { fechaLargaEspanol } from '@/lib/utils/dates';
import { repositorio } from '@/lib/web/data';
import { ETIQUETA_TEMA, formatearImporte } from '@/lib/web/labels';

export const dynamic = 'force-dynamic';

interface ResumenComparado {
  total: number;
  afectan: number;
  altoImpacto: number;
  conImporte: number;
  sumaImportes: number;
  temas: Record<string, number>;
}

function resumir(doc: DocumentoSesion): ResumenComparado {
  const temas: Record<string, number> = {};
  let afectan = 0;
  let altoImpacto = 0;
  let conImporte = 0;
  let sumaImportes = 0;
  for (const punto of doc.puntos) {
    for (const tema of punto.temas) temas[tema] = (temas[tema] ?? 0) + 1;
    if ((punto.afecta_vecinos_prob ?? 0) >= 0.5) afectan++;
    if ((punto.impacto ?? 0) >= 4) altoImpacto++;
    if (punto.importe_eur !== null) {
      conImporte++;
      sumaImportes += punto.importe_eur;
    }
  }
  return { total: doc.puntos.length, afectan, altoImpacto, conImporte, sumaImportes, temas };
}

function Diferencia({ valor }: { valor: number }) {
  if (valor === 0) return <span className="text-stone-500 dark:text-stone-400">0</span>;
  const signo = valor > 0 ? '+' : '';
  return (
    <span className={valor > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-sky-800 dark:text-sky-300'}>
      {signo}
      {valor}
    </span>
  );
}

export default async function PaginaComparar({
  params,
  searchParams,
}: {
  params: Promise<{ municipio: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { municipio: municipioId } = await params;
  const municipio = municipioPorId(municipioId);
  if (!municipio) notFound();

  const { a, b } = await searchParams;
  const repo = repositorio();
  const sesiones = await repo.listarSesiones(municipio.id);
  if (sesiones.length < 2) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comparar sesiones</h1>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          Hacen falta al menos dos sesiones procesadas para comparar.
        </p>
      </div>
    );
  }

  const idA = a && sesiones.some((s) => s.id === a) ? a : sesiones[1].id;
  const idB = b && sesiones.some((s) => s.id === b) ? b : sesiones[0].id;
  const docA = await repo.obtenerSesion(municipio.id, idA);
  const docB = await repo.obtenerSesion(municipio.id, idB);
  if (!docA || !docB) notFound();

  const resumenA = resumir(docA);
  const resumenB = resumir(docB);
  const temasPresentes = TEMAS.filter((t) => (resumenA.temas[t] ?? 0) > 0 || (resumenB.temas[t] ?? 0) > 0);
  const puntosA = [...docA.puntos].filter((p) => (p.impacto ?? 0) >= 4).sort((x, y) => (y.impacto ?? 0) - (x.impacto ?? 0));
  const puntosB = [...docB.puntos].filter((p) => (p.impacto ?? 0) >= 4).sort((x, y) => (y.impacto ?? 0) - (x.impacto ?? 0));

  const selector = (etiqueta: string, seleccionado: string, otro: string) => (
    <div>
      <h2 className="text-sm font-medium">{etiqueta}</h2>
      <ul className="mt-1 flex flex-wrap gap-2 text-xs">
        {sesiones.slice(0, 6).map((s) => (
          <li key={s.id}>
            <Link
              className={`rounded-full border px-3 py-1 ${
                s.id === seleccionado
                  ? 'border-sky-600 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100'
                  : 'border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'
              }`}
              href={`/m/${municipio.id}/comparar?a=${s.id}&b=${otro}`}
            >
              {fechaLargaEspanol(s.fecha)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-6">
      <nav aria-label="Migas de pan" className="text-sm">
        <Link className="underline underline-offset-2" href="/">
          Inicio
        </Link>{' '}
        /{' '}
        <Link className="underline underline-offset-2" href={`/m/${municipio.id}`}>
          {municipio.nombre}
        </Link>{' '}
        / <span>Comparar</span>
      </nav>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">Comparar sesiones</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-stone-400">
          Comparación calculada sobre los puntos publicados: conteos por tema, puntos que afectan a
          vecinos, impacto alto e importes detectados. No valora políticamente ninguna sesión.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {selector('Sesión A', idA, idB)}
        {selector('Sesión B', idB, idA)}
      </div>

      <section aria-labelledby="tabla" className="overflow-x-auto">
        <h2 id="tabla" className="text-lg font-semibold">
          Resumen
        </h2>
        <table className="mt-3 w-full min-w-[32rem] border-collapse text-sm">
          <caption className="sr-only">
            Comparación de métricas entre la sesión A y la sesión B
          </caption>
          <thead>
            <tr className="border-b border-stone-300 text-left dark:border-stone-700">
              <th scope="col" className="py-2 pr-4">Métrica</th>
              <th scope="col" className="py-2 pr-4">
                A · {fechaLargaEspanol(docA.sesion.fecha)}
              </th>
              <th scope="col" className="py-2 pr-4">
                B · {fechaLargaEspanol(docB.sesion.fecha)}
              </th>
              <th scope="col" className="py-2">Diferencia (B−A)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-stone-200 dark:border-stone-800">
              <th scope="row" className="py-2 pr-4 font-normal">Puntos tratados</th>
              <td className="py-2 pr-4">{resumenA.total}</td>
              <td className="py-2 pr-4">{resumenB.total}</td>
              <td className="py-2"><Diferencia valor={resumenB.total - resumenA.total} /></td>
            </tr>
            <tr className="border-b border-stone-200 dark:border-stone-800">
              <th scope="row" className="py-2 pr-4 font-normal">Afectan a vecinos</th>
              <td className="py-2 pr-4">{resumenA.afectan}</td>
              <td className="py-2 pr-4">{resumenB.afectan}</td>
              <td className="py-2"><Diferencia valor={resumenB.afectan - resumenA.afectan} /></td>
            </tr>
            <tr className="border-b border-stone-200 dark:border-stone-800">
              <th scope="row" className="py-2 pr-4 font-normal">Impacto 4-5</th>
              <td className="py-2 pr-4">{resumenA.altoImpacto}</td>
              <td className="py-2 pr-4">{resumenB.altoImpacto}</td>
              <td className="py-2"><Diferencia valor={resumenB.altoImpacto - resumenA.altoImpacto} /></td>
            </tr>
            <tr className="border-b border-stone-200 dark:border-stone-800">
              <th scope="row" className="py-2 pr-4 font-normal">Puntos con importe</th>
              <td className="py-2 pr-4">{resumenA.conImporte}</td>
              <td className="py-2 pr-4">{resumenB.conImporte}</td>
              <td className="py-2"><Diferencia valor={resumenB.conImporte - resumenA.conImporte} /></td>
            </tr>
            <tr>
              <th scope="row" className="py-2 pr-4 font-normal">Suma de importes detectados</th>
              <td className="py-2 pr-4">{formatearImporte(resumenA.sumaImportes)}</td>
              <td className="py-2 pr-4">{formatearImporte(resumenB.sumaImportes)}</td>
              <td className="py-2">
                <Diferencia valor={Math.round(resumenB.sumaImportes - resumenA.sumaImportes)} />
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section aria-labelledby="temas" className="overflow-x-auto">
        <h2 id="temas" className="text-lg font-semibold">
          Puntos por tema
        </h2>
        {temasPresentes.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Sin temas clasificados.</p>
        ) : (
          <table className="mt-3 w-full min-w-[24rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-300 text-left dark:border-stone-700">
                <th scope="col" className="py-2 pr-4">Tema</th>
                <th scope="col" className="py-2 pr-4">A</th>
                <th scope="col" className="py-2 pr-4">B</th>
                <th scope="col" className="py-2">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {temasPresentes.map((tema: Tema) => (
                <tr key={tema} className="border-b border-stone-200 dark:border-stone-800">
                  <th scope="row" className="py-2 pr-4 font-normal">{ETIQUETA_TEMA[tema]}</th>
                  <td className="py-2 pr-4">{resumenA.temas[tema] ?? 0}</td>
                  <td className="py-2 pr-4">{resumenB.temas[tema] ?? 0}</td>
                  <td className="py-2">
                    <Diferencia valor={(resumenB.temas[tema] ?? 0) - (resumenA.temas[tema] ?? 0)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="destacados" className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 id="destacados" className="text-lg font-semibold">
            Impacto 4-5 en A · {fechaLargaEspanol(docA.sesion.fecha)}
          </h2>
          <ul className="mt-2 space-y-2 text-sm">
            {puntosA.length === 0 ? (
              <li className="text-stone-600 dark:text-stone-400">Ninguno.</li>
            ) : (
              puntosA.map((p) => (
                <li key={p.id}>
                  <Insignia tono="aviso">Impacto {p.impacto}/5</Insignia>{' '}
                  <Link className="underline underline-offset-2" href={`/m/${municipio.id}/${docA.sesion.id}#punto-${p.orden}`}>
                    {p.titulo.slice(0, 90)}
                    {p.titulo.length > 90 ? '…' : ''}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Impacto 4-5 en B · {fechaLargaEspanol(docB.sesion.fecha)}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {puntosB.length === 0 ? (
              <li className="text-stone-600 dark:text-stone-400">Ninguno.</li>
            ) : (
              puntosB.map((p) => (
                <li key={p.id}>
                  <Insignia tono="aviso">Impacto {p.impacto}/5</Insignia>{' '}
                  <Link className="underline underline-offset-2" href={`/m/${municipio.id}/${docB.sesion.id}#punto-${p.orden}`}>
                    {p.titulo.slice(0, 90)}
                    {p.titulo.length > 90 ? '…' : ''}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
