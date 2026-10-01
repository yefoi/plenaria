import {
  ClienteClassifier,
  type ItemClasificable,
  type ResultadoClasificacionItem,
} from '@/lib/classify/classifier';
import { CacheClasificaciones, claveCache } from '@/lib/classify/cache';
import { type EvaluadorJev, type JuicioJev } from '@/lib/classify/jev';
import { hashInstrucciones, VERSION_TAXONOMIA } from '@/lib/classify/taxonomy';
import { MAX_LLAMADAS_CLASIFICACION, UMBRAL_CONFIANZA } from '@/lib/config';
import type { DocumentoSesion, Punto } from '@/lib/schemas';
import { log } from '@/lib/utils/log';

export interface ClientesClasificacion {
  classifier: ClienteClassifier;
  jev?: EvaluadorJev;
}

export interface OpcionesClasificar {
  usarJev?: boolean;
  umbralConfianza?: number;
  maxJevPorSesion?: number;
  cache?: CacheClasificaciones;
}

export interface ResultadoClasificacion {
  doc: DocumentoSesion;
  avisos: string[];
  llamadasJev: number;
}

const TIPOS_TRIVIALES = new Set(['aprobacion_acta', 'dacion_cuenta']);

async function mapConcurrente<T, R>(
  items: T[],
  limite: number,
  fn: (item: T, indice: number) => Promise<R>,
): Promise<R[]> {
  const resultados: R[] = new Array(items.length);
  let siguiente = 0;
  async function trabajador(): Promise<void> {
    while (siguiente < items.length) {
      const idx = siguiente++;
      resultados[idx] = await fn(items[idx], idx);
    }
  }
  const trabajadores = Array.from({ length: Math.min(limite, items.length) }, () => trabajador());
  await Promise.all(trabajadores);
  return resultados;
}

function confianzaTemas(resultado: ResultadoClasificacionItem['temas']): number | null {
  const valores = Object.values(resultado.scores).filter((n) => Number.isFinite(n));
  if (valores.length === 0) return null;
  return Math.max(...valores);
}

function textoParaClasificar(p: Punto): string {
  const partes = [p.titulo, p.texto_redactado !== p.titulo ? p.texto_redactado : ''];
  return partes.filter(Boolean).join('\n');
}

export async function clasificarDocumento(
  doc: DocumentoSesion,
  clientes: ClientesClasificacion,
  opciones: OpcionesClasificar = {},
): Promise<ResultadoClasificacion> {
  const umbral = opciones.umbralConfianza ?? UMBRAL_CONFIANZA;
  const usarJev = opciones.usarJev ?? clientes.jev !== undefined;
  const maxJev = opciones.maxJevPorSesion ?? MAX_LLAMADAS_CLASIFICACION;
  const avisos: string[] = [];

  if (doc.puntos.length === 0) {
    return { doc, avisos: ['La sesión no tiene puntos que clasificar'], llamadasJev: 0 };
  }

  const items = doc.puntos.map((p) => ({ id: p.id, texto: textoParaClasificar(p) }));
  const hash = hashInstrucciones();
  const clasificaciones = new Map<string, ResultadoClasificacionItem>();
  const pendientes: ItemClasificable[] = [];
  let desdeCache = 0;

  for (const item of items) {
    const entrada = opciones.cache?.obtener(claveCache(item.texto, hash));
    if (entrada) {
      clasificaciones.set(item.id, {
        temas: { temas: entrada.temas, scores: entrada.scores },
        tipo: {
          tipo: entrada.tipo,
          confianza: entrada.confianza,
          escalado: entrada.confianza === null,
        },
        modelo: entrada.modelo,
      });
      desdeCache++;
    } else {
      pendientes.push(item);
    }
  }

  if (pendientes.length > 0) {
    const nuevas = await clientes.classifier.clasificarLote(pendientes, umbral);
    for (const [id, resultado] of nuevas) {
      clasificaciones.set(id, resultado);
    }
    if (opciones.cache) {
      const fecha = new Date().toISOString();
      for (const item of pendientes) {
        const resultado = clasificaciones.get(item.id);
        if (!resultado) continue;
        opciones.cache.guardar(claveCache(item.texto, hash), {
          temas: resultado.temas.temas,
          scores: resultado.temas.scores,
          tipo: resultado.tipo.tipo,
          confianza: resultado.tipo.confianza,
          modelo: resultado.modelo,
          fecha,
        });
      }
    }
  }

  if (desdeCache > 0) {
    log('info', `Caché de clasificaciones: ${desdeCache} puntos reutilizados, ${pendientes.length} enviados a la API`);
  }
  const modelosClassifier = new Set<string>();

  for (const punto of doc.puntos) {
    punto.revision_manual = false;
    const clasificacion = clasificaciones.get(punto.id);
    if (!clasificacion) {
      avisos.push(`Sin clasificación para el punto ${punto.orden}`);
      punto.revision_manual = true;
      continue;
    }
    for (const m of clasificacion.modelo.split('|')) modelosClassifier.add(m);
    punto.tipo_punto = clasificacion.tipo.tipo;
    punto.temas = clasificacion.temas.temas.length > 0 ? clasificacion.temas.temas : ['otros'];
    const confTipo = clasificacion.tipo.confianza;
    const confTema = confianzaTemas(clasificacion.temas);
    punto.confianza_min =
      confTipo === null || confTema === null ? null : Math.min(confTipo, confTema);
    if (punto.confianza_min === null || punto.confianza_min < umbral) {
      punto.revision_manual = true;
    }
  }

  const modelosJev = new Set<string>();
  let llamadasJev = 0;
  let juiciosAplicados = 0;

  const elegibles = doc.puntos.filter(
    (p) => !p.sensible && p.tipo_punto !== null && !TIPOS_TRIVIALES.has(p.tipo_punto),
  );

  if (!usarJev) {
    avisos.push('jev no configurado o desactivado: los puntos no tienen impacto ni afectación vecinal');
  } else if (!clientes.jev) {
    avisos.push('No se ha inyectado evaluador jev');
  } else {
    const elegiblesLimitados = elegibles.slice(0, maxJev);
    if (elegibles.length > elegiblesLimitados.length) {
      avisos.push(
        `Tope de ${maxJev} llamadas a jev por sesión: ${elegibles.length - elegiblesLimitados.length} puntos quedan sin impacto`,
      );
    }
    const juicios = await mapConcurrente(elegiblesLimitados, 3, async (punto): Promise<JuicioJev | null> => {
      try {
        llamadasJev++;
        const juicio = await clientes.jev!({
          titulo: punto.titulo,
          texto: punto.texto_redactado,
          tipo_punto: punto.tipo_punto,
          temas: punto.temas,
          importe_eur: punto.importe_eur,
        });
        modelosJev.add(juicio.modelo);
        return juicio;
      } catch (err) {
        avisos.push(`jev falló en el punto ${punto.orden}: ${(err as Error).message}`);
        punto.revision_manual = true;
        return null;
      }
    });

    elegiblesLimitados.forEach((punto, idx) => {
      const juicio = juicios[idx];
      if (!juicio) return;
      punto.afecta_vecinos_prob = juicio.afecta_vecinos_prob;
      punto.impacto = juicio.impacto;
      if (juicio.confianza !== null) {
        const actual = punto.confianza_min;
        punto.confianza_min = actual === null ? juicio.confianza : Math.min(actual, juicio.confianza);
        if (punto.confianza_min < umbral) punto.revision_manual = true;
      } else {
        punto.revision_manual = true;
      }
      juiciosAplicados++;
    });
  }

  const modeloClassifier = [...modelosClassifier].join(',') || 'classifier.dev';
  const modeloJev = [...modelosJev].join(',');
  const modelo = modelosJev.size > 0
    ? `classifier.dev (${modeloClassifier}) + typesafe (${modeloJev})`
    : `classifier.dev (${modeloClassifier})`;

  const clasificadoCon = {
    modelo,
    version: `taxonomia ${VERSION_TAXONOMIA}`,
    hash_instrucciones: hashInstrucciones(),
    fecha: new Date().toISOString(),
  };
  for (const punto of doc.puntos) {
    punto.clasificado_con = clasificadoCon;
  }
  doc.sesion.estado_ingesta = 'clasificada';
  doc.sesion.actualizada_en = new Date().toISOString();

  log(
    'info',
    `Clasificados ${doc.puntos.length} puntos (jev aplicado a ${juiciosAplicados}, ${llamadasJev} llamadas)`,
  );

  return { doc, avisos, llamadasJev };
}
