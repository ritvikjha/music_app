import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { DynamicMusicVisualizer, VisualizerMode } from './DynamicMusicVisualizer';
import { RGBColor } from '../services/albumColors';
import { colors, spacing, borderRadius, typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface InteractiveArtworkProps {
  imageUrl?: string;
  songTitle?: string;
  artist?: string;
  isPlaying: boolean;
  artColor: RGBColor;
  size?: number;
  onSkipNext?: () => void;
  onSkipPrevious?: () => void;
  onCollapse?: () => void;
}

/**
 * InteractiveArtwork
 *
 * Implements:
 * 1. Realistic vinyl record slide-out animation when music is playing.
 * 2. 360-degree vinyl disc rotation synchronized with playback state.
 * 3. Tap-to-switch interaction between the vinyl album jacket and the DynamicMusicVisualizer.
 * 4. Ambient multi-layered glow matching the extracted album artwork dominant color.
 * 5. Fluid gesture controls: Horizontal swipe for track skip, vertical swipe down to collapse into MiniPlayer.
 * 6. High-performance memory-cached image rendering via expo-image.
 */
export function InteractiveArtwork({
  imageUrl,
  songTitle = 'Unknown Track',
  artist = 'Unknown Artist',
  isPlaying,
  artColor,
  size = Math.min(SCREEN_WIDTH - 64, 300),
  onSkipNext,
  onSkipPrevious,
  onCollapse,
}: InteractiveArtworkProps) {
  // Toggle between artwork sleeve ('artwork') and spectrum visualizer ('visualizer')
  const [activeView, setActiveView] = useState<'artwork' | 'visualizer'>('artwork');
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('bars');

  // Gestures for swipe track skipping & swipe-down collapse
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 15 || Math.abs(gestureState.dy) > 15;
      },
      onPanResponderRelease: (_, gestureState) => {
        // Horizontal swipe left -> skip next
        if (gestureState.dx < -50 && Math.abs(gestureState.dy) < 60) {
          if (onSkipNext) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {}
            onSkipNext();
          }
        }
        // Horizontal swipe right -> skip previous
        else if (gestureState.dx > 50 && Math.abs(gestureState.dy) < 60) {
          if (onSkipPrevious) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {}
            onSkipPrevious();
          }
        }
        // Vertical swipe down -> collapse player
        else if (gestureState.dy > 65 && Math.abs(gestureState.dx) < 60) {
          if (onCollapse) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            onCollapse();
          }
        }
      },
    })
  ).current;

  // Vinyl slide-out translation (0 = hidden behind sleeve, 1 = slid out)
  const slideProgress = useSharedValue(0);
  // Vinyl continuous rotation angle (0 to 360)
  const rotationAngle = useSharedValue(0);
  // Subtle sleeve breathing scale when playing
  const sleeveScale = useSharedValue(1);

  // Animate vinyl slide-out & rotation based on playback state
  useEffect(() => {
    if (isPlaying) {
      // Slide out vinyl ~38%
      slideProgress.value = withSpring(1, {
        damping: 14,
        stiffness: 90,
      });

      // Subtle jacket pulse
      sleeveScale.value = withRepeat(
        withTiming(1.018, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      );

      // Continuous vinyl rotation (one turn every 3.8s)
      rotationAngle.value = withRepeat(
        withTiming(360, {
          duration: 3800,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      // Slide vinyl back in (leave slight rim visible)
      slideProgress.value = withSpring(0.18, {
        damping: 16,
        stiffness: 110,
      });

      // Reset sleeve scale
      cancelAnimation(sleeveScale);
      sleeveScale.value = withTiming(1, { duration: 300 });

      // Pause rotation
      cancelAnimation(rotationAngle);
    }

    return () => {
      cancelAnimation(rotationAngle);
      cancelAnimation(sleeveScale);
    };
  }, [isPlaying, slideProgress, rotationAngle, sleeveScale]);

  // Handle tap on the artwork container to toggle between visualizer and sleeve
  const handleToggleView = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setActiveView((prev) => (prev === 'artwork' ? 'visualizer' : 'artwork'));
  };

  const sleeveSize = size * 0.82;
  const vinylSize = sleeveSize * 0.94;
  const maxSlideOffset = sleeveSize * 0.36;

  // Animated styles
  const vinylAnimatedStyle = useAnimatedStyle(() => {
    const translateX = slideProgress.value * maxSlideOffset;
    return {
      transform: [
        { translateX },
        { rotate: `${rotationAngle.value}deg` },
      ],
    };
  });

  const sleeveAnimatedStyle = useAnimatedStyle(() => {
    // Offset the sleeve slightly leftward when vinyl is out to keep overall composition centered
    const translateX = -slideProgress.value * (maxSlideOffset * 0.32);
    return {
      transform: [
        { translateX },
        { scale: sleeveScale.value },
      ],
    };
  });

  // Dynamic ambient glow strings with guaranteed fallback
  const safeArtColor =
    artColor && typeof artColor.r === 'number' && typeof artColor.g === 'number' && typeof artColor.b === 'number'
      ? artColor
      : { r: 184, g: 166, b: 230 };
  const dynamicGlowColor = `rgb(${safeArtColor.r}, ${safeArtColor.g}, ${safeArtColor.b})`;
  const dynamicBackdropBlob = `rgba(${safeArtColor.r}, ${safeArtColor.g}, ${safeArtColor.b}, 0.28)`;

  return (
    <View
      {...panResponder.panHandlers}
      style={[styles.outerContainer, { width: size + 24, height: size + 16 }]}
    >
      {/* ─── Ambient Dynamic Glow Layer ────────────────────────────────────── */}
      <View
        pointerEvents="none"
        style={[
          styles.ambientGlowBlob,
          {
            width: size * 0.92,
            height: size * 0.92,
            borderRadius: (size * 0.92) / 2,
            backgroundColor: dynamicBackdropBlob,
            shadowColor: dynamicGlowColor,
          },
        ]}
      />

      {/* ─── Interactive Touchable Canvas ──────────────────────────────────── */}
      <TouchableOpacity
        activeOpacity={0.94}
        onPress={handleToggleView}
        style={[styles.touchableArea, { width: size + 20, height: size }]}
      >
        {activeView === 'artwork' ? (
          <View style={styles.artworkComposition}>
            {/* 1. Realistic Black Vinyl Disc (Placed behind the sleeve) */}
            <Animated.View
              style={[
                styles.vinylDisc,
                {
                  width: vinylSize,
                  height: vinylSize,
                  borderRadius: vinylSize / 2,
                },
                vinylAnimatedStyle,
              ]}
            >
              {/* Concentric Grooves */}
              <View style={[styles.grooveRing, { width: '88%', height: '88%', borderRadius: vinylSize * 0.44 }]} />
              <View style={[styles.grooveRing, { width: '74%', height: '74%', borderRadius: vinylSize * 0.37 }]} />
              <View style={[styles.grooveRing, { width: '60%', height: '60%', borderRadius: vinylSize * 0.3 }]} />
              <View style={[styles.grooveRing, { width: '46%', height: '46%', borderRadius: vinylSize * 0.23 }]} />

              {/* Light Sheen / Reflection Highlights */}
              <View style={styles.sheenReflectionDiagonal} />

              {/* Center Record Label */}
              <View
                style={[
                  styles.centerLabel,
                  {
                    width: vinylSize * 0.34,
                    height: vinylSize * 0.34,
                    borderRadius: (vinylSize * 0.34) / 2,
                    borderColor: dynamicGlowColor,
                  },
                ]}
              >
                {imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0 ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.centerLabelImage}
                  />
                ) : (
                  <View style={styles.centerLabelFallback}>
                    <Ionicons name="musical-notes" size={14} color="#FFFFFF" />
                  </View>
                )}
                {/* Spindle Center Hole */}
                <View style={styles.spindleHole} />
              </View>
            </Animated.View>

            {/* 2. Main Album Jacket Sleeve */}
            <Animated.View
              style={[
                styles.albumSleeve,
                {
                  width: sleeveSize,
                  height: sleeveSize,
                  borderRadius: borderRadius.albumArt,
                  shadowColor: '#000',
                },
                sleeveAnimatedStyle,
              ]}
            >
              {imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0 ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={[
                    styles.sleeveCoverImage,
                    { borderRadius: borderRadius.albumArt },
                  ]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.sleeveFallback, { borderRadius: borderRadius.albumArt }]}>
                  <Ionicons name="disc" size={64} color={colors.accent} />
                </View>
              )}

              {/* Subtle metallic edge sheen on album jacket */}
              <View style={[styles.sleeveInnerBorder, { borderRadius: borderRadius.lg }]} />
            </Animated.View>
          </View>
        ) : (
          /* ─── Full-Frame Dynamic Music Visualizer View ───────────────────── */
          <View style={styles.visualizerWrapper}>
            <DynamicMusicVisualizer
              isPlaying={isPlaying}
              mode={visualizerMode}
              onToggleMode={setVisualizerMode}
              accentColor={dynamicGlowColor}
              secondaryColor={colors.accentSecondary}
              width={size}
              height={size}
              showControls={true}
            />
          </View>
        )}

        {/* ─── Floating View-Switcher Hint Badge ────────────────────────────── */}
        <View style={styles.switcherBadge}>
          <Ionicons
            name={activeView === 'artwork' ? 'stats-chart' : 'disc'}
            size={12}
            color={colors.textPrimary}
          />
          <Text style={styles.switcherBadgeText}>
            {activeView === 'artwork' ? 'Visualizer' : 'Cover'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: spacing.sm,
  },
  ambientGlowBlob: {
    position: 'absolute',
    alignSelf: 'center',
    opacity: 0.45,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.65,
    shadowRadius: 38,
    elevation: 12,
  },
  touchableArea: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  artworkComposition: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  albumSleeve: {
    backgroundColor: colors.backgroundElevated,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 26,
    elevation: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 2,
  },
  sleeveCoverImage: {
    width: '100%',
    height: '100%',
  },
  sleeveFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleeveInnerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  // Vinyl styling
  vinylDisc: {
    position: 'absolute',
    backgroundColor: '#0D0D11',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 8,
  },
  grooveRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sheenReflectionDiagonal: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    transform: [{ rotate: '45deg' }],
  },
  centerLabel: {
    backgroundColor: colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    position: 'relative',
  },
  centerLabelImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  centerLabelFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.accentSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spindleHole: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  visualizerWrapper: {
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherBadge: {
    position: 'absolute',
    bottom: -8,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(40, 40, 40, 0.95)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  switcherBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },
});
