import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius, typography } from '../theme';

interface ProgressBarProps {
  positionMs: number;
  durationMs: number;
  onSeek: (positionMs: number) => void;
  accentColor?: string;
}

/**
 * Format milliseconds to m:ss safely.
 */
function formatTime(ms: number): string {
  if (typeof ms !== 'number' || !isFinite(ms) || isNaN(ms) || ms <= 0) {
    return '0:00';
  }
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Enhanced seekable progress bar with real-time scrub bubble, glowing fill,
 * and responsive gesture tracking.
 */
export function ProgressBar({
  positionMs,
  durationMs,
  onSeek,
  accentColor = colors.accent,
}: ProgressBarProps) {
  const safePosition =
    typeof positionMs === 'number' && isFinite(positionMs) && !isNaN(positionMs)
      ? Math.max(0, positionMs)
      : 0;
  const safeDuration =
    typeof durationMs === 'number' && isFinite(durationMs) && !isNaN(durationMs)
      ? Math.max(0, durationMs)
      : 0;
  const progress =
    safeDuration > 0 ? Math.max(0, Math.min(safePosition / safeDuration, 1)) : 0;

  const isSeeking = useSharedValue(false);
  const seekProgress = useSharedValue(0);
  const seekAnim = useSharedValue(0);
  const barWidth = useSharedValue(0);
  const [scrubDisplayTime, setScrubDisplayTime] = useState<string>('0:00');

  const updateScrubTime = (ratio: number) => {
    const clamped = typeof ratio === 'number' && isFinite(ratio) && !isNaN(ratio)
      ? Math.max(0, Math.min(1, ratio))
      : 0;
    const ms = Math.floor(clamped * safeDuration);
    setScrubDisplayTime(formatTime(ms));
  };

  const handleSeek = useCallback(
    (ratio: number) => {
      const clampedRatio = typeof ratio === 'number' && isFinite(ratio) && !isNaN(ratio)
        ? Math.max(0, Math.min(1, ratio))
        : 0;
      onSeek(Math.floor(clampedRatio * safeDuration));
    },
    [safeDuration, onSeek]
  );

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      isSeeking.value = true;
      seekAnim.value = withTiming(1, { duration: 150 });
      if (barWidth.value > 0) {
        const ratio = Math.max(0, Math.min(1, e.x / barWidth.value));
        seekProgress.value = ratio;
        runOnJS(updateScrubTime)(ratio);
      }
    })
    .onUpdate((e) => {
      if (barWidth.value > 0) {
        const ratio = Math.max(0, Math.min(1, e.x / barWidth.value));
        seekProgress.value = ratio;
        runOnJS(updateScrubTime)(ratio);
      }
    })
    .onEnd(() => {
      isSeeking.value = false;
      seekAnim.value = withTiming(0, { duration: 150 });
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
    const raw = isSeeking.value ? seekProgress.value : progress;
    const safeP =
      typeof raw === 'number' && isFinite(raw) && !isNaN(raw)
        ? Math.max(0, Math.min(raw, 1))
        : 0;
    return {
      width: `${safeP * 100}%`,
    };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const raw = isSeeking.value ? seekProgress.value : progress;
    const safeP =
      typeof raw === 'number' && isFinite(raw) && !isNaN(raw)
        ? Math.max(0, Math.min(raw, 1))
        : 0;
    const safeAnim =
      typeof seekAnim.value === 'number' && isFinite(seekAnim.value) && !isNaN(seekAnim.value)
        ? Math.max(0, Math.min(seekAnim.value, 1))
        : 0;
    return {
      left: `${safeP * 100}%`,
      transform: [
        { translateX: -6 },
        { scale: safeAnim },
      ],
      opacity: safeAnim,
    };
  });

  const bubbleStyle = useAnimatedStyle(() => {
    const raw = isSeeking.value ? seekProgress.value : progress;
    const safeP =
      typeof raw === 'number' && isFinite(raw) && !isNaN(raw)
        ? Math.max(0, Math.min(raw, 1))
        : 0;
    const safeAnim =
      typeof seekAnim.value === 'number' && isFinite(seekAnim.value) && !isNaN(seekAnim.value)
        ? Math.max(0, Math.min(seekAnim.value, 1))
        : 0;
    return {
      left: `${safeP * 100}%`,
      opacity: safeAnim,
      transform: [
        { translateX: -22 },
        { translateY: -10 - safeAnim * 22 },
      ],
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
          {/* Floating Time Scrub Bubble */}
          <Animated.View pointerEvents="none" style={[styles.scrubBubble, bubbleStyle]}>
            <Text style={styles.scrubBubbleText}>{scrubDisplayTime}</Text>
          </Animated.View>

          {/* Background Track */}
          <View style={styles.track}>
            <Animated.View
              style={[
                styles.fill,
                fillStyle,
              ]}
            />
          </View>

          {/* Draggable Glowing Thumb */}
          <Animated.View
            style={[
              styles.thumb,
              thumbStyle,
            ]}
          />
        </View>
      </GestureDetector>

      {/* Timestamps */}
      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatTime(safePosition)}</Text>
        <Text style={styles.time}>{formatTime(safeDuration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: spacing.xl,
  },
  trackContainer: {
    height: 28,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.full,
  },
  thumb: {
    position: 'absolute',
    top: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  scrubBubble: {
    position: 'absolute',
    top: 0,
    width: 44,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(10, 10, 15, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 20,
  },
  scrubBubbleText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingHorizontal: 2,
  },
  time: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});
