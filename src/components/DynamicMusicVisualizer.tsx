import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type VisualizerMode = 'bars' | 'wave' | 'particles' | 'hologram';

interface DynamicMusicVisualizerProps {
  isPlaying: boolean;
  mode?: VisualizerMode;
  onToggleMode?: (nextMode: VisualizerMode) => void;
  accentColor?: string;
  secondaryColor?: string;
  height?: number;
  width?: number;
  showControls?: boolean;
}

/**
 * Frequency Band definitions for 16-bar spectrum analyzer.
 * Color spectrum transitions from Deep Cyber Violet (sub-bass) -> Emerald (mids) -> Neon Mint/Cyan (highs).
 */
const BARS_COUNT = 16;
const WAVE_BARS_COUNT = 24;

const SPECTRUM_COLORS = [
  '#1ED760', // 0: Sub-bass 30Hz
  '#1DB954', // 1: Sub-bass 50Hz
  '#1aa34a', // 2: Bass 80Hz
  '#169c46', // 3: Bass 120Hz
  '#10B981', // 4: Low-mid 200Hz
  '#059669', // 5: Low-mid 350Hz
  '#10B981', // 6: Mid 500Hz
  '#1ED760', // 7: Mid 800Hz
  '#1ED760', // 8: Mid 1.2kHz
  '#22C55E', // 9: Upper-mid 2kHz
  '#34D399', // 10: Upper-mid 3.5kHz
  '#4ADE80', // 11: Presence 5kHz
  '#1ED760', // 12: Presence 7kHz
  '#86EFAC', // 13: Brilliance 10kHz
  '#A7F3D0', // 14: Brilliance 13kHz
  '#FFFFFF', // 15: Air 16kHz
];

/**
 * DynamicMusicVisualizer
 *
 * NOTE ON AUDIO METRICS:
 * expo-audio in Expo managed workflow exposes track playback status (isPlaying,
 * positionMillis, durationMillis, playbackRate, volume) but does NOT provide
 * raw PCM Fast Fourier Transform (FFT) hardware audio stream taps.
 *
 * This visualizer uses real-time playback state:
 * - When isPlaying is true: Synthesizes dynamic, phase-varied rhythmic harmonics
 *   with reactive peak-hold meters across 16 spectrum frequency bands.
 * - When isPlaying is false: Smoothly glides down all bars to resting baseline within 250ms.
 */
export function DynamicMusicVisualizer({
  isPlaying,
  mode: controlledMode,
  onToggleMode,
  accentColor = colors.accent,
  secondaryColor = colors.accentSecondary,
  height = 200,
  width = Math.min(SCREEN_WIDTH - 64, 320),
  showControls = true,
}: DynamicMusicVisualizerProps) {
  const [internalMode, setInternalMode] = useState<VisualizerMode>('bars');
  const activeMode = controlledMode ?? internalMode;

  // 16 animated bar heights (0.0 to 1.0)
  const bar0 = useSharedValue(0.1);
  const bar1 = useSharedValue(0.1);
  const bar2 = useSharedValue(0.1);
  const bar3 = useSharedValue(0.1);
  const bar4 = useSharedValue(0.1);
  const bar5 = useSharedValue(0.1);
  const bar6 = useSharedValue(0.1);
  const bar7 = useSharedValue(0.1);
  const bar8 = useSharedValue(0.1);
  const bar9 = useSharedValue(0.1);
  const bar10 = useSharedValue(0.1);
  const bar11 = useSharedValue(0.1);
  const bar12 = useSharedValue(0.1);
  const bar13 = useSharedValue(0.1);
  const bar14 = useSharedValue(0.1);
  const bar15 = useSharedValue(0.1);

  // Peak hold meters (falling slowly with gravity)
  const peak0 = useSharedValue(0.15);
  const peak1 = useSharedValue(0.15);
  const peak2 = useSharedValue(0.15);
  const peak3 = useSharedValue(0.15);
  const peak4 = useSharedValue(0.15);
  const peak5 = useSharedValue(0.15);
  const peak6 = useSharedValue(0.15);
  const peak7 = useSharedValue(0.15);
  const peak8 = useSharedValue(0.15);
  const peak9 = useSharedValue(0.15);
  const peak10 = useSharedValue(0.15);
  const peak11 = useSharedValue(0.15);
  const peak12 = useSharedValue(0.15);
  const peak13 = useSharedValue(0.15);
  const peak14 = useSharedValue(0.15);
  const peak15 = useSharedValue(0.15);

  const bars = [
    bar0, bar1, bar2, bar3, bar4, bar5, bar6, bar7,
    bar8, bar9, bar10, bar11, bar12, bar13, bar14, bar15,
  ];

  const peaks = [
    peak0, peak1, peak2, peak3, peak4, peak5, peak6, peak7,
    peak8, peak9, peak10, peak11, peak12, peak13, peak14, peak15,
  ];

  // Animate bars based on active mode and isPlaying
  useEffect(() => {
    if (!isPlaying) {
      // Cancel ongoing loops and glide down to baseline
      bars.forEach((bar) => {
        cancelAnimation(bar);
        bar.value = withTiming(0.04, { duration: 250, easing: Easing.out(Easing.quad) });
      });
      peaks.forEach((peak) => {
        cancelAnimation(peak);
        peak.value = withTiming(0.06, { duration: 300, easing: Easing.out(Easing.quad) });
      });
      return;
    }

    if (activeMode === 'bars') {
      // Frequency Spectrum Analyzer Simulation
      bars.forEach((bar, index) => {
        // Bass bars (0-4) bounce with heavier, slower pulse
        // Mid bars (5-10) flutter with active vocal rhythm
        // High bars (11-15) shimmer with quick transient spikes
        const isBass = index < 4;
        const isMid = index >= 4 && index <= 10;
        const duration = isBass ? 380 + index * 40 : isMid ? 260 + (index % 3) * 35 : 190 + (index % 4) * 30;
        const minHeight = isBass ? 0.25 : 0.15;
        const maxHeight = isBass ? 0.95 - (index * 0.04) : isMid ? 0.92 : 0.78;

        bar.value = withDelay(
          (index * 35) % 250,
          withRepeat(
            withSequence(
              withTiming(maxHeight, {
                duration,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
              }),
              withTiming(minHeight + Math.random() * 0.2, {
                duration: duration * 1.1,
                easing: Easing.inOut(Easing.quad),
              })
            ),
            -1,
            true
          )
        );

        // Peak cap animation (drops slower for studio meter look)
        peaks[index].value = withDelay(
          (index * 35) % 250,
          withRepeat(
            withSequence(
              withTiming(maxHeight + 0.05, { duration: duration * 0.8 }),
              withTiming(maxHeight * 0.7, { duration: duration * 1.6, easing: Easing.in(Easing.quad) })
            ),
            -1,
            true
          )
        );
      });
    } else {
      // Cyber Wave Simulation: Sinusoidal flowing harmonic ribbon
      bars.forEach((bar, index) => {
        const delay = index * 45;
        bar.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(0.85, {
                duration: 550,
                easing: Easing.bezier(0.42, 0, 0.58, 1),
              }),
              withTiming(0.18, {
                duration: 550,
                easing: Easing.bezier(0.42, 0, 0.58, 1),
              })
            ),
            -1,
            true
          )
        );

        peaks[index].value = withDelay(
          delay + 40,
          withRepeat(
            withSequence(
              withTiming(0.92, { duration: 550 }),
              withTiming(0.24, { duration: 550 })
            ),
            -1,
            true
          )
        );
      });
    }

    return () => {
      bars.forEach((b) => cancelAnimation(b));
      peaks.forEach((p) => cancelAnimation(p));
    };
  }, [isPlaying, activeMode]);

  const handleToggle = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const modes: VisualizerMode[] = ['bars', 'wave', 'particles', 'hologram'];
    const nextIndex = (modes.indexOf(activeMode) + 1) % modes.length;
    const nextMode = modes[nextIndex];
    if (onToggleMode) {
      onToggleMode(nextMode);
    } else {
      setInternalMode(nextMode);
    }
  };

  const barWidth = Math.max(3, Math.floor((width - (BARS_COUNT - 1) * 3 - 24) / BARS_COUNT));
  const availableHeight = height - 52; // leaving space for mode pill & status text

  const getModeLabel = () => {
    switch (activeMode) {
      case 'bars':
        return 'BARS';
      case 'wave':
        return 'WAVE';
      case 'particles':
        return 'PARTICLES';
      case 'hologram':
        return 'HOLOGRAM';
    }
  };

  const getModeIcon = () => {
    switch (activeMode) {
      case 'bars':
        return 'stats-chart';
      case 'wave':
        return 'pulse';
      case 'particles':
        return 'sparkles';
      case 'hologram':
        return 'disc';
    }
  };

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Visualizer Mode Header & Info */}
      <View style={styles.topRow}>
        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isPlaying ? accentColor : colors.textMuted },
            ]}
          />
          <Text style={styles.statusLabel}>
            {isPlaying ? `CYBER ${getModeLabel()} ACTIVE` : 'PAUSED'}
          </Text>
        </View>

        {showControls && (
          <TouchableOpacity
            style={styles.modeTogglePill}
            onPress={handleToggle}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={getModeIcon()}
              size={12}
              color={accentColor}
            />
            <Text style={[styles.modeToggleText, { color: accentColor }]}>
              {getModeLabel()}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Dynamic Spectrum Canvas */}
      <View style={[styles.canvas, { height: availableHeight }]}>
        {/* Subtle grid background lines for studio look */}
        <View style={styles.gridLineTop} />
        <View style={styles.gridLineMid} />

        {activeMode === 'particles' ? (
          <View style={styles.particlesContainer}>
            {bars.map((barAnim, idx) => {
              const particleColor = SPECTRUM_COLORS[idx % SPECTRUM_COLORS.length];
              return (
                <VisualizerParticleItem
                  key={`particle-${idx}`}
                  anim={barAnim}
                  color={particleColor}
                  index={idx}
                  total={bars.length}
                  containerSize={Math.min(width, availableHeight)}
                />
              );
            })}
          </View>
        ) : activeMode === 'hologram' ? (
          <View style={styles.hologramContainer}>
            {[bars[0], bars[4], bars[8], bars[12]].map((ringAnim, rIdx) => (
              <VisualizerHologramRing
                key={`holo-ring-${rIdx}`}
                ringAnim={ringAnim}
                index={rIdx}
                color={rIdx % 2 === 0 ? accentColor : secondaryColor}
                maxRadius={Math.min(width, availableHeight) * 0.45}
              />
            ))}
          </View>
        ) : (
          <View style={styles.barsContainer}>
            {bars.map((barAnim, idx) => {
              const barColor = SPECTRUM_COLORS[idx % SPECTRUM_COLORS.length];
              const peakAnim = peaks[idx];

              return (
                <VisualizerBarItem
                  key={`vbar-${idx}`}
                  barAnim={barAnim}
                  peakAnim={peakAnim}
                  barWidth={barWidth}
                  maxHeight={availableHeight - 12}
                  color={barColor}
                  isWaveMode={activeMode === 'wave'}
                />
              );
            })}
          </View>
        )}
      </View>

      {/* Frequency Range Footer Labels (Sub -> Air) */}
      <View style={styles.frequencyFooter}>
        <Text style={styles.freqLabel}>30Hz</Text>
        <Text style={styles.freqLabel}>500Hz</Text>
        <Text style={styles.freqLabel}>2kHz</Text>
        <Text style={styles.freqLabel}>8kHz</Text>
        <Text style={styles.freqLabel}>16kHz</Text>
      </View>
    </View>
  );
}

interface VisualizerBarItemProps {
  barAnim: SharedValue<number>;
  peakAnim: SharedValue<number>;
  barWidth: number;
  maxHeight: number;
  color: string;
  isWaveMode: boolean;
}

function VisualizerBarItem({
  barAnim,
  peakAnim,
  barWidth,
  maxHeight,
  color,
  isWaveMode,
}: VisualizerBarItemProps) {
  const animatedBarStyle = useAnimatedStyle(() => ({
    height: Math.max(3, barAnim.value * maxHeight),
  }));

  const animatedPeakStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(4, peakAnim.value * maxHeight) }],
  }));

  return (
    <View style={[styles.barColumn, { width: barWidth }]}>
      {/* Floating Peak Cap Indicator (Studio analyzer style) */}
      {!isWaveMode && (
        <Animated.View
          style={[
            styles.peakCap,
            {
              width: barWidth,
              backgroundColor: color,
              shadowColor: color,
            },
            animatedPeakStyle,
          ]}
        />
      )}

      {/* Main Reactive Meter Bar */}
      <Animated.View
        style={[
          styles.meterBar,
          {
            width: barWidth,
            backgroundColor: color,
            shadowColor: color,
            borderRadius: isWaveMode ? barWidth / 2 : 2,
          },
          animatedBarStyle,
        ]}
      />
    </View>
  );
}

interface VisualizerParticleItemProps {
  anim: SharedValue<number>;
  color: string;
  index: number;
  total: number;
  containerSize: number;
}

function VisualizerParticleItem({
  anim,
  color,
  index,
  total,
  containerSize,
}: VisualizerParticleItemProps) {
  const angle = (index / total) * 2 * Math.PI;
  const radius = containerSize * 0.35;
  const cx = containerSize / 2 + Math.cos(angle) * radius;
  const cy = containerSize / 2 + Math.sin(angle) * radius;

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 0.5 + anim.value * 1.5;
    const opacity = 0.3 + anim.value * 0.7;
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particleDot,
        {
          left: cx - 6,
          top: cy - 6,
          backgroundColor: color,
          shadowColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

interface VisualizerHologramRingProps {
  ringAnim: SharedValue<number>;
  index: number;
  color: string;
  maxRadius: number;
}

function VisualizerHologramRing({
  ringAnim,
  index,
  color,
  maxRadius,
}: VisualizerHologramRingProps) {
  const baseSize = (index + 1) * (maxRadius / 2);

  const animatedStyle = useAnimatedStyle(() => {
    const pulse = 1 + ringAnim.value * 0.35;
    const opacity = 0.3 + ringAnim.value * 0.6;
    return {
      transform: [{ scale: pulse }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.hologramRing,
        {
          width: baseSize,
          height: baseSize,
          borderRadius: baseSize / 2,
          borderColor: color,
          shadowColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'space-between',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  modeTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeToggleText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.5,
  },
  canvas: {
    width: '100%',
    position: 'relative',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  gridLineTop: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  gridLineMid: {
    position: 'absolute',
    top: '60%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
    paddingBottom: 2,
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  peakCap: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    borderRadius: 1,
    opacity: 0.9,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  meterBar: {
    opacity: 0.92,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 6,
    elevation: 4,
  },
  frequencyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: spacing.xs,
  },
  freqLabel: {
    fontSize: 8,
    color: colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  particlesContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  hologramContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  hologramRing: {
    position: 'absolute',
    borderWidth: 2,
  },
});
