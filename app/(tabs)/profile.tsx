import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, Switch, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  PageHeader,
  Screen,
  SectionHeader,
  Text,
  colors,
  radius,
  spacing,
  surfaces,
} from '@/design-system';
import { useSession } from '@/features/auth/SessionProvider';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { BabyEditor } from '@/features/baby/BabyEditor';
import { resolveStage } from '@/features/baby/feeding-stage';
import { useActiveJourneys } from '@/features/journeys/useJourneys';
import {
  useNotificationSettings,
  useReminders,
  useSavePreference,
  useSaveSettings,
} from '@/features/notifications/useReminders';
import { deriveBabyAge, formatDate } from '@/lib/dates';
import { SUPPORTED_LOCALES, useI18n } from '@/lib/i18n';
import { REMINDER_CATEGORIES, type ReminderCategory } from '@/types/domain';

/**
 * Pestaña Perfil (§14).
 *
 * Reúne al bebé, la familia, el idioma, la privacidad y los avisos. Las
 * preferencias de aviso son personales: lo que configure una persona no afecta
 * a los demás cuidadores del hogar.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { signOut, profile } = useSession();
  const [leaving, setLeaving] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const { household, baby, role, babies } = useActiveBaby();
  const journeys = useActiveJourneys(baby?.id ?? null);

  const { settings, preferences } = useNotificationSettings();
  const savePreference = useSavePreference();
  const saveSettings = useSaveSettings();
  const reminders = useReminders();

  const age = deriveBabyAge(baby?.birth_date ?? null);
  const pushEnabled = settings.data?.push_enabled ?? false;

  const estaActiva = (category: ReminderCategory) =>
    preferences.data?.find((row) => row.category === category)?.enabled ?? true;

  return (
    <Screen>
      <PageHeader title={t('profile.title')} />

      {/* Bebé */}
      <Card>
        <SectionHeader title={t('profile.baby')} />
        {baby ? (
          <>
            <View style={styles.filaBebe}>
              <View style={[styles.avatar, { backgroundColor: surfaces.feeding.background }]}>
                <Ionicons
                  name="happy-outline"
                  size={24}
                  color={surfaces.feeding.ink}
                  accessible={false}
                />
              </View>
              <View style={styles.datos}>
                <Text variant="subtitle">{baby.name}</Text>
                {age ? (
                  <Text variant="caption" color={colors.textSecondary}>
                    {t('profile.ageDays', { days: age.days })}
                  </Text>
                ) : (
                  <Text variant="caption" color={colors.textSecondary}>
                    {t('profile.noBirthDate')}
                  </Text>
                )}
                {baby.birth_date ? (
                  <Text variant="overline" color={colors.textSecondary}>
                    {formatDate(baby.birth_date, locale)}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.chips}>
              {resolveStage(baby) ? (
                <Chip
                  label={t(`feedingStage.${resolveStage(baby)}` as 'feedingStage.milk_only')}
                  selected
                />
              ) : null}
              {baby.breastfeeding ? <Chip label={t('quickLog.breastfeed')} /> : null}
              {baby.formula ? <Chip label={t('quickLog.formula')} /> : null}
              {baby.pumped_milk ? <Chip label={t('quickLog.pumped_milk')} /> : null}
              {baby.solids_started ? <Chip label={t('food.title')} /> : null}
            </View>

            {(journeys.data ?? []).length > 0 ? (
              <Text variant="caption" color={colors.textSecondary}>
                {t('today.activeJourney')}:{' '}
                {(journeys.data ?? [])
                  .map((j) => t(`journeys.type.${j.journey_type}` as const))
                  .join(', ')}
              </Text>
            ) : null}
          </>
        ) : (
          <EmptyState title={t('today.noBaby')} description={t('today.noBabyHint')} />
        )}
      </Card>

      {baby && (role === 'owner' || role === 'parent') ? (
        <BabyEditor key={baby.id} baby={baby} />
      ) : null}

      {/* Familia y cuidadores */}
      <Card>
        <SectionHeader title={t('profile.household')} />
        <Text variant="bodyStrong">{household?.name ?? '—'}</Text>
        {role ? (
          <Text variant="caption" color={colors.textSecondary}>
            {t(`roles.${role}` as const)}
          </Text>
        ) : null}
        <Divider />
        <SectionHeader title={t('profile.caregivers')} />
        <Button
          label={t('caregivers.title')}
          variant="secondary"
          onPress={() => router.push('/caregivers')}
        />
        <Text variant="caption" color={colors.textSecondary}>
          {profile?.display_name ?? ''}
        </Text>
        {babies.length > 1 ? (
          <Text variant="overline" color={colors.textSecondary}>
            {babies.length} {t('profile.babiesCount')}
          </Text>
        ) : null}
      </Card>

      {/* Avisos y recordatorios */}
      <Card>
        <SectionHeader title={t('reminders.settings')} subtitle={t('reminders.personal')} />

        <View style={styles.filaAjuste}>
          <Text>{t('reminders.pushEnabled')}</Text>
          <Switch
            value={Platform.OS === 'web' ? false : pushEnabled}
            disabled={Platform.OS === 'web' || saveSettings.isPending}
            accessibilityLabel={t('reminders.pushEnabled')}
            trackColor={{ true: colors.accent, false: colors.border }}
            onValueChange={(valor) => saveSettings.mutate({ pushEnabled: valor })}
          />
        </View>

        {Platform.OS === 'web' ? <Text variant="caption">{t('reminders.webHint')}</Text> : null}
        {saveSettings.isError || savePreference.isError ? (
          <Text color={colors.error} accessibilityRole="alert">
            {t('common.error')}
          </Text>
        ) : null}
        <Text variant="caption" color={colors.textSecondary}>
          {t('reminders.quietHours')} · {settings.data?.quiet_hours_start ?? '—'} →{' '}
          {settings.data?.quiet_hours_end ?? '—'}
        </Text>
        <Text variant="overline" color={colors.textSecondary}>
          {t('reminders.quietHoursHint')}
        </Text>

        <Divider />

        <SectionHeader title={t('reminders.categories')} />
        <View style={styles.chips}>
          {REMINDER_CATEGORIES.map((category) => (
            <Chip
              key={category}
              label={t(`reminders.category.${category}` as 'reminders.category.feeding')}
              selected={estaActiva(category)}
              onPress={() => savePreference.mutate({ category, enabled: !estaActiva(category) })}
            />
          ))}
        </View>

        <Divider />

        <SectionHeader title={t('reminders.title')} />
        {(reminders.data ?? []).filter((r) => r.status === 'scheduled').length === 0 ? (
          <Text variant="caption" color={colors.textSecondary}>
            {t('reminders.emptyHint')}
          </Text>
        ) : (
          (reminders.data ?? [])
            .filter((r) => r.status === 'scheduled')
            .map((reminder) => (
              <Text key={reminder.id} variant="caption">
                {reminder.title} · {formatDate(reminder.scheduled_for, locale)}
              </Text>
            ))
        )}
      </Card>

      {/* Idioma */}
      <Card>
        <SectionHeader title={t('profile.language')} />
        <View style={styles.chips}>
          {SUPPORTED_LOCALES.map((option) => (
            <Chip
              key={option}
              label={option === 'es' ? 'Español' : 'English'}
              selected={option === locale}
              onPress={() => setLocale(option)}
            />
          ))}
        </View>
      </Card>

      {/* Privacidad, documentos y datos */}
      <Card>
        <SectionHeader title={t('profile.privacy')} />
        <Text variant="caption" color={colors.textSecondary}>
          {t('profile.privacyHint')}
        </Text>
        <Divider />
        <SectionHeader title={t('profile.documents')} />
        <Button
          label={t('profile.documents')}
          variant="secondary"
          onPress={() => router.push('/documents')}
        />
        <Text variant="caption" color={colors.textSecondary}>
          {t('profile.documentsHint')}
        </Text>
        <Divider />
        <SectionHeader title={t('profile.export')} />
        <Button label={t('report.title')} onPress={() => router.push('/export')} />
        <Text variant="caption" color={colors.textSecondary}>
          {t('report.hint')}
        </Text>
        <Divider />
        <SectionHeader title={t('profile.deleteAccount')} />
        <Text variant="caption" color={colors.textSecondary}>
          {t('profile.deleteAccountHint')}
        </Text>
      </Card>

      {signOutError ? (
        <Text color={colors.error} accessibilityRole="alert">
          {t('common.error')}
        </Text>
      ) : null}
      <Button
        variant="secondary"
        label={t('auth.signOut')}
        loading={leaving}
        onPress={async () => {
          setLeaving(true);
          setSignOutError(false);
          try {
            await signOut();
          } catch {
            setSignOutError(true);
          } finally {
            setLeaving(false);
          }
        }}
      />

      <Text variant="caption" color={colors.textSecondary}>
        {t('safety.notDiagnostic')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filaBebe: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datos: { flex: 1, gap: spacing.xxs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filaAjuste: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
});
