import { describe, expect, it } from 'vitest';
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
});
