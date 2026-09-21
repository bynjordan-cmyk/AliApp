import type { TranslationKey } from '@/lib/i18n';
import type { Journey } from '@/types/domain';
import type { TimelineItem } from '@/types/timeline';

/**
 * "Lo importante hoy".
 *
 * Elige UN hecho del día y lo describe. Reglas que no se negocian:
 *   - nunca una conclusión clínica ni una sospecha sobre un alimento,
 *   - nunca una instrucción ("retira", "ofrece", "espera"),
 *   - si no hay nada destacable, se dice con calma y sin alarma.
 *
 * Función pura: se prueba sin base de datos y sin React.
 */

export type Highlight = {
  /** Clave de traducción del título. */
  titleKey: TranslationKey;
  /** Clave de traducción del cuerpo. */
  bodyKey: TranslationKey;
  /** Valores para interpolar en el cuerpo. */
  params?: Record<string, string | number>;
  tone: 'journey' | 'symptom' | 'episode' | 'neutral';
  icon: 'map-outline' | 'calendar-outline' | 'eye-outline' | 'alert-circle-outline' | 'sparkles-outline';
};

export type HighlightInput = {
  items: TimelineItem[];
  journeys: Journey[];
  /** Días que faltan para la revisión más próxima, si hay alguna. */
  today?: Date;
};

const DIAS_PARA_AVISAR_REVISION = 7;

export function buildHighlight({ items, journeys, today = new Date() }: HighlightInput): Highlight {
  // 1. Un episodio abierto es lo más relevante que puede haber en curso.
  const episodioAbierto = items.find(
    (item) => item.type === 'reaction_episode' && item.metadata.status === 'open',
  );
  if (episodioAbierto) {
    return {
      titleKey: 'today.highlight.openEpisodeTitle',
      bodyKey: 'today.highlight.openEpisodeBody',
      tone: 'episode',
      icon: 'alert-circle-outline',
    };
  }

  // 2. Una revisión de proceso que se acerca: es una fecha que puso una
  //    persona, no un plazo que calcule AliApp.
  const revisiones = journeys
    .filter((journey) => journey.status === 'active' && journey.review_on)
    .map((journey) => ({
      journey,
      dias: Math.ceil(
        (new Date(`${journey.review_on as string}T00:00:00`).getTime() - startOfDay(today).getTime()) /
          86400000,
      ),
    }))
    .filter((revision) => revision.dias >= 0 && revision.dias <= DIAS_PARA_AVISAR_REVISION)
    .sort((a, b) => a.dias - b.dias);

  const proxima = revisiones[0];
  if (proxima) {
    return {
      titleKey: 'today.highlight.reviewTitle',
      bodyKey: proxima.dias === 0 ? 'today.highlight.reviewToday' : 'today.highlight.reviewInDays',
      params: { days: proxima.dias },
      tone: 'journey',
      icon: 'calendar-outline',
    };
  }

  // 3. Síntomas registrados hoy: se cuentan, no se valoran.
  const sintomasHoy = items.filter((item) => item.type === 'symptom').length;
  if (sintomasHoy > 0) {
    return {
      titleKey: 'today.highlight.symptomsTitle',
      bodyKey: 'today.highlight.symptomsBody',
      params: { count: sintomasHoy },
      tone: 'symptom',
      icon: 'eye-outline',
    };
  }

  // 4. Un proceso activo sin revisión próxima.
  const activo = journeys.find((journey) => journey.status === 'active');
  if (activo) {
    return {
      titleKey: 'today.highlight.journeyTitle',
      bodyKey: 'today.highlight.journeyBody',
      tone: 'journey',
      icon: 'map-outline',
    };
  }

  // 5. Día tranquilo. Se dice sin sugerir que eso signifique algo.
  return {
    titleKey: 'today.highlight.calmTitle',
    bodyKey: items.length > 0 ? 'today.highlight.calmBody' : 'today.highlight.noRecordsBody',
    params: { count: items.length },
    tone: 'neutral',
    icon: 'sparkles-outline',
  };
}

function startOfDay(date: Date): Date {
  const copia = new Date(date);
  copia.setHours(0, 0, 0, 0);
  return copia;
}
