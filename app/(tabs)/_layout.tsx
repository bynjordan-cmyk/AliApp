import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  SIDEBAR_WIDTH,
  colors,
  radius,
  spacing,
  touchTarget,
  typography,
  useLayout,
} from '@/design-system';
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
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
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
              height: touchTarget.comfortable + spacing.md + insets.bottom,
              paddingBottom: Math.max(insets.bottom, spacing.sm),
              paddingTop: spacing.xs,
            },
        tabBarItemStyle: isDesktop
          ? { borderRadius: radius.md, marginBottom: spacing.xxs, justifyContent: 'flex-start' }
          : undefined,
        tabBarLabelStyle: {
          ...(isDesktop ? typography.caption : typography.navigation),
          marginHorizontal: 0,
        },
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.screen },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: t('tabs.food'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="restaurant-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: t('tabs.health'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="heart-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="journeys"
        options={{
          title: t('tabs.journeys'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="map-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: ColorValue;
  focused: boolean;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{
        backgroundColor: focused ? colors.accentSoft : colors.transparent,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
      }}
    >
      <Ionicons name={name} color={color} size={22} accessible={false} />
    </View>
  );
}
