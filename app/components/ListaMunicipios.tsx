'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export interface MunicipioLista {
  id: string;
  nombre: string;
  provincia: string;
  sesiones: number;
  ultimaFecha: string | null;
}

export function ListaMunicipios({ municipios }: { municipios: MunicipioLista[] }) {
  const [consulta, setConsulta] = useState('');
  const filtrados = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    if (!q) return municipios;
    return municipios.filter(
      (m) => m.nombre.toLowerCase().includes(q) || m.provincia.toLowerCase().includes(q),
    );
  }, [consulta, municipios]);

  return (
    <section aria-labelledby="titulo-municipios">
      <h2 id="titulo-municipios" className="text-lg font-semibold">
        Municipios
      </h2>
      <label className="mt-3 block max-w-sm text-sm font-medium" htmlFor="buscador">
        Buscar municipio
        <input
          id="buscador"
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Nombre o provincia"
          className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
        />
      </label>
      {filtrados.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          No hay municipios que coincidan.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {filtrados.map((m) => (
            <li key={m.id}>
              <Link
                href={`/m/${m.id}`}
                className="block rounded-lg border border-stone-200 bg-white p-4 shadow-sm hover:border-sky-400 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-sky-700"
              >
                <span className="font-medium">{m.nombre}</span>
                <span className="block text-sm text-stone-600 dark:text-stone-400">
                  {m.provincia} · {m.sesiones} sesiones procesadas
                  {m.ultimaFecha ? ` · última: ${m.ultimaFecha}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
