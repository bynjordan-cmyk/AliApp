/**
 * Normalización y comparación de ingredientes de una etiqueta.
 *
 * LO QUE ESTE MÓDULO HACE: leer una lista de ingredientes, limpiarla y decir
 * qué palabras coinciden con alimentos que la familia ha marcado en su panel.
 *
 * LO QUE NO HACE, Y NO DEBE HACER NUNCA:
 *   · decir que un producto es seguro,
 *   · decir que un producto no contiene un alérgeno,
 *   · sustituir la lectura de la etiqueta original.
 *
 * Una coincidencia es una coincidencia de TEXTO con una lista que hizo una
 * persona. No es un análisis del producto: AliApp no sabe qué lleva dentro un
 * bote, solo qué pone en la foto que le han dado.
 *
 * Módulo puro y sin I/O: entra texto, sale texto normalizado y coincidencias.
 */

/** Quita tildes y diéresis para que "lactosuero" y "lactosuéro" sean lo mismo. */
function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Forma canónica de un ingrediente suelto.
 *
 * Quita porcentajes, cifras, asteriscos de nota al pie y espacios de más. No
 * traduce ni interpreta: solo deja el texto comparable.
 */
export function normalizeIngredient(raw: string): string {
  return stripDiacritics(raw)
    .toLowerCase()
    .replace(/\d+([.,]\d+)?\s*%/g, ' ')
    .replace(/[*†_]/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Encabezados de lista que no son ingredientes. */
const PREFIXES = [
  'ingredientes',
  'ingredients',
  'contiene',
  'contains',
  'puede contener trazas de',
  'puede contener',
  'may contain traces of',
  'may contain',
  'elaborado con',
];

/**
 * Trocea el texto de una etiqueta en ingredientes.
 *
 * Los paréntesis se abren en lugar de descartarse: en las etiquetas es justo
 * donde suele estar lo que interesa —"proteína láctea (caseinato)"—.
 */
export function parseIngredientList(rawText: string): string[] {
  if (!rawText.trim()) return [];

  const piezas = rawText
    .replace(/[()[\]]/g, ',')
    .split(/[,;\n·•|]+/)
    .map((pieza) => normalizeIngredient(pieza));

  const vistos = new Set<string>();
  const ingredientes: string[] = [];

  for (let pieza of piezas) {
    for (const prefijo of PREFIXES) {
      if (pieza.startsWith(prefijo)) {
        pieza = pieza.slice(prefijo.length).trim();
      }
    }

    // Demasiado corto o puro número: no es un ingrediente legible.
    if (pieza.length < 3 || /^[\d\s-]+$/.test(pieza)) continue;
    if (vistos.has(pieza)) continue;

    vistos.add(pieza);
    ingredientes.push(pieza);
  }

  return ingredientes;
}

/**
 * Nombres con los que un alimento aparece en una etiqueta.
 *
 * El catálogo de AliApp conoce "leche de vaca"; una etiqueta dice "caseinato",
 * "lactosuero" o "suero lácteo". Esta tabla une los dos mundos y es la razón
 * de que la lectura sirva de algo.
 *
 * Es deliberadamente generosa: ante la duda, mejor avisar y que la persona
 * mire la etiqueta original que callar.
 */
export const LABEL_ALIASES: Record<string, readonly string[]> = {
  cow_milk: [
    'leche',
    'leche de vaca',
    'leche en polvo',
    'lacteo',
    'lacteos',
    'lactea',
    'proteina lactea',
    'suero lacteo',
    'suero de leche',
    'lactosuero',
    'caseina',
    'caseinato',
    'caseinatos',
    'lactoalbumina',
    'lactoglobulina',
    'mantequilla',
    'nata',
    'queso',
    'cuajada',
    'milk',
    'whey',
    'casein',
    'caseinate',
    'butter',
    'cheese',
    'cream',
  ],
  hen_egg: [
    'huevo',
    'clara de huevo',
    'yema de huevo',
    'ovoalbumina',
    'albumina',
    'ovoproducto',
    'lisozima',
    'egg',
    'albumin',
    'egg white',
    'lysozyme',
  ],
  wheat: [
    'trigo',
    'harina de trigo',
    'harina',
    'gluten',
    'semola',
    'espelta',
    'cuscus',
    'almidon de trigo',
    'wheat',
    'flour',
    'semolina',
    'spelt',
  ],
  soy: [
    'soja',
    'lecitina de soja',
    'proteina de soja',
    'tofu',
    'edamame',
    'soy',
    'soya',
    'soy lecithin',
  ],
  peanut: ['cacahuete', 'cacahuate', 'mani', 'peanut', 'groundnut'],
  tree_nut: [
    'almendra',
    'almendras',
    'avellana',
    'avellanas',
    'nuez',
    'nueces',
    'anacardo',
    'anacardos',
    'pistacho',
    'pistachos',
    'frutos secos',
    'almond',
    'hazelnut',
    'walnut',
    'cashew',
    'pistachio',
    'tree nut',
  ],
  sesame: ['sesamo', 'ajonjoli', 'tahini', 'tahina', 'sesame'],
  fish: ['pescado', 'atun', 'salmon', 'merluza', 'bacalao', 'anchoa', 'fish', 'tuna', 'cod'],
  shellfish: [
    'marisco',
    'gamba',
    'gambas',
    'langostino',
    'camaron',
    'cangrejo',
    'mejillon',
    'shellfish',
    'shrimp',
    'prawn',
    'crab',
    'mussel',
  ],
  oat: ['avena', 'oat', 'oats'],
  rice: ['arroz', 'rice'],
  potato: ['patata', 'papa', 'potato'],
  carrot: ['zanahoria', 'carrot'],
  apple: ['manzana', 'apple'],
  banana: ['platano', 'banana'],
  pear: ['pera', 'pear'],
  lentil: ['lenteja', 'lentejas', 'lentil'],
  chicken: ['pollo', 'chicken'],
  olive_oil: ['aceite de oliva', 'olive oil'],
  zucchini: ['calabacin', 'zucchini', 'courgette'],
};

/**
 * Contextos en los que una palabra NO señala a ese alimento.
 *
 * "Bebida de almendras" lleva la palabra "leche" en muchas etiquetas y no es
 * leche de vaca. Avisar de eso sería ruido, y el ruido enseña a ignorar los
 * avisos que sí importan.
 */
const ALIAS_EXCLUSIONS: Record<string, readonly RegExp[]> = {
  cow_milk: [
    /\bleche de (almendra|soja|avena|arroz|coco|anacardo|avellana)/,
    /\b(almond|soy|oat|rice|coconut) milk\b/,
    /\bleche materna\b/,
    /\bbreast milk\b/,
  ],
  hen_egg: [/\bsustituto del huevo\b/, /\begg replacer\b/, /\bsin huevo\b/],
  wheat: [/\bsin gluten\b/, /\bgluten free\b/, /\bharina de (maiz|arroz|garbanzo|almendra)\b/],
};

export type CatalogEntry = {
  canonicalKey: string;
  /** Nombre visible en el idioma activo, para poder nombrarlo en pantalla. */
  displayName: string;
  /** Nombres adicionales que trae el propio catálogo. */
  aliases?: readonly string[];
};

export type IngredientMatch = {
  /** Ingrediente tal como quedó tras normalizar. */
  ingredient: string;
  canonicalKey: string;
  displayName: string;
  /** Palabra concreta que produjo la coincidencia. Se enseña: es la prueba. */
  matchedTerm: string;
};

function containsTerm(ingredient: string, term: string): boolean {
  if (!term) return false;
  // Coincidencia por palabra completa: "pera" no debe saltar dentro de "pimienta".
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\s|-)${escaped}($|\\s|-)`).test(ingredient);
}

function termsFor(entry: CatalogEntry): string[] {
  const propios = [entry.displayName, ...(entry.aliases ?? [])].map(normalizeIngredient);
  const deEtiqueta = (LABEL_ALIASES[entry.canonicalKey] ?? []).map(normalizeIngredient);

  return [...new Set([...propios, ...deEtiqueta])]
    .filter((term) => term.length >= 3)
    // Primero los términos largos: "leche en polvo" describe mejor que "leche".
    .sort((a, b) => b.length - a.length);
}

/**
 * Compara los ingredientes leídos con un catálogo de alimentos.
 *
 * Devuelve coincidencias de texto, nada más. Quién decide qué hacer con ellas
 * es la persona que está mirando la pantalla, con la etiqueta en la mano.
 */
export function matchIngredients(
  ingredients: readonly string[],
  catalog: readonly CatalogEntry[],
): IngredientMatch[] {
  const matches: IngredientMatch[] = [];

  for (const ingredient of ingredients) {
    for (const entry of catalog) {
      const exclusiones = ALIAS_EXCLUSIONS[entry.canonicalKey] ?? [];
      if (exclusiones.some((patron) => patron.test(ingredient))) continue;

      const term = termsFor(entry).find((candidate) => containsTerm(ingredient, candidate));
      if (!term) continue;

      matches.push({
        ingredient,
        canonicalKey: entry.canonicalKey,
        displayName: entry.displayName,
        matchedTerm: term,
      });
    }
  }

  return matches;
}
