import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { TEMAS, TIPOS_PUNTO } from '@/lib/schemas';
import { sha256 } from '@/lib/utils/hash';
import { log } from '@/lib/utils/log';

const entradaCacheSchema = z.object({
  temas: z.array(z.enum(TEMAS)),
  scores: z.record(z.string(), z.number()),
  tipo: z.enum(TIPOS_PUNTO),
  confianza: z.number().nullable(),
  modelo: z.string(),
  fecha: z.string(),
});

const archivoCacheSchema = z.object({
  version: z.literal(1),
  entradas: z.record(z.string(), entradaCacheSchema),
});

export type EntradaCache = z.infer<typeof entradaCacheSchema>;

export function claveCache(texto: string, hashInstrucciones: string): string {
  return sha256(`${hashInstrucciones}::${texto}`).slice(0, 32);
}

export class CacheClasificaciones {
  private entradas = new Map<string, EntradaCache>();
  private nuevo = false;

  constructor(private readonly archivo: string) {}

  static porDefecto(dataDir = path.join(process.cwd(), 'data')): CacheClasificaciones {
    return new CacheClasificaciones(path.join(dataDir, '_clasificaciones.json'));
  }

  get tamano(): number {
    return this.entradas.size;
  }

  async cargar(): Promise<void> {
    try {
      const crudo = await fs.readFile(this.archivo, 'utf8');
      const datos = archivoCacheSchema.parse(JSON.parse(crudo));
      this.entradas = new Map(Object.entries(datos.entradas));
      log('info', `Caché de clasificaciones cargada: ${this.entradas.size} entradas`);
    } catch {
      this.entradas = new Map();
    }
  }

  obtener(clave: string): EntradaCache | undefined {
    return this.entradas.get(clave);
  }

  guardar(clave: string, entrada: EntradaCache): void {
    this.entradas.set(clave, entrada);
    this.nuevo = true;
  }

  async persistir(): Promise<void> {
    if (!this.nuevo) return;
    await fs.mkdir(path.dirname(this.archivo), { recursive: true });
    await fs.writeFile(
      this.archivo,
      JSON.stringify({ version: 1, entradas: Object.fromEntries(this.entradas) }, null, 2) + '\n',
      'utf8',
    );
    log('info', `Caché de clasificaciones guardada: ${this.entradas.size} entradas`);
  }
}
