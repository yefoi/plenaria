import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Insignia } from '@/app/components/Insignia';
import { PuntoCard } from '@/app/components/PuntoCard';
import { municipioPorId } from '@/lib/config';
import { fechaLargaEspanol } from '@/lib/utils/dates';
import { repositorio } from '@/lib/web/data';
import { ETIQUETA_ESTADO } from '@/lib/web/labels';

export const dynamic = 'force-dynamic';

export default async function PaginaSesion({
  params,
}: {
  params: Promise<{ municipio: string; sesion: string }>;
}) {
  const { municipio: municipioId, sesion: sesionId } = await params;
  const municipio = municipioPorId(municipioId);
  if (!municipio) notFound();

  const repo = repositorio();
  const doc = await repo.obtenerSesion(municipio.id, sesionId);
  if (!doc) notFound();

  const puntos = [...doc.puntos].sort((a, b) => a.orden - b.orden);

  return (
    <div>
      <nav aria-label="Migas de pan" className="text-sm">
        <Link className="underline underline-offset-2" href="/">
          Inicio
        </Link>{' '}
        /{' '}
        <Link className="underline underline-offset-2" href={`/m/${municipio.id}`}>
          {municipio.nombre}
        </Link>{' '}
        / <span>{doc.sesion.fecha}</span>
      </nav>

      <header className="mt-3">
        <h1 className="text-2xl font-bold tracking-tight">
          Pleno del {fechaLargaEspanol(doc.sesion.fecha)}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
          <Insignia>{doc.sesion.tipo}</Insignia>
          <Insignia tono="info">{ETIQUETA_ESTADO[doc.sesion.estado_ingesta]}</Insignia>
          <span>{doc.puntos.length} puntos</span>
          <a
            className="underline underline-offset-2"
            href={doc.sesion.fuente_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Documento original (PDF)
          </a>
        </div>
        {doc.sesion.estado_ingesta === 'segmentacion_pobre' && (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            La segmentación automática de este documento es dudosa: puede contener todos los
            acuerdos en un único punto o faltar alguno. Consulta siempre el PDF original.
          </p>
        )}
        {doc.sesion.estado_ingesta === 'requiere_ocr' && (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            El documento no tiene capa de texto y no se procesa (no se hace OCR en esta versión).
          </p>
        )}
        {doc.sesion.estado_ingesta === 'redactada' && (
          <p className="mt-3 rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
            Esta sesión está pendiente de la pasada de clasificación automática.
          </p>
        )}
      </header>

      <div className="mt-6 space-y-3">
        {puntos.map((punto) => (
          <PuntoCard
            key={punto.id}
            punto={punto}
            municipioId={municipio.id}
            sesionId={doc.sesion.id}
            fuenteUrl={doc.sesion.fuente_url}
          />
        ))}
      </div>
    </div>
  );
}
