import { RESUMEN_MODELO_HABILITADO } from '@/lib/config';

export interface ResultadoVerificacion {
  ok: boolean;
  cifrasAusentes: string[];
}

function normalizar(valor: string): string {
  return valor.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
}

export function extraerCifras(texto: string): string[] {
  const cifras = new Set<string>();
  for (const m of texto.matchAll(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g)) {
    cifras.add(m[0]);
  }
  return [...cifras];
}

export function verificarResumen(resumen: string, fuente: string): ResultadoVerificacion {
  const fuenteNormalizada = normalizar(fuente);
  const ausentes: string[] = [];
  for (const cifra of extraerCifras(resumen)) {
    const sinSeparadores = cifra.replace(/\./g, '');
    if (
      !fuenteNormalizada.includes(cifra) &&
      !fuenteNormalizada.replace(/\./g, '').includes(sinSeparadores)
    ) {
      ausentes.push(cifra);
    }
  }
  return { ok: ausentes.length === 0, cifrasAusentes: ausentes };
}

export class ResumenModeloDeshabilitadoError extends Error {}

export interface OpcionesResumenModelo {
  habilitado?: boolean;
  generar: (prompt: string) => Promise<string>;
}

export async function generarResumenConModelo(
  fuenteTexto: string,
  opciones: OpcionesResumenModelo,
): Promise<{ resumen: string; verificacion: ResultadoVerificacion }> {
  if (!(opciones.habilitado ?? RESUMEN_MODELO_HABILITADO)) {
    throw new ResumenModeloDeshabilitadoError(
      'El resumen generado por modelo está desactivado (interruptor apagado por defecto).',
    );
  }
  const prompt = [
    'Escribe un resumen breve en español usando EXCLUSIVAMENTE frases y cifras presentes en el texto fuente.',
    'No añadas datos, opiniones ni valoraciones políticas. No menciones partidos ni personas.',
    'Texto fuente:',
    fuenteTexto.slice(0, 6000),
  ].join('\n');
  const resumen = (await opciones.generar(prompt)).trim();
  const verificacion = verificarResumen(resumen, fuenteTexto);
  return { resumen, verificacion };
}
