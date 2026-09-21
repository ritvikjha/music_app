import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { colors } from '../theme';

interface AnimatedEqualizerProps {
  size?: number;
  color?: string;
  barCount?: number;
  isPlaying?: boolean;
}

/**
 * Animated equalizer bars that bounce at different frequencies.
 * Used as a "now playing" indicator on SongCard, MiniPlayer, and JamRoom.
 */
export function AnimatedEqualizer({
  size = 16,
  color = colors.accent,
  barCount = 3,
  isPlaying = true,
}: AnimatedEqualizerProps) {
  const bar1 = useSharedValue(0.4);
  const bar2 = useSharedValue(0.7);
  const bar3 = useSharedValue(0.5);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimation(bar1);
      cancelAnimation(bar2);
      cancelAnimation(bar3);
      bar1.value = withTiming(0.2, { duration: 200 });
      bar2.value = withTiming(0.2, { duration: 200 });
      bar3.value = withTiming(0.2, { duration: 200 });
      return;
    }

    const animConfig = {
      duration: 400,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    };

    bar1.value = withRepeat(
      withSequence(
        withTiming(1, animConfig),
        withTiming(0.3, animConfig)
      ),
      -1,
      true
    );

    bar2.value = withDelay(
      130,
      withRepeat(
        withSequence(
          withTiming(0.9, { ...animConfig, duration: 350 }),
          withTiming(0.2, { ...animConfig, duration: 350 })
        ),
        -1,
        true
      )
    );

    bar3.value = withDelay(
      260,
      withRepeat(
        withSequence(
          withTiming(1, { ...animConfig, duration: 450 }),
          withTiming(0.35, { ...animConfig, duration: 450 })
        ),
        -1,
        true
      )
    );
  }, [isPlaying, bar1, bar2, bar3]);

  const barWidth = Math.max(2, Math.floor(size / 5));
  const gap = Math.max(1, Math.floor(size / 8));

  const style1 = useAnimatedStyle(() => ({
    height: bar1.value * size,
  }));

  const style2 = useAnimatedStyle(() => ({
    height: bar2.value * size,
  }));

  const style3 = useAnimatedStyle(() => ({
    height: bar3.value * size,
  }));

  const bars = [style1, style2, style3].slice(0, barCount);

  return (
    <View style={[styles.container, { height: size, gap }]}>
      {bars.map((animStyle, i) => (
        <Animated.View
          key={i}
          style={[
            {
              width: barWidth,
              backgroundColor: color,
              borderRadius: barWidth / 2,
            },
            animStyle,
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
});
