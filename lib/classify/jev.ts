import { experimental_evaluate } from 'ai';
import { typeSafeAi } from '@ai-sdk/typesafe-ai';
import {
  CRITERIOS_AFECTA_VECINOS,
  CRITERIOS_IMPACTO,
  CRITERIOS_IMPACTO_INSTRUCTIONS,
  CRITERIOS_PLAZO_CIUDADANO,
} from '@/lib/classify/taxonomy';
import { contienePosibleDatoPersonal } from '@/lib/redact/redact';
import { DatoPersonalSinRedactarError } from '@/lib/classify/classifier';

export interface DatosJev {
  titulo: string;
  texto: string;
  tipo_punto: string | null;
  temas: string[];
  importe_eur: number | null;
}

export interface JuicioJev {
  afecta_vecinos_prob: number;
  impacto: number;
  plazo_accion_ciudadana_prob: number;
  confianza: number | null;
  modelo: string;
}

export type EvaluadorJev = (datos: DatosJev) => Promise<JuicioJev>;

export class JevNoConfiguradoError extends Error {}

export interface ResultadoEvaluacionMinimo {
  answers: {
    afecta_vecinos: { probability: number };
    impacto: { score: number };
    plazo_accion_ciudadana: { probability: number };
  };
  providerMetadata?: unknown;
  response?: { modelId?: string };
}

export interface OpcionesJev {
  modelo?: string;
  evaluar?: (args: {
    model: unknown;
    state: unknown;
    questions: unknown;
    maxRetries: number;
    abortSignal: AbortSignal;
  }) => Promise<ResultadoEvaluacionMinimo>;
  proveedor?: { evaluationModel: (id: string) => unknown };
  apiKey?: string;
}

export function jevConfigurado(): boolean {
  return Boolean(process.env.TYPESAFE_AI_API_KEY?.trim());
}

export function crearEvaluadorJev(opciones: OpcionesJev = {}): EvaluadorJev {
  const modelo = opciones.modelo ?? 'jev-latest';
  const proveedor = opciones.proveedor ?? (typeSafeAi as unknown as { evaluationModel: (id: string) => unknown });
  const evaluar =
    opciones.evaluar ??
    (experimental_evaluate as unknown as NonNullable<OpcionesJev['evaluar']>);

  return async (datos: DatosJev): Promise<JuicioJev> => {
    const hallazgos = [
      ...new Set([
        ...contienePosibleDatoPersonal(datos.titulo),
        ...contienePosibleDatoPersonal(datos.texto),
      ]),
    ];
    if (hallazgos.length > 0) {
      throw new DatoPersonalSinRedactarError(
        `El estado enviado a jev contiene posibles datos personales sin redactar (${hallazgos.join(', ')}). No se envía a la API.`,
      );
    }

    const resultado = await evaluar({
      model: proveedor.evaluationModel(modelo),
      state: datos,
      questions: {
        afecta_vecinos: {
          type: 'boolean',
          instructions: CRITERIOS_AFECTA_VECINOS.instructions,
          criteria: {
            true: CRITERIOS_AFECTA_VECINOS.true,
            false: CRITERIOS_AFECTA_VECINOS.false,
          },
        },
        impacto: {
          type: 'score',
          instructions: CRITERIOS_IMPACTO_INSTRUCTIONS,
          criteria: CRITERIOS_IMPACTO,
        },
        plazo_accion_ciudadana: {
          type: 'boolean',
          instructions: CRITERIOS_PLAZO_CIUDADANO.instructions,
          criteria: {
            true: CRITERIOS_PLAZO_CIUDADANO.true,
            false: CRITERIOS_PLAZO_CIUDADANO.false,
          },
        },
      },
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(90000),
    });

    const probabilidad = clamp01(resultado.answers.afecta_vecinos.probability);
    const puntuacion = clamp(resultado.answers.impacto.score, 0, 4);
    const plazo = clamp01(resultado.answers.plazo_accion_ciudadana.probability);
    const meta = resultado.providerMetadata as
      | { typesafe?: { confidence?: Record<string, number> } }
      | undefined;
    const confianzaBruta = meta?.typesafe?.confidence?.impacto;
    const confianza = typeof confianzaBruta === 'number' && Number.isFinite(confianzaBruta)
      ? clamp01(confianzaBruta)
      : null;

    return {
      afecta_vecinos_prob: probabilidad,
      impacto: Math.min(5, Math.max(1, Math.round(puntuacion) + 1)),
      plazo_accion_ciudadana_prob: plazo,
      confianza,
      modelo: resultado.response?.modelId ?? modelo,
    };
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
