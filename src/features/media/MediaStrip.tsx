import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text, colors, radius, spacing, touchTarget } from '@/design-system';
import { useSession } from '@/features/auth/SessionProvider';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { useT } from '@/lib/i18n';
import { queryKeys } from '@/lib/query-keys';
import type { MediaCategory, MediaEntityType } from '@/types/domain';
import { useQueryClient } from '@tanstack/react-query';

import { PermissionDeniedError, capturarYSubir } from './capture';
import { useMedia } from './useMedia';

/**
 * Tira de fotos de un evento, con opción de añadir más.
 *
 * Las fotos son DOCUMENTACIÓN: AliApp las guarda y las ordena en el tiempo, y
 * no dice nada sobre lo que muestran (§4 del encargo, §10 de seguridad).
 */
export function MediaStrip({
  entityType,
  entityId,
  category,
  readOnly = false,
}: {
  entityType: MediaEntityType;
  entityId: string;
  category?: MediaCategory;
  readOnly?: boolean;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const { profile } = useSession();
  const { household, membership } = useActiveBaby();
  const { data, isLoading } = useMedia(entityType, entityId);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const puedeAdjuntar =
    !readOnly &&
    Boolean(household && profile) &&
    membership?.status === 'active' &&
    membership.role !== 'professional_viewer';

  const añadir = async (source: 'camera' | 'library') => {
    if (!household || !profile) return;
    setAviso(null);
    setSubiendo(true);
    try {
      await capturarYSubir(source, { householdId: household.id, entityType, entityId, category }, profile.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.media(entityType, entityId) });
    } catch (error) {
      setAviso(
        error instanceof PermissionDeniedError
          ? t('media.permissionNeeded')
          : t('common.error'),
      );
    } finally {
      setSubiendo(false);
    }
  };

  const fotos = data ?? [];

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
        {fotos.map((foto) => (
          <View key={foto.id} style={styles.miniatura}>
            {foto.signedUrl ? (
              <Image
                source={{ uri: foto.signedUrl }}
                style={styles.imagen}
                accessibilityLabel={t('common.photos')}
              />
            ) : (
              <View style={[styles.imagen, styles.imagenVacia]}>
                <Ionicons name="image-outline" size={18} color={colors.textSecondary} />
              </View>
            )}
          </View>
        ))}

        {puedeAdjuntar ? (
          <>
            <BotonFoto
              icono="camera-outline"
              etiqueta={t('media.takePhoto')}
              ocupado={subiendo}
              onPress={() => void añadir('camera')}
            />
            <BotonFoto
              icono="images-outline"
              etiqueta={t('media.fromLibrary')}
              ocupado={subiendo}
              onPress={() => void añadir('library')}
            />
          </>
        ) : null}
      </ScrollView>

      {isLoading ? <ActivityIndicator color={colors.brand} /> : null}

      {fotos.length === 0 && !puedeAdjuntar ? (
        <Text variant="caption" color={colors.textSecondary}>
          {t('common.noPhotos')}
        </Text>
      ) : null}

      {aviso ? (
        <Text variant="caption" color={colors.error} accessibilityRole="alert">
          {aviso}
        </Text>
      ) : null}
    </View>
  );
}

function BotonFoto({
  icono,
  etiqueta,
  ocupado,
  onPress,
}: {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  etiqueta: string;
  ocupado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ busy: ocupado }}
      disabled={ocupado}
      onPress={onPress}
      style={({ pressed }) => [styles.añadir, pressed && styles.pressed]}
    >
      {ocupado ? (
        <ActivityIndicator color={colors.brand} />
      ) : (
        <Ionicons name={icono} size={22} color={colors.brand} accessible={false} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  fila: { gap: spacing.sm, paddingVertical: spacing.xs },
  miniatura: { borderRadius: radius.md, overflow: 'hidden' },
  imagen: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  imagenVacia: { alignItems: 'center', justifyContent: 'center' },
  añadir: {
    width: touchTarget.comfortable + spacing.lg,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  pressed: { opacity: 0.7 },
});
