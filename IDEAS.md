# IDEAS.md

Ideas fuera del alcance actual. No implementar sin acordarlo antes.

## Datos y modelo

- Campo `resultado` por punto (aprovat / rebutjat / assabentat). Hoy el
  segmentador lo detecta y se usa en tests y en el golden, pero no se publica
  porque el modelo de datos del MVP no lo contempla.
- Importes que solo aparecen en los expedientes anexos (no en el extracto):
  habría que enlazar el expediente completo.
- Detección de PDFs duplicados en el catálogo con contenidos auxiliares
  (p. ej. `aprovavio_definitiva_xarxa_bressol.pdf` repetido).
- Traducción de títulos catalán→castellano en la interfaz, manteniendo el
  original como fuente.

## Fuentes

- Ampliar a otras comunidades autónomas con el adaptador `pdf-transparencia`
  (cada portal exige verificar listado, patrón de PDF y fechas).
- Adaptadores para portales con plantilla común de la Diputación de Sevilla
  (VideoActas) donde las actas no están en PDF sino en una aplicación.
- OCR para PDFs sin capa de texto (marcados `requiere_ocr`).
- Comprobación automática de que `robots.txt` sigue permitiendo las rutas y
  aviso en `/fuentes` si cambia (hoy se comprueba en cada descarga).

## Producto

- Panel de revisión manual: marcar puntos como revisados y anotar la corrección
  (alimentaría el golden set).
- Alertas por email o RSS filtrado por tema.
- Página de comparación entre sesiones (qué cambió de una a otra).
- Formulario de reporte con almacenamiento propio en vez de issues de GitHub.
- Suscripción por palabras clave.

## Clasificación

- Resumen por modelo con proveedor de texto configurable: el interruptor y la
  verificación de cifras ya existen (`lib/digest/modelo.ts`), falta conectar un
  proveedor de generación (AI SDK `generateText`) y su clave.
- Recalibrar el umbral de confianza con datos reales acumulados.
- Caché de clasificaciones por hash del texto para no repetir llamadas cuando
  solo cambia el título de la web.
- Evaluar `laya`/`kev` de classifier.dev como alternativa más barata a jev en
  corpus largos.

## Mapa y cobertura

- Agrupar pines cercanos (clustering) y hacer zoom por comunidad autónoma para
  cuando haya muchos municipios en la misma zona.
- Mini-mapa localizador en la página de cada municipio.
- Comparador entre municipios (temas e impacto por sesión).
- Mostrar en el mapa los municipios «en cartera» sin datos todavía, con estado
  diferenciado.

## Infraestructura

- Con 14 municipios el JSON versionado sigue yendo bien; reconsiderar una base
  de datos si la cobertura crece mucho más (la interfaz `Repository` ya lo
  aísla).
- Ingesta incremental del CSV por ETag a nivel de fila (hoy se filtra en
  memoria tras descargar el catálogo completo, ~32 MB).
