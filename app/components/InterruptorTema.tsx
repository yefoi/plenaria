'use client';

import { useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import {
  aplicarTema,
  CLAVE_TEMA,
  ETIQUETA_TEMA,
  ORDEN_TEMA,
  type PreferenciaTema,
} from '@/lib/web/tema';

const suscriptores = new Set<() => void>();
const avisar = () => {
  for (const fn of suscriptores) fn();
};

function suscribir(fn: () => void) {
  suscriptores.add(fn);
  return () => {
    suscriptores.delete(fn);
  };
}

function preferenciaGuardada(): PreferenciaTema {
  const valor = document.cookie
    .split('; ')
    .find((parte) => parte.startsWith(`${CLAVE_TEMA}=`))
    ?.split('=')[1];
  return valor === 'claro' || valor === 'oscuro' || valor === 'auto' ? valor : 'auto';
}

function Icono({ preferencia }: { preferencia: PreferenciaTema }) {
  const comun = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none' as const };
  if (preferencia === 'claro') {
    return (
      <svg {...comun} aria-hidden="true">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (preferencia === 'oscuro') {
    return (
      <svg {...comun} aria-hidden="true">
        <path
          d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg {...comun} aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 20h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function InterruptorTema({
  preferenciaInicial,
}: {
  preferenciaInicial: PreferenciaTema;
}) {
  const router = useRouter();
  const preferencia = useSyncExternalStore(suscribir, preferenciaGuardada, () => preferenciaInicial);

  const siguiente = ORDEN_TEMA[(ORDEN_TEMA.indexOf(preferencia) + 1) % ORDEN_TEMA.length];

  const cambiar = () => {
    document.cookie = `${CLAVE_TEMA}=${siguiente}; path=/; max-age=31536000; samesite=lax`;
    aplicarTema(siguiente);
    avisar();
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={cambiar}
      title={`Tema ${ETIQUETA_TEMA[preferencia]}. Pulsa para cambiar a ${ETIQUETA_TEMA[siguiente]}.`}
      aria-label={`Tema ${ETIQUETA_TEMA[preferencia]}. Cambiar a ${ETIQUETA_TEMA[siguiente]}.`}
      className="inline-flex size-9 items-center justify-center rounded-full border border-linea-fuerte bg-superficie text-apagado transition-colors hover:border-marca hover:bg-marca-tenue hover:text-marca-fuerte"
    >
      <Icono preferencia={preferencia} />
    </button>
  );
}
