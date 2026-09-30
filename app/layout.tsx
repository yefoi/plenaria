import type { Metadata } from 'next';
import Link from 'next/link';
import { MARCA } from '@/lib/brand';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${MARCA.global} — ${MARCA.nombreLocalLargo}`,
    template: `%s · ${MARCA.global}`,
  },
  description: MARCA.descripcion,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col">
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <header className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-lg font-semibold tracking-tight">{MARCA.global}</span>
              <span className="text-sm text-stone-600 dark:text-stone-400">
                {MARCA.nombreLocalLargo}
              </span>
            </Link>
            <nav aria-label="Principal">
              <ul className="flex items-center gap-4 text-sm">
                <li>
                  <Link className="hover:underline" href="/metodologia">
                    Metodología
                  </Link>
                </li>
                <li>
                  <Link className="hover:underline" href="/fuentes">
                    Fuentes
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-stone-200 px-4 py-6 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-400">
          <div className="mx-auto max-w-5xl space-y-2">
            <p>
              {MARCA.global} ({MARCA.nombreLocal}) es una herramienta informativa elaborada a partir
              de documentos publicados por las administraciones. <strong>No es fuente oficial</strong>{' '}
              ni asesoramiento legal: verifica siempre el documento original enlazado.
            </p>
            <p>
              No se puntúan partidos ni personas. Los datos personales se redactan antes de su
              publicación. <Link className="underline" href="/metodologia">Metodología y limitaciones</Link>.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
