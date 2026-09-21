/**
 * Ali Capture · interpretación de una frase de registro (§7, fundación).
 *
 * Reglas que mandan sobre todo lo demás:
 *   - NUNCA se guarda nada en silencio: esto devuelve una PROPUESTA que la
 *     persona confirma o corrige,
 *   - la interpretación estructura, no interpreta clínicamente: reconoce
 *     alimentos y horas, y jamás deduce síntomas, causas ni diagnósticos,
 *   - cuando algo no se reconoce, se dice. Es preferible una propuesta
 *     incompleta a una inventada.
 *
 * Esta primera versión funciona con reglas y el catálogo de alimentos de la
 * familia, sin servicio externo ni credenciales. `CaptureInterpreter` deja la
 * puerta abierta a un proveedor mejor sin tocar la interfaz.
 */

export type ParsedFoodMatch = {
  foodId: string;
  canonicalKey: string;
  /** Texto exacto de la frase que disparó la coincidencia. */
  matchedText: string;
};

export type ParsedEntry = {
  /** Hora detectada en formato ISO, o null si la frase no dice ninguna. */
  occurredAt: string | null;
  /** Texto de la hora tal y como aparecía ("a la 1:15"). */
  timeText: string | null;
  babyNameGuess: string | null;
  foods: ParsedFoodMatch[];
  /** Palabras que parecían alimentos y no están en el catálogo. */
  unmatchedTerms: string[];
  /** La propuesta nunca se guarda sola: esto siempre es true. */
  requiresConfirmation: true;
};

export type FoodVocabularyEntry = {
  foodId: string;
  canonicalKey: string;
  /** Nombre visible y alias, en el idioma de la familia. */
  terms: string[];
};

export type ParseContext = {
  vocabulary: FoodVocabularyEntry[];
  babyNames: string[];
  /** Momento de referencia para resolver "a la 1:15" en una fecha concreta. */
  now?: Date;
};

const PALABRAS_IGNORADAS = new Set([
  'comio', 'comió', 'comida', 'tomo', 'tomó', 'desayuno', 'desayunó', 'almorzo', 'almorzó',
  'ceno', 'cenó', 'merendo', 'merendó', 'probo', 'probó', 'y', 'de', 'la', 'el', 'las', 'los',
  'un', 'una', 'con', 'a', 'al', 'para', 'hoy', 'ayer', 'esta', 'este', 'mañana', 'tarde',
  'noche', 'ate', 'had', 'and', 'the', 'at', 'with', 'today',
]);

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** Busca una hora del tipo "1:15", "13:15", "a las 9" o "9h". */
function extraerHora(frase: string, now: Date): { iso: string | null; texto: string | null } {
  const conMinutos = /\b(?:a\s+la[s]?\s+)?(\d{1,2})[:.](\d{2})\s*(am|pm|h)?\b/i.exec(frase);
  const soloHora = /\b(?:a\s+la[s]?\s+)(\d{1,2})\s*(am|pm|h)?\b/i.exec(frase);
  const match = conMinutos ?? soloHora;

  if (!match) return { iso: null, texto: null };

  let horas = Number(match[1]);
  const minutos = conMinutos ? Number(match[2]) : 0;
  const sufijo = (conMinutos ? match[3] : match[2])?.toLowerCase();

  if (horas > 23 || minutos > 59) return { iso: null, texto: null };

  if (sufijo === 'pm' && horas < 12) horas += 12;
  if (sufijo === 'am' && horas === 12) horas = 0;

  const fecha = new Date(now);
  fecha.setSeconds(0, 0);
  fecha.setHours(horas, minutos);

  // Una hora que aún no ha llegado se entiende como de hoy más temprano:
  // nadie registra el futuro, así que se interpreta como del día anterior.
  if (fecha.getTime() > now.getTime() + 60000) {
    fecha.setDate(fecha.getDate() - 1);
  }

  return { iso: fecha.toISOString(), texto: match[0].trim() };
}

export function parseEntry(frase: string, context: ParseContext): ParsedEntry {
  const now = context.now ?? new Date();
  const normalizada = normalizar(frase);

  const hora = extraerHora(frase, now);

  const nombreBebe =
    context.babyNames.find((nombre) => normalizada.includes(normalizar(nombre))) ?? null;

  const foods: ParsedFoodMatch[] = [];
  const usados = new Set<string>();

  for (const entrada of context.vocabulary) {
    for (const termino of entrada.terms) {
      const termNormalizado = normalizar(termino);
      if (!termNormalizado || usados.has(entrada.foodId)) continue;

      const patron = new RegExp(`\\b${termNormalizado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (patron.test(normalizada)) {
        foods.push({ foodId: entrada.foodId, canonicalKey: entrada.canonicalKey, matchedText: termino });
        usados.add(entrada.foodId);
        break;
      }
    }
  }

  // Palabras sueltas que no son ni relleno, ni el bebé, ni la hora, ni un
  // alimento conocido: se devuelven para que la persona decida qué hacer.
  const reconocidas = new Set(
    foods.flatMap((food) => normalizar(food.matchedText).split(/\s+/)),
  );
  const unmatchedTerms = normalizada
    .replace(/\d{1,2}[:.]\d{2}/g, ' ')
    .split(/[^a-zñ]+/)
    .filter((palabra) => palabra.length > 2)
    .filter((palabra) => !PALABRAS_IGNORADAS.has(palabra))
    .filter((palabra) => !reconocidas.has(palabra))
    .filter((palabra) => !(nombreBebe && normalizar(nombreBebe).includes(palabra)))
    .filter((palabra, indice, lista) => lista.indexOf(palabra) === indice);

  return {
    occurredAt: hora.iso,
    timeText: hora.texto,
    babyNameGuess: nombreBebe,
    foods,
    unmatchedTerms,
    requiresConfirmation: true,
  };
}

/**
 * Interfaz de interpretación.
 *
 * Hoy la implementa el analizador de reglas de arriba. Si algún día se conecta
 * un servicio externo, se implementa esta misma interfaz: la pantalla de
 * confirmación no cambia, y la regla de no guardar sin confirmar tampoco.
 * Ninguna clave vive en el cliente.
 */
export type CaptureInterpreter = {
  readonly name: string;
  interpret(phrase: string, context: ParseContext): Promise<ParsedEntry>;
};

export const ruleBasedInterpreter: CaptureInterpreter = {
  name: 'rules',
  interpret: async (phrase, context) => parseEntry(phrase, context),
};
