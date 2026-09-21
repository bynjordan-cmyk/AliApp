import {
  matchIngredients,
  normalizeIngredient,
  parseIngredientList,
  type CatalogEntry,
} from '@/features/labels/ingredients';
import {
  buildLabelScanResult,
  describeDetected,
  hasMarkedMatches,
} from '@/features/labels/label-scan';
import {
  FAILURE_COPY,
  LabelScanError,
  classifyCameraError,
  classifyOcrError,
  isRetryable,
  type LabelScanFailure,
} from '@/features/labels/ocr-errors';
import { normalizeOcrPayload, hasUsableText } from '@/features/labels/ocr-normalize';
import { LABEL_FIXTURE_TEXT, fixtureLabelOcrProvider } from '@/features/labels/providers/fixture';
import { isSafeStatement } from '@/lib/safety';
import { translate } from '@/lib/i18n';
import type { FoodStatus } from '@/types/domain';

/**
 * Lectura de etiquetas.
 *
 * Lo que se comprueba aquí no es solo que el texto se parsee: es que AliApp
 * NUNCA diga que un producto es seguro, que se pueda dar o que no contenga
 * alérgenos, y que el aviso de verificar la etiqueta original exista.
 */

const CATALOGO: CatalogEntry[] = [
  { canonicalKey: 'cow_milk', displayName: 'Leche de vaca', aliases: ['lácteos'] },
  { canonicalKey: 'hen_egg', displayName: 'Huevo' },
  { canonicalKey: 'soy', displayName: 'Soja' },
  { canonicalKey: 'wheat', displayName: 'Trigo' },
  { canonicalKey: 'pear', displayName: 'Pera' },
];

describe('normalización de ingredientes', () => {
  it('quita tildes, porcentajes y símbolos', () => {
    expect(normalizeIngredient('Leche en polvo desnatada 12%*')).toBe(
      'leche en polvo desnatada',
    );
  });

  it('trocea una lista real de etiqueta y abre los paréntesis', () => {
    const ingredientes = parseIngredientList(
      'INGREDIENTES: harina de trigo, leche en polvo (caseinato), sal.',
    );

    expect(ingredientes).toContain('harina de trigo');
    expect(ingredientes).toContain('leche en polvo');
    expect(ingredientes).toContain('caseinato');
  });

  it('descarta el encabezado y los trozos que no son ingredientes', () => {
    const ingredientes = parseIngredientList('Contiene: sal, 12, E-330');
    expect(ingredientes).toContain('sal');
    expect(ingredientes).not.toContain('12');
  });

  it('no repite un ingrediente que aparece dos veces', () => {
    expect(parseIngredientList('azucar, azúcar, sal')).toEqual(['azucar', 'sal']);
  });
});

describe('coincidencias con el panel de alimentos', () => {
  it('reconoce la jerga de etiqueta: caseinato es leche', () => {
    const matches = matchIngredients(['caseinato'], CATALOGO);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.canonicalKey).toBe('cow_milk');
    expect(matches[0]?.matchedTerm).toBe('caseinato');
  });

  it('reconoce lactosuero, albúmina y lecitina de soja', () => {
    const claves = matchIngredients(
      ['lactosuero', 'ovoalbumina', 'lecitina de soja'],
      CATALOGO,
    ).map((match) => match.canonicalKey);

    expect(claves).toEqual(['cow_milk', 'hen_egg', 'soy']);
  });

  it('no confunde "leche de almendras" con leche de vaca', () => {
    expect(matchIngredients(['leche de almendras'], CATALOGO)).toEqual([]);
  });

  it('no salta con una palabra dentro de otra', () => {
    // "pera" no debe encontrarse dentro de "pimienta" ni de "esperanza".
    expect(matchIngredients(['pimienta negra'], CATALOGO)).toEqual([]);
  });

  it('prefiere el término más específico que encuentra', () => {
    const matches = matchIngredients(['leche en polvo'], CATALOGO);
    expect(matches[0]?.matchedTerm).toBe('leche en polvo');
  });
});

describe('resultado de la lectura', () => {
  const estados: Record<string, FoodStatus> = {
    cow_milk: 'avoid',
    hen_egg: 'professional_supervision',
    wheat: 'tolerated',
  };

  const resultado = buildLabelScanResult({
    rawText: 'Ingredientes: harina de trigo, leche en polvo (caseinato), huevo, sal.',
    catalog: CATALOGO,
    statusByKey: estados,
  });

  it('separa lo marcado como Evitar de lo demás', () => {
    expect(resultado.avoid.map((h) => h.canonicalKey)).toContain('cow_milk');
    expect(resultado.supervision.map((h) => h.canonicalKey)).toEqual(['hen_egg']);
    expect(resultado.other.map((h) => h.canonicalKey)).toContain('wheat');
  });

  it('conserva el texto original detectado', () => {
    expect(resultado.rawText).toContain('caseinato');
  });

  it('enumera lo que no coincide con nada del panel', () => {
    expect(resultado.unmatched).toContain('sal');
  });

  it('avisa de que hay coincidencias marcadas', () => {
    expect(hasMarkedMatches(resultado)).toBe(true);
  });

  it('la persona manda: sus ingredientes confirmados sustituyen a los detectados', () => {
    const confirmado = buildLabelScanResult({
      rawText: 'Ingredientes: leche en polvo, sal.',
      catalog: CATALOGO,
      statusByKey: estados,
      confirmedIngredients: ['sal'],
    });

    expect(confirmado.ingredients).toEqual(['sal']);
    expect(confirmado.avoid).toEqual([]);
  });

  it('sin coincidencias no significa que el producto esté limpio', () => {
    const sinNada = buildLabelScanResult({
      rawText: 'Ingredientes: agua, sal.',
      catalog: CATALOGO,
      statusByKey: estados,
    });

    expect(hasMarkedMatches(sinNada)).toBe(false);
    // El texto que verá la persona habla de SU lista, no del producto.
    expect(translate('es', 'label.noMatches')).toContain('marcado como Evitar');
    expect(translate('es', 'label.noMatchesHint')).toContain('tu lista');
  });
});

describe('lo que la lectura de etiquetas NUNCA dice', () => {
  const claves = [
    'label.intro',
    'label.limits',
    'label.privacy',
    'label.detected',
    'label.matchesIntro',
    'label.matchAvoid',
    'label.matchSupervision',
    'label.noMatches',
    'label.noMatchesHint',
    'label.verifyOriginal',
    'label.ocrMayErr',
  ] as const;

  it.each(claves)('%s pasa los límites de seguridad en español', (clave) => {
    expect(isSafeStatement(translate('es', clave))).toBe(true);
  });

  it.each(claves)('%s pasa los límites de seguridad en inglés', (clave) => {
    expect(isSafeStatement(translate('en', clave))).toBe(true);
  });

  it('ningún texto promete seguridad ni ausencia de alérgenos', () => {
    const textos = claves.map((clave) => translate('es', clave).toLowerCase());
    for (const texto of textos) {
      expect(texto).not.toContain('es seguro');
      expect(texto).not.toContain('puedes dárselo');
      expect(texto).not.toContain('no contiene');
    }
  });

  it('siempre remite a la etiqueta original y admite que el OCR falla', () => {
    expect(translate('es', 'label.verifyOriginal')).toBe(
      'Verifica también la etiqueta original del producto.',
    );
    expect(translate('es', 'label.ocrMayErr')).toBe(
      'La lectura automática puede contener errores.',
    );
  });

  it('las coincidencias se presentan como lo que son: texto detectado', () => {
    expect(translate('es', 'label.matchesIntro')).toBe(
      'Encontramos estas coincidencias en el texto detectado.',
    );
  });

  it('la promesa de privacidad está escrita, no solo en el código', () => {
    expect(translate('es', 'label.privacy')).toContain('no sale de tu dispositivo');
    expect(translate('en', 'label.privacy')).toContain('does not leave your device');
  });
});

describe('normalización de la salida de cualquier motor', () => {
  it('entiende la forma de tesseract.js: bloques con párrafos y líneas', () => {
    const salida = normalizeOcrPayload(
      {
        text: 'INGREDIENTES: leche\nen polvo',
        blocks: [
          {
            text: 'INGREDIENTES: leche en polvo',
            paragraphs: [{ lines: [{ text: 'INGREDIENTES: leche' }, { text: 'en polvo' }] }],
          },
        ],
      },
      { engine: 'tesseract.js@7', platform: 'web' },
    );

    expect(salida.lines).toEqual(['INGREDIENTES: leche', 'en polvo']);
    expect(salida.blocks).toHaveLength(1);
    expect(salida.engine).toBe('tesseract.js@7');
    expect(salida.platform).toBe('web');
  });

  it('entiende la forma de ML Kit: bloques con líneas directas', () => {
    const salida = normalizeOcrPayload(
      {
        text: 'Contiene: soja',
        blocks: [{ text: 'Contiene: soja', lines: [{ text: 'Contiene: soja' }] }],
      },
      { engine: 'mlkit', platform: 'android' },
    );

    expect(salida.lines).toEqual(['Contiene: soja']);
    expect(salida.platform).toBe('android');
  });

  it('se apaña con un motor que solo devuelve texto suelto', () => {
    const salida = normalizeOcrPayload(
      { text: 'harina de trigo\n\n  sal  ' },
      { engine: 'otro', platform: 'web' },
    );

    expect(salida.lines).toEqual(['harina de trigo', 'sal']);
    expect(salida.blocks).toEqual([]);
  });

  it('no inventa nada cuando no se leyó nada', () => {
    const salida = normalizeOcrPayload({}, { engine: 'otro', platform: 'web' });

    expect(salida.rawText).toBe('');
    expect(salida.lines).toEqual([]);
    expect(hasUsableText(salida)).toBe(false);
  });

  it('dos caracteres sueltos no son una etiqueta', () => {
    const casi = normalizeOcrPayload({ text: 'a b' }, { engine: 'otro', platform: 'web' });
    expect(hasUsableText(casi)).toBe(false);
  });
});

describe('fixture de laboratorio', () => {
  it('se marca como fixture, para que nunca se confunda con una lectura real', async () => {
    const lectura = await fixtureLabelOcrProvider.recognize({ uri: 'file://etiqueta.jpg' });
    expect(lectura.engine).toBe('fixture');
    expect(lectura.platform).toBe('test');
  });

  it('devuelve una etiqueta que el resto del camino sabe leer', async () => {
    const lectura = await fixtureLabelOcrProvider.recognize({ uri: 'file://etiqueta.jpg' });
    const resultado = buildLabelScanResult({
      rawText: lectura.rawText,
      catalog: CATALOGO,
      statusByKey: { cow_milk: 'avoid' },
    });

    expect(lectura.rawText).toBe(LABEL_FIXTURE_TEXT);
    expect(describeDetected(resultado).length).toBeGreaterThan(0);
    expect(resultado.avoid.length).toBeGreaterThan(0);
  });
});

describe('qué se le cuenta a una persona cuando algo falla', () => {
  it('distingue permiso denegado de cámara no disponible', () => {
    const denegado = Object.assign(new Error('x'), { name: 'NotAllowedError' });
    const sinCamara = Object.assign(new Error('x'), { name: 'NotFoundError' });
    const ocupada = Object.assign(new Error('x'), { name: 'NotReadableError' });

    expect(classifyCameraError(denegado)).toBe('permission_denied');
    expect(classifyCameraError(sinCamara)).toBe('camera_unavailable');
    expect(classifyCameraError(ocupada)).toBe('camera_unavailable');
  });

  it('un fallo al cargar el motor no se confunde con uno del worker', () => {
    expect(classifyOcrError(new Error('Failed to load TesseractCore'))).toBe(
      'engine_load_failed',
    );
    expect(classifyOcrError(new Error('Failed to fetch'))).toBe('engine_load_failed');
    expect(classifyOcrError(new Error('algo raro a mitad'))).toBe('worker_failed');
  });

  it('un error ya clasificado se respeta tal cual', () => {
    expect(classifyOcrError(new LabelScanError('no_text'))).toBe('no_text');
  });

  it('solo se ofrece reintentar donde reintentar tiene sentido', () => {
    expect(isRetryable('engine_load_failed')).toBe(true);
    expect(isRetryable('worker_failed')).toBe(true);
    // Repetir la lectura de una foto ilegible da exactamente lo mismo.
    expect(isRetryable('unreadable_image')).toBe(false);
    expect(isRetryable('permission_denied')).toBe(false);
  });

  it('los seis fallos tienen texto en los dos idiomas', () => {
    const fallos: LabelScanFailure[] = [
      'camera_unavailable',
      'permission_denied',
      'engine_load_failed',
      'worker_failed',
      'unreadable_image',
      'no_text',
    ];

    for (const fallo of fallos) {
      for (const idioma of ['es', 'en'] as const) {
        const titulo = translate(idioma, FAILURE_COPY[fallo].title);
        const pista = translate(idioma, FAILURE_COPY[fallo].hint);

        expect(titulo.length).toBeGreaterThan(0);
        expect(pista.length).toBeGreaterThan(0);
        // Ni el texto de un fallo puede cruzar los límites de seguridad.
        expect(isSafeStatement(titulo)).toBe(true);
        expect(isSafeStatement(pista)).toBe(true);
      }
    }
  });

  it('ningún mensaje de fallo enseña jerga técnica', () => {
    const jerga = ['tesseract', 'wasm', 'worker', 'undefined', 'error:'];

    for (const copia of Object.values(FAILURE_COPY)) {
      const texto = translate('es', copia.title).toLowerCase();
      for (const palabra of jerga) {
        expect(texto).not.toContain(palabra);
      }
    }
  });
});
