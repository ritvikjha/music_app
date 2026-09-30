import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Share,
  Animated as RNAnimated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SpotifyTouchable } from '../components/SpotifyTouchable';
import { usePlayer } from '../context/PlayerContext';
import { useJam } from '../context/JamContext';
import { useQueue } from '../context/QueueContext';
import { useLibrary } from '../context/LibraryContext';
import { useSleepTimer } from '../context/SleepTimerContext';
import { ProgressBar } from '../components/ProgressBar';
import { AvatarRow } from '../components/AvatarRow';
import { SleepTimerModal } from '../components/SleepTimerModal';
import { QueueModal } from '../components/QueueModal';
import { LyricsModal } from '../components/LyricsModal';
import { SoundPresetsModal } from '../components/SoundPresetsModal';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { InteractiveArtwork } from '../components/InteractiveArtwork';
import { OfflineStatusPill } from '../components/OfflineStatusPill';
import { useKeepAwake } from 'expo-keep-awake';
import { extractDominantColor, DEFAULT_DOMINANT_COLOR, RGBColor } from '../services/albumColors';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ART_SIZE = Math.min(SCREEN_WIDTH - 64, SCREEN_HEIGHT > 720 ? 320 : 260);

/**
 * Full-screen player modal with album art, controls, heart, dominant color tint, and Jam info.
 */
export default function PlayerScreen() {
  useKeepAwake();
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
  const { isInRoom, isHost, allowGuestPlayback, memberCount, jamPlay, jamPause, jamSeek, jamSkipNext } = useJam();
  const { shuffle, repeatMode, toggleShuffle, cycleRepeatMode, upcomingQueue } = useQueue();
  const { isLiked: checkIsLiked, toggleLike } = useLibrary();
  const { isActive: sleepTimerActive, remainingMs, timerLabel } = useSleepTimer();
  const router = useRouter();

  // Modals state
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showSoundPresets, setShowSoundPresets] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

  // Dominant artwork color with guaranteed fallback
  const [artColor, setArtColor] = useState<RGBColor>(DEFAULT_DOMINANT_COLOR);

  // Heart bounce
  const heartScale = useRef(new RNAnimated.Value(1)).current;
  // Play button pulse aura
  const playPulse = useRef(new RNAnimated.Value(1)).current;

  // Extract color whenever current song changes safely
  useEffect(() => {
    let isMounted = true;
    if (currentSong?.imageUrl) {
      extractDominantColor(currentSong.imageUrl)
        .then((col) => {
          if (isMounted) setArtColor(col || DEFAULT_DOMINANT_COLOR);
        })
        .catch(() => {
          if (isMounted) setArtColor(DEFAULT_DOMINANT_COLOR);
        });
    } else {
      setArtColor(DEFAULT_DOMINANT_COLOR);
    }
    return () => {
      isMounted = false;
    };
  }, [currentSong?.imageUrl]);

  // Pulse play button aura when actively playing
  useEffect(() => {
    if (isPlaying) {
      const pulseAnimation = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(playPulse, {
            toValue: 1.2,
            duration: 1200,
            useNativeDriver: true,
          }),
          RNAnimated.timing(playPulse, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      playPulse.setValue(1);
    }
  }, [isPlaying, playPulse]);

  const isLiked = currentSong ? checkIsLiked(currentSong.id) : false;
  const canControlPlayback = !isInRoom || isHost || allowGuestPlayback;

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
    if (!canControlPlayback) return;
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
    if (!canControlPlayback) return;
    if (isInRoom) {
      jamSeek(ms);
    } else {
      seekTo(ms);
    }
  };

  const handleSkipNext = () => {
    if (!canControlPlayback) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (isInRoom) {
      jamSeek(0);
    } else {
      skipPrevious();
    }
  };

  const handleShare = async () => {
    if (!currentSong) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `Listening to "${currentSong.title}" by ${currentSong.artist} on Jam! 🎵\n\nListen along on Jam Music: ${currentSong.streamUrl || 'https://www.jiosaavn.com'}`,
        title: currentSong.title,
      });
    } catch (err) {
      console.warn('[PlayerScreen] Share error:', err);
    }
  };

  const dismissModal = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.back();
  };

  if (!currentSong) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-down" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconRing}>
            <Ionicons name="disc" size={54} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>NO TRACK LOADED</Text>
          <Text style={styles.emptyText}>Pick a track from Trending Hits or explore your Liked Songs library.</Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              router.push('/(tabs)/home');
            }}
            activeOpacity={0.82}
          >
            <Ionicons name="flash" size={16} color="#000000" />
            <Text style={styles.emptyCtaText}>DISCOVER MUSIC</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const safeArtColor =
    artColor && typeof artColor.r === 'number' && typeof artColor.g === 'number' && typeof artColor.b === 'number'
      ? artColor
      : DEFAULT_DOMINANT_COLOR;
  const dynamicGlowColor = `rgb(${safeArtColor.r}, ${safeArtColor.g}, ${safeArtColor.b})`;

  return (
    <View style={styles.container}>
      {/* JS-only layered ambient backdrop fading to Spotify dark surface (#121212) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '55%',
            backgroundColor: `rgb(${safeArtColor.r}, ${safeArtColor.g}, ${safeArtColor.b})`,
            opacity: 0.28,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: '25%',
            left: 0,
            right: 0,
            height: '35%',
            backgroundColor: '#121212',
            opacity: 0.55,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: '45%',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#121212',
            opacity: 0.88,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: '60%',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#121212',
          }}
        />
      </View>

      {/* Top Handle with tap to dismiss */}
      <TouchableOpacity
        onPress={dismissModal}
        style={styles.handleContainer}
        hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
        activeOpacity={0.7}
      >
        <View style={styles.handleBar} />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={dismissModal} style={styles.backButton}>
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
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setShowSoundPresets(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="options-outline" size={21} color={colors.accent} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setShowSleepTimer(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={sleepTimerActive ? 'moon' : 'moon-outline'}
              size={21}
              color={sleepTimerActive ? colors.accent : colors.textSecondary}
            />
            {sleepTimerActive && <View style={styles.sleepTimerDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Stash Resilience Indicator */}
      <OfflineStatusPill />

      {/* Interactive Album Artwork with Vinyl Slide-Out, Pulse on Play/Pause & Swipe to Skip */}
      <View style={styles.artworkContainer}>
        <InteractiveArtwork
          imageUrl={currentSong.imageUrl}
          songTitle={currentSong.title}
          artist={currentSong.artist}
          isPlaying={isPlaying}
          artColor={artColor}
          size={ART_SIZE}
          onSkipNext={isInRoom ? jamSkipNext : () => skipNext()}
          onSkipPrevious={skipPrevious}
          onCollapse={dismissModal}
        />
      </View>

      {/* Song info + Like button */}
      <View style={styles.infoRow}>
        <View style={styles.infoContainer}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <View style={styles.songMetaLinks}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/artist/[id]', params: { id: currentSong.artistId || currentSong.artist } })}
              activeOpacity={0.7}
            >
              <Text style={styles.songArtist} numberOfLines={1}>{currentSong.artist}</Text>
            </TouchableOpacity>
            {currentSong.album ? (
              <>
                <Text style={styles.songMetaDot}>·</Text>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/album/[id]', params: { id: currentSong.albumId || currentSong.album } })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.songArtist} numberOfLines={1}>{currentSong.album}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
          <View style={styles.metaBadgeRow}>
            <TouchableOpacity
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setShowSoundPresets(true);
              }}
              activeOpacity={0.75}
              style={styles.audioBadge}
            >
              <Ionicons name="sparkles" size={10} color={colors.accent} style={{ marginRight: 3 }} />
              <Text style={styles.audioBadgeText}>320 KBPS HD</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setShowSoundPresets(true);
              }}
              activeOpacity={0.75}
              style={styles.audioBadge}
            >
              <Text style={styles.audioBadgeText}>EQUALIZER</Text>
            </TouchableOpacity>
            {sleepTimerActive && (
              <TouchableOpacity
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setShowSleepTimer(true);
                }}
                activeOpacity={0.75}
                style={[styles.audioBadge, { borderColor: colors.accentAlpha25, backgroundColor: colors.accentAlpha10 }]}
              >
                <Ionicons name="moon" size={10} color={colors.accent} style={{ marginRight: 3 }} />
                <Text style={[styles.audioBadgeText, { color: colors.accent }]}>
                  {timerLabel || `${Math.ceil(remainingMs / 60000)}m`}
                </Text>
              </TouchableOpacity>
            )}
            {isInRoom && (
              <View style={[styles.audioBadge, styles.liveSyncBadge]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveSyncText}>LIVE JAM</Text>
              </View>
            )}
          </View>
        </View>
        <RNAnimated.View style={{ transform: [{ scale: heartScale }] }}>
          <TouchableOpacity
            style={styles.heartButton}
            onPress={handleToggleLike}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={26}
              color={isLiked ? '#FF4D6D' : colors.textSecondary}
            />
          </TouchableOpacity>
        </RNAnimated.View>
      </View>

      {/* Progress bar with dynamic scrub bubble & glow */}
      <ProgressBar
        positionMs={positionMs}
        durationMs={durationMs}
        onSeek={handleSeek}
        accentColor={dynamicGlowColor}
      />

      {/* Floating Futuristic Playback Capsule */}
      <View style={styles.controlCapsule}>
        {/* Shuffle */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={toggleShuffle}
          disabled={isInRoom}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="shuffle"
            size={20}
            color={shuffle && !isInRoom ? colors.accent : colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Previous */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleSkipPrevious}
          disabled={!canControlPlayback}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="play-skip-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Play / Pause - Large white circle with black icon */}
        <View style={styles.playButtonWrapper}>
          <SpotifyTouchable
            style={styles.playButton}
            onPress={handlePlayPause}
            disabled={!canControlPlayback}
            activeScale={0.93}
            activeOpacity={0.88}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color="#000000"
              style={!isPlaying ? { marginLeft: 3 } : undefined}
            />
          </SpotifyTouchable>
        </View>

        {/* Next */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleSkipNext}
          disabled={!canControlPlayback}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="play-skip-forward" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Repeat */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={cycleRepeatMode}
          disabled={isInRoom}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.repeatButtonContainer}>
            <Ionicons
              name="repeat"
              size={20}
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

      {/* Action Row: Lyrics, Share, Playlist, Queue */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionPill}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            setShowLyrics(true);
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="mic-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.actionPillText}>Lyrics</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionPill}
          onPress={handleShare}
          activeOpacity={0.75}
        >
          <Ionicons name="share-social-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.actionPillText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionPill}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            setShowAddToPlaylist(true);
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="bookmark-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.actionPillText}>Playlist</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionPill}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            setShowQueue(true);
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="list-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.actionPillText}>Queue</Text>
          {upcomingQueue.length > 0 && (
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>{upcomingQueue.length}</Text>
            </View>
          )}
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

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        visible={showSleepTimer}
        onClose={() => setShowSleepTimer(false)}
      />

      {/* Queue Modal */}
      <QueueModal
        visible={showQueue}
        onClose={() => setShowQueue(false)}
      />

      {/* Lyrics Modal with Tap-To-Seek */}
      <LyricsModal
        visible={showLyrics}
        onClose={() => setShowLyrics(false)}
        song={currentSong}
        positionMs={positionMs}
        onSeek={handleSeek}
      />

      {/* Audio Sound Presets & Equalizer Modal */}
      <SoundPresetsModal
        visible={showSoundPresets}
        onClose={() => setShowSoundPresets(false)}
      />

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        visible={showAddToPlaylist}
        onClose={() => setShowAddToPlaylist(false)}
        song={currentSong}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  artworkContainer: {
    alignSelf: 'center',
    marginVertical: spacing.xs,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'transparent',
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sleepTimerDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  infoContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  songTitle: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  songArtist: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  songMetaLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  songMetaDot: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  audioBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  audioBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentAlpha10,
    borderColor: colors.accentAlpha25,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
  },
  liveSyncText: {
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
    color: colors.accent,
    letterSpacing: 0.5,
  },
  heartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlCapsule: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    backgroundColor: 'transparent',
    borderRadius: borderRadius.xl,
    borderWidth: 0,
  },
  secondaryButton: {
    width: 38,
    height: 38,
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
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282828',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full,
    borderWidth: 0,
    gap: 6,
  },
  actionPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  actionBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    marginLeft: 2,
  },
  actionBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  jamInfo: {
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  jamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  jamBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.accent,
    fontWeight: typography.weights.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentAlpha10,
    borderWidth: 1.5,
    borderColor: colors.accentAlpha25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  emptyCtaText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.extrabold,
    color: '#000000',
    letterSpacing: 0.6,
  },
  sleepTimerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
});
