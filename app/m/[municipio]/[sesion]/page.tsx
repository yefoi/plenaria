import { notFound } from 'next/navigation';
import { Insignia } from '@/app/components/Insignia';
import { PuntoCard } from '@/app/components/PuntoCard';
import { Aviso, EnlaceExterno, Migas, Seccion } from '@/app/components/ui';
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
    <div className="space-y-10">
      <Migas
        pasos={[
          { texto: 'Inicio', href: '/' },
          { texto: municipio.nombre, href: `/m/${municipio.id}` },
          { texto: fechaLargaEspanol(doc.sesion.fecha) },
        ]}
      />

      <header>
        <p className="eyebrow">{municipio.provincia}</p>
        <h1 className="mt-2 text-3xl font-semibold text-marca-fuerte sm:text-4xl">
          Pleno del {fechaLargaEspanol(doc.sesion.fecha)}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-apagado">
          <Insignia>{doc.sesion.tipo}</Insignia>
          <Insignia tono="info">{ETIQUETA_ESTADO[doc.sesion.estado_ingesta]}</Insignia>
          <span className="tabular-nums">
            {doc.puntos.length} {doc.puntos.length === 1 ? 'punto' : 'puntos'}
          </span>
          <EnlaceExterno href={doc.sesion.fuente_url}>Documento original</EnlaceExterno>
        </div>
      </header>

      {doc.sesion.estado_ingesta === 'segmentacion_pobre' && (
        <Aviso tono="aviso" titulo="Segmentación dudosa">
          La segmentación automática de este documento es dudosa: puede contener todos los acuerdos
          en un único punto o faltar alguno. Consulta siempre el documento original.
        </Aviso>
      )}
      {doc.sesion.estado_ingesta === 'requiere_ocr' && (
        <Aviso tono="aviso" titulo="Documento sin capa de texto">
          El documento no tiene capa de texto y no se procesa (no se hace OCR en esta versión).
        </Aviso>
      )}
      {doc.sesion.estado_ingesta === 'redactada' && (
        <Aviso tono="info" titulo="Pendiente de clasificar">
          Esta sesión está pendiente de la pasada de clasificación automática.
        </Aviso>
      )}

      <Seccion
        id="puntos-sesion"
        eyebrow="Todos los acuerdos"
        titulo={`${puntos.length} ${puntos.length === 1 ? 'punto' : 'puntos'} del orden del día`}
        descripcion="En el mismo orden en que aparecen en el documento oficial."
      >
        <div className="grid gap-3">
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
      </Seccion>
    </div>
  );
}
