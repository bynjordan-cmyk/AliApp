import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, View } from 'react-native';

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
  const { t, locale, setLocale } = useI18n();
  const { signOut, profile } = useSession();
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
                <Ionicons name="happy-outline" size={24} color={surfaces.feeding.ink} accessible={false} />
              </View>
              <View style={styles.datos}>
                <Text variant="subtitle">{baby.name}</Text>
                {age ? (
                  <Text variant="caption" color={colors.textSecondary}>
                    {age.months} {locale === 'es' ? 'meses' : 'months'} · {age.days}{' '}
                    {locale === 'es' ? 'días' : 'days'}
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

            {baby.feeding_mode.length > 0 ? (
              <View style={styles.chips}>
                {baby.feeding_mode.map((modo) => (
                  <Chip key={modo} label={modo} />
                ))}
              </View>
            ) : null}

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
            value={pushEnabled}
            accessibilityLabel={t('reminders.pushEnabled')}
            trackColor={{ true: colors.accent, false: colors.border }}
            onValueChange={(valor) => saveSettings.mutate({ pushEnabled: valor })}
          />
        </View>

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
              onPress={() =>
                savePreference.mutate({ category, enabled: !estaActiva(category) })
              }
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
        <Text variant="caption" color={colors.textSecondary}>
          {t('profile.documentsHint')}
        </Text>
        <Divider />
        <SectionHeader title={t('profile.export')} />
        <Text variant="caption" color={colors.textSecondary}>
          {t('profile.exportPlaceholder')}
        </Text>
        <Divider />
        <SectionHeader title={t('profile.deleteAccount')} />
        <Text variant="caption" color={colors.textSecondary}>
          {t('profile.deleteAccountHint')}
        </Text>
      </Card>

      <Button variant="secondary" label={t('auth.signOut')} onPress={() => void signOut()} />

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
