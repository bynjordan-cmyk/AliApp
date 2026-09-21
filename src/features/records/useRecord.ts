import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import type {
  BreastfeedPatch,
  DiaperEventPatch,
  FoodEntryPatch,
  MedicationEventPatch,
  ReactionEpisodePatch,
  SymptomPatch,
} from '@/lib/validation';
import type {
  Breastfeed,
  DiaperEvent,
  FoodEntry,
  FoodEntryItem,
  MedicationEvent,
  ReactionEpisode,
  Symptom,
} from '@/types/domain';
import type { TimelineItemType } from '@/types/timeline';
import {
  getBreastfeed,
  getFoodEntry,
  updateBreastfeed,
  updateFoodEntry,
} from '@/features/feeding/feeding.service';
import { getDiaperEvent, updateDiaperEvent } from '@/features/diapers/diaper.service';
import { getSymptom, updateSymptom } from '@/features/symptoms/symptom.service';
import {
  getMedicationEvent,
  updateMedicationEvent,
} from '@/features/medication/medication.service';
import { getEpisode, updateEpisode } from '@/features/reactions/reaction.service';

import { listRevisions } from './record.service';

/**
 * Un registro cualquiera, para la pantalla de detalle.
 *
 * Seis tipos, una sola pantalla: el detalle no debería obligar a navegar a otra
 * sección para corregir algo, así que aquí se resuelve cada tipo contra su
 * servicio de dominio.
 */
export type RecordDetail =
  | { type: 'food_entry'; row: FoodEntry; items: FoodEntryItem[] }
  | { type: 'breastfeed'; row: Breastfeed }
  | { type: 'diaper_event'; row: DiaperEvent }
  | { type: 'symptom'; row: Symptom }
  | { type: 'reaction_episode'; row: ReactionEpisode }
  | { type: 'medication_event'; row: MedicationEvent };

export type RecordPatch =
  | FoodEntryPatch
  | BreastfeedPatch
  | DiaperEventPatch
  | SymptomPatch
  | ReactionEpisodePatch
  | MedicationEventPatch;

async function fetchRecord(type: TimelineItemType, id: string): Promise<RecordDetail> {
  switch (type) {
    case 'food_entry': {
      const { entry, items } = await getFoodEntry(id);
      return { type, row: entry, items };
    }
    case 'breastfeed':
      return { type, row: await getBreastfeed(id) };
    case 'diaper_event':
      return { type, row: await getDiaperEvent(id) };
    case 'symptom':
      return { type, row: await getSymptom(id) };
    case 'reaction_episode':
      return { type, row: await getEpisode(id) };
    case 'medication_event':
      return { type, row: await getMedicationEvent(id) };
    default:
      throw new Error(`[AliApp] fetchRecord: tipo desconocido ${String(type)}`);
  }
}

async function applyPatch(
  type: TimelineItemType,
  id: string,
  patch: RecordPatch,
): Promise<void> {
  switch (type) {
    case 'food_entry':
      await updateFoodEntry(id, patch as FoodEntryPatch);
      return;
    case 'breastfeed':
      await updateBreastfeed(id, patch as BreastfeedPatch);
      return;
    case 'diaper_event':
      await updateDiaperEvent(id, patch as DiaperEventPatch);
      return;
    case 'symptom':
      await updateSymptom(id, patch as SymptomPatch);
      return;
    case 'reaction_episode':
      await updateEpisode(id, patch as ReactionEpisodePatch);
      return;
    case 'medication_event':
      await updateMedicationEvent(id, patch as MedicationEventPatch);
      return;
    default:
      throw new Error(`[AliApp] applyPatch: tipo desconocido ${String(type)}`);
  }
}

export function useRecord(type: TimelineItemType | null, id: string | null) {
  return useQuery({
    queryKey: queryKeys.record(type ?? 'none', id ?? 'none'),
    queryFn: () => fetchRecord(type as TimelineItemType, id as string),
    enabled: Boolean(type && id),
  });
}

export function useRecordRevisions(type: TimelineItemType | null, id: string | null) {
  return useQuery({
    queryKey: queryKeys.recordRevisions(type ?? 'none', id ?? 'none'),
    queryFn: () => listRevisions(type as TimelineItemType, id as string),
    enabled: Boolean(type && id),
  });
}

/**
 * Guarda una corrección.
 *
 * Invalida a lo grande a propósito: corregir la hora de un evento mueve su
 * sitio en la línea de tiempo, en el calendario y en el resumen del día, y
 * todos deben contar lo mismo.
 */
export function useUpdateRecord(
  type: TimelineItemType | null,
  id: string | null,
  babyId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: RecordPatch) =>
      applyPatch(type as TimelineItemType, id as string, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.record(type ?? 'none', id ?? 'none'),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recordRevisions(type ?? 'none', id ?? 'none'),
      });
      if (babyId) {
        void queryClient.invalidateQueries({ queryKey: ['babies', babyId] });
      }
    },
  });
}
