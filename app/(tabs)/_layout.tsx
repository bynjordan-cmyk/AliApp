import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors, spacing, touchTarget } from '@/design-system';
import { useT } from '@/lib/i18n';

/**
 * Arquitectura de información (§14): Hoy · Alimentación · Salud · Procesos ·
 * Perfil. Cada pestaña lleva icono Y texto: el estado nunca depende solo del
 * color (§21).
 */
export default function TabsLayout() {
  const t = useT();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: touchTarget.comfortable + spacing.xl,
          paddingTop: spacing.xs,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
          tabBarIcon: ({ color, size }) => <Ionicons name="today" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: t('tabs.food'),
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: t('tabs.health'),
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="journeys"
        options={{
          title: t('tabs.journeys'),
          tabBarIcon: ({ color, size }) => <Ionicons name="map" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
