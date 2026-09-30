import { describe, expect, it } from 'vitest';
import { parsearRobots, rutaPermitida } from '@/lib/http/robots';

const UA = 'Plenaria/0.1 (+contacto)';

describe('parsearRobots', () => {
  it('parsea las reglas de dadesobertes.seu-e.cat', () => {
    const texto = [
      'User-agent: *',
      'Disallow: /dataset/rate/',
      'Disallow: /revision/',
      'Disallow: /dataset/*/history',
      'Disallow: /api/',
      'Crawl-Delay: 10',
      'User-agent: bingbot',
      'Disallow: /',
    ].join('\n');
    const reglas = parsearRobots(texto, UA);
    expect(rutaPermitida(reglas, '/csv/agn-ag-actes-de-ple.csv')).toBe(true);
    expect(rutaPermitida(reglas, '/api/3/action/package_show')).toBe(false);
    expect(rutaPermitida(reglas, '/dataset/foo/history')).toBe(false);
    expect(reglas.crawlDelaySegundos).toBe(10);
  });

  it('trata la línea malformada de media.seu-e.cat como no restrictiva (RFC 9309)', () => {
    const texto = ['User-Agent: *', 'Disallow:', '*/acteca'].join('\r\n');
    const reglas = parsearRobots(texto, UA);
    expect(rutaPermitida(reglas, '/acteca/810170005/2026/abc/acta.pdf')).toBe(true);
  });

  it('respeta un Disallow válido si el operador lo publica', () => {
    const texto = ['User-Agent: *', 'Disallow: */acteca'].join('\n');
    const reglas = parsearRobots(texto, UA);
    expect(rutaPermitida(reglas, '/acteca/810170005/2026/abc/acta.pdf')).toBe(false);
  });

  it('aplica la regla más específica y permite con empate', () => {
    const texto = ['User-Agent: *', 'Disallow: /privado/', 'Allow: /privado/publico/'].join('\n');
    const reglas = parsearRobots(texto, UA);
    expect(rutaPermitida(reglas, '/privado/otro')).toBe(false);
    expect(rutaPermitida(reglas, '/privado/publico/x')).toBe(true);
  });

  it('sin reglas permite todo', () => {
    expect(rutaPermitida(parsearRobots('User-agent: *\nDisallow:', UA), '/cualquier/cosa')).toBe(true);
  });

  it('respeta el grupo específico de nuestro user-agent', () => {
    const texto = [
      'User-agent: bingbot',
      'Disallow: /',
      'User-agent: Plenaria',
      'Disallow: /solo-para-nosotros/',
    ].join('\n');
    const reglas = parsearRobots(texto, UA);
    expect(rutaPermitida(reglas, '/todo')).toBe(true);
    expect(rutaPermitida(reglas, '/solo-para-nosotros/x')).toBe(false);
  });
});
