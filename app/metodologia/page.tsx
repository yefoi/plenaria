import type { Metadata } from 'next';
import {
  CRITERIOS_AFECTA_VECINOS,
  CRITERIOS_IMPACTO,
  CRITERIOS_PLAZO_CIUDADANO,
  DESCRIPCION_TEMAS,
  DESCRIPCION_TIPOS,
  VERSION_TAXONOMIA,
} from '@/lib/classify/taxonomy';
import { MARCA } from '@/lib/brand';
import { UMBRAL_CONFIANZA } from '@/lib/config';
import { TEMAS, TIPOS_PUNTO } from '@/lib/schemas';
import { ETIQUETA_TEMA, ETIQUETA_TIPO } from '@/lib/web/labels';
import { REPO_URL } from '@/lib/web/repo';

export const metadata: Metadata = {
  title: 'Metodología y limitaciones',
};

export default function PaginaMetodologia() {
  return (
    <article className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Metodología y limitaciones</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Taxonomía v{VERSION_TAXONOMIA}. Última revisión: septiembre de 2026.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Qué es y qué no es</h2>
        <p>
          {MARCA.global} ({MARCA.nombreLocal}) convierte órdenes del día y actas de plenos
          municipales en un resumen legible y filtrable. Es una herramienta informativa para
          vecinos, asociaciones y periodistas locales.
        </p>
        <p>
          <strong>No es fuente oficial.</strong> La única fuente válida es el documento original,
          enlazado en cada punto. No se valora políticamente ningún asunto, no se puntúa a partidos
          ni personas y no se atribuyen votos.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">De dónde salen los datos</h2>
        <p>
          El piloto usa el conjunto de datos público «Actes del Ple» del portal de datos abiertos
          de la AOC (licencia CC0). La ingesta descarga el catálogo, localiza el acta o extracto de
          acuerdos en PDF, extrae su texto y lo divide en puntos con reglas deterministas.
        </p>
        <p>
          Se respeta <code>robots.txt</code> en todas las descargas (comprobado con un intérprete
          estándar), se usa un identificador de agente con contacto, hay pausa entre peticiones,
          caché por hash y reintentos con espera. La API interna del portal no se usa: el catálogo
          se obtiene por la ruta pública de descarga masiva.
        </p>
        <p>
          El mapa de España usa la cartografía de provincias del Instituto Geográfico Nacional
          (licencia <a className="underline" href="https://www.ign.es/" rel="noopener noreferrer" target="_blank">CC BY 4.0</a>)
          a través del proyecto <code>es-atlas</code>. Se genera en tiempo de compilación como SVG
          y no carga teselas ni scripts de terceros.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Cómo se puntúa</h2>
        <div>
          <h3 className="font-medium">Afectación vecinal</h3>
          <p className="text-sm">{CRITERIOS_AFECTA_VECINOS.instructions} Se muestra la probabilidad estimada por el modelo.</p>
        </div>
        <div>
          <h3 className="font-medium">Impacto (1 a 5)</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {CRITERIOS_IMPACTO.map((nivel, i) => (
              <li key={i}>
                <strong>{i + 1}: </strong>
                {nivel}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="font-medium">Plazos y acción ciudadana</h3>
          <p className="text-sm">{CRITERIOS_PLAZO_CIUDADANO.instructions}</p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Temas y tipos de punto</h2>
        <ul className="space-y-1 text-sm">
          {TEMAS.map((tema) => (
            <li key={tema}>
              <strong>{ETIQUETA_TEMA[tema]}:</strong> {DESCRIPCION_TEMAS[tema]}
            </li>
          ))}
        </ul>
        <ul className="mt-3 space-y-1 text-sm">
          {TIPOS_PUNTO.map((tipo) => (
            <li key={tipo}>
              <strong>{ETIQUETA_TIPO[tipo]}:</strong> {DESCRIPCION_TIPOS[tipo]}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Confianza y errores</h2>
        <p>
          Cada clasificación guarda una confianza. Si la confianza mínima de un punto queda por
          debajo de {UMBRAL_CONFIANZA}, se marca «clasificación a revisar» y se muestra un aviso. Los
          puntos sensibles no pasan por la segunda pasada de evaluación.
        </p>
        <p>
          Puedes reportar un error con el botón «Reportar clasificación errónea» de cada punto, que
          abre un formulario en GitHub con el punto precargado: <a className="underline" href={REPO_URL}>{REPO_URL}</a>.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Privacidad: qué se redacta y qué no</h2>
        <p>
          Antes de enviar cualquier texto a un servicio de clasificación se sustituyen los datos
          personales por marcadores: DNI, NIE, CIF, correos, teléfonos, IBAN, matrículas,
          direcciones postales y nombres de personas físicas que no sean cargos públicos en
          ejercicio («Sra. <span className="italic">[NOMBRE]</span>»). Un test automático impide que
          un texto con posibles datos personales llegue a una llamada de modelo.
        </p>
        <p>
          Los puntos que tratan de personal, nombramientos, sanciones o ayudas individuales,
          expropiaciones, responsabilidad patrimonial, menores o servicios sociales se marcan como
          sensibles: se publican con un título genérico y sin texto.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Límites conocidos</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>La clasificación la hace un modelo de decisiones (Jev, de TypeSafe, y el servicio classifier.dev). Puede equivocarse: para eso está la confianza y el botón de reporte.</li>
          <li>El resumen semanal se compone con plantillas deterministas. Existe un interruptor para un resumen generado por modelo, apagado por defecto, con verificación de que cada cifra aparece en el texto fuente.</li>
          <li>No se hace OCR: los documentos sin capa de texto se marcan y se omiten.</li>
          <li>Los importes se extraen con expresiones regulares del texto; si no constan, no se muestran.</li>
          <li>Las fechas, conteos y ordenaciones se calculan con código, nunca con un modelo.</li>
          <li>El idioma de las fuentes es el de cada administración (catalán y castellano en el piloto).</li>
          <li>Las clasificaciones guardan modelo, versión, hash de instrucciones y fecha para poder reproducirlas y compararlas.</li>
        </ul>
      </section>
    </article>
  );
}
