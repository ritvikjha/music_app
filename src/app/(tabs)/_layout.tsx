import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../../theme';

/**
 * Tab layout — Home, Friends, Jam tabs with Midnight Cyber-Neon aesthetic.
 */
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Ensure enough bottom space for Android 3-button navigation or gesture bar
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 8);
  const barHeight = 58 + bottomInset;

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
          fontWeight: typography.weights.bold,
          fontSize: typography.sizes.lg,
          letterSpacing: 0.5,
        },
        tabBarStyle: {
          backgroundColor: '#090912',
          borderTopColor: 'rgba(0, 242, 254, 0.18)',
          borderTopWidth: 1,
          height: barHeight,
          paddingBottom: bottomInset + 2,
          paddingTop: 6,
          elevation: 16,
          shadowColor: '#00F2FE',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerTitle: '⚡ JAM MUSIC',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons name={focused ? 'flash' : 'flash-outline'} size={size - 1} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Squad',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="jam"
        options={{
          title: 'Jam Room',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons name={focused ? 'radio' : 'radio-outline'} size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Ionicons
                name={focused ? 'person-circle' : 'person-circle-outline'}
                size={size}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconWrap: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 4,
  },
});

