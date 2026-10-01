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
import { EnlaceExterno } from '@/app/components/ui';
import { REPO_URL } from '@/lib/web/repo';

export const metadata: Metadata = {
  title: 'Metodología y limitaciones',
};

export default function PaginaMetodologia() {
  return (
    <article className="max-w-3xl space-y-14">
      <header className="border-b border-linea pb-6">
        <p className="eyebrow">Transparencia del método</p>
        <h1 className="mt-2 text-3xl font-semibold text-marca-fuerte sm:text-4xl">
          Metodología y limitaciones
        </h1>
        <p className="mt-3 text-apagado">
          Taxonomía v{VERSION_TAXONOMIA}. Última revisión: septiembre de 2026.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl text-marca-fuerte">Qué es y qué no es</h2>
        <p className="leading-relaxed text-apagado">
          {MARCA.global} ({MARCA.nombreLocal}) convierte órdenes del día y actas de plenos
          municipales en un resumen legible y filtrable. Es una herramienta informativa para
          vecinos, asociaciones y periodistas locales.
        </p>
        <p className="leading-relaxed text-apagado">
          <strong className="text-texto">No es fuente oficial.</strong> La única fuente válida es el
          documento original, enlazado en cada punto. No se valora políticamente ningún asunto, no
          se puntúa a partidos ni personas y no se atribuyen votos.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl text-marca-fuerte">De dónde salen los datos</h2>
        <p className="leading-relaxed text-apagado">
          El piloto usa el conjunto de datos público «Actes del Ple» del portal de datos abiertos de
          la AOC (licencia CC0). La ingesta descarga el catálogo, localiza el acta o extracto de
          acuerdos en PDF o DOCX, extrae su texto y lo divide en puntos con reglas deterministas.
        </p>
        <p className="leading-relaxed text-apagado">
          Se respeta <code>robots.txt</code> en todas las descargas (comprobado con un intérprete
          estándar), se usa un identificador de agente con contacto, hay pausa entre peticiones,
          caché por hash y reintentos con espera. La API interna del portal no se usa: el catálogo
          se obtiene por la ruta pública de descarga masiva.
        </p>
        <p className="leading-relaxed text-apagado">
          El mapa de España usa la cartografía de provincias del Instituto Geográfico Nacional
          (licencia{' '}
          <EnlaceExterno href="https://www.ign.es/">CC BY 4.0</EnlaceExterno>) a través del proyecto{' '}
          <code>es-atlas</code>. Se genera en tiempo de compilación como SVG y no carga teselas ni
          scripts de terceros.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl text-marca-fuerte">Cómo se puntúa</h2>
        <div className="tarjeta p-5">
          <h3 className="font-serif text-base font-semibold text-marca-fuerte">
            Afectación vecinal
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-apagado">
            {CRITERIOS_AFECTA_VECINOS.instructions} Se muestra la probabilidad estimada por el
            modelo.
          </p>
        </div>
        <div className="tarjeta p-5">
          <h3 className="font-serif text-base font-semibold text-marca-fuerte">Impacto (1 a 5)</h3>
          <ol className="mt-2.5 grid gap-1.5 text-sm">
            {CRITERIOS_IMPACTO.map((nivel, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="shrink-0 font-semibold tabular-nums text-marca">{i + 1}</span>
                <span className="text-apagado">{nivel}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="tarjeta p-5">
          <h3 className="font-serif text-base font-semibold text-marca-fuerte">
            Plazos y acción ciudadana
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-apagado">
            {CRITERIOS_PLAZO_CIUDADANO.instructions}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl text-marca-fuerte">Temas y tipos de punto</h2>
        <div className="tarjeta p-5">
          <h3 className="eyebrow">Temas</h3>
          <dl className="mt-3 grid gap-2.5 text-sm">
            {TEMAS.map((tema) => (
              <div key={tema} className="border-b border-linea pb-2.5 last:border-0 last:pb-0">
                <dt className="font-semibold text-texto">{ETIQUETA_TEMA[tema]}</dt>
                <dd className="text-apagado">{DESCRIPCION_TEMAS[tema]}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="tarjeta p-5">
          <h3 className="eyebrow">Tipos de punto</h3>
          <dl className="mt-3 grid gap-2.5 text-sm">
            {TIPOS_PUNTO.map((tipo) => (
              <div key={tipo} className="border-b border-linea pb-2.5 last:border-0 last:pb-0">
                <dt className="font-semibold text-texto">{ETIQUETA_TIPO[tipo]}</dt>
                <dd className="text-apagado">{DESCRIPCION_TIPOS[tipo]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl text-marca-fuerte">Confianza y errores</h2>
        <p className="leading-relaxed text-apagado">
          Cada clasificación guarda una confianza. Si la confianza mínima de un punto queda por
          debajo de {UMBRAL_CONFIANZA}, se marca «clasificación a revisar» y se muestra un aviso.
          Los puntos sensibles no pasan por la segunda pasada de evaluación.
        </p>
        <p className="leading-relaxed text-apagado">
          Puedes reportar un error con el enlace «Reportar clasificación errónea» de cada punto, que
          abre un formulario en GitHub con el punto precargado: <EnlaceExterno href={REPO_URL}>{REPO_URL}</EnlaceExterno>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl text-marca-fuerte">Privacidad: qué se redacta y qué no</h2>
        <p className="leading-relaxed text-apagado">
          Antes de enviar cualquier texto a un servicio de clasificación se sustituyen los datos
          personales por marcadores: DNI, NIE, CIF, correos, teléfonos, IBAN, matrículas,
          direcciones postales y nombres de personas físicas que no sean cargos públicos en
          ejercicio («Sra. <em>[NOMBRE]</em>»). Un test automático impide que un texto con posibles
          datos personales llegue a una llamada de modelo.
        </p>
        <p className="leading-relaxed text-apagado">
          Los puntos que tratan de personal, nombramientos, sanciones o ayudas individuales,
          expropiaciones, responsabilidad patrimonial, menores o servicios sociales se marcan como
          sensibles: se publican con un título genérico y sin texto.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl text-marca-fuerte">Límites conocidos</h2>
        <ul className="tarjeta grid gap-2.5 p-5 text-sm text-apagado">
          {[
            'La clasificación la hace un modelo de decisiones (Jev, de TypeSafe, y el servicio classifier.dev). Puede equivocarse: para eso está la confianza y el enlace de reporte.',
            'El resumen semanal se compone con plantillas deterministas. Existe un interruptor para un resumen generado por modelo, apagado por defecto, con verificación de que cada cifra aparece en el texto fuente.',
            'No se hace OCR: los documentos sin capa de texto se marcan y se omiten.',
            'Los importes se extraen con expresiones regulares del texto; si no constan, no se muestran.',
            'Las fechas, conteos y ordenaciones se calculan con código, nunca con un modelo.',
            'El idioma de las fuentes es el de cada administración (catalán y castellano en el piloto).',
            'Las clasificaciones guardan modelo, versión, hash de instrucciones y fecha para poder reproducirlas y compararlas.',
          ].map((limite) => (
            <li key={limite} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-marca" />
              <span className="leading-relaxed">{limite}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
