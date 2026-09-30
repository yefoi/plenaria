import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ManualAdapter } from '@/lib/adapters/manual';
import { extraerEnlacesPdf, fechaDesdeUrl } from '@/lib/adapters/pdf-transparencia';
import { csvAFilasObjeto, parsearCsv } from '@/lib/utils/csv';
import { procesarSesion } from '@/lib/pipeline/procesar';
import { documentoSesionSchema, municipioSchema } from '@/lib/schemas';
import type { Municipio } from '@/lib/schemas';

describe('parsearCsv', () => {
  it('parsea campos entrecomillados con comas y saltos internos', () => {
    const csv = 'a,b,c\n"1,2","x\ny",3\n';
    const filas = parsearCsv(csv);
    expect(filas).toHaveLength(2);
    expect(filas[1]).toEqual(['1,2', 'x\ny', '3']);
  });

  it('convierte a objetos y limpia el BOM', () => {
    const csv = '\uFEFF"CODI_ENS","NOM_ENS"\n"123","Vila"\n';
    const filas = csvAFilasObjeto(csv);
    expect(filas).toEqual([{ CODI_ENS: '123', NOM_ENS: 'Vila' }]);
  });
});

describe('extraerEnlacesPdf', () => {
  it('encuentra PDFs y resuelve URLs relativas', () => {
    const html = `
      <ul>
        <li><a href="/docs/acta-pleno-2026-01-15.pdf">Acta</a></li>
        <li><a href="https://otro.example/acta.pdf">Otro</a></li>
        <li><a href="/docs/acta-pleno-2026-02-15.pdf">Acta 2</a></li>
      </ul>`;
    const enlaces = extraerEnlacesPdf(html, /\/docs\/acta.*\.pdf$/i, 'https://transparencia.ejemplo.es/listado');
    expect(enlaces).toHaveLength(2);
    expect(enlaces[0].url).toBe('https://transparencia.ejemplo.es/docs/acta-pleno-2026-01-15.pdf');
  });
});

describe('fechaDesdeUrl', () => {
  it('interpreta fechas con mes en español (Toledo)', () => {
    expect(
      fechaDesdeUrl(
        'https://www.toledo.es/wp-content/uploads/2026/09/acta-sesion-ordinaria-pleno-celebrado-el-24-de-julio-de-2026.pdf',
      ),
    ).toBe('2026-07-24');
    expect(
      fechaDesdeUrl(
        'https://www.toledo.es/wp-content/uploads/2025/11/acta-de-la-sesion-ordinaria-celebrada-el-26-de-septiembre-de-2025..pdf',
      ),
    ).toBe('2025-09-26');
  });

  it('interpreta fechas numéricas y respeta un patrón explícito', () => {
    expect(fechaDesdeUrl('https://x.es/acta-2026-01-15.pdf')).toBe('2026-01-15');
    expect(fechaDesdeUrl('https://x.es/acta-15.01.2026.pdf')).toBe('2026-01-15');
    expect(
      fechaDesdeUrl(
        'https://x.es/acta-2026.pdf?fecha=2025-03-02',
        /fecha=(\d{4}-\d{2}-\d{2})/,
      ),
    ).toBe('2025-03-02');
  });

  it('devuelve null si no reconoce fecha', () => {
    expect(fechaDesdeUrl('https://x.es/acta-sin-fecha.pdf')).toBeNull();
  });
});

describe('ManualAdapter con un PDF real del piloto', () => {
  it('extrae, segmenta y produce un documento válido con 35 puntos', async () => {
    const rutaPdf = path.join(
      process.cwd(),
      'fixtures',
      'hospitalet-llobregat',
      'sesion-2026-09-23.pdf',
    );
    const buffer = new Uint8Array(fs.readFileSync(rutaPdf));
    const adapter = new ManualAdapter('extracte-acords');
    const referencia = adapter.agregar(
      { fecha: '2026-09-23', tipo: 'ordinaria', urlDocumento: 'https://example.com/acta.pdf' },
      buffer,
    );
    const contenido = await adapter.fetch(referencia);
    const parseado = await adapter.parse(contenido);

    expect(parseado.requiereOcr).toBe(false);
    expect(parseado.segmentacionPobre).toBe(false);
    expect(parseado.puntos).toHaveLength(35);

    const municipio: Municipio = municipioSchema.parse({
      id: 'prueba',
      nombre: 'Prueba',
      provincia: 'Barcelona',
      fuente_tipo: 'manual',
      fuente_config: { formato: 'extracte-acords' },
    });
    const doc = procesarSesion({
      municipio,
      referencia,
      parseado,
      hashContenido: 'hash-de-prueba-123',
      sesionId: '2026-09-23',
      fuenteUrl: 'https://example.com/acta.pdf',
    });

    const validado = documentoSesionSchema.parse(doc);
    expect(validado.puntos).toHaveLength(35);
    expect(validado.sesion.estado_ingesta).toBe('redactada');
    const sensibles = validado.puntos.filter((p) => p.sensible);
    expect(sensibles.length).toBeGreaterThan(0);
    for (const p of sensibles) {
      expect(p.texto_redactado).toBe('');
      expect(p.titulo).toMatch(/^Punto/);
    }
  }, 60000);
});
