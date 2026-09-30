import { describe, expect, it } from 'vitest';
import { extraerImportes, importePrincipal, normalizarNumeroEspanol } from '@/lib/pipeline/amounts';

describe('normalizarNumeroEspanol', () => {
  it('interpreta formato español', () => {
    expect(normalizarNumeroEspanol('1.234,56')).toBe(1234.56);
    expect(normalizarNumeroEspanol('120.000')).toBe(120000);
    expect(normalizarNumeroEspanol('1234,5')).toBe(1234.5);
  });

  it('interpreta decimales con punto', () => {
    expect(normalizarNumeroEspanol('1234.56')).toBe(1234.56);
  });

  it('rechaza valores absurdos', () => {
    expect(normalizarNumeroEspanol('1.2345.6789')).toBeNull();
  });
});

describe('extraerImportes', () => {
  it('extrae importes con símbolo de euro', () => {
    expect(extraerImportes('Aprovat un pressupost de 1.234,56 € per obres.')).toEqual([1234.56]);
  });

  it('extrae importes con la palabra euros', () => {
    expect(extraerImportes('La subvenció de 120.000 euros i una altra de 35.500 euros.')).toEqual([
      120000, 35500,
    ]);
  });

  it('extrae millones y miles', () => {
    expect(extraerImportes('Inversió d’1,5 millones de euros i 500 mil euros més.')).toEqual([
      1_500_000, 500_000,
    ]);
  });

  it('no confunde años ni números de expediente', () => {
    expect(extraerImportes('Expedient 143042/2026 de data 23-09-2026.')).toEqual([]);
  });

  it('importePrincipal devuelve el máximo', () => {
    expect(importePrincipal('Despeses de 2.000,00 € i de 15.750,25 €.')).toBe(15750.25);
  });

  it('importePrincipal devuelve null sin importes', () => {
    expect(importePrincipal('Acord sense cap xifra econòmica.')).toBeNull();
  });
});
