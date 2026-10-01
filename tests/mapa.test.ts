import { describe, expect, it } from 'vitest';
import { agruparPines, type PinMapa } from '@/app/components/MapaEspana';
import { MUNICIPIOS } from '@/lib/config';
import mapa from '@/lib/mapa/espana.json';

describe('mapa de España', () => {
  it('contiene las provincias con identificador y trazo', () => {
    expect(mapa.provincias.length).toBeGreaterThanOrEqual(52);
    for (const provincia of mapa.provincias) {
      expect(provincia.id).toMatch(/^\d{2}$/);
      expect(provincia.nombre.length).toBeGreaterThan(2);
      expect(provincia.d.length).toBeGreaterThan(50);
    }
    const ids = mapa.provincias.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sitúa todos los municipios configurados con su provincia', () => {
    const idsProvincias = new Set(mapa.provincias.map((p) => p.id));
    for (const municipio of MUNICIPIOS) {
      const pin = mapa.pines.find((p) => p.municipio_id === municipio.id);
      expect(pin, `Falta el pin de ${municipio.id}: ejecuta npm run mapa`).toBeDefined();
      if (!pin) continue;
      expect(idsProvincias.has(pin.provincia_id)).toBe(true);
      expect(pin.nombre).toBe(municipio.nombre);
    }
  });

  it('coloca todos los pines dentro del viewBox', () => {
    const [x, y, ancho, alto] = mapa.viewBox.split(' ').map(Number);
    for (const pin of mapa.pines) {
      expect(pin.x).toBeGreaterThanOrEqual(x);
      expect(pin.x).toBeLessThanOrEqual(x + ancho);
      expect(pin.y).toBeGreaterThanOrEqual(y);
      expect(pin.y).toBeLessThanOrEqual(y + alto);
    }
  });

  it('cada provincia tiene bbox para el zoom', () => {
    for (const provincia of mapa.provincias) {
      expect(provincia.bbox).toHaveLength(4);
      const [x0, y0, x1, y1] = provincia.bbox;
      expect(x1).toBeGreaterThan(x0);
      expect(y1).toBeGreaterThan(y0);
    }
  });
});

describe('agruparPines', () => {
  const pines: PinMapa[] = [
    { municipio_id: 'a', nombre: 'A', provincia_id: '08', x: 10, y: 10 },
    { municipio_id: 'b', nombre: 'B', provincia_id: '08', x: 12, y: 11 },
    { municipio_id: 'c', nombre: 'C', provincia_id: '08', x: 50, y: 50 },
    { municipio_id: 'd', nombre: 'D', provincia_id: '28', x: 200, y: 200 },
  ];

  it('agrupa los pines cercanos y deja sueltos los lejanos', () => {
    const grupos = agruparPines(pines, 10, null);
    expect(grupos).toHaveLength(3);
    expect(grupos.find((g) => g.pines.length === 2)?.pines.map((p) => p.municipio_id).sort()).toEqual(['a', 'b']);
  });

  it('filtra por provincia cuando hay zoom', () => {
    const grupos = agruparPines(pines, 10, '28');
    expect(grupos).toHaveLength(1);
    expect(grupos[0].pines[0].municipio_id).toBe('d');
  });
});
