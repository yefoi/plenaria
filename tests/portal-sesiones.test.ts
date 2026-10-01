import { describe, expect, it } from 'vitest';
import { extraerDocumentoWeb, extraerSesionesWeb } from '@/lib/adapters/portal-sesiones';
import { fechaDesdeUrl } from '@/lib/adapters/pdf-transparencia';

const UA = 'Plenaria/0.1';

describe('fechaDesdeUrl', () => {
  it('reconoce fechas con mes en español con y sin «de»', () => {
    expect(fechaDesdeUrl('.../sesion-pleno-ordinario-23-julio-2026')).toBe('2026-07-23');
    expect(fechaDesdeUrl('.../Pleno/29-de-septiembre-de-2026/')).toBe('2026-09-29');
    expect(fechaDesdeUrl('.../Acta del 23 de julio de 2026.pdf')).toBe('2026-07-23');
  });
});

describe('extraerSesionesWeb (listado)', () => {
  const listadoMadrid = `
    <a href="/portales/.../Pleno/29-de-septiembre-de-2026/?vgnextoid=x">29 de septiembre de 2026</a>
    <a href="/portales/.../Pleno/30-de-junio-de-2026-Extraordinaria/?vgnextoid=y">Extra</a>
    <a href="/portales/.../Pleno/26-de-mayo-de-2026/?vgnextoid=z">26 de mayo</a>
    <a href="/portales/.../Pleno/26-de-mayo-de-2026/?vgnextoid=z">dup</a>
  `;

  it('extrae sesiones únicas según el patrón (Madrid)', () => {
    const sesiones = extraerSesionesWeb(listadoMadrid, /Pleno\/\d{1,2}-de-[a-z]+-de-\d{4}/i, 'https://www.madrid.es/');
    expect(sesiones).toHaveLength(3);
    expect(sesiones[0].url).toContain('29-de-septiembre-de-2026');
  });

  it('extrae sesiones de un portal municipal (Móstoles)', () => {
    const listadoMostoles = `
      <a href="/es/.../sesion-pleno-ordinario-ayuntamiento-mostoles-24-septiembre">24 septiembre</a>
      <a href="/es/.../sesion-pleno-extraordinario-urgente-ayuntamiento-mostoles-6">6</a>
      <a href="/es/.../plenos-municipales">indice</a>
    `;
    const sesiones = extraerSesionesWeb(listadoMostoles, /sesion-pleno-[^/]+$/i, 'https://www.mostoles.es/');
    expect(sesiones).toHaveLength(2);
  });
});

describe('extraerDocumentoWeb', () => {
  const pagina = `
    <a href="/docs/Convocatoria de Pleno.pdf">Convocatoria</a>
    <a href="/docs/Extracto de Pleno ordinario.pdf">Extracto</a>
    <a href="/docs/Acta de Pleno Ordinario del 23 de julio de 2026.pdf">Acta</a>
  `;

  it('prefiere el acta frente a extracto y convocatoria', () => {
    const doc = extraerDocumentoWeb(
      pagina,
      [/Acta de Pleno/i, /Extracto de Pleno/i],
      'https://www.mostoles.es/',
    );
    expect(decodeURIComponent(doc ?? '')).toContain('Acta de Pleno');
  });

  it('cae al extracto si no hay acta', () => {
    const soloExtracto = '<a href="/docs/Extracto de Pleno.pdf">E</a>';
    const doc = extraerDocumentoWeb(soloExtracto, [/Acta de Pleno/i, /Extracto de Pleno/i], 'https://x.es/');
    expect(decodeURIComponent(doc ?? '')).toContain('Extracto');
  });

  it('devuelve null si no hay documento', () => {
    expect(extraerDocumentoWeb('<a href="/otra.pdf">x</a>', [/Acta de Pleno/i], 'https://x.es/')).toBeNull();
  });
});

describe('user agent', () => {
  it('es identificable', () => {
    expect(UA).toContain('Plenaria');
  });
});
