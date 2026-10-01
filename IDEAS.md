# IDEAS.md

Ideas fuera del alcance actual. No implementar sin acordarlo antes.

## Datos y modelo

- Importes que solo aparecen en los expedientes anexos (no en el extracto):
  habría que enlazar el expediente completo.
- Traducción de títulos catalán→castellano en la interfaz, manteniendo el
  original como fuente (requiere proveedor de traducción).

## Fuentes

- Área metropolitana de Madrid, siguientes candidatos verificados a medias:
  Alcalá de Henares (portal `sesionesplenos` sin PDFs; las actas están en su
  sede), Alcorcón (directorio con pocos documentos públicos), Leganés (carga
  los PDFs por JavaScript en Liferay), Getafe (`robots.txt` bloquea
  `/wp-content/uploads`, donde están los PDFs), Fuenlabrada (actas en sede
  electrónica, no en el portal de transparencia).
- Rivas-Vaciamadrid: sus actas son escaneos sin capa de texto
  (`requiere_ocr`); quedaría pendiente de OCR selectivo.
- Cobertura catalana: hay ~125 ayuntamientos más con sesiones frescas en el
  catálogo de la AOC; añadibles por lotes siguiendo el mismo criterio de
  población (hoy hay 61 municipios: 58 catalanes + Toledo + Madrid + Móstoles).
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

## Clasificación

- Resumen por modelo con proveedor de texto configurable: el interruptor y la
  verificación de cifras ya existen (`lib/digest/modelo.ts`), falta conectar un
  proveedor de generación (AI SDK `generateText`) y su clave.
- Recalibrar el umbral de confianza con datos reales acumulados.
- Evaluar `laya`/`kev` de classifier.dev como alternativa más barata a jev en
  corpus largos.
- Caché de la pasada jev (la caché actual cubre la pasada de classifier.dev).

## Infraestructura

- Con 61 municipios el JSON versionado sigue yendo bien; reconsiderar una base
  de datos si la cobertura crece mucho más (la interfaz `Repository` ya lo
  aísla).
- Ingesta incremental del CSV por ETag a nivel de fila (hoy se filtra en
  memoria tras descargar el catálogo completo, ~32 MB).
