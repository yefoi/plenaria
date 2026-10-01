import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { segmentar } from '@/lib/pipeline/segment';

function fixture(nombre: string): string {
  return fs.readFileSync(
    path.join(process.cwd(), 'fixtures', 'hospitalet-llobregat', nombre),
    'utf8',
  );
}

describe('segmentar extracte d’acords (Hospitalet)', () => {
  it('segmenta la sesión del 2026-09-23 en 35 puntos sin pobreza de segmentación', () => {
    const r = segmentar(fixture('sesion-2026-09-23.txt'), 'extracte-acords');
    expect(r.segmentacionPobre).toBe(false);
    expect(r.metodo).toBe('extracte-acords');
    expect(r.puntos).toHaveLength(35);
    expect(r.puntos[0].titulo.startsWith('LECTURA I APROVACIÓ')).toBe(true);
    expect(r.puntos[0].resultado).toBe('aprovada');
    expect(r.puntos[34].orden).toBe(35);
  });

  it('no incluye ruido de cabecera ni referencias en los títulos', () => {
    const r = segmentar(fixture('sesion-2026-09-23.txt'), 'extracte-acords');
    for (const p of r.puntos) {
      expect(p.titulo).not.toMatch(/CODI DE VERIFICACIÓ/i);
      expect(p.titulo).not.toMatch(/\d+\/\d+\s*$/);
      expect(p.titulo).not.toMatch(/AJT\//);
      expect(p.titulo).not.toMatch(/Partit Popular|Esquerra Republicana|Vox/i);
      expect(p.titulo).not.toMatch(/F_FIRMA/);
      expect(p.titulo.length).toBeGreaterThan(8);
    }
  });

  it('segmenta las otras dos sesiones de fixtures en más de 15 puntos', () => {
    for (const f of ['sesion-2026-07-29.txt', 'sesion-2026-06-30.txt']) {
      const r = segmentar(fixture(f), 'extracte-acords');
      expect(r.segmentacionPobre).toBe(false);
      expect(r.puntos.length).toBeGreaterThan(15);
    }
  });

  it('mantiene el orden y los resultados detectados', () => {
    const r = segmentar(fixture('sesion-2026-09-23.txt'), 'extracte-acords');
    r.puntos.forEach((p, idx) => expect(p.orden).toBe(idx + 1));
    const resultados = r.puntos.map((p) => p.resultado);
    expect(resultados).toContain('assabentat');
    expect(resultados).toContain('rebutjada');
  });
});

describe('segmentar otros formatos', () => {
  it('segmenta un acta numerada con expedientes', () => {
    const acta = [
      'ACTA DE LA SESSIÓ ORDINÀRIA',
      'Desenvolupament de la sessió',
      '1. ÀREA D’ALCALDIA Expedient: 33/2026/1029 : Moció per a la sanitat pública.',
      'Text llarg de la moció amb detalls.',
      '2. ÀREA DE SERVEIS GENERALS Expedient: 1/2026/1472 : Decret a donar compte al Ple.',
      'Més text del punt.',
      '3. PRECS I PREGUNTES',
      'Pregunta sobre els contenidors del carrer Major.',
    ].join('\n');
    const r = segmentar(acta);
    expect(r.metodo).toBe('acta-numerada');
    expect(r.segmentacionPobre).toBe(false);
    expect(r.puntos).toHaveLength(3);
    expect(r.puntos[1].titulo).toContain('SERVEIS GENERALS');
  });

  it('segmenta un acta con lista de asistentes, dígitos y subapartados (estilo Toledo)', () => {
    const acta = [
      'ACTA DE LA SESIÓN ORDINARIA DEL EXCMO. AYUNTAMIENTO PLENO DE TOLEDO',
      'A S I S T E N T E S',
      '1. D. Carlos Velázquez Romo',
      '2. Dª Ana María Pérez Álvarez',
      '16. Nuria Garrido Dorado',
      '25. D. José María Fernández Sánchez',
      'El objeto de la reunión es celebrar Sesión Ordinaria.',
      '1. APROBACIÓN DEL BORRADOR DEL ACTA DE LA SESIÓN ANTERIOR DEL',
      'EXCMO. AYUNTAMIENTO PLENO DE TOLEDO.',
      '2. RECONOCIMIENTO EXTRAJUDICIAL DE CRÉDITO Nº 12/2026.',
      '3. EXPEDIENTE DE MODIFICACIÓN DE CRÉDITO Nº 71/2026.',
      '4. EXPEDIENTE DE MODIFICACIÓN DE CRÉDITO Nº 73/2026.',
      '5. EXPEDIENTE DE MODIFICACIÓN DE CRÉDITO Nº 74/2026.',
      '6. EXPEDIENTE DE MODIFICACIÓN DE CRÉDITO Nº 5/2026 DEL DEPORTE.',
      '7. PLAN ESPECIAL DE PROTECCIÓN DEL CASCO HISTÓRICO.',
      '8. MOCIONES (PROPOSICIONES):',
      '8.a) MOCIÓN PSOE: PARA LA CREACIÓN DE UNA RED DE REFUGIOS CLIMÁTICOS.',
      '1. Instar el Gobierno de España a esta cuestión.',
      '2. Instar al Ayuntamiento a corregir deficiencias.',
      '8.b) MOCIÓN PP: PARA INSTAR AL GOBIERNO DE ESPAÑA.',
      '9. DAR CUENTA DEL SOMETIMIENTO A INFORMACIÓN PÚBLICA.',
      '10. DAR CUENTA DEL PLAN ESPECIAL.',
      '11.RUEGOS Y PREGUNTAS.',
    ].join('\n');
    const r = segmentar(acta);
    expect(r.segmentacionPobre).toBe(false);
    expect(r.metodo).toBe('acta-numerada');
    expect(r.puntos).toHaveLength(11);
    expect(r.puntos[0].titulo).toContain('APROBACIÓN DEL BORRADOR');
    expect(r.puntos[7].titulo).toContain('MOCIÓN PSOE');
    expect(r.puntos[7].titulo).toContain('MOCIÓN PP');
    expect(r.puntos[10].titulo).toContain('RUEGOS Y PREGUNTAS');
    for (const p of r.puntos) {
      expect(p.titulo).not.toMatch(/Carlos Velázquez|Nuria Garrido/);
    }
  });

  it('segmenta un extracto en tabla con resultados (estilo El Masnou)', () => {
    const extracto = [
      'Expedient núm. PLE2026000008',
      'Codi de verificació electrònic: 1a733547-ed06-4572-abb5-b1716a81e9a2',
      'ACTSEXTR',
      'v. 2023/03',
      'Extractes del Ple Municipal en sessió ordinària de l’Ajuntament del Masnou del',
      '17 de setembre de 2026',
      'Assumptes tractats Resultat',
      'Aprovació de l’esborrany de l’acta del Ple ordinari del 16 de juliol de 2026. Aprovat',
      'Informacions de l’Alcaldia.',
      'En resten assabentats',
      'Aprovació inicial del projecte d’urbanització de la fase 6 del Parc Vallmora.',
      'Aprovat',
      'Compatibilitat de l’empleada 255.',
      'Aprovat',
    ].join('\n');
    const r = segmentar(extracto, 'auto');
    expect(r.segmentacionPobre).toBe(false);
    expect(r.metodo).toBe('extracte-resultats');
    expect(r.puntos).toHaveLength(4);
    expect(r.puntos[0].titulo).toContain('esborrany');
    expect(r.puntos[0].resultado).toBe('aprovat');
    expect(r.puntos[1].resultado).toBe('en resten assabentats');
  });

  it('segmenta un acta con puntos «N.-» desordenados (estilo Martorell)', () => {
    const acta = [
      'ACTA DEL PLE',
      '3.- DACIÓ DE COMPTE DE LES RESOLUCIONS DE L’ALCALDIA.',
      'Text del punt tres.',
      '1.- APROVACIÓ DE L’ACTA DE LA SESSIÓ ORDINÀRIA (20-07-26).',
      'Text del punt un.',
      '2.- APROVACIÓ DE L’ACTA DE LA SESSIÓ EXTRAORDINÀRIA (10-09-26).',
      'Text del punt dos.',
      '4.- MOCIÓ SOBRE HABITATGE.',
      'Text del punt quatre.',
    ].join('\n');
    const r = segmentar(acta, 'auto');
    expect(r.segmentacionPobre).toBe(false);
    expect(r.metodo).toBe('acta-guiones');
    expect(r.puntos.map((p) => p.orden)).toEqual([1, 2, 3, 4]);
    expect(r.puntos[0].titulo).toContain('APROVACIÓ DE L’ACTA');
    expect(r.puntos[2].titulo).toContain('DACIÓ DE COMPTE');
  });

  it('acepta un certificado de acuerdo único (estilo Tarragona)', () => {
    const certificado = [
      'MTC_SES_EXT Document electrònic garantit amb signatura electrònica.',
      'Sessió extraordinària del Consell Plenari de 18 de setembre de 2026.',
      'ACORD ADOPTAT A LA SESSIÓ EXTRAORDINÀRIA DEL CONSELL PLENARI QUE TINGUÉ LLOC',
      'EL DIA 18 DE SETEMBRE DE 2026.',
      '1.- Ordenació Corporativa i Administrativa. Expedient 2026/1-G212_1',
      'Presa de possessió del conseller municipal.',
    ].join('\n');
    const r = segmentar(certificado, 'auto');
    expect(r.segmentacionPobre).toBe(false);
    expect(r.puntos).toHaveLength(1);
    expect(r.puntos[0].titulo).toContain('Ordenació Corporativa');
  });

  it('segmenta un ple de punt únic «Únic.» (estilo Sant Cugat)', () => {
    const acta = [
      'ACTA DEL PLE DE 27-07-2026',
      'Srs. Assistents:',
      'Presidència:',
      'JOSEP MARIA VALLES NAVARRO',
      '2/5',
      'DESPATX INSTITUCIONAL',
      'Únic. - POSICIONAMENT DEL GOVERN I DELS GRUPS MUNICIPALS SOBRE L’ESTAT DE',
      'LA CIUTAT.',
      'Obertura de la sessió',
      'El Sr. alcalde-president dona la benvinguda als assistents.',
    ].join('\n');
    const r = segmentar(acta, 'auto');
    expect(r.segmentacionPobre).toBe(false);
    expect(r.metodo).toBe('punto-unico');
    expect(r.puntos).toHaveLength(1);
    expect(r.puntos[0].titulo).toContain('L’ESTAT DE LA CIUTAT');
  });

  it('marca segmentacion_pobre y un punto único cuando no reconoce el formato', () => {
    const r = segmentar('Un text qualsevol sense estructura numerada reconeixible.', 'auto');
    expect(r.segmentacionPobre).toBe(true);
    expect(r.metodo).toBe('documento-unico');
    expect(r.puntos).toHaveLength(1);
  });

  it('no confunde listas internas de una moción con puntos del pleno', () => {
    const acta = [
      'ACTA DE LA SESSIÓ ORDINÀRIA',
      '1. ÀREA D’ALCALDIA Expedient: 1/2026 : Moció sobre habitatge.',
      'EXPOSICIÓ DE MOTIUS',
      '1. L’habitatge és un dret.',
      '2. Cal més inversió.',
      'ACORDS',
      '2. ÀREA DE TERRITORI Expedient: 2/2026 : Pla urbanístic.',
      'Text del punt.',
      '3. PRECS I PREGUNTES',
    ].join('\n');
    const r = segmentar(acta);
    expect(r.metodo).toBe('acta-numerada');
    expect(r.puntos.map((p) => p.orden)).toEqual([1, 2, 3]);
  });
});
