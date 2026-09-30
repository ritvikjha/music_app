import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
  Insets,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export interface SpotifyTouchableProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  hitSlop?: Insets | number;
  activeScale?: number;
  activeOpacity?: number;
  hapticFeedback?: boolean;
  testID?: string;
}

/**
 * SpotifyTouchable
 *
 * Implements Spotify's signature tactile "spring & squish" button physics:
 * - On press-in: snappy compression to 0.94 scale with light haptic tap.
 * - On press-out: organic overshoot release bounce back to 1.0 scale (tension: 120, friction: 5).
 * - Simultaneous opacity dimming to 0.88.
 * - Fully hardware-accelerated with useNativeDriver: true for locked 60fps.
 */
export function SpotifyTouchable({
  children,
  onPress,
  onLongPress,
  style,
  disabled = false,
  hitSlop,
  activeScale = 0.94,
  activeOpacity = 0.88,
  hapticFeedback = true,
  testID,
}: SpotifyTouchableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = (event: GestureResponderEvent) => {
    if (disabled) return;
    if (hapticFeedback) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }

    Animated.parallel([
      Animated.spring(scale, {
        toValue: activeScale,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: activeOpacity,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    if (disabled) return;

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1.0,
        tension: 120,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1.0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default SpotifyTouchable;
