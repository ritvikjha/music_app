import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius, typography } from '../theme';

interface ProgressBarProps {
  positionMs: number;
  durationMs: number;
  onSeek: (positionMs: number) => void;
}

/**
 * Format milliseconds to m:ss.
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Seekable progress bar with draggable thumb.
 */
export function ProgressBar({ positionMs, durationMs, onSeek }: ProgressBarProps) {
  const progress = durationMs > 0 ? Math.min(positionMs / durationMs, 1) : 0;
  const isSeeking = useSharedValue(false);
  const seekProgress = useSharedValue(0);
  const barWidth = useSharedValue(0);

  const handleSeek = useCallback(
    (ratio: number) => {
      const clampedRatio = Math.max(0, Math.min(1, ratio));
      onSeek(Math.floor(clampedRatio * durationMs));
    },
    [durationMs, onSeek]
  );

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      isSeeking.value = true;
      if (barWidth.value > 0) {
        seekProgress.value = Math.max(0, Math.min(1, e.x / barWidth.value));
      }
    })
    .onUpdate((e) => {
      if (barWidth.value > 0) {
        seekProgress.value = Math.max(0, Math.min(1, e.x / barWidth.value));
      }
    })
    .onEnd(() => {
      isSeeking.value = false;
      runOnJS(handleSeek)(seekProgress.value);
    });

  const tapGesture = Gesture.Tap().onEnd((e) => {
    if (barWidth.value > 0) {
      const ratio = Math.max(0, Math.min(1, e.x / barWidth.value));
      runOnJS(handleSeek)(ratio);
    }
  });

  const gesture = Gesture.Race(panGesture, tapGesture);

  const fillStyle = useAnimatedStyle(() => {
    const displayProgress = isSeeking.value ? seekProgress.value : progress;
    return {
      width: `${displayProgress * 100}%`,
    };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const displayProgress = isSeeking.value ? seekProgress.value : progress;
    return {
      left: `${displayProgress * 100}%`,
      transform: [{ translateX: -6 }],
      opacity: isSeeking.value ? 1 : 0.8,
      scale: isSeeking.value ? 1.3 : 1,
    };
  });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.trackContainer}
          onLayout={(e) => {
            barWidth.value = e.nativeEvent.layout.width;
          }}
        >
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>
      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatTime(positionMs)}</Text>
        <Text style={styles.time}>{formatTime(durationMs)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  trackContainer: {
    height: 30,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  thumb: {
    position: 'absolute',
    top: 9,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  time: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
});
