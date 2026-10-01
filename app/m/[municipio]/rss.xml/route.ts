import { MARCA } from '@/lib/brand';
import { municipioPorId } from '@/lib/config';
import { repositorio } from '@/lib/web/data';
import { ETIQUETA_TEMA, formatearImporte } from '@/lib/web/labels';
import { TEMAS, type Punto, type Sesion, type Tema } from '@/lib/schemas';

function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ municipio: string }> },
) {
  const { municipio: municipioId } = await params;
  const municipio = municipioPorId(municipioId);
  if (!municipio) {
    return new Response('Municipio no encontrado', { status: 404 });
  }

  const temaParam = new URL(request.url).searchParams.get('tema');
  const tema = temaParam && (TEMAS as readonly string[]).includes(temaParam) ? (temaParam as Tema) : null;

  const repo = repositorio();
  const sesiones = await repo.listarSesiones(municipio.id);
  const items: { punto: Punto; sesion: Sesion }[] = [];
  for (const resumen of sesiones) {
    const doc = await repo.obtenerSesion(municipio.id, resumen.id);
    if (!doc) continue;
    for (const punto of doc.puntos) {
      if ((punto.impacto ?? 0) < 4) continue;
      if (tema && !punto.temas.includes(tema)) continue;
      items.push({ punto, sesion: doc.sesion });
    }
    if (items.length >= 40) break;
  }
  items.sort((a, b) => (a.sesion.fecha < b.sesion.fecha ? 1 : -1));

  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? new URL(request.url).origin;
  const enlaces = items
    .map(({ punto, sesion }) => {
      const url = `${base}/m/${municipio.id}/${sesion.id}#punto-${punto.orden}`;
      const descripcion = punto.sensible
        ? 'Punto reservado por privacidad: ver documento original.'
        : punto.texto_redactado.slice(0, 300) +
          (punto.importe_eur !== null ? ` (Importe detectado: ${formatearImporte(punto.importe_eur)})` : '');
      return [
        '    <item>',
        `      <title>${escaparXml(`[Impacto ${punto.impacto}/5] ${punto.titulo}`)}</title>`,
        `      <link>${escaparXml(url)}</link>`,
        `      <guid isPermaLink="false">${escaparXml(punto.id)}</guid>`,
        `      <pubDate>${new Date(`${sesion.fecha}T08:00:00Z`).toUTCString()}</pubDate>`,
        `      <description>${escaparXml(descripcion)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${escaparXml(
      tema
        ? `${MARCA.global} — ${municipio.nombre} · ${ETIQUETA_TEMA[tema]}`
        : `${MARCA.global} — ${municipio.nombre}`,
    )}</title>`,
    `    <link>${escaparXml(tema ? `${base}/m/${municipio.id}?tema=${tema}` : `${base}/m/${municipio.id}`)}</link>`,
    `    <description>${escaparXml(
      tema
        ? `Puntos de ${ETIQUETA_TEMA[tema].toLowerCase()} con impacto vecinal alto (4 o 5 sobre 5) de los plenos municipales. No es fuente oficial.`
        : 'Puntos con impacto vecinal alto (4 o 5 sobre 5) de los plenos municipales. No es fuente oficial.',
    )}</description>`,
    '    <language>es</language>',
    `    <generator>${escaparXml(MARCA.global)}</generator>`,
    enlaces,
    '  </channel>',
    '</rss>',
    '',
  ]
    .filter((l) => l !== '')
    .join('\n');

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
