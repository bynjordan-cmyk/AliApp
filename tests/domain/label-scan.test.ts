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
import { mockOcrProvider } from '@/features/labels/ocr';
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
    'label.detected',
    'label.matchAvoid',
    'label.matchSupervision',
    'label.noMatches',
    'label.noMatchesHint',
    'label.verifyOriginal',
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

  it('siempre remite a la etiqueta original', () => {
    expect(translate('es', 'label.verifyOriginal')).toBe(
      'Verifica también la etiqueta original del producto.',
    );
  });
});

describe('lector de ejemplo', () => {
  it('se identifica como tal, para que nadie confunda la demo con su foto', async () => {
    const lectura = await mockOcrProvider.recognize('file://etiqueta.jpg');
    expect(lectura.provider).toBe('mock');
  });

  it('devuelve una etiqueta que el resto del camino sabe leer', async () => {
    const lectura = await mockOcrProvider.recognize('file://etiqueta.jpg');
    const resultado = buildLabelScanResult({
      rawText: lectura.text,
      catalog: CATALOGO,
      statusByKey: { cow_milk: 'avoid' },
    });

    expect(describeDetected(resultado).length).toBeGreaterThan(0);
    expect(resultado.avoid.length).toBeGreaterThan(0);
  });
});
