import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { geoConicConformalSpain } from 'd3-composite-projections/index.js';
import { geoPath } from 'd3-geo';
import type { Feature, FeatureCollection } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { MUNICIPIOS } from '@/lib/config';

const require = createRequire(import.meta.url);

const ANCHO = 1000;
const ALTO = 760;
const MARGEN = 10;
const ESCALA = 3800;

function normalizar(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`´]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function redondearTrazos(d: string): string {
  return d.replace(/-?\d+(?:\.\d+)?/g, (n) => {
    const v = Number(n);
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  });
}

function main(): void {
  const provTopo = require('es-atlas/es/provinces.json') as Topology;
  const munTopo = require('es-atlas/es/municipalities.json') as Topology;

  const provFc = feature(provTopo, provTopo.objects.provinces as GeometryCollection) as FeatureCollection;
  const munFc = feature(munTopo, munTopo.objects.municipalities as GeometryCollection) as FeatureCollection;

  const idsProvincia = (provTopo.objects.provinces as GeometryCollection).geometries.map((g) => String(g.id));

  const proyeccion = geoConicConformalSpain();
  proyeccion.scale(ESCALA).translate([ANCHO / 2, ALTO / 2]);
  const trazador = geoPath(proyeccion);

  const [[x0, y0], [x1, y1]] = trazador.bounds(provFc);
  const viewBox = [
    Math.floor(x0 - MARGEN),
    Math.floor(y0 - MARGEN),
    Math.ceil(x1 - x0 + 2 * MARGEN),
    Math.ceil(y1 - y0 + 2 * MARGEN),
  ].join(' ');

  const provincias = provFc.features.map((f, i) => {
    const [[bx0, by0], [bx1, by1]] = trazador.bounds(f);
    return {
      id: idsProvincia[i] ?? String(f.id ?? ''),
      nombre: (f.properties as { name?: string } | null)?.name ?? '',
      d: redondearTrazos(trazador(f) ?? ''),
      bbox: [
        Number(bx0.toFixed(1)),
        Number(by0.toFixed(1)),
        Number(bx1.toFixed(1)),
        Number(by1.toFixed(1)),
      ],
    };
  });

  const porNombre = new Map<string, Feature>();
  for (const f of munFc.features) {
    const nombre = (f.properties as { name?: string } | null)?.name;
    if (nombre) porNombre.set(normalizar(nombre), f);
  }
  const porNombreSinArticulo = new Map<string, Feature>();
  for (const [clave, f] of porNombre) {
    const sinArticulo = clave.replace(/^(l|el|la|les|els|es|sa|son|sant) /, '').trim();
    if (sinArticulo !== clave) porNombreSinArticulo.set(sinArticulo, f);
  }

  const pines: {
    municipio_id: string;
    nombre: string;
    provincia_id: string;
    x: number;
    y: number;
  }[] = [];
  const sinMatch: string[] = [];

  for (const m of MUNICIPIOS) {
    const clave = normalizar(m.nombre);
    const f = porNombre.get(clave) ?? porNombreSinArticulo.get(clave.replace(/^(l|el|la|les|els|es|sa|son|sant) /, '').trim());
    if (!f) {
      sinMatch.push(`${m.id} (${m.nombre})`);
      continue;
    }
    const [cx, cy] = trazador.centroid(f);
    const ine = String(f.id ?? '');
    const provinciaId = ine.length >= 2 ? ine.slice(0, 2) : '';
    if (!provincias.some((p) => p.id === provinciaId)) {
      sinMatch.push(`${m.id}: provincia INE ${provinciaId} no encontrada en el mapa`);
      continue;
    }
    pines.push({
      municipio_id: m.id,
      nombre: m.nombre,
      provincia_id: provinciaId,
      x: Number(cx.toFixed(1)),
      y: Number(cy.toFixed(1)),
    });
  }

  if (sinMatch.length > 0) {
    console.error('No se pudo situar en el mapa:', sinMatch.join('; '));
    process.exit(1);
  }

  const salida = {
    fuente: 'Cartografía: IGN (CC BY 4.0), vía es-atlas',
    viewBox,
    provincias,
    pines,
  };

  const destino = path.join(process.cwd(), 'lib', 'mapa', 'espana.json');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(salida) + '\n', 'utf8');

  const kb = Math.round(fs.statSync(destino).size / 1024);
  console.log(`Mapa generado: ${provincias.length} provincias, ${pines.length} pines, ${kb} KB, viewBox "${viewBox}"`);
  for (const p of pines) {
    const provincia = provincias.find((x) => x.id === p.provincia_id);
    console.log(`  ${p.municipio_id} => ${p.nombre} en ${provincia?.nombre} (${p.provincia_id}) @ ${p.x},${p.y}`);
  }
}

main();
