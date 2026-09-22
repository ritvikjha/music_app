import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../../theme';

/**
 * Tab layout — Home, Friends, Jam tabs with dark/lavender styling.
 */
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Ensure enough bottom space for Android 3-button navigation or gesture bar
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 8);
  const barHeight = 56 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: typography.weights.semibold,
          fontSize: typography.sizes.lg,
        },
        tabBarStyle: {
          backgroundColor: colors.backgroundElevated,
          borderTopColor: colors.divider,
          borderTopWidth: 0.5,
          height: barHeight,
          paddingBottom: bottomInset + 2,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: typography.sizes.xs,
          fontWeight: typography.weights.medium,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerTitle: 'Jam',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jam"
        options={{
          title: 'Jam',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
