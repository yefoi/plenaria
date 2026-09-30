import { describe, expect, it } from 'vitest';
import { contienePosibleDatoPersonal, redactar } from '@/lib/redact/redact';

describe('redactar', () => {
  it('redacta DNI y NIE', () => {
    const { texto } = redactar('El senyor amb DNI 12345678Z i l’altre amb NIE X1234567L.');
    expect(texto).toContain('[DNI]');
    expect(texto).toContain('[NIE]');
    expect(texto).not.toMatch(/\b12345678Z\b/);
    expect(texto).not.toMatch(/X1234567L/);
  });

  it('redacta CIF de empresa', () => {
    const { texto } = redactar('L’empresa amb NIF B-12345678 va presentar l’escrit.');
    expect(texto).toContain('[CIF]');
    expect(texto).not.toContain('B-12345678');
  });

  it('redacta emails', () => {
    const { texto } = redactar('Contacte: nom.cognom@exemple.cat o be a l’oficina.');
    expect(texto).toContain('[EMAIL]');
    expect(texto).not.toContain('nom.cognom@exemple.cat');
  });

  it('redacta teléfonos fijos y móviles con separadores', () => {
    const { texto } = redactar('Tel. 934 123 456, mòbil 600.123.123 i fax 93 123 45 67.');
    expect(texto.match(/\[TELÉFONO\]/g)?.length).toBeGreaterThanOrEqual(2);
    expect(texto).not.toContain('600.123.123');
  });

  it('redacta IBAN', () => {
    const { texto } = redactar('Ingrés al compte ES91 2100 0418 4502 0005 1332 abans del dia 5.');
    expect(texto).toContain('[IBAN]');
    expect(texto).not.toContain('2100 0418');
  });

  it('redacta matrículas modernas y antiguas', () => {
    const { texto } = redactar('Vehicle 1234-BCD i l’altre B-1234-CD estacionat.');
    expect(texto.match(/\[MATRÍCULA\]/g)).toHaveLength(2);
  });

  it('redacta direcciones postales de particulares', () => {
    const { texto } = redactar('Domicili al C/ Sant Joan, 15, 3r 2a de la ciutat.');
    expect(texto).toContain('[DIRECCIÓN]');
    expect(texto).not.toContain('Sant Joan, 15');
  });

  it('redacta nombres de particulares tras tratamiento', () => {
    const { texto } = redactar('La Sra. Anna Puig i Solé i el D. Joan M. Ferrer han presentat escrits.');
    expect(texto.match(/\[NOMBRE\]/g)?.length).toBeGreaterThanOrEqual(2);
    expect(texto).not.toContain('Anna Puig');
    expect(texto).not.toContain('Joan M. Ferrer');
  });

  it('redacta iniciales tras tratamiento', () => {
    const { texto } = redactar('AUTORITZAR AL SENYOR C. G. B. LA COMPATIBILITAT PER EXERCIR UNA ACTIVITAT.');
    expect(texto).toContain('SENYOR [NOMBRE] LA COMPATIBILITAT');
    expect(texto).not.toContain('C. G. B.');
  });

  it('no redacta cargos públicos', () => {
    const { texto } = redactar('El Sr. Alcalde i la Sra. Regidora han respost.');
    expect(texto).toContain('Sr. Alcalde');
    expect(texto).toContain('Sra. Regidora');
  });

  it('es idempotente: redactar dos veces da el mismo resultado', () => {
    const original = 'DNI 12345678Z, tel 600123123, correu a@b.cat, C/ Major, 3.';
    const una = redactar(original).texto;
    const dos = redactar(una).texto;
    expect(dos).toBe(una);
  });

  it('cuenta los reemplazos por tipo', () => {
    const { reemplazos } = redactar('DNI 12345678Z i DNI 87654321X, tel 600111222.');
    expect(reemplazos.dni).toBe(2);
    expect(reemplazos.telefono).toBe(1);
  });
});

describe('contienePosibleDatoPersonal', () => {
  it('detecta datos sin redactar', () => {
    const hallazgos = contienePosibleDatoPersonal('DNI 12345678Z i la Sra. Anna Puig.');
    expect(hallazgos).toContain('dni');
    expect(hallazgos).toContain('nombre');
  });

  it('no marca texto ya redactado', () => {
    const { texto } = redactar('DNI 12345678Z, la Sra. Anna Puig, tel 600123123 i a@b.cat.');
    expect(contienePosibleDatoPersonal(texto)).toEqual([]);
  });

  it('no marca cargos públicos', () => {
    expect(contienePosibleDatoPersonal('El Sr. Alcalde ha presidit la sessió.')).toEqual([]);
  });
});
