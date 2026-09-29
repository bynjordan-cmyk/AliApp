import { useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { z } from 'zod';
import { Button, Card, Input, PageHeader, Screen, Text, colors } from '@/design-system';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { buildReport } from '@/services/reporting.service';
import { downloadReport } from '@/features/reports/download';
import { useT } from '@/lib/i18n';

export default function ExportReport() {
  const t = useT();
  const router = useRouter();
  const { baby } = useActiveBaby();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    if (!baby || busy) return;
    setDone(false);
    if (
      !z.string().date().safeParse(from).success ||
      !z.string().date().safeParse(to).success ||
      from > to
    ) {
      setError(t('report.invalid'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const report = await buildReport(baby.id, {
        from: new Date(`${from}T00:00:00`).toISOString(),
        to: new Date(`${to}T23:59:59.999`).toISOString(),
      });
      downloadReport(JSON.stringify(report, null, 2), `aliapp-${from}-${to}.json`);
      setDone(true);
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen maxWidth={600}>
      <PageHeader title={t('report.title')} subtitle={t('report.hint')} />
      <Card>
        {Platform.OS === 'web' ? (
          <>
            <Text variant="subtitle">{baby?.name ?? t('today.noBaby')}</Text>
            <Input label={t('report.from')} value={from} onChangeText={setFrom} />
            <Input label={t('report.to')} value={to} onChangeText={setTo} />
            <Button
              label={t('report.download')}
              loading={busy}
              disabled={!baby}
              onPress={() => void run()}
            />
          </>
        ) : (
          <Text>{t('report.native')}</Text>
        )}
        {done ? <Text accessibilityRole="alert">{t('report.done')}</Text> : null}
        {error ? (
          <Text accessibilityRole="alert" color={colors.error}>
            {error}
          </Text>
        ) : null}
      </Card>
      <Button variant="ghost" label={t('common.close')} onPress={() => router.back()} />
    </Screen>
  );
}
