'use client';

import Link from 'next/link';
import { useDeferredValue, useId, useMemo, useState } from 'react';

export interface MunicipioLista {
  id: string;
  nombre: string;
  provincia: string;
  sesiones: number;
  ultimaFecha: string | null;
}

const FECHA_CORTA = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function fechaCorta(iso: string | null): string {
  if (!iso) return '';
  const fecha = new Date(`${iso}T00:00:00`);
  return Number.isNaN(fecha.getTime()) ? iso : FECHA_CORTA.format(fecha);
}

export function ListaMunicipios({ municipios }: { municipios: MunicipioLista[] }) {
  const [consulta, setConsulta] = useState('');
  const diferida = useDeferredValue(consulta);
  const idBuscador = useId();

  const filtrados = useMemo(() => {
    const q = diferida.trim().toLowerCase();
    if (!q) return municipios;
    return municipios.filter(
      (m) => m.nombre.toLowerCase().includes(q) || m.provincia.toLowerCase().includes(q),
    );
  }, [diferida, municipios]);

  const idResultados = `${idBuscador}-resultados`;

  return (
    <section aria-labelledby="titulo-municipios" id="municipios">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-linea pb-3">
        <div>
          <p className="eyebrow">Directorio</p>
          <h2 id="titulo-municipios" className="mt-1 text-xl text-marca-fuerte">
            Municipios con datos
          </h2>
        </div>
        <p className="text-sm text-apagado">
          <span className="font-semibold tabular-nums text-marca-fuerte">{municipios.length}</span>{' '}
          municipios
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="relative block w-full max-w-xs" htmlFor={idBuscador}>
          <span className="sr-only">Buscar municipio por nombre o provincia</span>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tenue"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id={idBuscador}
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Buscar por nombre o provincia"
            aria-describedby={idResultados}
            className="w-full rounded-full border border-linea-fuerte bg-superficie py-2 pl-9 pr-4 text-sm text-texto placeholder:text-tenue transition-colors focus:border-marca"
          />
        </label>
        <p id={idResultados} role="status" className="text-sm text-tenue">
          {filtrados.length === municipios.length
            ? 'Ordenados por número de sesiones'
            : `${filtrados.length} de ${municipios.length}`}
        </p>
      </div>

      {filtrados.length === 0 ? (
        <p className="tarjeta mt-4 p-5 text-sm text-apagado">
          Ningún municipio coincide con «{consulta}». Prueba con el nombre sin acertar o con la
          provincia.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((m) => (
            <li key={m.id}>
              <Link href={`/m/${m.id}`} className="tarjeta-clic block px-4 py-3.5">
                <span className="block font-serif text-[0.9375rem] font-semibold leading-snug text-marca-fuerte">
                  {m.nombre}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-apagado">
                  <span className="rounded bg-marca-tenue px-1.5 py-0.5 font-medium text-marca">
                    {m.provincia}
                  </span>
                  <span className="tabular-nums">
                    {m.sesiones} {m.sesiones === 1 ? 'sesión' : 'sesiones'}
                  </span>
                  {m.ultimaFecha && <span className="text-tenue">· {fechaCorta(m.ultimaFecha)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
