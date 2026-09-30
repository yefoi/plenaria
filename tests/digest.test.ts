import { describe, expect, it, vi } from 'vitest';
import { construirDigest, construirResumen } from '@/lib/digest/weekly';
import {
  generarResumenConModelo,
  ResumenModeloDeshabilitadoError,
  verificarResumen,
} from '@/lib/digest/modelo';
import type { Punto } from '@/lib/schemas';

function punto(parcial: Partial<Punto> & { id: string; orden: number; titulo: string }): Punto {
  return {
    sesion_id: 's1',
    texto_redactado: parcial.titulo,
    importe_eur: null,
    sensible: false,
    tipo_punto: 'acuerdo',
    temas: ['otros'],
    afecta_vecinos_prob: null,
    impacto: null,
    confianza_min: null,
    revision_manual: false,
    clasificado_con: null,
    ...parcial,
  };
}

describe('construirResumen', () => {
  const puntos: Punto[] = [
    punto({ id: 'a', orden: 1, titulo: 'Aprovar el pressupost', impacto: 5, afecta_vecinos_prob: 0.9 }),
    punto({ id: 'b', orden: 2, titulo: 'Tràmit intern', impacto: 1, afecta_vecinos_prob: 0.1 }),
    punto({ id: 'c', orden: 3, titulo: 'Millora de parcs', impacto: 4, afecta_vecinos_prob: 0.8 }),
  ];

  it('compone totales y lista de destacados con enlaces internos', () => {
    const resumen = construirResumen('Vila', 'vila', [{ id: '2026-01-10', fecha: '2026-01-10', puntos }]);
    expect(resumen).toContain('1 pleno procesado');
    expect(resumen).toContain('3 puntos en total');
    expect(resumen).toContain('2 afectan directamente a vecinos');
    expect(resumen).toContain('El pleno del 10 de enero de 2026 trató 3 puntos; 2 afectan');
    expect(resumen).toContain('/m/vila/2026-01-10#punto-1');
    expect(resumen).toContain('/m/vila/2026-01-10#punto-3');
    expect(resumen).not.toContain('#punto-2');
  });

  it('no inventa nada si no hay sesiones', () => {
    expect(construirResumen('Vila', 'vila', [])).toContain('Sin plenos procesados');
  });

  it('construirDigest guarda ids de destacados y semana ISO', () => {
    const digest = construirDigest('vila', 'Vila', [{ id: '2026-01-10', fecha: '2026-01-10', puntos }]);
    expect(digest.semana_iso).toBe('2026-W02');
    expect(digest.puntos_destacados).toEqual(['a', 'c']);
  });
});

describe('verificarResumen', () => {
  it('acepta cifras presentes en la fuente', () => {
    const fuente = 'El pleno trató 35 puntos y aprobó 1.234,56 euros en ayudas.';
    const r = verificarResumen('Se trataron 35 puntos y 1.234,56 euros.', fuente);
    expect(r.ok).toBe(true);
  });

  it('detecta cifras inventadas', () => {
    const r = verificarResumen('Se trataron 42 puntos.', 'El pleno trató 35 puntos.');
    expect(r.ok).toBe(false);
    expect(r.cifrasAusentes).toContain('42');
  });
});

describe('generarResumenConModelo', () => {
  it('está desactivado por defecto', async () => {
    await expect(
      generarResumenConModelo('texto', { generar: vi.fn() }),
    ).rejects.toBeInstanceOf(ResumenModeloDeshabilitadoError);
  });

  it('cuando se habilita, verifica las cifras contra la fuente', async () => {
    const generar = vi.fn(async () => 'El pleno trató 12 puntos inventados.');
    const { verificacion } = await generarResumenConModelo('El pleno trató 35 puntos.', {
      habilitado: true,
      generar,
    });
    expect(generar).toHaveBeenCalledOnce();
    expect(verificacion.ok).toBe(false);
  });
});
