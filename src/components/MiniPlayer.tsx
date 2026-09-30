import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { usePlayer } from '../context/PlayerContext';
import { useJam } from '../context/JamContext';
import { AnimatedEqualizer } from './AnimatedEqualizer';
import { SpotifyTouchable } from './SpotifyTouchable';
import { extractDominantColor, DEFAULT_DOMINANT_COLOR } from '../services/albumColors';
import { colors, spacing, borderRadius, typography } from '../theme';

/**
 * Persistent mini-player bar shown at the bottom of tab screens.
 * Features Spotify floating rounded bar (8px) tinted with dominant album color,
 * thin white progress line, swipe-up gesture, and tactile controls.
 */
export function MiniPlayer() {
  const { currentSong, isPlaying, togglePlayPause, skipNext, skipPrevious, positionMs, durationMs } = usePlayer();
  const { isInRoom, isHost, allowGuestPlayback, jamPlay, jamPause, jamSkipNext, jamSeek } = useJam();
  const canControlPlayback = !isInRoom || isHost || allowGuestPlayback;
  const router = useRouter();

  const [tintColor, setTintColor] = React.useState<string>('#282828');

  React.useEffect(() => {
    let active = true;
    if (currentSong?.imageUrl) {
      extractDominantColor(currentSong.imageUrl).then((c) => {
        if (active) {
          // Subtle blend of dominant color with Spotify dark surface
          setTintColor(`rgba(${c.r}, ${c.g}, ${c.b}, 0.24)`);
        }
      }).catch(() => {
        if (active) setTintColor('transparent');
      });
    } else {
      setTintColor('transparent');
    }
    return () => { active = false; };
  }, [currentSong?.imageUrl]);

  if (!currentSong) return null;

  const safePosition =
    typeof positionMs === 'number' && isFinite(positionMs) && !isNaN(positionMs)
      ? Math.max(0, positionMs)
      : 0;
  const safeDuration =
    typeof durationMs === 'number' && isFinite(durationMs) && !isNaN(durationMs)
      ? Math.max(0, durationMs)
      : 0;
  const safeProgress =
    safeDuration > 0 ? Math.min(1, Math.max(0, safePosition / safeDuration)) : 0;
  const progressPercent =
    typeof safeProgress === 'number' && isFinite(safeProgress) && !isNaN(safeProgress)
      ? safeProgress * 100
      : 0;

  const navigateToPlayer = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push('/player');
  };

  const handleSkipNext = () => {
    if (!canControlPlayback) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    if (isInRoom) {
      jamSkipNext();
    } else {
      skipNext();
    }
  };

  const handleSkipPrevious = () => {
    if (!canControlPlayback) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    if (isInRoom) {
      jamSeek(0);
    } else {
      skipPrevious();
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .activeOffsetX([-15, 15])
    .onEnd((e) => {
      // Swiping upward expands to player
      if (e.translationY < -15 || e.velocityY < -250) {
        runOnJS(navigateToPlayer)();
      } else if (e.translationX < -40 || e.velocityX < -400) {
        // Swipe left -> Next track
        runOnJS(handleSkipNext)();
      } else if (e.translationX > 40 || e.velocityX > 400) {
        // Swipe right -> Previous track
        runOnJS(handleSkipPrevious)();
      }
    });

  const handleToggle = () => {
    if (!canControlPlayback) return;
    if (isInRoom) {
      isPlaying ? jamPause() : jamPlay();
    } else {
      togglePlayPause();
    }
  };

  const innerContent = (
    <View style={styles.surface}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tintColor }]} pointerEvents="none" />
      <View style={styles.content}>
        {currentSong.imageUrl ? (
          <Image
            source={{ uri: currentSong.imageUrl }}
            style={styles.artwork}
          />
        ) : (
          <View style={[styles.artwork, { justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="musical-notes" size={18} color="#777777" />
          </View>
        )}
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
            <AnimatedEqualizer size={14} color={colors.accent} isPlaying={isPlaying} />
          </View>
        ) : null}

        {/* Play / Pause button */}
        <SpotifyTouchable
          onPress={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          style={styles.playButton}
          disabled={!canControlPlayback}
          activeScale={0.88}
          activeOpacity={0.85}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={22}
            color={colors.textPrimary}
          />
        </SpotifyTouchable>

        {/* Next Track button */}
        <SpotifyTouchable
          onPress={(e) => {
            e.stopPropagation();
            handleSkipNext();
          }}
          style={styles.nextButton}
          disabled={!canControlPlayback}
          activeScale={0.88}
          activeOpacity={0.85}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="play-skip-forward"
            size={20}
            color={colors.textSecondary}
          />
        </SpotifyTouchable>
      </View>

      {/* Spotify thin white progress line along the bottom */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
    </View>
  );

  return (
    <GestureDetector gesture={panGesture}>
      <SpotifyTouchable
        style={styles.container}
        onPress={navigateToPlayer}
        activeScale={0.98}
        activeOpacity={0.92}
      >
        {innerContent}
      </SpotifyTouchable>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 8,
    marginBottom: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  surface: {
    backgroundColor: '#282828',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  artwork: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#181818',
  },
  info: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  artist: {
    fontSize: 12,
    color: '#B3B3B3',
    fontWeight: '400',
  },
  jamBadge: {
    backgroundColor: colors.accentAlpha10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  eqContainer: {
    marginRight: spacing.sm,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  expandHint: {
    marginLeft: spacing.xs,
    opacity: 0.5,
  },
});
