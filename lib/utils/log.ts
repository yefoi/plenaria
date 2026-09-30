type Nivel = 'info' | 'aviso' | 'error';

export function log(nivel: Nivel, mensaje: string, datos?: unknown): void {
  const marca = new Date().toISOString();
  const prefijo = nivel === 'error' ? 'ERROR' : nivel === 'aviso' ? 'AVISO' : 'INFO ';
  if (datos === undefined) {
    console.log(`[${marca}] ${prefijo} ${mensaje}`);
  } else {
    console.log(`[${marca}] ${prefijo} ${mensaje}`, typeof datos === 'string' ? datos : JSON.stringify(datos));
  }
}
