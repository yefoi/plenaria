import path from 'node:path';
import { crearRepositorio } from '@/lib/repo/repository';

export function repositorio() {
  return crearRepositorio(path.join(process.cwd(), 'data'));
}
