import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { usePlayer } from '../context/PlayerContext';
import { useJam } from '../context/JamContext';
import { AnimatedEqualizer } from './AnimatedEqualizer';
import { colors, spacing, borderRadius, typography } from '../theme';

/**
 * Persistent mini-player bar shown at the bottom of tab screens.
 * Features progress line, skip-next button, swipe-up gesture to expand, and equalizer indicator.
 */
export function MiniPlayer() {
  const { currentSong, isPlaying, togglePlayPause, skipNext, positionMs, durationMs } = usePlayer();
  const { isInRoom } = useJam();
  const router = useRouter();

  if (!currentSong) return null;

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  const navigateToPlayer = () => {
    router.push('/player');
  };

  const panGesture = Gesture.Pan()
    .activeOffsetY([-15, 15])
    .onEnd((e) => {
      if (e.translationY < -20) {
        runOnJS(navigateToPlayer)();
      }
    });

  const handleToggle = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    togglePlayPause();
  };

  const handleSkipNext = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    skipNext();
  };

  return (
    <GestureDetector gesture={panGesture}>
      <TouchableOpacity
        style={styles.container}
        onPress={navigateToPlayer}
        activeOpacity={0.94}
      >
        {/* Progress line at the top */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.content}>
          <Image
            source={{ uri: currentSong.imageUrl }}
            style={styles.artwork}
          />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {currentSong.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentSong.artist}
            </Text>
          </View>

          {/* Jam badge or equalizer */}
          {isInRoom ? (
            <View style={styles.jamBadge}>
              <Ionicons name="radio" size={12} color={colors.accent} />
            </View>
          ) : isPlaying ? (
            <View style={styles.eqContainer}>
              <AnimatedEqualizer size={14} color={colors.accent} />
            </View>
          ) : null}

          {/* Play / Pause button */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            style={styles.playButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color={colors.textPrimary}
            />
          </TouchableOpacity>

          {/* Next Track button */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleSkipNext();
            }}
            style={styles.nextButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="play-skip-forward"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Expand hint */}
          <Ionicons
            name="chevron-up"
            size={16}
            color={colors.textSecondary}
            style={styles.expandHint}
          />
        </View>
      </TouchableOpacity>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundElevated,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  progressTrack: {
    height: 2.5,
    backgroundColor: colors.backgroundInput,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.backgroundInput,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  artist: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  jamBadge: {
    backgroundColor: colors.accentAlpha10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  eqContainer: {
    marginRight: spacing.sm,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  expandHint: {
    marginLeft: spacing.xs,
    opacity: 0.6,
  },
});
