# Plenaria

**Vigía de plenos municipales.** Convierte las órdenes del día y las actas de
plenos municipales en un resumen legible y filtrable para vecinos, asociaciones
vecinales y periodistas locales. Cada punto se clasifica por tema, tipo e
impacto vecinal, siempre con enlace al documento original.

Marca global `Plenaria`, pensada para funcionar en varios países: la raíz
"plen-" (pleno, plenaria, plénière, plenary, Plenarsitzung) se entiende en todos
los idiomas de destino. El nombre localizado para España es "Vigía de plenos".

Es una herramienta informativa: **no es fuente oficial, no valora políticamente
y no inventa nada que no esté en el texto**.

## Estado

Dos municipios procesados de punta a punta, con **tipos de fuente distintos**
para demostrar la arquitectura de adaptadores:

- **L'Hospitalet de Llobregat** (`ckan-seu-e`): catálogo CSV de la AOC con
  enlaces a los extractos de acuerdos en PDF. Dos sesiones reales (julio y
  septiembre de 2026) en `data/` y clasificadas.
- **Toledo** (`pdf-transparencia`): listado HTML de actas del Ayuntamiento con
  PDFs. Dos sesiones reales (junio y julio de 2026) en `data/` y clasificadas.
  Añadirlo no requirió cambios en el pipeline ni en la web, solo una entrada en
  `lib/config.ts`.

- Fases 0 a 5 completadas (spike de datos, ingesta y redacción, clasificación y
  evaluación, web, automatización y generalización).
- Informe de la fase 0 con hallazgos y riesgos: `docs/fase-0-informe.md`.
- Conjunto dorado provisional y su informe: `eval/golden.json`,
  `eval/informe-eval.md`.

## Cómo funciona

```
descubrir → descargar → extraer texto → segmentar → redactar → clasificar → agregar → publicar
```

1. **Adaptadores de fuente** (`lib/adapters/`): `ckan-seu-e` (municipios
   catalanes vía catálogo CSV de AOC), `pdf-transparencia` (listados HTML con
   PDFs) y `manual` (PDF local o URL para cualquier ayuntamiento).
2. **Segmentación determinista** (`lib/pipeline/segment.ts`): reconoce el
   formato «extracte d'acords» (puntos numerados 1..N sin ruido) y actas
   numeradas; si no reconoce el formato, marca `segmentacion_pobre`.
3. **Redacción de datos personales** (`lib/redact/`): DNI, NIE, CIF, correos,
   teléfonos, IBAN, matrículas, direcciones y nombres de particulares se
   sustituyen por marcadores **antes** de cualquier llamada a un modelo. Un
   guardián impide que un texto sin redactar llegue a las APIs.
4. **Clasificación en dos pasadas** (`lib/classify/`):
   - Pasada 1, barata en lote con [classifier.dev](https://classifier.dev):
     tema (multi-etiqueta) y tipo de punto. Los puntos con confianza baja se
     reescalan a `smart`.
   - Pasada 2, con **jev** (TypeSafe AI) vía AI SDK y
     `@ai-sdk/typesafe-ai`: probabilidad de que el punto afecte a vecinos,
     impacto 1-5 con criterios explícitos y si abre plazo de acción ciudadana.
     Se omite en puntos sensibles y trámites rutinarios.
5. **Agregación**: resumen semanal con plantilla determinista
   (`lib/digest/weekly.ts`). Existe un interruptor (apagado por defecto) para
   un resumen generado por modelo, con verificación automática de que cada
   cifra aparece en el texto fuente (`lib/digest/modelo.ts`).
6. **Publicación**: JSON versionado en `data/<municipio>/` y web Next.js que lo
   lee. La ingesta en GitHub Actions hace commit de los datos.

## Requisitos

- Node.js 24 o superior.
- Opcional: clave de TypeSafe AI (`TYPESAFE_AI_API_KEY`) para la pasada de
  impacto. Sin ella, la ingesta y la primera pasada funcionan igual.
- Opcional: clave de workspace de classifier.dev (`CLASSIFIER_API_KEY`) para
  más límites; sin clave se usa el acceso anónimo compartido por IP.

Copia `.env.example` a `.env.local` y rellena lo que tengas. La clave de
TypeSafe se usa solo en scripts de servidor; nunca se envía al navegador.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # opcional
npm run ingest -- --municipio hospitalet-de-llobregat --limit 2
npm run classify -- --municipio hospitalet-de-llobregat
npm run digest -- --todas
npm run dev
```

La primera ingesta descarga el catálogo completo (~32 MB) y lo cachea en
`.cache/` con ETag y `Last-Modified`; las siguientes ejecuciones usan 304.
Se respeta `robots.txt` (intérprete estándar RFC 9309), hay pausa entre
peticiones y el User-Agent es identificable (configurable con
`PLENARIA_USER_AGENT`).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo Next.js |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm test` | Tests unitarios (Vitest) |
| `npm run typecheck` | Comprobación de tipos |
| `npm run lint` | ESLint |
| `npm run ingest -- --municipio <id> [--limit N] [--desde AAAA-MM-DD] [--reprocesar]` | Ingesta y redacción |
| `npm run ingest -- --municipio <id> --pdf <ruta> [--fecha AAAA-MM-DD]` | Ingesta manual de un PDF local |
| `npm run ingest -- --municipio <id> --url <url>` | Ingesta manual desde URL |
| `npm run classify -- --municipio <id> [--limit N] [--sesion <id>] [--sin-jev] [--reprocesar]` | Clasificación |
| `npm run digest -- --todas` | Resúmenes semanales deterministas |
| `npm run eval` | Evaluación contra el conjunto dorado (`--ci` para umbrales) |
| `npm run golden` | Regenera `eval/golden.json` desde los fixtures |

## Estructura

```
app/                  Web Next.js (App Router): rutas, componentes, RSS
lib/adapters/         Adaptadores de fuente + registro
lib/pipeline/         Segmentación, importes, sensibilidad, procesado
lib/redact/           Redacción de datos personales
lib/classify/         Taxonomía, cliente classifier.dev, cliente jev, pipeline
lib/digest/           Resumen semanal determinista y verificación del de modelo
lib/repo/             Interfaz Repository + implementación JSON (data/)
lib/schemas/          Esquemas Zod y tipos del modelo de datos
lib/http/             Descargador respetuoso (robots, pausas, reintentos)
scripts/              ingest, classify, digest, eval, generar-golden
tests/                Tests con Vitest
fixtures/             Muestras reales del piloto (PDF + texto extraído)
data/                 Datos procesados (JSON versionado, lo escribe la ingesta)
eval/                 Conjunto dorado e informes de evaluación
docs/                 Informes por fase
```

## Privacidad y neutralidad

- Antes de cualquier llamada a un modelo, los datos personales se redactan y
  un test comprueba que nada sin redactar llega a una API (mock del cliente).
- Los puntos de personal, sanciones, ayudas individuales, expropiaciones,
  responsabilidad patrimonial, menores y servicios sociales se marcan
  `sensible` y se muestran con título genérico y sin texto.
- No se puntúan partidos, grupos ni personas. No se publican votos.
- Los puntos con confianza baja se marcan «clasificación a revisar» y cada
  ficha tiene un botón para reportar el error (abre un issue prellenado).

## Evaluación

`eval/golden.json` contiene 51 puntos reales anotados a mano (versión
**provisional**, pendiente de revisión humana) de tres sesiones del piloto.
`npm run eval` mide exactitud de tipo, F1 de tema, acierto de afectación
vecinal, error medio de impacto y calibración de la confianza, y escribe
`eval/informe-eval.md`. Los umbrales de CI están en el propio golden.

Resultados de la última ejecución (sin pasada jev): tipo 98 %, tema F1 micro
83.9 %, confianza ≥ 0.9 acierta el 100 % de las veces.

## Fuentes y límites

- Datos del catálogo «Actes del Ple» de la AOC, licencia **CC0**. Se usa la
  descarga masiva (no la API interna, reservada en su `robots.txt`).
- El `robots.txt` de `media.seu-e.cat` contiene una línea malformada
  (`*/acteca`) que los intérpretes estándar ignoran; si el operador publica una
  regla válida que excluya los PDFs, el adaptador dejará de descargarlos y lo
  indicará en `/fuentes`.
- No se hace OCR: los PDFs sin capa de texto se marcan y se omiten.
- Las clasificaciones pueden fallar; por eso se publica la confianza y hay un
  canal de reporte. Ver `/metodologia` en la web.

## Despliegue

- **Web**: Vercel (build de Next.js; lee `data/` del repositorio).
- **Datos**: GitHub Actions (`.github/workflows/ingesta-diaria.yml`) ejecuta
  ingesta, clasificación y digest a diario y hace commit de `data/`.
  Si defines el secreto `TYPESAFE_AI_API_KEY`, se ejecuta también la pasada de
  impacto. La evaluación (`npm run eval`) corre después de cada ingesta con
  `continue-on-error` para no bloquear la publicación de datos.
- **CI** (`.github/workflows/ci.yml`): typecheck, tests y build en cada push.

## Ideas y alcance

Lo que no entra en el MVP y las propuestas nuevas están en `IDEAS.md`. Las
convenciones para agentes y personas que toquen el código están en `AGENTS.md`.

## Licencia

Código: MIT. Datos de las administraciones: según su licencia de origen
(CC0 en el piloto).
