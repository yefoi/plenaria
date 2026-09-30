# Prompt para OpenCode: Vigía de Plenos

Cómo usarlo: guarda este archivo en la raíz de un repo vacío como `PROMPT.md`
y lanza las fases de una en una, por ejemplo:

    opencode run "Lee PROMPT.md y ejecuta solo la Fase 0. Para al terminar y dame el informe."

No lances todo de golpe. Cada fase termina con un informe y espera mi visto bueno.

---

## 0. Qué es esto

Construye **Vigía de Plenos**: una web app que convierte las órdenes del día y
las actas de plenos municipales en un resumen legible y filtrable para vecinos,
asociaciones vecinales y periodistas locales.

Cada punto de un pleno se clasifica por tema, tipo e impacto vecinal, siempre
con enlace a la fuente original. Es una herramienta informativa: **no es fuente
oficial, no valora políticamente y no inventa nada que no esté en el texto.**

Modelos de clasificación que se usan (las dos APIs las lees tú en su
documentación oficial antes de codificar; no supongas endpoints ni nombres de
parámetros):

- **classifier.dev**: clasificación zero-shot de texto, sin API key, en lote
  (hasta 1000 entradas por petición), con etiquetas libres, modo multi-etiqueta,
  parámetro `instructions` y dos niveles (`fast` y `smart`). Doc: https://classifier.dev/
- **jev** (TypeSafe AI) vía Vercel AI SDK y `@ai-sdk/typesafe-ai`, con
  `experimental_evaluate`: preguntas tipadas `choice`, `score` (2 a 10 niveles) y
  `boolean` (probabilidad). Comprueba en la doc del proveedor la versión mínima
  del AI SDK, el nombre de la variable de entorno de la clave y la forma exacta
  del resultado. La clave va solo en variables de entorno.

## 1. Principios no negociables

1. **Cero invención.** Todo dato mostrado (importe, fecha, órgano, tema) debe
   poder rastrearse a un fragmento del texto fuente. Si no se puede, no se muestra.
2. **Cálculo en código, juicio en el modelo.** Fechas, importes, conteos y
   ordenaciones se calculan con regex y aritmética, nunca con un LLM. Los modelos
   solo clasifican y puntúan.
3. **Enlace a la fuente siempre.** Cada punto lleva URL del documento original.
4. **Privacidad por defecto.** Antes de enviar texto a cualquier API se redactan
   datos personales (sección 5). Los puntos sensibles no se muestran en detalle.
5. **Neutralidad.** Se puntúa el impacto vecinal, no el mérito político. No hay
   puntuaciones de partidos ni de concejales, ni atribución de votos a personas.
6. **Honestidad sobre la calidad.** Cada clasificación muestra su confianza. Hay
   un conjunto de evaluación y una página de metodología con las limitaciones.
7. **Buen ciudadano de internet.** Respeta `robots.txt` y términos de cada
   fuente, User-Agent identificable, límite de peticiones, caché por hash.

## 2. Alcance del MVP

- **Un municipio piloto** funcionando de punta a punta, con arquitectura de
  **adaptadores de fuente** para añadir más sin tocar el resto.
- Ingesta, redacción de datos personales, clasificación, web pública, RSS y
  actualización automática.
- Fuera de alcance del MVP: cuentas de usuario, alertas por email, OCR de
  escaneados, votos por grupo, transcripción de vídeo, cualquier análisis político.

## 3. Fuentes de datos (lo que se sabe y lo que no)

Estado del panorama, comprobado por búsqueda; **confírmalo tú con datos reales**
en la Fase 0:

- **Estructurada y con API:** varios municipios catalanes publican el conjunto
  "Actas del Pleno" (acuerdos de las sesiones, en CSV) en el portal
  `dadesobertes.seu-e.cat`, con API tipo CKAN: `package_show` con
  `id=agn-ag-actes-de-ple` para metadatos y `datastore_search` filtrando por
  `CODI_ENS` para los datos. Ejemplos vistos: Vilafranca del Penedès, Lloret de
  Mar, Cunit. **No conozco las columnas ni la frescura de los datos:** descúbrelas
  con `package_show` en tiempo de ejecución, no las asumas.
- **PDF en portales de transparencia:** Toledo y Ciudad Real publican actas y
  convocatorias en PDF en sus webs; Bormujos, Pruna y Sanlúcar la Mayor usan la
  misma estructura de URL en `transparencia.<municipio>.es/.../indicador/...`,
  lo que sugiere una plantilla común (por confirmar).
- **Datos abiertos antiguos:** Málaga tiene actas en su portal de datos abiertos,
  pero solo de 2007 a 2013 (ZIP y PDF). Sirve para pruebas, no para el producto.

### Adaptadores a implementar

Define una interfaz única `SourceAdapter` con: `discover()` (lista sesiones
nuevas), `fetch(session)` (obtiene el contenido) y `parse(content)` (devuelve
puntos en el modelo común). Implementa:

1. **`ckan-seu-e`**: municipios catalanes vía API CKAN. Es el adaptador
   estructurado y el candidato a piloto.
2. **`pdf-transparencia`**: descubre enlaces a PDF en un listado HTML (cheerio),
   descarga, extrae texto (`unpdf` o `pdfjs-dist`) y segmenta en puntos.
3. **`manual`**: sube un PDF o pega una URL para cualquier ayuntamiento. Útil
   para demos y para probar sin depender de un scraper.

Si un PDF no tiene capa de texto, márcalo `requiere_ocr` y sáltalo; no hagas OCR.

## 4. Modelo de datos

Valida todo con **Zod**. Tipos principales:

- `Municipio`: `id`, `nombre`, `provincia`, `fuente_tipo`, `fuente_config`.
- `Sesion`: `id`, `municipio_id`, `fecha`, `tipo` (ordinaria | extraordinaria |
  extraordinaria_urgente | otra), `fuente_url`, `hash_contenido`, `estado_ingesta`.
- `Punto`: `id`, `sesion_id`, `orden`, `titulo`, `texto_redactado` (truncado a
  unos 1500 caracteres), `importe_eur` (regex, opcional), `sensible` (bool),
  `tipo_punto`, `temas[]`, `afecta_vecinos_prob`, `impacto` (1 a 5),
  `confianza_min`, `revision_manual` (bool), `clasificado_con` (modelo, versión,
  hash de instrucciones, fecha).
- `Digest`: `municipio_id`, `semana_iso`, `puntos_destacados[]`, `generado_en`.

**Almacenamiento MVP:** JSON versionado en el repo (`data/<municipio>/<AAAA-MM-DD>.json`)
y actualización con **GitHub Actions** (el sistema de archivos de Vercel es de
solo lectura, así que la ingesta hace commit del JSON). Aísla el acceso a datos
detrás de una interfaz `Repository` por si luego se migra a una base de datos.

## 5. Pipeline de ingesta

`descubrir → descargar → extraer texto → segmentar → redactar → clasificar → agregar → publicar`

1. **Idempotencia:** hash del contenido; si no cambia, no se reprocesa ni se
   gastan llamadas a modelos.
2. **Segmentación en puntos:** heurística determinista (numeración tipo "1.",
   "PUNTO 1º", "Punto único", encabezados de "Ruegos y preguntas"). Si falla,
   trata la sesión entera como un punto y márcalo `segmentacion_pobre`.
3. **Redacción de datos personales (obligatoria antes de cualquier API):**
   DNI/NIE/NIF/CIF, teléfonos, emails, IBAN, matrículas, direcciones postales de
   particulares y nombres de personas físicas que no sean cargos públicos en
   ejercicio. Sustituye por marcadores (`[DNI]`, `[NOMBRE]`...). Cubre la
   redacción con tests unitarios y con casos difíciles.
4. **Sensibilidad:** un punto es `sensible` si trata de personal, nombramientos
   individuales, sanciones a particulares, ayudas individuales, expropiaciones,
   responsabilidad patrimonial, menores o servicios sociales. Los sensibles se
   muestran solo con un título genérico ("Punto de personal", "Ayuda individual")
   y sin texto.
5. **Importes:** extrae con regex (`1.234,56 €`, `120.000 euros`) y guarda el
   valor numérico normalizado. Nunca lo extraigas con un modelo.

## 6. Clasificación

Dos pasadas, de más barata a más matizada, siempre sobre el **texto ya redactado**.

### Pasada 1: classifier.dev (lote, barato)

- **Tema** (multi-etiqueta): `urbanismo_licencias`, `vivienda`,
  `presupuesto_impuestos`, `contratacion_obras`, `servicios_publicos`,
  `movilidad_trafico`, `seguridad`, `cultura_deporte_educacion`,
  `servicios_sociales`, `personal`, `medio_ambiente`, `mociones_grupos`,
  `organizacion_institucional`, `otros`.
- **Tipo de punto** (una etiqueta): `aprobacion_acta`, `acuerdo`, `mocion`,
  `ruego_pregunta`, `dacion_cuenta`, `otro`.
- Usa el nivel `fast` por defecto y **reescala a `smart` solo los puntos con
  confianza baja** (umbral inicial 0.7, configurable). Usa el parámetro
  `instructions` para dar contexto ("son puntos de un pleno municipal español").

### Pasada 2: jev (solo puntos no triviales)

Salta esta pasada para `aprobacion_acta`, `dacion_cuenta` rutinarias y puntos
`sensible`. Para el resto, con `experimental_evaluate`, sobre un `state` con el
título, el texto redactado, el tipo, los temas y el importe:

- `afecta_vecinos` (`boolean`): ¿tiene efecto directo y concreto en la vida
  diaria o el bolsillo de los residentes, y no es un mero trámite interno?
- `impacto` (`score`, 5 niveles): 1 trámite interno; 2 menor; 3 moderado;
  4 relevante; 5 muy relevante. Criterios explícitos: alcance (a cuántos vecinos),
  importe si consta en el texto, irreversibilidad, plazo.
- `hay_plazo_o_accion_ciudadana` (`boolean`): ¿abre plazo de alegaciones,
  información pública o convocatoria a la que un vecino pueda responder?

### Reglas comunes

- Guarda siempre etiqueta y confianza. Si la confianza mínima de un punto es
  menor que el umbral, `revision_manual = true` y se muestra un aviso visible.
- Registra modelo, versión, hash de las instrucciones y fecha para poder
  reproducir y comparar después de cambiar un prompt.
- Tope de llamadas por ejecución y reintentos con backoff. Nunca bucles sin límite.
- Todo cambio en taxonomía o criterios pasa por el conjunto de evaluación (sección 9).

## 7. Producto (web pública)

Next.js (App Router) + TypeScript + Tailwind. Rutas:

- `/`: buscador de municipio y últimos plenos procesados.
- `/m/[municipio]`: pleno más reciente, puntos ordenados por impacto, filtros por
  tema y por "afecta a vecinos", línea temporal de sesiones.
- `/m/[municipio]/[sesion]`: todos los puntos con etiquetas, badge de confianza,
  importe si consta, enlace a la fuente, botón "Reportar clasificación errónea"
  (abre un issue prellenado en GitHub; sin backend propio).
- `/m/[municipio]/rss.xml`: RSS por municipio con los puntos de impacto 4 o 5.
- `/metodologia`: taxonomía, criterios de puntuación, umbrales, limitaciones,
  qué se redacta y qué no, y el aviso de que no es fuente oficial.
- `/fuentes`: estado de cada adaptador (última descarga, sesiones, errores).

**Resumen semanal:** con **plantillas deterministas** (sin generación libre):
"El pleno del {fecha} trató {n} puntos; {k} afectan directamente a vecinos. Los de
mayor impacto: {lista con enlace}". Deja un interruptor (apagado por defecto)
para un resumen breve generado por modelo, con la restricción de usar solo
frases presentes en el texto y con verificación automática de que cada cifra
del resumen aparece en el texto fuente.

Diseño: sobrio, legible, accesible (contraste, teclado, lectores de pantalla),
tema claro y oscuro, móvil primero.

## 8. Stack y estructura

- Next.js + TypeScript + Tailwind; Zod; Vitest; cheerio; `unpdf` o `pdfjs-dist`.
- AI SDK (`ai`) y `@ai-sdk/typesafe-ai` para jev; `fetch` directo para classifier.dev.
- Scripts: `npm run ingest -- --municipio <id>`, `npm run classify`, `npm run eval`,
  `npm run dev`. Ingesta programada con GitHub Actions (cron diario) con commit de JSON.
- Estructura sugerida: `lib/adapters/`, `lib/pipeline/`, `lib/classify/`,
  `lib/redact/`, `lib/schemas/`, `data/`, `scripts/`, `tests/`, `fixtures/`.
- Crea un `AGENTS.md` con las convenciones del proyecto y actualízalo al final de
  cada fase.

## 9. Evaluación (para no engañarnos)

- Crea `eval/golden.json` con 40 a 60 puntos reales redactados, con etiquetas
  puestas **a mano por mí** (yo las revisaré; propón una primera versión y márcala
  como provisional).
- `npm run eval` mide, por dimensión: exactitud de tema y tipo, acierto de
  `afecta_vecinos`, error medio de `impacto`, y si la confianza está calibrada
  (¿los puntos con confianza alta aciertan más?).
- Falla el CI si la exactitud cae por debajo del umbral pactado tras un cambio.
- Informa de los errores más frecuentes, no solo de la media.

## 10. Tests mínimos

Redacción de datos personales (incluidos casos límite), segmentación de puntos con
al menos 3 formatos distintos de acta, extracción de importes, idempotencia por
hash, validación Zod de cada adaptador, y un test que compruebe que **nada sin
redactar llega a una llamada de modelo** (mock del cliente).

## 11. Fases (una cada vez, con informe y pausa)

**Fase 0: spike de datos.** Sin escribir producto. Elige el municipio piloto
comprobando de verdad: `robots.txt` y términos, si hay API, columnas reales
(`package_show`), frescura del último pleno, calidad de los PDF. Descarga 3
sesiones de ejemplo a `fixtures/`. Entrega un informe con la recomendación
(adaptador `ckan-seu-e` o `pdf-transparencia`) y los riesgos encontrados.
*Aceptación:* tres sesiones reales parseadas a mano a puntos.

**Fase 1: ingesta y redacción.** Adaptador elegido + `manual`, segmentación,
redacción de datos personales, importes, idempotencia, tests.
*Aceptación:* `npm run ingest` produce JSON válido para el piloto; los tests pasan.

**Fase 2: clasificación y evaluación.** Pasadas 1 y 2, reescalado por confianza,
golden set y `npm run eval`. *Aceptación:* informe de exactitud con errores típicos.

**Fase 3: web.** Rutas de la sección 7 con datos reales del piloto.
*Aceptación:* navegación completa, accesible, con enlaces a la fuente y avisos.

**Fase 4: automatización y salida.** GitHub Actions, RSS, resumen semanal por
plantilla, página `/fuentes`. *Aceptación:* una semana simulada de extremo a extremo.

**Fase 5: generalizar.** Añade un segundo municipio con un tipo de fuente
**distinto** al piloto para demostrar que la arquitectura de adaptadores aguanta.
*Aceptación:* el segundo municipio funciona sin cambios en pipeline ni web.

## 12. Cómo quiero que trabajes

- No inventes endpoints, columnas ni parámetros: **lee la documentación real** y,
  si algo no se puede comprobar, dilo en el informe.
- Commits pequeños con mensajes claros. README directo, sin marketing, en español.
- Si encuentras una ambigüedad que cambie el diseño, **pregunta antes de seguir**.
- Al final de cada fase: qué hiciste, qué decidiste y por qué, qué no funcionó,
  qué riesgos quedan y qué propones para la siguiente.
- No amplíes el alcance por tu cuenta. Las ideas nuevas van a una lista en
  `IDEAS.md`, no al código.

## 13. Qué no hacer

- No tocar ni almacenar datos personales sin redactar.
- No puntuar a partidos, grupos ni personas. No atribuir votos.
- No presentar el resultado como fuente oficial ni como asesoría.
- No saltarse `robots.txt` ni los límites de cada fuente.
- No generar texto libre con modelos en el resumen semanal salvo con el
  interruptor activado y su verificación.
