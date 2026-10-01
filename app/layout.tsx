import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { MARCA } from '@/lib/brand';
import { FUENTES } from '@/lib/fuentes-web';
import { CLAVE_TEMA, CLASES_TEMA, esPreferenciaTema } from '@/lib/web/tema';
import InterruptorTema from '@/app/components/InterruptorTema';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${MARCA.global} — ${MARCA.nombreLocalLargo}`,
    template: `%s · ${MARCA.global}`,
  },
  description: MARCA.descripcion,
  metadataBase: new URL('https://plenaria-civica.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: MARCA.global,
    title: `${MARCA.global} — ${MARCA.nombreLocalLargo}`,
    description: MARCA.descripcion,
  },
};

const NAVEGACION = [
  { texto: 'Metodología', href: '/metodologia' },
  { texto: 'Fuentes', href: '/fuentes' },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const preferencia = esPreferenciaTema((await cookies()).get(CLAVE_TEMA)?.value);

  return (
    <html lang="es" className={CLASES_TEMA[preferencia]}>
      <body
        className={`flex min-h-screen flex-col ${FUENTES.sans.variable} ${FUENTES.serif.variable}`}
      >
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>

        <header className="sticky top-0 z-40 border-b border-linea bg-superficie/85 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3">
            <Link href="/" className="group flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-md bg-marca font-serif text-lg font-semibold text-superficie-2 shadow-suave"
              >
                P
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-serif text-lg font-semibold tracking-tight text-marca-fuerte">
                  {MARCA.global}
                </span>
                <span className="mt-1 text-xs text-tenue">{MARCA.nombreLocalLargo}</span>
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <nav aria-label="Principal">
                <ul className="flex items-center gap-1 text-sm">
                  {NAVEGACION.map((entrada) => (
                    <li key={entrada.href}>
                      <Link
                        href={entrada.href}
                        className="rounded-full px-3 py-1.5 text-apagado transition-colors hover:bg-marca-tenue hover:text-marca-fuerte"
                      >
                        {entrada.texto}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <InterruptorTema preferenciaInicial={preferencia} />
            </div>
          </div>
        </header>

        <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
          {children}
        </main>

        <footer className="mt-8 border-t border-linea bg-superficie">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="font-serif text-base font-semibold text-marca-fuerte">{MARCA.global}</p>
              <p className="mt-2 text-sm text-apagado">
                {MARCA.nombreLocalLargo}: una herramienta informativa elaborada a partir de
                documentos publicados por las administraciones.
              </p>
            </div>
            <div className="text-sm text-apagado">
              <p className="font-semibold text-texto">Avisos</p>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <strong className="font-semibold text-texto">No es fuente oficial</strong> ni
                  asesoramiento legal: verifica siempre el documento original enlazado.
                </li>
                <li>No se puntúan partidos ni personas, ni se atribuye ningún voto.</li>
                <li>Los datos personales se redactan antes de su publicación.</li>
              </ul>
            </div>
            <div className="text-sm text-apagado">
              <p className="font-semibold text-texto">Páginas</p>
              <ul className="mt-2 space-y-1.5">
                {NAVEGACION.map((entrada) => (
                  <li key={entrada.href}>
                    <Link className="enlace-subrayado text-marca" href={entrada.href}>
                      {entrada.texto}
                    </Link>
                  </li>
                ))}
                <li>
                  <a
                    className="enlace-subrayado text-marca"
                    href="https://github.com/yefoi/plenaria"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Código fuente
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-linea">
            <p className="mx-auto w-full max-w-6xl px-5 py-4 text-xs text-tenue">
              Cartografía del mapa: Instituto Geográfico Nacional (CC BY 4.0), vía es-atlas.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
