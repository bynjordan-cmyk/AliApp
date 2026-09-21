import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { SIDEBAR_WIDTH, colors, spacing, touchTarget, useLayout } from '@/design-system';
import { useT } from '@/lib/i18n';

/**
 * Arquitectura de información (§14): Hoy · Alimentación · Salud · Procesos ·
 * Perfil.
 *
 * En móvil la navegación va abajo, al alcance del pulgar. En escritorio pasa a
 * una columna lateral: una barra inferior de 1900 px de ancho no es una web,
 * es una app estirada.
 *
 * Cada pestaña lleva icono Y texto: el estado nunca depende solo del color (§21).
 */
export default function TabsLayout() {
  const t = useT();
  const { isDesktop } = useLayout();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        tabBarVariant: isDesktop ? 'material' : 'uikit',
        tabBarLabelPosition: isDesktop ? 'beside-icon' : 'below-icon',
        tabBarStyle: isDesktop
          ? {
              width: SIDEBAR_WIDTH,
              backgroundColor: colors.surface,
              borderRightColor: colors.border,
              borderRightWidth: 1,
              paddingTop: spacing.xl,
              paddingHorizontal: spacing.sm,
            }
          : {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              height: touchTarget.comfortable + spacing.xl,
              paddingTop: spacing.xs,
            },
        tabBarItemStyle: isDesktop
          ? { borderRadius: 12, marginBottom: spacing.xxs, justifyContent: 'flex-start' }
          : undefined,
        tabBarLabelStyle: { fontSize: isDesktop ? 14 : 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.screen },
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
