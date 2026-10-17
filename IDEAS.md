# IDEAS.md

Ideas fuera del alcance actual. No implementar sin acordarlo antes.

## Datos y modelo

- Importes que solo aparecen en los expedientes anexos (no en el extracto):
  habría que enlazar el expediente completo.
- Traducción de títulos catalán→castellano en la interfaz, manteniendo el
  original como fuente (requiere proveedor de traducción).

## Cruce con datos de gestión

Idea surgida al comparar con `ayuntamientostransparentes.es`, que cubre 8.132
municipios con datos económicos agregados pero no entra en el contenido de los
plenos. Nuestro hueco es el contrario: llevar el dato oficial de ejecución al
**punto del pleno que lo decide**, no al municipio en general.

- **CONPREL** (liquidaciones de presupuestos, Ministerio de Hacienda): cuando un
  punto aprueba una modificación de crédito, la cuenta general o una ordenanza
  fiscal, enlazar con la ejecución real (gasto por capítulos, inversiones,
  remanente de tesorería, periodo medio de pago).
- **Contratos**: para puntos de obra, servicio o suministro, buscar el contrato
  adjudicado en la Plataforma de Contratación del Sector Público y, en
  Cataluña, en el Registre públic de contractes de la Generalitat (que incluye
  los menores), y mostrar importe, procedimiento y si hubo una sola oferta.
- **Subvenciones**: Base de Datos Nacional de Subvenciones, siempre sin nombres
  de beneficiarios.
- **Deuda viva** y **periodo medio de pago a proveedores** como contexto del
  municipio en la ficha, con la fecha del dato a la vista.
- Requisito de diseño: la asociación punto↔dato debe ser por identificador
  (número de expediente, contrato, ejercicio), nunca por heurística de texto.
  Si no hay coincidencia verificable, no se muestra nada.

## Fuentes

- Área metropolitana de Madrid, siguientes candidatos verificados a medias:
  Alcalá de Henares (portal `sesionesplenos` sin PDFs; las actas están en su
  sede), Alcorcón (directorio con pocos documentos públicos), Leganés (carga
  los PDFs por JavaScript en Liferay), Getafe (`robots.txt` bloquea
  `/wp-content/uploads`, donde están los PDFs), Fuenlabrada (actas en sede
  electrónica, no en el portal de transparencia).
- Rivas-Vaciamadrid: sus actas son escaneos sin capa de texto
  (`requiere_ocr`); quedaría pendiente de OCR selectivo.
- Cobertura catalana: quedan ~250 ayuntamientos con sesiones frescas en el
  catálogo de la AOC; añadibles por lotes siguiendo el criterio de población
  (hoy hay 81 municipios: 78 catalanes + Toledo + Madrid + Móstoles). El
  ranking de candidatos se calcula cruzando el `CODI_ENS` con el padrón de
  2025 del Idescat y el atlas del IGN; conviene automatizarlo en un script
  versionado en vez de repetir el análisis a mano.
- Ampliar a otras comunidades autónomas con el adaptador `pdf-transparencia`
  o `portal-sesiones` (cada portal exige verificar listado, patrón de PDF y
  fechas).
- Adaptadores para portales con plantilla común de la Diputación de Sevilla
  (VideoActas) donde las actas no están en PDF sino en una aplicación.
- OCR selectivo para escaneos (tesseract.js u equivalente, en servidor).

## Producto

- Panel de revisión manual: marcar puntos como revisados y anotar la corrección
  (alimentaría el golden set). Requiere backend o almacenamiento en el repo.
- Alertas por email (requiere backend/proveedor). El RSS por tema ya existe.
- Página de comparación de municipios entre sí (la comparación entre sesiones
  del mismo municipio ya existe en `/m/[municipio]/comparar`).
- Formulario de reporte con almacenamiento propio en vez de issues de GitHub.
- Suscripción por palabras clave.
- Mostrar en el mapa los municipios «en cartera» sin datos todavía, con estado
  diferenciado.
- Sección «Qué no está disponible» en `/fuentes`: lista explícita de lo que no
  se puede mostrar y por qué (reparos del interventor sin contenido publicado,
  mociones de censura sin registro oficial, plantilla por municipio, causas
  judiciales sin desglose municipal). Refuerza la honestidad sobre los límites
  sin necesidad de código nuevo.

## Clasificación

- Resumen por modelo con proveedor de texto configurable: el interruptor y la
  verificación de cifras ya existen (`lib/digest/modelo.ts`), falta conectar un
  proveedor de generación (AI SDK `generateText`) y su clave.
- Recalibrar el umbral de confianza con datos reales acumulados.
- Evaluar `laya`/`kev` de classifier.dev como alternativa más barata a jev en
  corpus largos.
- Caché de la pasada jev (la caché actual cubre la pasada de classifier.dev).

## Infraestructura

- Con 81 municipios el JSON versionado sigue yendo bien; reconsiderar una base
  de datos si la cobertura crece mucho más (la interfaz `Repository` ya lo
  aísla).
- Ingesta incremental del CSV por ETag a nivel de fila (hoy se filtra en
  memoria tras descargar el catálogo completo, ~32 MB).
