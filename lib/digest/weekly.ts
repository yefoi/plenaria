import type { Digest, Punto } from '@/lib/schemas';
import { fechaLargaEspanol, semanaISO } from '@/lib/utils/dates';

export interface SesionParaDigest {
  id: string;
  fecha: string;
  puntos: Punto[];
}

export function construirResumen(municipioNombre: string, municipioId: string, sesiones: SesionParaDigest[]): string {
  if (sesiones.length === 0) {
    return `Sin plenos procesados en el periodo para ${municipioNombre}.`;
  }
  const lineas: string[] = [];
  const totalPuntos = sesiones.reduce((acc, s) => acc + s.puntos.length, 0);
  const totalAfectan = sesiones.reduce(
    (acc, s) => acc + s.puntos.filter((p) => (p.afecta_vecinos_prob ?? 0) >= 0.5).length,
    0,
  );

  lineas.push(
    `${municipioNombre}: ${sesiones.length} ${sesiones.length === 1 ? 'pleno procesado' : 'plenos procesados'}, ` +
      `${totalPuntos} puntos en total, de los que ${totalAfectan} afectan directamente a vecinos.`,
  );

  const ordenadas = [...sesiones].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  for (const sesion of ordenadas) {
    const afectan = sesion.puntos.filter((p) => (p.afecta_vecinos_prob ?? 0) >= 0.5).length;
    const base = `${sesion.puntos.length} ${sesion.puntos.length === 1 ? 'punto' : 'puntos'}`;
    const destacados = destacadosDeSesion(sesion);
    let parrafo =
      `El pleno del ${fechaLargaEspanol(sesion.fecha)} trató ${base}; ` +
      `${afectan} ${afectan === 1 ? 'afecta' : 'afectan'} directamente a vecinos.`;
    if (destacados.length > 0) {
      const lista = destacados
        .map(
          (p) =>
            `«${recortar(p.titulo, 90)}» (impacto ${p.impacto}/5, /m/${municipioId}/${sesion.id}#punto-${p.orden})`,
        )
        .join('; ');
      parrafo += ` Los de mayor impacto: ${lista}.`;
    }
    lineas.push(parrafo);
  }

  return lineas.join('\n\n');
}

function destacadosDeSesion(sesion: SesionParaDigest): Punto[] {
  return [...sesion.puntos]
    .filter((p) => (p.impacto ?? 0) >= 4)
    .sort((a, b) => (b.impacto ?? 0) - (a.impacto ?? 0))
    .slice(0, 5);
}

function recortar(texto: string, max: number): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio;
}

export function construirDigest(municipioId: string, municipioNombre: string, sesiones: SesionParaDigest[]): Digest {
  const fechas = sesiones.map((s) => s.fecha).sort();
  const semana = semanaISO(fechas[0] ?? new Date().toISOString().slice(0, 10));
  const destacados = sesiones
    .flatMap((s) => destacadosDeSesion(s))
    .sort((a, b) => (b.impacto ?? 0) - (a.impacto ?? 0))
    .slice(0, 10)
    .map((p) => p.id);
  return {
    municipio_id: municipioId,
    semana_iso: semana,
    puntos_destacados: destacados,
    generado_en: new Date().toISOString(),
    resumen: construirResumen(municipioNombre, municipioId, sesiones),
  };
}
