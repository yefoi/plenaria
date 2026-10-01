import { describe, expect, it } from 'vitest';
import {
  aplicarTema,
  CLAVE_TEMA,
  CLASES_TEMA,
  esPreferenciaTema,
  ORDEN_TEMA,
} from '@/lib/web/tema';

function raizFalsa(sistemaOscuro: boolean) {
  const clases = new Set<string>();
  return {
    style: {} as { colorScheme?: string },
    classList: {
      toggle: (nombre: string, activo: boolean) => {
        if (activo) clases.add(nombre);
        else clases.delete(nombre);
      },
    },
    clases,
    sistemaOscuro,
  };
}

function aplicar(raiz: ReturnType<typeof raizFalsa>, preferencia: string) {
  const original = globalThis.document;
  Object.defineProperty(globalThis, 'document', {
    value: {
      documentElement: raiz,
    },
    configurable: true,
  });
  globalThis.window = {
    matchMedia: () => ({ matches: raiz.sistemaOscuro }),
  } as unknown as Window & typeof globalThis;
  try {
    aplicarTema(esPreferenciaTema(preferencia));
  } finally {
    Object.defineProperty(globalThis, 'document', { value: original, configurable: true });
    Reflect.deleteProperty(globalThis, 'window');
  }
}

describe('tema', () => {
  it('lee solo preferencias conocidas y cae en auto', () => {
    expect(esPreferenciaTema('oscuro')).toBe('oscuro');
    expect(esPreferenciaTema('claro')).toBe('claro');
    expect(esPreferenciaTema('auto')).toBe('auto');
    expect(esPreferenciaTema('inventado')).toBe('auto');
    expect(esPreferenciaTema(undefined)).toBe('auto');
  });

  it('el servidor no pinta clase para auto y sí para los otros dos', () => {
    expect(CLASES_TEMA.auto).toBe('');
    expect(CLASES_TEMA.oscuro).toBe('dark');
    expect(CLASES_TEMA.claro).toBe('claro');
  });

  it('el ciclo del interruptor pasa por los tres estados', () => {
    expect(ORDEN_TEMA).toEqual(['auto', 'claro', 'oscuro']);
    const siguiente = (p: string) => ORDEN_TEMA[(ORDEN_TEMA.indexOf(p as never) + 1) % 3];
    expect(siguiente('auto')).toBe('claro');
    expect(siguiente('claro')).toBe('oscuro');
    expect(siguiente('oscuro')).toBe('auto');
  });

  it('con preferencia auto delega en el sistema y no fija clase', () => {
    const raiz = raizFalsa(true);
    aplicar(raiz, 'auto');
    expect(raiz.clases.has('dark')).toBe(false);
    expect(raiz.clases.has('claro')).toBe(false);
    expect(raiz.style.colorScheme).toBe('light dark');
  });

  it('una preferencia explicita manda sobre el sistema', () => {
    const oscuro = raizFalsa(false);
    aplicar(oscuro, 'oscuro');
    expect(oscuro.clases.has('dark')).toBe(true);
    expect(oscuro.style.colorScheme).toBe('dark');

    const claro = raizFalsa(true);
    aplicar(claro, 'claro');
    expect(claro.clases.has('claro')).toBe(true);
    expect(claro.clases.has('dark')).toBe(false);
    expect(claro.style.colorScheme).toBe('light');
  });

  it('la cookie tiene un nombre estable', () => {
    expect(CLAVE_TEMA).toBe('plenaria-tema');
  });
});
