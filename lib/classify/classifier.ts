import { z } from 'zod';
import {
  INSTRUCCIONES_TEMA,
  INSTRUCCIONES_TIPO,
} from '@/lib/classify/taxonomy';
import { TEMAS, TIPOS_PUNTO, type Tema, type TipoPunto } from '@/lib/schemas';
import { contienePosibleDatoPersonal } from '@/lib/redact/redact';
import { log } from '@/lib/utils/log';

const itemRespuestaSchema = z.looseObject({
  label: z.string().nullish(),
  labels: z.array(z.string()).nullish(),
  confidence: z.number().nullish(),
  scores: z.record(z.string(), z.number()).nullish(),
  model: z.string().nullish(),
  escalated: z.boolean().nullish(),
});

const respuestaSchema = z.looseObject({
  results: z.array(itemRespuestaSchema),
  model: z.string().nullish(),
});

export interface ItemClasificable {
  id: string;
  texto: string;
}

export interface ClasificacionTema {
  temas: Tema[];
  scores: Record<string, number>;
}

export interface ClasificacionTipo {
  tipo: TipoPunto;
  confianza: number | null;
  escalado: boolean;
}

export interface ResultadoClasificacionItem {
  temas: ClasificacionTema;
  tipo: ClasificacionTipo;
  modelo: string;
}

export interface EstadisticasClassifier {
  peticiones: number;
  decisiones: number;
}

export interface OpcionesClienteClassifier {
  apiKey?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  maxItemsPorPeticion?: number;
  reintentos?: number;
}

export class DatoPersonalSinRedactarError extends Error {}

export class ClienteClassifier {
  private readonly baseUrl: string;
  private readonly apiKey: string | null;
  private readonly fetchFn: typeof fetch;
  private readonly maxItems: number;
  private readonly reintentos: number;
  private stats: EstadisticasClassifier = { peticiones: 0, decisiones: 0 };

  constructor(opciones: OpcionesClienteClassifier = {}) {
    this.baseUrl = opciones.baseUrl ?? 'https://classifier.dev';
    this.apiKey = opciones.apiKey ?? process.env.CLASSIFIER_API_KEY ?? null;
    this.fetchFn = opciones.fetchFn ?? fetch;
    this.maxItems = opciones.maxItemsPorPeticion ?? 25;
    this.reintentos = opciones.reintentos ?? 4;
  }

  get estadisticas(): EstadisticasClassifier {
    return { ...this.stats };
  }

  private validarTextos(items: ItemClasificable[]): void {
    for (const item of items) {
      const hallazgos = contienePosibleDatoPersonal(item.texto);
      if (hallazgos.length > 0) {
        throw new DatoPersonalSinRedactarError(
          `El texto de ${item.id} contiene posibles datos personales sin redactar (${hallazgos.join(', ')}). No se envÃ­a a la API.`,
        );
      }
    }
  }

  private async peticion(cuerpo: Record<string, unknown>): Promise<z.infer<typeof respuestaSchema>> {
    let ultimoError: Error | null = null;
    for (let intento = 1; intento <= this.reintentos; intento++) {
      try {
        const res = await this.fetchFn(`${this.baseUrl}/v1/classify`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
          },
          body: JSON.stringify(cuerpo),
          signal: AbortSignal.timeout(120000),
        });
        this.stats.peticiones++;
        if (res.status === 429 || res.status >= 500) {
          const retryAfter = Number.parseFloat(res.headers.get('retry-after') ?? '');
          const espera = Number.isFinite(retryAfter) ? retryAfter * 1000 : 1500 * 2 ** intento;
          log('aviso', `classifier.dev HTTP ${res.status}; reintento en ${Math.round(espera)} ms`, { intento });
          await new Promise((r) => setTimeout(r, espera));
          ultimoError = new Error(`classifier.dev HTTP ${res.status}`);
          continue;
        }
        if (!res.ok) {
          const texto = await res.text().catch(() => '');
          throw new Error(`classifier.dev HTTP ${res.status}: ${texto.slice(0, 300)}`);
        }
        const json = await res.json();
        return respuestaSchema.parse(json);
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('classifier.dev HTTP 4')) throw err;
        ultimoError = err as Error;
        if (intento < this.reintentos) {
          const espera = 1000 * 2 ** intento;
          log('aviso', `Fallo de red con classifier.dev; reintento en ${espera} ms`, { intento });
          await new Promise((r) => setTimeout(r, espera));
        }
      }
    }
    throw ultimoError ?? new Error('classifier.dev no respondiÃ³');
  }

  private async enLotes<T>(items: ItemClasificable[], fn: (lote: ItemClasificable[]) => Promise<T[]>): Promise<T[]> {
    const salida: T[] = [];
    for (let i = 0; i < items.length; i += this.maxItems) {
      const lote = items.slice(i, i + this.maxItems);
      const resultados = await fn(lote);
      salida.push(...resultados);
    }
    return salida;
  }

  private async clasificarTemas(items: ItemClasificable[]): Promise<{ temas: ClasificacionTema; modelo: string }[]> {
    return this.enLotes(items, async (lote) => {
      const respuesta = await this.peticion({
        inputs: lote.map((i) => i.texto),
        labels: [...TEMAS],
        multi: true,
        max_labels: 4,
        tier: 'fast',
        instructions: INSTRUCCIONES_TEMA,
      });
      this.stats.decisiones += lote.length * TEMAS.length;
      return respuesta.results.map((r) => ({
        temas: (r.labels ?? []).filter((l): l is Tema => (TEMAS as readonly string[]).includes(l)),
        scores: r.scores ?? {},
        modelo: r.model ?? respuesta.model ?? 'jev',
      }));
    }).then((resultados) => resultados.map((r) => ({ temas: { temas: r.temas, scores: r.scores }, modelo: r.modelo })));
  }

  private async clasificarTipos(
    items: ItemClasificable[],
    tier: 'fast' | 'smart',
  ): Promise<{ tipo: TipoPunto; confianza: number | null; modelo: string; escalado: boolean }[]> {
    return this.enLotes(items, async (lote) => {
      const respuesta = await this.peticion({
        inputs: lote.map((i) => i.texto),
        labels: [...TIPOS_PUNTO],
        tier,
        instructions: INSTRUCCIONES_TIPO,
      });
      this.stats.decisiones += lote.length;
      return respuesta.results.map((r) => {
        const label = r.label ?? 'otro';
        const tipo = (TIPOS_PUNTO as readonly string[]).includes(label) ? (label as TipoPunto) : 'otro';
        return {
          tipo,
          confianza: r.confidence ?? null,
          modelo: r.model ?? respuesta.model ?? 'jev',
          escalado: r.escalated === true || tier === 'smart',
        };
      });
    });
  }

  async clasificarLote(
    items: ItemClasificable[],
    umbralConfianza: number,
  ): Promise<Map<string, ResultadoClasificacionItem>> {
    if (items.length === 0) return new Map();
    this.validarTextos(items);

    const salida = new Map<string, ResultadoClasificacionItem>();
    const [temas, tipos] = await Promise.all([
      this.clasificarTemas(items),
      this.clasificarTipos(items, 'fast'),
    ]);

    const indicesBajos: number[] = [];
    tipos.forEach((t, idx) => {
      if (t.confianza === null || t.confianza < umbralConfianza) indicesBajos.push(idx);
    });

    if (indicesBajos.length > 0) {
      log('info', `Reescalando ${indicesBajos.length} de ${items.length} puntos a smart`);
      const itemsBajos = indicesBajos.map((i) => items[i]);
      const tiposSmart = await this.clasificarTipos(itemsBajos, 'smart');
      indicesBajos.forEach((idx, k) => {
        tipos[idx] = tiposSmart[k];
      });
    }

    items.forEach((item, idx) => {
      const modeloTema = temas[idx]?.modelo ?? 'jev';
      const modeloTipo = tipos[idx]?.modelo ?? 'jev';
      salida.set(item.id, {
        temas: temas[idx]?.temas ?? { temas: [], scores: {} },
        tipo: {
          tipo: tipos[idx]?.tipo ?? 'otro',
          confianza: tipos[idx]?.confianza ?? null,
          escalado: tipos[idx]?.escalado ?? false,
        },
        modelo: modeloTema === modeloTipo ? modeloTema : `${modeloTema}|${modeloTipo}`,
      });
    });
    return salida;
  }
}
