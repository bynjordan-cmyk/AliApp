import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useState } from 'react';
import { z } from 'zod';
import { Button, Input, Text, colors } from '@/design-system';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { can } from '@/features/caregivers/permissions';
import { useT } from '@/lib/i18n';
import { queryKeys } from '@/lib/query-keys';
import type { Journey, JourneyStatus } from '@/types/domain';
import { updateJourneyStatus } from './journey.service';

export function JourneyActions({ journey }: { journey: Journey }) {
  const t = useT();
  const cache = useQueryClient();
  const { membership } = useActiveBaby();
  const [next, setNext] = useState<JourneyStatus | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const change = useMutation({
    mutationFn: () => {
      if (
        next === 'completed' &&
        (!z.string().date().safeParse(date).success || date < journey.started_on)
      ) {
        throw new Error('Invalid completion date');
      }
      return updateJourneyStatus(journey.id, next!, next === 'completed' ? date : null);
    },
    onSuccess: async () => {
      setNext(null);
      await cache.invalidateQueries({ queryKey: queryKeys.journeys(journey.baby_id) });
    },
  });
  if (!can('journey.write', membership)) return null;
  return (
    <>
      {next ? (
        <>
          <Text>
            {t('journeyForm.confirmStatus')} {t(`journeys.status.${next}`)}
          </Text>
          {next === 'completed' ? (
            <Input label={t('journeyForm.completed')} value={date} onChangeText={setDate} />
          ) : null}
          <Button
            label={t('common.save')}
            loading={change.isPending}
            onPress={() => change.mutate()}
          />
          <Button
            variant="ghost"
            label={t('common.cancel')}
            disabled={change.isPending}
            onPress={() => setNext(null)}
          />
        </>
      ) : (
        <>
          {journey.status === 'draft' || journey.status === 'paused' ? (
            <Button
              variant="secondary"
              label={t('journeyForm.activate')}
              onPress={() => setNext('active')}
            />
          ) : null}
          {journey.status === 'active' ? (
            <Button
              variant="secondary"
              label={t('journeyForm.pause')}
              onPress={() => setNext('paused')}
            />
          ) : null}
          {journey.status === 'active' || journey.status === 'paused' ? (
            <Button
              variant="secondary"
              label={t('journeyForm.complete')}
              onPress={() => setNext('completed')}
            />
          ) : null}
          {journey.status !== 'completed' && journey.status !== 'cancelled' ? (
            <Button
              variant="ghost"
              label={t('journeyForm.cancel')}
              onPress={() => setNext('cancelled')}
            />
          ) : null}
        </>
      )}
      {change.isError ? (
        <Text color={colors.error} accessibilityRole="alert">
          {t('common.error')}
        </Text>
      ) : null}
    </>
  );
}
