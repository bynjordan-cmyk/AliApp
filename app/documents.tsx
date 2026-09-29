import { useState } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  QueryState,
  Screen,
  Text,
  colors,
} from '@/design-system';
import { useSession } from '@/features/auth/SessionProvider';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { can } from '@/features/caregivers/permissions';
import { DocumentPicker } from '@/features/media/DocumentPicker';
import { useMedia } from '@/features/media/useMedia';
import { getSignedUrl, softDeleteMedia, uploadMedia } from '@/services/media.service';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/lib/i18n';

export default function DocumentsScreen() {
  const t = useT();
  const router = useRouter();
  const cache = useQueryClient();
  const { profile } = useSession();
  const { baby, household, membership } = useActiveBaby();
  const media = useMedia('baby', baby?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const documents = media.data?.filter((asset) => asset.media_type === 'document') ?? [];
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(false);
    try {
      await action();
      await cache.invalidateQueries({ queryKey: queryKeys.media('baby', baby!.id) });
      setConfirm(null);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <PageHeader title={t('profile.documents')} subtitle={baby?.name} />
      <Text>{t('documents.hint')}</Text>
      {error ? (
        <Text color={colors.error} accessibilityRole="alert">
          {t('common.error')}
        </Text>
      ) : null}
      {baby && household && profile && can('event.create', membership) ? (
        <Card>
          <DocumentPicker
            disabled={busy}
            onPick={async (file) => {
              setBusy(true);
              setError(false);
              try {
                await uploadMedia(
                  {
                    householdId: household.id,
                    entityType: 'baby',
                    entityId: baby.id,
                    mediaType: 'document',
                    category: 'plan',
                    fileName: file.name,
                    contentType: file.type,
                    body: file.body,
                  },
                  profile.id,
                );
                await cache.invalidateQueries({ queryKey: queryKeys.media('baby', baby.id) });
              } finally {
                setBusy(false);
              }
            }}
          />
        </Card>
      ) : null}
      <QueryState
        loading={media.isLoading}
        error={media.isError}
        onRetry={() => void media.refetch()}
      >
        {documents.length === 0 ? (
          <EmptyState title={t('documents.empty')} />
        ) : (
          documents.map((asset) => (
            <Card key={asset.id}>
              <Text variant="bodyStrong">
                {asset.storage_path.split('/').pop()?.slice(37) || t('profile.documents')}
              </Text>
              <Button
                variant="secondary"
                label={t('documents.open')}
                disabled={busy}
                onPress={() =>
                  void run(async () => Linking.openURL(await getSignedUrl(asset.storage_path)))
                }
              />
              {can('household.manageSettings', membership) ? (
                confirm === asset.id ? (
                  <>
                    <Text>{t('documents.removeHint')}</Text>
                    <Button
                      label={t('documents.remove')}
                      disabled={busy}
                      onPress={() => void run(() => softDeleteMedia(asset.id))}
                    />
                    <Button
                      variant="ghost"
                      label={t('common.cancel')}
                      onPress={() => setConfirm(null)}
                    />
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    label={t('documents.remove')}
                    onPress={() => setConfirm(asset.id)}
                  />
                )
              ) : null}
            </Card>
          ))
        )}
      </QueryState>
      <Button variant="ghost" label={t('common.close')} onPress={() => router.back()} />
    </Screen>
  );
}
