import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme';

interface AnimatedEqualizerProps {
  size?: number;
  color?: string;
  barCount?: number;
  isPlaying?: boolean;
}

/**
 * AnimatedEqualizer
 *
 * Authentic live music visualizer bars:
 * - 3 to 4 vertical equalizer bars animate independently with staggered loops.
 * - Heights randomly fluctuate between 4px and 18px at 150ms-280ms intervals.
 * - Smoothly collapses down to flat dots (2px) when playback is paused.
 * - Hardware rendered with graceful animated height.
 */
export function AnimatedEqualizer({
  size = 18,
  color = colors.accent,
  barCount = 4,
  isPlaying = true,
}: AnimatedEqualizerProps) {
  // Staggered independent equalizer bars
  const h1 = useRef(new Animated.Value(isPlaying ? 6 : 2)).current;
  const h2 = useRef(new Animated.Value(isPlaying ? 12 : 2)).current;
  const h3 = useRef(new Animated.Value(isPlaying ? 16 : 2)).current;
  const h4 = useRef(new Animated.Value(isPlaying ? 8 : 2)).current;

  useEffect(() => {
    if (!isPlaying) {
      // Smoothly collapse down to flat dots (2px) when paused
      Animated.parallel([
        Animated.timing(h1, { toValue: 2, duration: 250, useNativeDriver: false }),
        Animated.timing(h2, { toValue: 2, duration: 250, useNativeDriver: false }),
        Animated.timing(h3, { toValue: 2, duration: 250, useNativeDriver: false }),
        Animated.timing(h4, { toValue: 2, duration: 250, useNativeDriver: false }),
      ]).start();
      return;
    }

    let isMounted = true;

    // Independent random fluctuating loops between 4px and 18px at 150ms-280ms intervals
    const createBarLoop = (val: Animated.Value, minDuration: number, maxDuration: number) => {
      const step = () => {
        if (!isMounted) return;
        const maxHeight = Math.min(size, 18);
        const targetHeight = Math.floor(4 + Math.random() * (maxHeight - 4));
        const duration = Math.floor(minDuration + Math.random() * (maxDuration - minDuration));

        Animated.timing(val, {
          toValue: targetHeight,
          duration,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished && isMounted) {
            step();
          }
        });
      };
      step();
    };

    createBarLoop(h1, 150, 220);
    createBarLoop(h2, 180, 260);
    createBarLoop(h3, 160, 240);
    createBarLoop(h4, 200, 280);

    return () => {
      isMounted = false;
      h1.stopAnimation();
      h2.stopAnimation();
      h3.stopAnimation();
      h4.stopAnimation();
    };
  }, [isPlaying, size, h1, h2, h3, h4]);

  const barValues = [h1, h2, h3, h4].slice(0, barCount);
  const barWidth = Math.max(2, Math.floor(size / 5));
  const gap = Math.max(1, Math.floor(size / 8));

  return (
    <View style={[styles.container, { height: size, gap }]}>
      {barValues.map((animHeight, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              width: barWidth,
              height: animHeight,
              backgroundColor: color,
              borderRadius: barWidth / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    // Clean, crisp Spotify visualizer bar without neon glow
  },
});

