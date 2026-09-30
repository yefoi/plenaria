import fs from 'node:fs/promises';
import path from 'node:path';
import {
  digestSchema,
  documentoSesionSchema,
  fuentesStatusSchema,
  type Digest,
  type DocumentoSesion,
  type EstadoIngesta,
  type FuentesStatus,
  type Municipio,
  type TipoSesion,
} from '@/lib/schemas';

export interface ResumenSesion {
  id: string;
  fecha: string;
  tipo: TipoSesion;
  num_puntos: number;
  max_impacto: number | null;
  afecta_vecinos: number;
  estado_ingesta: EstadoIngesta;
  fuente_url: string;
}

export interface Repository {
  listarSesiones(municipioId: string): Promise<ResumenSesion[]>;
  obtenerSesion(municipioId: string, sesionId: string): Promise<DocumentoSesion | null>;
  guardarSesion(doc: DocumentoSesion): Promise<void>;
  guardarDigest(digest: Digest): Promise<void>;
  obtenerUltimoDigest(municipioId: string): Promise<Digest | null>;
  guardarFuentes(status: FuentesStatus): Promise<void>;
  obtenerFuentes(municipioId: string): Promise<FuentesStatus | null>;
}

const PATRON_SESION = /^(\d{4}-\d{2}-\d{2})(--[0-9a-z]+)?\.json$/;

export function nombreArchivoSesion(id: string): string {
  return `${id}.json`;
}

export class JsonRepository implements Repository {
  constructor(private readonly dataDir: string) {}

  private dirMunicipio(municipioId: string): string {
    return path.join(this.dataDir, municipioId);
  }

  private archivoSesion(municipioId: string, sesionId: string): string {
    return path.join(this.dirMunicipio(municipioId), nombreArchivoSesion(sesionId));
  }

  async listarSesiones(municipioId: string): Promise<ResumenSesion[]> {
    const dir = this.dirMunicipio(municipioId);
    let entradas: string[] = [];
    try {
      entradas = await fs.readdir(dir);
    } catch {
      return [];
    }
    const resumenes: ResumenSesion[] = [];
    for (const entrada of entradas) {
      if (!PATRON_SESION.test(entrada)) continue;
      const doc = await this.obtenerSesion(municipioId, entrada.replace(/\.json$/, ''));
      if (!doc) continue;
      const impactos = doc.puntos
        .map((p) => p.impacto)
        .filter((i): i is number => i !== null);
      resumenes.push({
        id: doc.sesion.id,
        fecha: doc.sesion.fecha,
        tipo: doc.sesion.tipo,
        num_puntos: doc.puntos.length,
        max_impacto: impactos.length > 0 ? Math.max(...impactos) : null,
        afecta_vecinos: doc.puntos.filter((p) => (p.afecta_vecinos_prob ?? 0) >= 0.5).length,
        estado_ingesta: doc.sesion.estado_ingesta,
        fuente_url: doc.sesion.fuente_url,
      });
    }
    return resumenes.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  }

  async obtenerSesion(municipioId: string, sesionId: string): Promise<DocumentoSesion | null> {
    try {
      const crudo = await fs.readFile(this.archivoSesion(municipioId, sesionId), 'utf8');
      return documentoSesionSchema.parse(JSON.parse(crudo));
    } catch {
      return null;
    }
  }

  async guardarSesion(doc: DocumentoSesion): Promise<void> {
    documentoSesionSchema.parse(doc);
    const dir = this.dirMunicipio(doc.municipio.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      this.archivoSesion(doc.municipio.id, doc.sesion.id),
      JSON.stringify(doc, null, 2) + '\n',
      'utf8',
    );
  }

  async guardarDigest(digest: Digest): Promise<void> {
    digestSchema.parse(digest);
    const dir = this.dirMunicipio(digest.municipio_id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, `digest-${digest.semana_iso}.json`),
      JSON.stringify(digest, null, 2) + '\n',
      'utf8',
    );
  }

  async obtenerUltimoDigest(municipioId: string): Promise<Digest | null> {
    const dir = this.dirMunicipio(municipioId);
    try {
      const entradas = (await fs.readdir(dir)).filter((e) => e.startsWith('digest-')).sort();
      const ultimo = entradas.at(-1);
      if (!ultimo) return null;
      const crudo = await fs.readFile(path.join(dir, ultimo), 'utf8');
      return digestSchema.parse(JSON.parse(crudo));
    } catch {
      return null;
    }
  }

  async guardarFuentes(status: FuentesStatus): Promise<void> {
    fuentesStatusSchema.parse(status);
    const dir = this.dirMunicipio(status.municipio_id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, 'fuentes.json'),
      JSON.stringify(status, null, 2) + '\n',
      'utf8',
    );
  }

  async obtenerFuentes(municipioId: string): Promise<FuentesStatus | null> {
    try {
      const crudo = await fs.readFile(path.join(this.dirMunicipio(municipioId), 'fuentes.json'), 'utf8');
      return fuentesStatusSchema.parse(JSON.parse(crudo));
    } catch {
      return null;
    }
  }
}

export function crearRepositorio(dataDir = path.join(process.cwd(), 'data')): Repository {
  return new JsonRepository(dataDir);
}
