import { importePrincipal } from '@/lib/pipeline/amounts';
import { redactar, contienePosibleDatoPersonal } from '@/lib/redact/redact';
import { esSensible, tituloGenericoSensible } from '@/lib/pipeline/sensible';
import type { DocumentoParseado, ReferenciaSesion } from '@/lib/adapters/types';
import type { DocumentoSesion, Municipio, Punto } from '@/lib/schemas';
import { log } from '@/lib/utils/log';

export interface EntradaProceso {
  municipio: Municipio;
  referencia: ReferenciaSesion;
  parseado: DocumentoParseado;
  hashContenido: string;
  sesionId: string;
  fuenteUrl: string;
}

export const LIMITE_TEXTO = 1500;

export function redactarPunto(
  sesionId: string,
  orden: number,
  tituloCrudo: string,
): Punto {
  const sensible = esSensible(tituloCrudo);
  const { texto: tituloRedactado } = redactar(tituloCrudo);
  const titulo = sensible ? tituloGenericoSensible(tituloCrudo) : tituloRedactado;
  const textoRedactado = sensible ? '' : tituloRedactado.slice(0, LIMITE_TEXTO);
  const importe = sensible ? null : importePrincipal(tituloRedactado);
  const restos = contienePosibleDatoPersonal(textoRedactado);
  if (restos.length > 0) {
    log('aviso', `Posible dato personal sin redactar en el punto ${orden}: ${restos.join(', ')}`);
  }
  return {
    id: `${sesionId}#${orden}`,
    sesion_id: sesionId,
    orden,
    titulo,
    texto_redactado: textoRedactado,
    importe_eur: importe,
    sensible,
    tipo_punto: null,
    temas: [],
    afecta_vecinos_prob: null,
    impacto: null,
    confianza_min: null,
    revision_manual: restos.length > 0,
    clasificado_con: null,
  };
}

export function procesarSesion(entrada: EntradaProceso): DocumentoSesion {
  const { municipio, referencia, parseado, hashContenido, sesionId, fuenteUrl } = entrada;

  let estado: DocumentoSesion['sesion']['estado_ingesta'];
  let puntos: Punto[] = [];

  if (parseado.requiereOcr) {
    estado = 'requiere_ocr';
  } else {
    puntos = parseado.puntos.map((p) => redactarPunto(sesionId, p.orden, p.titulo));
    estado = parseado.segmentacionPobre ? 'segmentacion_pobre' : 'redactada';
  }

  return {
    version: 1,
    municipio,
    sesion: {
      id: sesionId,
      municipio_id: municipio.id,
      fecha: referencia.fecha,
      tipo: referencia.tipo,
      fuente_url: fuenteUrl,
      hash_contenido: hashContenido,
      estado_ingesta: estado,
      actualizada_en: new Date().toISOString(),
    },
    puntos,
  };
}

