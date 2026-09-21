import {
  PageHeader,
  Button,
  Card,
  Divider,
  Screen,
  SectionHeader,
  Text,
  colors,
} from '@/design-system';
import { useSession } from '@/features/auth/SessionProvider';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { deriveBabyAge } from '@/lib/dates';
import { SUPPORTED_LOCALES, useI18n } from '@/lib/i18n';

/** Pestaña Perfil (§14): bebé, hogar, cuidadores, idioma, privacidad, exportación. */
export default function ProfileScreen() {
  const { t, locale, setLocale } = useI18n();
  const { signOut, profile } = useSession();
  const { household, baby, role } = useActiveBaby();

  const age = deriveBabyAge(baby?.birth_date ?? null);

  return (
    <Screen>
      <PageHeader title={t('profile.title')} icon="person-outline" />

      <Card>
        <SectionHeader title={t('profile.baby')} />
        <Text variant="bodyStrong">{baby?.name ?? '—'}</Text>
        {age ? (
          <Text variant="caption" color={colors.textSecondary}>
            {age.months} {locale === 'es' ? 'meses' : 'months'} · {age.days}{' '}
            {locale === 'es' ? 'días' : 'days'}
          </Text>
        ) : null}
      </Card>

      <Card>
        <SectionHeader title={t('profile.household')} />
        <Text variant="bodyStrong">{household?.name ?? '—'}</Text>
        {role ? (
          <Text variant="caption" color={colors.textSecondary}>
            {t(`roles.${role}` as const)}
          </Text>
        ) : null}
      </Card>

      <Card>
        <SectionHeader title={t('profile.language')} />
        {SUPPORTED_LOCALES.map((option) => (
          <Button
            key={option}
            variant={option === locale ? 'primary' : 'secondary'}
            label={option === 'es' ? 'Español' : 'English'}
            onPress={() => setLocale(option)}
          />
        ))}
      </Card>

      <Card>
        <SectionHeader title={t('profile.privacy')} />
        <Text variant="caption" color={colors.textSecondary}>
          {t('safety.notDiagnostic')}
        </Text>
        <Divider />
        <SectionHeader title={t('profile.export')} />
        <Text variant="caption" color={colors.textSecondary}>
          {t('profile.exportPlaceholder')}
        </Text>
      </Card>

      <Card>
        <SectionHeader title={t('profile.caregivers')} />
        <Text variant="caption" color={colors.textSecondary}>
          {profile?.display_name ?? ''}
        </Text>
      </Card>

      <Button variant="secondary" label={t('auth.signOut')} onPress={() => void signOut()} />
    </Screen>
  );
}
