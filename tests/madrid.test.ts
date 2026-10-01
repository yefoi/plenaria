import { describe, expect, it } from 'vitest';
import { extraerAcuerdos, extraerSesionesMadrid } from '@/lib/adapters/madrid-pleno';

const LISTADO = `
<ul>
  <li><a href="/portales/munimadrid/es/Inicio/El-Ayuntamiento/El-Pleno/Actividad-del-Pleno-y-las-Comisiones/Pleno/29-de-septiembre-de-2026/?vgnextoid=abc">29 de septiembre de 2026</a></li>
  <li><a href="/portales/munimadrid/es/Inicio/El-Ayuntamiento/El-Pleno/Actividad-del-Pleno-y-las-Comisiones/Pleno/30-de-junio-de-2026-Extraordinaria/?vgnextoid=def">30 de junio de 2026 - Extraordinaria</a></li>
  <li><a href="/portales/munimadrid/es/Inicio/El-Ayuntamiento/El-Pleno/Actividad-del-Pleno-y-las-Comisiones/Pleno/26-de-mayo-de-2026/?vgnextoid=ghi">26 de mayo de 2026</a></li>
  <li><a href="https://www.madrid.es/portales/munimadrid/es/Inicio/otra-cosa/">Otra cosa</a></li>
</ul>`;

const PAGINA_SESION = `
<ul>
  <li><a href="/UnidadesDescentralizadas/UDCPleno/Actividad/Pleno/2026/2026-05-26/OD_PO_26_05_26.pdf">Orden del día</a></li>
  <li><a href="/UnidadesDescentralizadas/UDCPleno/Actividad/Pleno/2026/2026-05-26/DS_2546_PO_26_05_26.pdf">Diario de sesiones</a></li>
  <li><a href="/UnidadesDescentralizadas/UDCPleno/Actividad/Pleno/2026/2026-05-26/AC_PO_26_05_26.pdf">Acuerdos adoptados</a></li>
</ul>`;

describe('adaptador madrid-pleno', () => {
  it('extrae sesiones con fecha y tipo', () => {
    const sesiones = extraerSesionesMadrid(LISTADO, 'https://www.madrid.es/portales/');
    expect(sesiones).toHaveLength(3);
    expect(sesiones[0]).toMatchObject({ fecha: '2026-09-29', tipo: 'ordinaria' });
    expect(sesiones[1]).toMatchObject({ fecha: '2026-06-30', tipo: 'extraordinaria' });
    expect(sesiones[2].fecha).toBe('2026-05-26');
  });

  it('prioriza el PDF de acuerdos frente a orden del día o diario', () => {
    const acuerdos = extraerAcuerdos(PAGINA_SESION, 'https://www.madrid.es/portales/');
    expect(acuerdos).toContain('AC_PO_26_05_26.pdf');
    expect(acuerdos).not.toContain('OD_');
    expect(acuerdos).not.toContain('DS_');
  });

  it('devuelve null si no hay PDF de acuerdos', () => {
    expect(extraerAcuerdos('<a href="/x/OD_PO_1.pdf">Orden</a>', 'https://www.madrid.es/')).toBeNull();
  });
});
