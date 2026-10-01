import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Insignia } from '@/app/components/Insignia';
import { Migas, Seccion } from '@/app/components/ui';
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
  if (valor === 0) return <span className="text-tenue">0</span>;
  const signo = valor > 0 ? '+' : '';
  return (
    <span
      className={`font-semibold tabular-nums ${valor > 0 ? 'text-aviso-texto' : 'text-ok-texto'}`}
    >
      {signo}
      {valor}
    </span>
  );
}

const CABECERA_TD = 'py-2.5 pr-4 align-top';

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
      <div className="space-y-6">
        <Migas
          pasos={[
            { texto: 'Inicio', href: '/' },
            { texto: municipio.nombre, href: `/m/${municipio.id}` },
            { texto: 'Comparar' },
          ]}
        />
        <h1 className="text-3xl font-semibold text-marca-fuerte">Comparar sesiones</h1>
        <p className="text-sm text-apagado">
          Hacen falta al menos dos sesiones procesadas para comparar.{' '}
          <Link className="enlace-subrayado text-marca" href={`/m/${municipio.id}`}>
            Volver al municipio
          </Link>
          .
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
  const temasPresentes = TEMAS.filter(
    (t) => (resumenA.temas[t] ?? 0) > 0 || (resumenB.temas[t] ?? 0) > 0,
  );
  const puntosA = [...docA.puntos]
    .filter((p) => (p.impacto ?? 0) >= 4)
    .sort((x, y) => (y.impacto ?? 0) - (x.impacto ?? 0));
  const puntosB = [...docB.puntos]
    .filter((p) => (p.impacto ?? 0) >= 4)
    .sort((x, y) => (y.impacto ?? 0) - (x.impacto ?? 0));

  const selector = (etiqueta: string, seleccionado: string, otro: string) => (
    <div>
      <p className="eyebrow">{etiqueta}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {sesiones.slice(0, 6).map((s) => (
          <li key={s.id}>
            <Link
              aria-pressed={s.id === seleccionado}
              className={`chip ${s.id === seleccionado ? 'chip-activo' : ''}`}
              href={`/m/${municipio.id}/comparar?a=${s.id}&b=${otro}`}
            >
              {fechaLargaEspanol(s.fecha)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  const METRICAS: { etiqueta: string; a: string; b: string; dif: number }[] = [
    {
      etiqueta: 'Puntos tratados',
      a: String(resumenA.total),
      b: String(resumenB.total),
      dif: resumenB.total - resumenA.total,
    },
    {
      etiqueta: 'Afectan a vecinos',
      a: String(resumenA.afectan),
      b: String(resumenB.afectan),
      dif: resumenB.afectan - resumenA.afectan,
    },
    {
      etiqueta: 'Impacto 4-5',
      a: String(resumenA.altoImpacto),
      b: String(resumenB.altoImpacto),
      dif: resumenB.altoImpacto - resumenA.altoImpacto,
    },
    {
      etiqueta: 'Puntos con importe',
      a: String(resumenA.conImporte),
      b: String(resumenB.conImporte),
      dif: resumenB.conImporte - resumenA.conImporte,
    },
    {
      etiqueta: 'Suma de importes',
      a: formatearImporte(resumenA.sumaImportes),
      b: formatearImporte(resumenB.sumaImportes),
      dif: Math.round(resumenB.sumaImportes - resumenA.sumaImportes),
    },
  ];

  const columnaDestacados = (
    titulo: string,
    puntos: typeof puntosA,
    fecha: string,
    idSesion: string,
  ) => (
    <div>
      <p className="eyebrow">Impacto 4-5</p>
      <h3 className="mt-1 font-serif text-lg font-semibold text-marca-fuerte">{titulo}</h3>
      <p className="text-sm text-apagado">{fechaLargaEspanol(fecha)}</p>
      {puntos.length === 0 ? (
        <p className="mt-3 text-sm text-apagado">Ningún punto con impacto alto en esta sesión.</p>
      ) : (
        <ul className="mt-3 grid gap-1.5">
          {puntos.map((p) => (
            <li key={p.id} className="flex gap-2.5 border-b border-linea pb-1.5 text-sm last:border-0">
              <span className="shrink-0">
                <Insignia tono="aviso">{p.impacto}/5</Insignia>
              </span>
              <Link
                className="text-marca hover:underline"
                href={`/m/${municipio.id}/${idSesion}#punto-${p.orden}`}
                title={p.titulo}
              >
                {p.titulo.length > 90 ? `${p.titulo.slice(0, 90)}…` : p.titulo}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="space-y-10">
      <Migas
        pasos={[
          { texto: 'Inicio', href: '/' },
          { texto: municipio.nombre, href: `/m/${municipio.id}` },
          { texto: 'Comparar' },
        ]}
      />

      <header>
        <p className="eyebrow">{municipio.provincia}</p>
        <h1 className="mt-2 text-3xl font-semibold text-marca-fuerte sm:text-4xl">
          Comparar sesiones
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-apagado">
          Comparación calculada sobre los puntos publicados: conteos por tema, puntos que afectan a
          vecinos, impacto alto e importes detectados. No valora políticamente ninguna sesión.
        </p>
      </header>

      <div className="tarjeta grid gap-5 p-5 sm:grid-cols-2">
        {selector('Sesión A', idA, idB)}
        {selector('Sesión B', idB, idA)}
      </div>

      <Seccion id="tabla" eyebrow="Agregado" titulo="Resumen de ambas sesiones">
        <div className="tarjeta overflow-x-auto p-2 sm:p-4">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <caption className="sr-only">
              Comparación de métricas entre la sesión A y la sesión B
            </caption>
            <thead>
              <tr className="border-b-2 border-linea-fuerte text-left">
                <th scope="col" className="py-2.5 pr-4 font-semibold text-apagado">
                  Métrica
                </th>
                <th scope="col" className="py-2.5 pr-4 font-semibold text-marca-fuerte">
                  A · {fechaLargaEspanol(docA.sesion.fecha)}
                </th>
                <th scope="col" className="py-2.5 pr-4 font-semibold text-marca-fuerte">
                  B · {fechaLargaEspanol(docB.sesion.fecha)}
                </th>
                <th scope="col" className="py-2.5 font-semibold text-apagado">
                  B−A
                </th>
              </tr>
            </thead>
            <tbody>
              {METRICAS.map((fila, indice) => (
                <tr
                  key={fila.etiqueta}
                  className={indice < METRICAS.length - 1 ? 'border-b border-linea' : ''}
                >
                  <th scope="row" className={`${CABECERA_TD} text-left font-medium text-texto`}>
                    {fila.etiqueta}
                  </th>
                  <td className={`${CABECERA_TD} tabular-nums`}>{fila.a}</td>
                  <td className={`${CABECERA_TD} tabular-nums`}>{fila.b}</td>
                  <td className={`${CABECERA_TD} tabular-nums`}>
                    <Diferencia valor={fila.dif} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion id="temas" eyebrow="Distribución" titulo="Puntos por tema">
        {temasPresentes.length === 0 ? (
          <p className="tarjeta p-5 text-sm text-apagado">Sin temas clasificados.</p>
        ) : (
          <div className="tarjeta overflow-x-auto p-2 sm:p-4">
            <table className="w-full min-w-[24rem] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-linea-fuerte text-left">
                  <th scope="col" className="py-2.5 pr-4 font-semibold text-apagado">
                    Tema
                  </th>
                  <th scope="col" className="py-2.5 pr-4 font-semibold text-apagado">
                    A
                  </th>
                  <th scope="col" className="py-2.5 pr-4 font-semibold text-apagado">
                    B
                  </th>
                  <th scope="col" className="py-2.5 font-semibold text-apagado">
                    B−A
                  </th>
                </tr>
              </thead>
              <tbody>
                {temasPresentes.map((tema: Tema, indice) => (
                  <tr
                    key={tema}
                    className={
                      indice < temasPresentes.length - 1 ? 'border-b border-linea' : ''
                    }
                  >
                    <th scope="row" className={`${CABECERA_TD} text-left font-normal`}>
                      {ETIQUETA_TEMA[tema]}
                    </th>
                    <td className={`${CABECERA_TD} tabular-nums`}>{resumenA.temas[tema] ?? 0}</td>
                    <td className={`${CABECERA_TD} tabular-nums`}>{resumenB.temas[tema] ?? 0}</td>
                    <td className={`${CABECERA_TD} tabular-nums`}>
                      <Diferencia
                        valor={(resumenB.temas[tema] ?? 0) - (resumenA.temas[tema] ?? 0)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>

      <Seccion
        id="destacados"
        eyebrow="Puntos destacados"
        titulo="Impacto vecinal alto en cada sesión"
        descripcion="Los cinco puntos con mayor puntuación de impacto de cada sesión."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="tarjeta p-5">
            {columnaDestacados('Sesión A', puntosA, docA.sesion.fecha, docA.sesion.id)}
          </div>
          <div className="tarjeta p-5">
            {columnaDestacados('Sesión B', puntosB, docB.sesion.fecha, docB.sesion.id)}
          </div>
        </div>
      </Seccion>
    </div>
  );
}
