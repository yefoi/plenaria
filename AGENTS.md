# Convenciones del proyecto (para agentes y personas)

## Principios no negociables

1. **Cero invención.** Todo dato mostrado debe rastrearse al texto fuente. Si no
   se puede, no se muestra.
2. **Cálculo en código, juicio en el modelo.** Fechas, importes, conteos y
   ordenaciones se calculan con regex y aritmética. Los modelos solo clasifican
   y puntúan.
3. **Enlace a la fuente siempre.** Cada punto lleva la URL del documento.
4. **Privacidad por defecto.** Nada se envía a una API sin pasar antes por
   `lib/redact/redact.ts`. Los puntos sensibles no muestran texto.
5. **Neutralidad.** Sin puntuaciones a partidos ni personas, sin atribución de
   votos.
6. **Honestidad sobre la calidad.** Cada clasificación guarda su confianza; el
   conjunto dorado y los informes de evaluación se mantienen actualizados.
7. **Buen ciudadano de internet.** `robots.txt` con intérprete estándar, pausas,
   User-Agent identificable, caché y reintentos con espera.

## Comandos

- `npm test` · `npm run typecheck` · `npm run lint` · `npm run build`
- `npm run ingest -- --todos` · `npm run classify -- --todos` · `npm run digest`
- `npm run eval` · `npm run golden` · `npm run mapa`

Al añadir un municipio a `MUNICIPIOS` hay que ejecutar `npm run mapa` para
situarlo en el mapa; `tests/mapa.test.ts` falla si falta el pin.

Antes de dar un cambio por terminado: `npm run typecheck && npm test && npm run lint && npm run build`.

## Estructura y estilo

- TypeScript estricto, alias `@/` a la raíz. Módulos ECMAScript (`type: module`).
- Dominio en español (`Punto`, `Sesion`, `revision_manual`), APIs externas en su
  idioma. Esquemas Zod en `lib/schemas/index.ts`; todo lo que se persiste o se
  lee se valida con Zod.
- Acceso a datos siempre detrás de la interfaz `Repository` (`lib/repo/`). No
  leer ficheros de `data/` directamente desde otras partes.
- Scripts ejecutables con `tsx` en `scripts/`; nada de lógica de negocio ahí.
- Sin comentarios en el código salvo necesidad real. La documentación va en
  `README.md`, `docs/` y este archivo.
- Nombres de funciones y variables en español cuando son del dominio;
  identificadores de terceros se dejan como vienen.

## Reglas de seguridad

- Jamás llamar a classifier.dev, TypeSafe/u otro servicio con texto que no haya
  pasado por `redactar()`. Los clientes de clasificación llaman a
  `contienePosibleDatoPersonal()` y lanzan error si hay restos.
- Ningún secreto en el repositorio: `TYPESAFE_AI_API_KEY` y
  `CLASSIFIER_API_KEY` van por variables de entorno (`.env.local`, secretos de
  Actions).
- No almacenar datos personales sin redactar, ni siquiera en caché.

## Cambios en taxonomía o criterios

1. Tocar `lib/classify/taxonomy.ts` (subir `VERSION_TAXONOMIA`).
2. Revisar/actualizar `eval/golden.json` (o regenerarlo con `npm run golden` si
   cambian los fixtures).
3. `npm run eval` y comparar con el informe anterior. El hash de instrucciones
   guardado en cada punto permite saber con qué criterios se clasificó.
4. Informar de los errores más frecuentes, no solo de la media.

## Flujo por fases

El trabajo se organiza en fases con informe al terminar (ver sección 11 del
prompt original y `docs/`). Al cerrar una fase: actualizar este archivo si
cambian convenciones, y anotar ideas nuevas en `IDEAS.md`, nunca en el código.
