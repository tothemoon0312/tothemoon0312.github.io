import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accentText,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarLabelStyle: { fontFamily: Typography.caption.fontFamily },
      }}>
      <Tabs.Screen name="index" options={{ title: 'For you', tabBarIcon: tabIcon('sparkles') }} />
      <Tabs.Screen name="saves" options={{ title: 'Saves', tabBarIcon: tabIcon('bookmark') }} />
      <Tabs.Screen name="profile" options={{ title: 'You', tabBarIcon: tabIcon('person-circle') }} />
    </Tabs>
  );
}
