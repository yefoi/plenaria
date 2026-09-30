# Informe de Fase 0 — Spike de datos

Fecha: 2026-09-30. Sin código de producto; solo verificación real de fuentes.

## 1. Qué se ha comprobado (con datos reales)

### API y portal (SEU-e / AOC)

- `package_show` funciona: conjunto `agn-ag-actes-de-ple` ("Actes del Ple") en
  `https://dadesobertes.seu-e.cat/api/3/action/package_show?id=agn-ag-actes-de-ple`.
- Recurso único: CSV de 32,8 MB en
  `https://dadesobertes.seu-e.cat/csv/agn-ag-actes-de-ple.csv` (cabecera real:
  `DATA_ACORD,TIPUS,ENLLAÇ_ACTA,CODI_ACTA,CODI_ENS,NOM_ENS`; UTF-8 con BOM;
  campos entrecomillados; delimitador coma).
- `datastore_search_sql` funciona y permite consultas agregadas.
- Volumen: 142.586 registros, 142.586 `CODI_ACTA` distintos (no hay duplicados
  por acta). El CSV se actualizó por última vez el 2026-09-29.
- Licencia declarada: **CC0** (dominio público). Conservador: CC Zero.

### `robots.txt` (verificado al byte)

- `dadesobertes.seu-e.cat`: `Disallow: /api/` y `Crawl-Delay: 10`. La ruta del
  CSV (`/csv/...`) **no** está restringida.
  → Decisión: el producto no llama a `/api/`; usa la **descarga del CSV masivo**
  y descubre las columnas del propio encabezado en tiempo de ejecución. Durante
  el spike usé la API a mano (una vez) para explorar; el código no la usará.
- `media.seu-e.cat` (PDFs): el `robots.txt` contiene
  `User-Agent: *`, `Disallow:` (vacío) y la línea `*/acteca`, que **no es una
  directiva válida** (sin `Disallow:`); los parsers estándar la ignoran. La
  intención del operador es ambigua (parece querer excluir `/acteca`, pero no lo
  consigue). Riesgo registrado en la sección 4.
- `seu-e.cat` restringe páginas HTML de "actes-de-ple"; irrelevante para el CSV
  y los PDFs.

### Formato de los documentos (PDFs descargados)

Se descargaron 9 PDFs (3 de Vilafranca del Penedès, 3 de L'Hospitalet de
Llobregat y 3 de Cambrils) y se probó extracción con `unpdf`:

| Fuente | Formato | Págs | Caracteres | Marcas de punto | Ruido de numeración |
| --- | --- | --- | --- | --- | --- |
| Vilafranca del Penedès | Acta completa | 20–44 | 66 k–151 k | 10–30 "punt" | Alto: 89 líneas numeradas, solo ~14 son puntos |
| L'Hospitalet de Llobregat | Extracte dels acords | 5 | 8,4 k–9,9 k | 0 ("punt") | **Nulo**: 35 líneas numeradas = 35 puntos reales |
| Cambrils | Acta completa | 59–79 | 147 k–199 k | 53–71 | Medio |

Los tres tienen capa de texto (no hace falta OCR). Los PDFs de Vilafranca y
Cambrils son actas completas con debates y votaciones; el de Hospitalet es un
"extracto de acuerdos" pensado para consulta: título de cada asunto, referencia
administrativa y resultado `(Aprovat)`, `(Rebutjada)`, `(Assabentat)`.

## 2. Municipio piloto recomendado: L'Hospitalet de Llobregat

Motivos:

1. **Segmentación determinista fiable.** El extracto numera los puntos 1..N sin
   ruido; el segmentador no necesita heurísticas frágiles. Vilafranca (acta
   completa) mezcla numeraciones de anexos con los puntos reales.
2. **Frescura.** Sesión de 2026-09-23 ya publicada en el CSV del 2026-09-29
   (~6 días de retraso). Cadencia mensual estable (documentación "Extracte
   acords del Ple" de 2011 a 2026).
3. **Tamaño manejable.** 5 páginas y ~9 k caracteres por sesión; coste mínimo de
   clasificación.
4. **Volumen suficiente.** 234 sesiones en el conjunto; ciudad de ~265.000
   habitantes, con temas de claro impacto vecinal (presupuestos, sanciones,
   movilidad, vivienda).
5. **Fuente ya explicada en el prompt** como adaptador `ckan-seu-e`.

Adaptador: `ckan-seu-e` (descubrimiento por CSV) + extracción de PDF
(`pdf-transparencia` comparte el módulo de extraer texto; `manual` reutiliza el
segmentador del extracto).

### Muestras en `fixtures/`

`fixtures/hospitalet-llobregat/` contiene 3 sesiones (PDF + texto extraído):
`sesion-2026-09-23`, `sesion-2026-07-29`, `sesion-2026-06-30`.
La sesión 2026-09-23 está parseada a mano a 35 puntos en
`fixtures/hospitalet-llobregat/2026-09-23.puntos.json` (verificado título a
título contra el PDF; los resultados entre paréntesis se usan solo para
validación, el modelo de datos del MVP no los publica).

## 3. Decisiones tomadas

- **Descubrimiento sin API:** descarga del CSV masivo (permitida por
  robots.txt), validación del encabezado en tiempo de ejecución y filtro por
  `CODI_ENS`. Si el encabezado cambia, el adaptador falla con error claro en vez
  de adivinar.
- **User-Agent identificable** y `Crawl-Delay: 10` respetado; caché por ETag /
  Last-Modified y hash de contenido.
- **Los votos y referencias a grupos políticos no entran en el modelo.** El
  extracto de Hospitalet contiene líneas del tipo `(AJT/139875/2026 Partit
  Popular)`; el parser las descarta y no se publican.
- **Puntos sensibles:** el extracto trae "Autoritzar al senyor C. G. B. ..." con
  iniciales (ya seudonimizado por transparencia). Aun así, las clases
  "personal", "sanciones", "ayudas individuales" se marcarán `sensible` y se
  mostrarán con título genérico.
- **Importes:** el extracto rara vez incluye cifras; el patrón de importes se
  implementa igualmente (hay referencias a expedientes de crédito y a menudo el
  título contiene cantidades en otras fuentes).

## 4. Riesgos y limitaciones encontrados

1. **`robots.txt` ambiguo en `media.seu-e.cat`.** La línea malformada `*/acteca`
   no restringe nada según el estándar, pero indica una posible intención de
   excluir los PDFs. Mitigación: el fetcher comprueba `robots.txt` con un parser
   estándar antes de cada descarga y respeta el resultado; si el operador
   publica un `Disallow: */acteca` válido, el adaptador dejará de descargar y
   pedirá ingesta manual. Queda documentado en `/fuentes` y `/metodologia`.
2. **El extracto no incluye texto de debate ni importes completos.** El impacto
   se puntúa sobre el título; el conjunto dorado medirá si basta.
3. **Frescura con hasta ~2 semanas de retraso** (aprobación del acta). Asumible
   para un resumen informativo.
4. **Cambios de plantilla en PDFs.** El segmentador debe fallar visiblemente
   (`segmentacion_pobre`) si el formato cambia; hay tests con 3 sesiones y al
   menos 3 formatos.
5. **Idioma catalán** (y actas bilingües puntuales). Los prompts de
   clasificación y taxonomía se definen en español pero los textos llegan en
   catalán; classifier.dev y jev manejan multilingüe. El conjunto dorado lo
   refleja.
6. **Límites de APIs gratuitas.** classifier.dev anónimo: 3.000 preguntas/minuto
   y 20.000/día por IP; suficiente para el piloto. jev requiere clave; el
   pipeline funciona sin jev (degradado) y lo indica.

## 5. Coste estimado por sesión

- 1 PDF (~240 KB) + 1 llamada CSV compartida.
- ~35 puntos → 1 pasada classifier.dev en lote (35 decisiones de tema en
  multi-etiqueta + 35 de tipo; el lote permite hasta 1.000 por petición).
- jev: solo puntos no triviales (~20 por sesión), una llamada por punto con 3
  preguntas tipadas.
- Coste marginal por sesión: céntimos o cero con las capas gratuitas.

## 6. Qué propongo para la Fase 1

Adaptador `ckan-seu-e` (CSV → PDF → texto), adaptador `manual`, segmentador del
formato "extracte d'acords" con fallback, redacción de datos personales,
extracción de importes, idempotencia por hash y tests con los fixtures
descargados.
