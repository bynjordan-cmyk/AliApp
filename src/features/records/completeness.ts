import type { TimelineItem, TimelineItemType } from '@/types/timeline';

/**
 * Registros que se pueden completar.
 *
 * Premisa: "registra ahora, completa después". Guardar con lo mínimo es la
 * forma CORRECTA de usar AliApp a las cuatro de la mañana, no un error. Por eso
 * este módulo no valida nada ni devuelve errores: solo señala qué campos
 * útiles quedaron en blanco, por si a alguien le apetece volver sobre ellos.
 *
 * Dos reglas de tono que se respetan aquí y en la interfaz:
 *   · nada de lenguaje de error ("incompleto", "te falta", "mal registrado"),
 *   · un registro sin detalle es un registro válido y así se queda si nadie
 *     lo toca.
 *
 * Es una función pura: no consulta la base ni mira el reloj por su cuenta.
 */

/** Campos opcionales que, cuando faltan, merece la pena ofrecer. */
export type CompletionField =
  | 'endedAt'
  | 'side'
  | 'amountMl'
  | 'brand'
  | 'mealType'
  | 'amountText'
  | 'stoolConsistency'
  | 'stoolColor'
  | 'stoolAmount'
  | 'severity'
  | 'doseText';

export type PendingRecord = {
  id: string;
  type: TimelineItemType;
  occurredAt: string;
  /** Campos que se pueden añadir. Nunca vacío. */
  missing: CompletionField[];
};

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Campos que se podrían añadir a un registro.
 *
 * Lo que se ofrece depende del tipo y de lo que ya se registró: a un pañal de
 * solo pipí no se le pregunta por la consistencia, y a una toma de fórmula no
 * se le pregunta por el lado del pecho.
 */
export function missingDetails(item: TimelineItem): CompletionField[] {
  const meta = item.metadata;
  const missing: CompletionField[] = [];

  switch (item.type) {
    case 'breastfeed': {
      // Sin hora de fin no hay duración: es lo que más se completa después.
      if (isBlank(meta.endedAt)) missing.push('endedAt');

      const kind = typeof meta.feedKind === 'string' ? meta.feedKind : 'breast';
      if (kind === 'breast') {
        if (isBlank(meta.side)) missing.push('side');
      } else {
        if (isBlank(meta.amountMl)) missing.push('amountMl');
        if (isBlank(meta.brand)) missing.push('brand');
      }
      break;
    }

    case 'food_entry': {
      if (isBlank(meta.mealType)) missing.push('mealType');

      const foods = Array.isArray(meta.foods) ? meta.foods : [];
      const sinCantidad = foods.some(
        (food) =>
          typeof food === 'object' &&
          food !== null &&
          isBlank((food as { amountText?: unknown }).amountText),
      );
      if (sinCantidad) missing.push('amountText');
      break;
    }

    case 'diaper_event': {
      const tipo = typeof meta.diaperType === 'string' ? meta.diaperType : null;
      // El detalle de deposición solo tiene sentido si hubo deposición.
      if (tipo === 'stool' || tipo === 'both') {
        if (isBlank(meta.stoolConsistency)) missing.push('stoolConsistency');
        if (isBlank(meta.stoolColor)) missing.push('stoolColor');
        if (isBlank(meta.stoolAmount)) missing.push('stoolAmount');
      }
      break;
    }

    case 'symptom': {
      if (isBlank(meta.severity)) missing.push('severity');
      if (isBlank(meta.endedAt)) missing.push('endedAt');
      break;
    }

    case 'medication_event': {
      if (isBlank(meta.doseText)) missing.push('doseText');
      break;
    }

    case 'reaction_episode':
      // Un episodio abierto está abierto a propósito: no es algo que completar.
      break;

    default:
      break;
  }

  return missing;
}

export type PendingOptions = {
  /** Instante de referencia. Se pasa siempre: nadie lee el reloj por su cuenta. */
  now: Date;
  /** Cuánto hacia atrás se mira. Más allá, completar deja de ser útil. */
  withinDays?: number;
  /** Cuántos se ofrecen como mucho. La lista es una invitación, no una tarea. */
  limit?: number;
};

/**
 * Registros recientes a los que se les puede añadir algo.
 *
 * Se mira solo lo reciente: recordarle a alguien que un pañal de hace tres
 * semanas no tiene color no ayuda a nadie.
 */
export function pendingRecords(
  items: TimelineItem[],
  { now, withinDays = 3, limit = 5 }: PendingOptions,
): PendingRecord[] {
  const desde = now.getTime() - withinDays * 24 * 60 * 60 * 1000;

  return items
    .filter((item) => {
      const cuando = new Date(item.occurredAt).getTime();
      return cuando >= desde && cuando <= now.getTime();
    })
    .map((item) => ({
      id: item.id,
      type: item.type,
      occurredAt: item.occurredAt,
      missing: missingDetails(item),
    }))
    .filter((record) => record.missing.length > 0)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
}
