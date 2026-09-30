import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ColorValue, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../../components/ErrorBoundary';

function TabIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: ColorValue;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1.0, { damping: 14, stiffness: 200 });
  }, [focused, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name={name} size={24} color={color} />
    </Animated.View>
  );
}

/**
 * Tab layout — Home, Library, Games, Jam Room, Profile tabs.
 * Spotify-styled solid black tab bar with spring-scaled icons and fade transitions.
 */
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);
  const barHeight = 54 + bottomInset;

  return (
    <ErrorBoundary fallbackTitle="NAVIGATION SYSTEM RECOVERED">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#000000',
            borderTopWidth: 0,
            height: barHeight,
            paddingBottom: bottomInset + 2,
            paddingTop: 6,
            elevation: 0,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.4,
            shadowRadius: 6,
          },
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: '#B3B3B3',
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '500',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'flash' : 'flash-outline'} focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'albums' : 'albums-outline'} focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="games"
          options={{
            title: 'Games',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name={focused ? 'game-controller' : 'game-controller-outline'}
                focused={focused}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="jam"
          options={{
            title: 'Jam Room',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'radio' : 'radio-outline'} focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name={focused ? 'person-circle' : 'person-circle-outline'}
                focused={focused}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </ErrorBoundary>
  );
}
