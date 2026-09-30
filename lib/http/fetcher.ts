import { userAgent } from '@/lib/config';
import { parsearRobots, rutaPermitida, type ReglasRobots } from '@/lib/http/robots';
import { log } from '@/lib/utils/log';

export interface RespuestaDescarga {
  status: number;
  buffer: Buffer;
  contentType: string | null;
  etag: string | null;
  lastModified: string | null;
  notModified: boolean;
  urlFinal: string;
}

export class DescargaBloqueadaError extends Error {}
export class DescargaFallidaError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface EstadoHost {
  robots: ReglasRobots | null;
  ultimaPeticion: number;
}

const hosts = new Map<string, EstadoHost>();
const PAUSA_POR_DEFECTO_MS = 2000;
const REINTENTOS_MAX = 3;

function estadoDe(host: string): EstadoHost {
  let estado = hosts.get(host);
  if (!estado) {
    estado = { robots: null, ultimaPeticion: 0 };
    hosts.set(host, estado);
  }
  return estado;
}

export async function cargarRobots(origin: string): Promise<ReglasRobots | null> {
  const estado = estadoDe(origin);
  if (estado.robots) return estado.robots;
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'user-agent': userAgent() },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    estado.robots = parsearRobots(await res.text(), userAgent());
    return estado.robots;
  } catch {
    return null;
  }
}

async function respetarPausa(origin: string, pausaMs: number): Promise<void> {
  const estado = estadoDe(origin);
  const desde = Date.now() - estado.ultimaPeticion;
  if (desde < pausaMs) {
    await new Promise((r) => setTimeout(r, pausaMs - desde));
  }
  estado.ultimaPeticion = Date.now();
}

export interface OpcionesDescarga {
  timeoutMs?: number;
  pausaMs?: number;
  cabeceras?: Record<string, string>;
  metodo?: 'GET' | 'HEAD';
  omitirRobots?: boolean;
}

export async function descargar(url: string, opciones: OpcionesDescarga = {}): Promise<RespuestaDescarga> {
  const u = new URL(url);
  const timeoutMs = opciones.timeoutMs ?? 60000;

  if (!opciones.omitirRobots) {
    const robots = await cargarRobots(u.origin);
    const ruta = u.pathname + u.search;
    if (robots && !rutaPermitida(robots, ruta)) {
      throw new DescargaBloqueadaError(
        `robots.txt de ${u.origin} no permite descargar ${ruta}`,
      );
    }
    const pausa = Math.max(
      opciones.pausaMs ?? PAUSA_POR_DEFECTO_MS,
      (robots?.crawlDelaySegundos ?? 0) * 1000,
    );
    await respetarPausa(u.origin, pausa);
  }

  let ultimoError: Error | null = null;
  for (let intento = 1; intento <= REINTENTOS_MAX; intento++) {
    try {
      const res = await fetch(url, {
        method: opciones.metodo ?? 'GET',
        headers: {
          'user-agent': userAgent(),
          accept: '*/*',
          ...opciones.cabeceras,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number.parseFloat(res.headers.get('retry-after') ?? '');
        const espera = Number.isFinite(retryAfter)
          ? retryAfter * 1000
          : Math.min(30000, 1000 * 2 ** intento);
        log('aviso', `HTTP ${res.status} en ${url}; reintento en ${Math.round(espera)} ms`, {
          intento,
        });
        await new Promise((r) => setTimeout(r, espera));
        ultimoError = new DescargaFallidaError(`HTTP ${res.status}`, res.status);
        continue;
      }

      if (res.status === 304) {
        return {
          status: 304,
          buffer: Buffer.alloc(0),
          contentType: res.headers.get('content-type'),
          etag: res.headers.get('etag'),
          lastModified: res.headers.get('last-modified'),
          notModified: true,
          urlFinal: res.url,
        };
      }

      if (!res.ok) {
        throw new DescargaFallidaError(`HTTP ${res.status} al descargar ${url}`, res.status);
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      return {
        status: res.status,
        buffer,
        contentType: res.headers.get('content-type'),
        etag: res.headers.get('etag'),
        lastModified: res.headers.get('last-modified'),
        notModified: false,
        urlFinal: res.url,
      };
    } catch (err) {
      if (err instanceof DescargaFallidaError && err.status < 500 && err.status !== 429) throw err;
      ultimoError = err as Error;
      const espera = Math.min(30000, 1000 * 2 ** intento);
      log('aviso', `Fallo de red en ${url}; reintento en ${espera} ms`, { intento, error: (err as Error).message });
      await new Promise((r) => setTimeout(r, espera));
    }
  }
  throw ultimoError ?? new Error(`No se pudo descargar ${url}`);
}
