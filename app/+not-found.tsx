import { Link } from 'expo-router';

import { Screen, Text } from '@/design-system';
import { useT } from '@/lib/i18n';

export default function NotFoundScreen() {
  const t = useT();

  return (
    <Screen>
      <Text variant="title">{t('common.error')}</Text>
      <Link href="/">
        <Text>{t('tabs.today')}</Text>
      </Link>
    </Screen>
  );
}
