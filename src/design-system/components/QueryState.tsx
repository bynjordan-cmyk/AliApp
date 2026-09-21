import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useT } from '@/lib/i18n';
import { spacing } from '../tokens';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';

/**
 * Solo presentación: los estados de carga, error y reintento se pintan aquí,
 * pero la consulta y el reintento siguen siendo de quien llama.
 */
export function QueryState({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  const t = useT();
  if (loading) return <LoadingState label={t('common.loading')} />;
  if (error)
    return (
      <View style={{ gap: spacing.md }} accessibilityLiveRegion="polite">
        <EmptyState title={t('common.error')} />
        <Button label={t('common.retry')} variant="secondary" onPress={onRetry} />
      </View>
    );
  return <>{children}</>;
}
