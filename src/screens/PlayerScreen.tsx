import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { usePlayer } from '../context/PlayerContext';
import { useJam } from '../context/JamContext';
import { useQueue } from '../context/QueueContext';
import { useLibrary } from '../context/LibraryContext';
import { ProgressBar } from '../components/ProgressBar';
import { AvatarRow } from '../components/AvatarRow';
import { extractDominantColor, DEFAULT_DOMINANT_COLOR, RGBColor } from '../services/albumColors';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ART_SIZE = SCREEN_WIDTH - 96;

/**
 * Full-screen player modal with album art, controls, heart, dominant color tint, and Jam info.
 */
export default function PlayerScreen() {
  const {
    currentSong,
    isPlaying,
    positionMs,
    durationMs,
    togglePlayPause,
    seekTo,
    skipNext,
    skipPrevious,
  } = usePlayer();
  const { isInRoom, memberCount, jamPlay, jamPause, jamSeek } = useJam();
  const { shuffle, repeatMode, toggleShuffle, cycleRepeatMode } = useQueue();
  const { isLiked: checkIsLiked, toggleLike } = useLibrary();
  const router = useRouter();

  // Dominant artwork color
  const [artColor, setArtColor] = useState<RGBColor>(DEFAULT_DOMINANT_COLOR);

  // Album art scale animation
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  // Heart bounce
  const heartScale = useRef(new RNAnimated.Value(1)).current;

  // Extract color whenever current song changes
  useEffect(() => {
    if (currentSong?.imageUrl) {
      extractDominantColor(currentSong.imageUrl).then(setArtColor);
    } else {
      setArtColor(DEFAULT_DOMINANT_COLOR);
    }
  }, [currentSong?.imageUrl]);

  // Album art pulse when playing
  useEffect(() => {
    if (isPlaying) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(scaleAnim, {
            toValue: 1.025,
            duration: 2200,
            useNativeDriver: true,
          }),
          RNAnimated.timing(scaleAnim, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.stopAnimation();
      RNAnimated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isPlaying, scaleAnim]);

  const isLiked = currentSong ? checkIsLiked(currentSong.id) : false;

  const handleToggleLike = async () => {
    if (!currentSong) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    RNAnimated.sequence([
      RNAnimated.timing(heartScale, { toValue: 1.4, duration: 150, useNativeDriver: true }),
      RNAnimated.timing(heartScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    await toggleLike(currentSong);
  };

  const handlePlayPause = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (isInRoom) {
      isPlaying ? jamPause() : jamPlay();
    } else {
      togglePlayPause();
    }
  };

  const handleSeek = (ms: number) => {
    if (isInRoom) {
      jamSeek(ms);
    } else {
      seekTo(ms);
    }
  };

  const handleSkipNext = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (!isInRoom) {
      skipNext();
    }
  };

  const handleSkipPrevious = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (isInRoom) {
      jamSeek(0);
    } else {
      skipPrevious();
    }
  };

  const dismissModal = () => {
    router.back();
  };

  const dismissGesture = Gesture.Pan()
    .activeOffsetY([10, 40])
    .onEnd((e) => {
      if (e.translationY > 40) {
        runOnJS(dismissModal)();
      }
    });

  if (!currentSong) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-down" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-note-outline" size={64} color={colors.textSecondary} style={{ opacity: 0.4 }} />
          <Text style={styles.emptyText}>No song playing</Text>
        </View>
      </View>
    );
  }

  const dynamicGlowColor = `rgb(${artColor.r}, ${artColor.g}, ${artColor.b})`;
  const dynamicTint = `rgba(${artColor.r}, ${artColor.g}, ${artColor.b}, 0.12)`;
  const dynamicBlob = `rgba(${artColor.r}, ${artColor.g}, ${artColor.b}, 0.28)`;

  return (
    <View style={styles.container}>
      {/* Background tint overlay */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: dynamicTint }]} />
      {/* Ambient background glow circle */}
      <View
        style={[
          styles.glowBlob,
          {
            backgroundColor: dynamicBlob,
            shadowColor: dynamicGlowColor,
          },
        ]}
      />

      {/* Top Handle with pull-down gesture to dismiss */}
      <GestureDetector gesture={dismissGesture}>
        <View style={styles.handleContainer}>
          <View style={styles.handleBar} />
        </View>
      </GestureDetector>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-down" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {isInRoom ? (
            <View style={styles.jamIndicator}>
              <Ionicons name="radio" size={14} color={colors.accent} />
              <Text style={styles.jamIndicatorText}>In Jam</Text>
            </View>
          ) : (
            <Text style={styles.headerTitle}>Now Playing</Text>
          )}
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Album art with pulse animation and dynamic glow */}
      <View style={styles.artContainer}>
        <RNAnimated.View
          style={[
            styles.artShadow,
            {
              shadowColor: dynamicGlowColor,
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.55,
              shadowRadius: 28,
              elevation: 16,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image
            source={{ uri: currentSong.imageUrl }}
            style={styles.artwork}
          />
        </RNAnimated.View>
      </View>

      {/* Song info + Like button */}
      <View style={styles.infoRow}>
        <View style={styles.infoContainer}>
          <Text style={styles.songTitle} numberOfLines={2}>
            {currentSong.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {currentSong.artist}
          </Text>
        </View>
        <RNAnimated.View style={{ transform: [{ scale: heartScale }] }}>
          <TouchableOpacity onPress={handleToggleLike} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={28}
              color={isLiked ? '#F87171' : colors.textSecondary}
            />
          </TouchableOpacity>
        </RNAnimated.View>
      </View>

      {/* Progress bar */}
      <ProgressBar
        positionMs={positionMs}
        durationMs={durationMs}
        onSeek={handleSeek}
      />

      {/* Controls */}
      <View style={styles.controls}>
        {/* Shuffle */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={toggleShuffle}
          disabled={isInRoom}
        >
          <Ionicons
            name="shuffle"
            size={22}
            color={shuffle && !isInRoom ? colors.accent : colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Previous */}
        <TouchableOpacity style={styles.controlButton} onPress={handleSkipPrevious}>
          <Ionicons name="play-skip-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Play / Pause */}
        <TouchableOpacity
          style={[styles.playButton, shadows.lavenderGlow]}
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={32}
            color={colors.background}
            style={!isPlaying ? { marginLeft: 3 } : undefined}
          />
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity
          style={[styles.controlButton, isInRoom && { opacity: 0.4 }]}
          onPress={handleSkipNext}
          disabled={isInRoom}
        >
          <Ionicons name="play-skip-forward" size={28} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Repeat */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={cycleRepeatMode}
          disabled={isInRoom}
        >
          <View style={styles.repeatButtonContainer}>
            <Ionicons
              name="repeat"
              size={22}
              color={repeatMode !== 'off' && !isInRoom ? colors.accent : colors.textSecondary}
            />
            {repeatMode === 'one' && !isInRoom && (
              <View style={styles.repeatBadge}>
                <Text style={styles.repeatBadgeText}>1</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Jam room info */}
      {isInRoom && memberCount > 0 && (
        <View style={styles.jamInfo}>
          <View style={styles.jamBadge}>
            <Ionicons name="people" size={14} color={colors.accent} />
            <Text style={styles.jamBadgeText}>{memberCount} listening</Text>
          </View>
          <AvatarRow count={memberCount} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glowBlob: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    width: ART_SIZE * 0.85,
    height: ART_SIZE * 0.85,
    borderRadius: (ART_SIZE * 0.85) / 2,
    opacity: 0.35,
    shadowRadius: 50,
    shadowOpacity: 0.6,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 38,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: colors.textSecondary + '40',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  jamIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentAlpha10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  jamIndicatorText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.accent,
  },
  artContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  artShadow: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundInput,
  },
  artwork: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: borderRadius.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
  },
  infoContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  songTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  songArtist: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xl,
  },
  secondaryButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatButtonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: colors.accent,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.background,
  },
  controlButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jamInfo: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    gap: spacing.md,
  },
  jamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  jamBadgeText: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
    fontWeight: typography.weights.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
});
