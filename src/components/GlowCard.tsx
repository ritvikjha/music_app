import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { shadows, colors } from '../theme';

interface GlowCardProps {
  children: React.ReactNode;
  intensity?: 'normal' | 'intense';
  style?: ViewStyle;
}

/**
 * A wrapper that adds a soft lavender glow shadow behind its children.
 */
export function GlowCard({ children, intensity = 'normal', style }: GlowCardProps) {
  const glowStyle = intensity === 'intense' ? shadows.lavenderGlowIntense : shadows.lavenderGlow;

  return (
    <View style={[styles.container, glowStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    overflow: 'visible',
  },
});
