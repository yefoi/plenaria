import Link from 'next/link';
import type { ReactNode } from 'react';

export function Seccion({
  id,
  eyebrow,
  titulo,
  descripcion,
  acciones,
  children,
  className = '',
}: {
  id?: string;
  eyebrow?: string;
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const cabeceraId = id ? `${id}-titulo` : undefined;
  return (
    <section aria-labelledby={cabeceraId} className={className}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-linea pb-3">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 id={cabeceraId} className={`text-xl text-marca-fuerte ${eyebrow ? 'mt-1' : ''}`}>
            {titulo}
          </h2>
          {descripcion && (
            <p className="mt-1.5 max-w-2xl text-sm text-apagado">{descripcion}</p>
          )}
        </div>
        {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

export function Tarjeta({
  children,
  className = '',
  as: Element = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'section' | 'li';
}) {
  return <Element className={`tarjeta p-5 ${className}`}>{children}</Element>;
}

export function Aviso({
  tono = 'info',
  titulo,
  children,
}: {
  tono?: 'info' | 'aviso' | 'peligro' | 'ok';
  titulo?: string;
  children: ReactNode;
}) {
  const estilos = {
    info: 'border-info-linea bg-info-fondo text-info-texto',
    aviso: 'border-aviso-linea bg-aviso-fondo text-aviso-texto',
    peligro: 'border-peligro-linea bg-peligro-fondo text-peligro-texto',
    ok: 'border-ok-linea bg-ok-fondo text-ok-texto',
  }[tono];
  return (
    <div className={`rounded-r-lg border-l-4 border-y border-r border-y-transparent ${estilos} p-4 text-sm`}>
      {titulo && <p className="font-semibold">{titulo}</p>}
      <div className={titulo ? 'mt-1' : ''}>{children}</div>
    </div>
  );
}

export function Dato({
  valor,
  etiqueta,
  detalle,
}: {
  valor: ReactNode;
  etiqueta: string;
  detalle?: string;
}) {
  return (
    <div className="tarjeta px-4 py-3">
      <p className="text-2xl font-semibold tabular-nums text-marca-fuerte">{valor}</p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-apagado">{etiqueta}</p>
      {detalle && <p className="mt-1 text-xs text-tenue">{detalle}</p>}
    </div>
  );
}

type VarianteBoton = 'primario' | 'secundario' | 'sutil';

const VARIANTES: Record<VarianteBoton, string> = {
  primario:
    'border-transparent bg-marca text-superficie-2 hover:bg-marca-fuerte shadow-suave',
  secundario:
    'border-linea-fuerte bg-superficie text-marca hover:border-marca hover:bg-marca-tenue',
  sutil: 'border-transparent bg-transparent text-marca hover:bg-marca-tenue',
};

const BASE_BOTON =
  'inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors';

export function Boton({
  href,
  variante = 'secundario',
  className = '',
  children,
  ...resto
}: {
  href: string;
  variante?: VarianteBoton;
  className?: string;
  children: ReactNode;
  target?: string;
  rel?: string;
  title?: string;
  'aria-label'?: string;
}) {
  const clases = `${BASE_BOTON} ${VARIANTES[variante]} ${className}`;
  const externo = resto.target === '_blank';
  if (externo) {
    return (
      <a className={clases} {...resto}>
        {children}
      </a>
    );
  }
  return (
    <Link className={clases} href={href} {...resto}>
      {children}
    </Link>
  );
}

export function Migas({ pasos }: { pasos: { texto: string; href?: string }[] }) {
  return (
    <nav aria-label="Migas de pan">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-apagado">
        {pasos.map((paso, indice) => (
          <li key={`${paso.texto}-${indice}`} className="flex items-center gap-1.5">
            {indice > 0 && (
              <span aria-hidden="true" className="text-tenue">
                /
              </span>
            )}
            {paso.href ? (
              <Link className="rounded hover:text-marca-fuerte hover:underline" href={paso.href}>
                {paso.texto}
              </Link>
            ) : (
              <span className="text-texto">{paso.texto}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function EnlaceExterno({
  href,
  children,
  className = '',
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      className={`enlace-subrayado inline-flex items-center gap-1 ${className}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
