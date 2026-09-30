import { describe, expect, it, vi } from 'vitest';
import {
  ClienteClassifier,
  DatoPersonalSinRedactarError,
} from '@/lib/classify/classifier';
import { crearEvaluadorJev } from '@/lib/classify/jev';
import { clasificarDocumento } from '@/lib/classify/pipeline';
import type { DocumentoSesion } from '@/lib/schemas';

function respuestaMulti(etiquetas: string[], modelo = 'jev-test') {
  return new Response(
    JSON.stringify({
      results: [{ labels: etiquetas, scores: Object.fromEntries(etiquetas.map((e) => [e, 0.91])), model: modelo }],
      model: modelo,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

function respuestaSimple(label: string, confidence: number | null, modelo = 'jev-test', escalated = false) {
  return new Response(
    JSON.stringify({
      results: [{ label, confidence, scores: { [label]: confidence ?? 0 }, model: modelo, escalated }],
      model: modelo,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('ClienteClassifier', () => {
  it('clasifica temas (multi) y tipo (simple) y mapea resultados', async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      const cuerpo = JSON.parse(init.body as string);
      cuerpos.push(cuerpo);
      if (cuerpo.multi) return respuestaMulti(['presupuesto_impuestos', 'servicios_publicos']);
      return respuestaSimple('acuerdo', 0.93);
    }) as unknown as typeof fetch;

    const cliente = new ClienteClassifier({ fetchFn });
    const resultado = await cliente.clasificarLote(
      [{ id: 'p1', texto: 'APROVAR LA MODIFICACIÓ DE CRÈDIT DEL PRESSUPOST MUNICIPAL.' }],
      0.7,
    );

    expect(resultado.get('p1')?.tipo.tipo).toBe('acuerdo');
    expect(resultado.get('p1')?.tipo.confianza).toBe(0.93);
    expect(resultado.get('p1')?.temas.temas).toContain('presupuesto_impuestos');
    expect(cuerpos.some((c) => c.multi === true)).toBe(true);
  });

  it('reescala a smart los tipos con confianza baja', async () => {
    const tiers: string[] = [];
    let llamadasTipo = 0;
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      const cuerpo = JSON.parse(init.body as string);
      if (cuerpo.multi) return respuestaMulti(['otros']);
      llamadasTipo++;
      if (cuerpo.tier === 'smart') {
        tiers.push('smart');
        return respuestaSimple('mocion', null, 'jev-smart', true);
      }
      tiers.push('fast');
      return respuestaSimple('acuerdo', 0.4);
    }) as unknown as typeof fetch;

    const cliente = new ClienteClassifier({ fetchFn });
    const resultado = await cliente.clasificarLote([{ id: 'p1', texto: 'Moció sobre habitatge.' }], 0.7);

    expect(tiers).toEqual(['fast', 'smart']);
    expect(llamadasTipo).toBe(2);
    expect(resultado.get('p1')?.tipo.tipo).toBe('mocion');
    expect(resultado.get('p1')?.tipo.confianza).toBeNull();
    expect(resultado.get('p1')?.tipo.escalado).toBe(true);
  });

  it('no envía texto con datos personales sin redactar', async () => {
    const fetchFn = vi.fn(async () => respuestaMulti(['otros'])) as unknown as typeof fetch;
    const cliente = new ClienteClassifier({ fetchFn });
    await expect(
      cliente.clasificarLote([{ id: 'p1', texto: 'El senyor amb DNI 12345678Z sol·licita això.' }], 0.7),
    ).rejects.toBeInstanceOf(DatoPersonalSinRedactarError);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('crearEvaluadorJev', () => {
  it('mapea score a impacto 1-5 y extrae la confianza de providerMetadata', async () => {
    const evaluar = vi.fn(async () => ({
      answers: {
        afecta_vecinos: { probability: 0.93 },
        impacto: { score: 3.4 },
        plazo_accion_ciudadana: { probability: 0.2 },
      },
      providerMetadata: { typesafe: { confidence: { impacto: 0.81, afecta_vecinos: 0.9 } } },
      response: { modelId: 'jev-1.13.0' },
    }));

    const evaluador = crearEvaluadorJev({ evaluar });
    const juicio = await evaluador({
      titulo: 'Punt de prova',
      texto: 'Text de prova sobre l’impacte',
      tipo_punto: 'acuerdo',
      temas: ['servicios_publicos'],
      importe_eur: 1000,
    });

    expect(juicio.impacto).toBe(4);
    expect(juicio.afecta_vecinos_prob).toBe(0.93);
    expect(juicio.plazo_accion_ciudadana_prob).toBe(0.2);
    expect(juicio.confianza).toBe(0.81);
    expect(juicio.modelo).toBe('jev-1.13.0');
  });

  it('no llama al modelo si el estado contiene datos personales sin redactar', async () => {
    const evaluar = vi.fn(async () => {
      throw new Error('no debería llamarse');
    });
    const evaluador = crearEvaluadorJev({ evaluar });
    await expect(
      evaluador({
        titulo: 'Compatibilitat de la Sra. Anna Puig',
        texto: 'Expedient de personal',
        tipo_punto: 'acuerdo',
        temas: ['personal'],
        importe_eur: null,
      }),
    ).rejects.toBeInstanceOf(DatoPersonalSinRedactarError);
    expect(evaluar).not.toHaveBeenCalled();
  });
});

function documentoDePrueba(): DocumentoSesion {
  return {
    version: 1,
    municipio: {
      id: 'prueba',
      nombre: 'Prueba',
      provincia: 'Barcelona',
      fuente_tipo: 'manual',
      fuente_config: {},
    },
    sesion: {
      id: '2026-01-01',
      municipio_id: 'prueba',
      fecha: '2026-01-01',
      tipo: 'ordinaria',
      fuente_url: 'https://example.com/acta.pdf',
      hash_contenido: '0123456789abcdef',
      estado_ingesta: 'redactada',
      actualizada_en: '2026-01-01T00:00:00.000Z',
    },
    puntos: [
      {
        id: '2026-01-01#1',
        sesion_id: '2026-01-01',
        orden: 1,
        titulo: 'APROVACIÓ DE L’ACTA ANTERIOR',
        texto_redactado: 'APROVACIÓ DE L’ACTA ANTERIOR',
        importe_eur: null,
        sensible: false,
        tipo_punto: null,
        temas: [],
        afecta_vecinos_prob: null,
        impacto: null,
        confianza_min: null,
        revision_manual: false,
        clasificado_con: null,
      },
      {
        id: '2026-01-01#2',
        sesion_id: '2026-01-01',
        orden: 2,
        titulo: 'Punto de personal',
        texto_redactado: '',
        importe_eur: null,
        sensible: true,
        tipo_punto: null,
        temas: [],
        afecta_vecinos_prob: null,
        impacto: null,
        confianza_min: null,
        revision_manual: false,
        clasificado_con: null,
      },
      {
        id: '2026-01-01#3',
        sesion_id: '2026-01-01',
        orden: 3,
        titulo: 'APROVAR LA MILLORA DELS PARCS INFANTILS',
        texto_redactado: 'APROVAR LA MILLORA DELS PARCS INFANTILS',
        importe_eur: 25000,
        sensible: false,
        tipo_punto: null,
        temas: [],
        afecta_vecinos_prob: null,
        impacto: null,
        confianza_min: null,
        revision_manual: false,
        clasificado_con: null,
      },
    ],
  };
}

describe('clasificarDocumento', () => {
  it('aplica clasificación, salta jev en sensibles y triviales, y registra procedencia', async () => {
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      const cuerpo = JSON.parse(init.body as string);
      const resultados = (cuerpo.inputs as string[]).map((texto) => {
        if (cuerpo.multi) return { labels: ['otros'], scores: { otros: 0.9 }, model: 'jev-test' };
        if (texto.includes('ACTA')) return { label: 'aprobacion_acta', confidence: 0.95, scores: { aprobacion_acta: 0.95 }, model: 'jev-test' };
        if (/personal/i.test(texto)) return { label: 'dacion_cuenta', confidence: 0.9, scores: { dacion_cuenta: 0.9 }, model: 'jev-test' };
        return { label: 'acuerdo', confidence: 0.85, scores: { acuerdo: 0.85 }, model: 'jev-test' };
      });
      return new Response(JSON.stringify({ results: resultados, model: 'jev-test' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const cliente = new ClienteClassifier({ fetchFn });
    const textosJev: string[] = [];
    const jev = vi.fn(async (datos: { titulo: string }) => {
      textosJev.push(datos.titulo);
      return {
        afecta_vecinos_prob: 0.9,
        impacto: 4,
        plazo_accion_ciudadana_prob: 0.1,
        confianza: 0.8,
        modelo: 'jev-test',
      };
    });

    const doc = documentoDePrueba();
    const { doc: clasificado } = await clasificarDocumento(doc, { classifier: cliente, jev });

    expect(clasificado.sesion.estado_ingesta).toBe('clasificada');
    expect(clasificado.puntos[0].tipo_punto).toBe('aprobacion_acta');
    expect(clasificado.puntos[0].impacto).toBeNull();
    expect(clasificado.puntos[1].impacto).toBeNull();
    expect(clasificado.puntos[2].impacto).toBe(4);
    expect(textosJev).toHaveLength(1);
    expect(textosJev[0]).toContain('PARC');
    expect(clasificado.puntos[2].afecta_vecinos_prob).toBe(0.9);
    expect(clasificado.puntos[2].clasificado_con?.modelo).toContain('classifier.dev');
    expect(clasificado.puntos[2].clasificado_con?.modelo).toContain('typesafe');
    expect(clasificado.puntos[2].clasificado_con?.hash_instrucciones).toMatch(/^[0-9a-f]{16}$/);
  });

  it('marca revision_manual cuando la confianza no llega al umbral', async () => {
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      const cuerpo = JSON.parse(init.body as string);
      if (cuerpo.multi) return respuestaMulti(['otros']);
      if (cuerpo.tier === 'smart') return respuestaSimple('otro', null, 'jev-smart', true);
      return respuestaSimple('otro', 0.35);
    }) as unknown as typeof fetch;
    const cliente = new ClienteClassifier({ fetchFn });
    const { doc: clasificado } = await clasificarDocumento(
      documentoDePrueba(),
      { classifier: cliente },
      { usarJev: false },
    );
    expect(clasificado.puntos[0].revision_manual).toBe(true);
    expect(clasificado.puntos[0].confianza_min).toBeNull();
  });
});
