import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { audioPlayer, DEFAULT_FALLBACK_ARTWORK } from '../services/audioPlayer';
import { offlineStorage } from '../services/offlineStorage';
import { syncManager } from '../services/playbackSyncManager';
import { getSongById, getRelatedSongs } from '../services/saavn';
import { useQueue } from './QueueContext';
import { useLibrary } from './LibraryContext';
import { CONFIG } from '../config';
import type { Song } from '../types';

interface PlayerContextValue {
  currentSong: Song | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  isLoading: boolean;
  crossfadeEnabled: boolean;
  setCrossfadeEnabled: (enabled: boolean) => void;

  playSong: (song: Song, opts?: { crossfade?: boolean }) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  skipNext: (opts?: { crossfade?: boolean }) => Promise<void>;
  skipPrevious: () => Promise<void>;

  stashTrack: (song: Song) => Promise<boolean>;
  isTrackStashed: (songId: string) => Promise<boolean>;

  /** Called by JamContext to force playback state from sync */
  _forceState: (opts: {
    songId: string;
    isPlaying: boolean;
    positionMs: number;
  }) => Promise<void>;

  /** Called by JamContext to inform PlayerContext of room state */
  setIsInJam: (inJam: boolean) => void;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(true);

  const { getNextSong, getPreviousSong, recordPlayedSong, repeatMode, autoplay, addSongsToQueue } = useQueue();
  const { addRecent, toggleLike, recordTrackStarted, recordListeningTime } = useLibrary();

  // Track whether we're in a jam room
  const isInJamRef = useRef(false);
  const positionMsRef = useRef(0);
  const repeatModeRef = useRef(repeatMode);
  const currentSongRef = useRef(currentSong);
  const autoplayRef = useRef(autoplay);
  const isFetchingAutoplayRef = useRef(false);
  const isSyncingRef = useRef(false);
  const lastProgressRef = useRef<{ songId: string | null; positionMs: number } | null>(null);
  const audiblePlayMsRef = useRef(0);
  const countedPlaySongRef = useRef<string | null>(null);

  positionMsRef.current = positionMs;
  repeatModeRef.current = repeatMode;
  currentSongRef.current = currentSong;
  autoplayRef.current = autoplay;

  const setIsInJam = useCallback((inJam: boolean) => {
    isInJamRef.current = inJam;
  }, []);

  // Subscribe to audio status updates
  useEffect(() => {
    const unsubscribe = audioPlayer.onStatusUpdate((status) => {
      if (isSyncingRef.current) return;
      setIsPlaying(status.isPlaying);
      setPositionMs(status.positionMillis ?? 0);
      setDurationMs(status.durationMillis ?? 0);
      const nextPosition = status.positionMillis ?? 0;
      const songId = currentSongRef.current?.id ?? null;
      const previous = lastProgressRef.current;
      if (previous?.songId !== songId) {
        audiblePlayMsRef.current = 0;
        countedPlaySongRef.current = null;
      }
      if (status.isPlaying && previous?.songId === songId && songId) {
        const elapsed = nextPosition - previous.positionMs;
        if (elapsed > 0 && elapsed <= 3000) {
          recordListeningTime(elapsed);
          audiblePlayMsRef.current += elapsed;
          if (audiblePlayMsRef.current >= 10000 && countedPlaySongRef.current !== songId) {
            const playedSong = currentSongRef.current;
            if (playedSong) recordTrackStarted(playedSong);
            countedPlaySongRef.current = songId;
          }
        }
      }
      lastProgressRef.current = { songId, positionMs: nextPosition };
    });
    return unsubscribe;
  }, [recordListeningTime, recordTrackStarted]);

  // Keep lock screen & notification metadata synchronized with currentSong
  useEffect(() => {
    if (currentSong) {
      audioPlayer.updateMetadata({
        title: currentSong.title || 'Unknown Title',
        artist: currentSong.artist || 'Unknown Artist',
        albumTitle: currentSong.album || currentSong.title || 'Jam Music',
        artworkUrl: currentSong.imageUrl || DEFAULT_FALLBACK_ARTWORK,
      });
    }
  }, [currentSong]);

  // Broadcast real-time "Listening To..." presence across squad and rooms
  useEffect(() => {
    AsyncStorage.getItem('@jam_user').then((userJson) => {
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          syncManager.emitPresenceUpdate({
            username: user.username,
            tag: user.tag,
            currentSong: currentSong
              ? { title: currentSong.title, artist: currentSong.artist, imageUrl: currentSong.imageUrl }
              : null,
            isPlaying,
            roomId: isInJamRef.current ? syncManager.roomId : null,
          });
        } catch {}
      }
    });
  }, [currentSong, isPlaying]);

  const playSong = useCallback(
    async (song: Song, opts?: { crossfade?: boolean }) => {
      setIsLoading(true);
      setCurrentSong(song);
      recordPlayedSong(song);
      addRecent(song);

      try {
        // Check if track is stashed in local flash storage for instant zero-data playback
        const playbackUri = await offlineStorage.getPlaybackUri(song);
        const metadata = {
          title: song.title || 'Unknown Title',
          artist: song.artist || 'Unknown Artist',
          albumTitle: song.album || song.title || 'Jam Music',
          artworkUrl: song.imageUrl || DEFAULT_FALLBACK_ARTWORK,
        };

        if (opts?.crossfade && crossfadeEnabled && isPlaying) {
          await audioPlayer.crossfadeTo(playbackUri, metadata, 2500);
        } else {
          await audioPlayer.loadAndPlay(playbackUri, metadata);
        }
      } catch (error) {
        console.error('[Player] Failed to play song:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [recordPlayedSong, addRecent, recordTrackStarted, crossfadeEnabled, isPlaying]
  );

  const play = useCallback(async () => {
    await audioPlayer.play();
  }, []);

  const pause = useCallback(async () => {
    await audioPlayer.pause();
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await audioPlayer.pause();
    } else {
      await audioPlayer.play();
    }
  }, [isPlaying]);

  const seekTo = useCallback(async (ms: number) => {
    await audioPlayer.seekTo(ms);
  }, []);

  const stashTrack = useCallback(async (song: Song): Promise<boolean> => {
    try {
      await offlineStorage.stashTrack(song);
      return true;
    } catch (e) {
      console.warn('[Player] Stash error:', e);
      return false;
    }
  }, []);

  const isTrackStashed = useCallback(async (songId: string): Promise<boolean> => {
    return offlineStorage.isStashed(songId);
  }, []);

  const skipNext = useCallback(async (opts?: { crossfade?: boolean }) => {
    const nextSong = getNextSong();
    if (nextSong) {
      await playSong(nextSong, { crossfade: opts?.crossfade ?? crossfadeEnabled });
      return;
    }

    // If queue reached the end, check if Smart Autoplay / Endless Radio is active
    if (
      autoplayRef.current &&
      !isInJamRef.current &&
      currentSongRef.current &&
      !isFetchingAutoplayRef.current
    ) {
      isFetchingAutoplayRef.current = true;
      try {
        const related = await getRelatedSongs(currentSongRef.current, 8);
        if (related.length > 0) {
          addSongsToQueue(related);
          const [firstSong] = related;
          await playSong(firstSong);
          return;
        }
      } catch (err) {
        console.warn('[PlayerContext] Autoplay error:', err);
      } finally {
        isFetchingAutoplayRef.current = false;
      }
    }

    await audioPlayer.pause();
  }, [getNextSong, playSong, addSongsToQueue]);

  const skipPrevious = useCallback(async () => {
    // If more than 3 seconds into the track, restart it
    if (positionMsRef.current > 3000) {
      await audioPlayer.seekTo(0);
      return;
    }

    const prevSong = getPreviousSong();
    if (prevSong) {
      await playSong(prevSong);
    } else {
      await audioPlayer.seekTo(0);
    }
  }, [getPreviousSong, playSong]);

  // Handle automatic track advancement when track ends
  useEffect(() => {
    const unsubscribe = audioPlayer.onTrackEnd(() => {
      // In a Jam room, playback stays manually driven (sync conflict avoidance)
      if (isInJamRef.current) return;

      if (repeatModeRef.current === 'one') {
        audioPlayer.seekTo(0).then(() => audioPlayer.play());
      } else {
        skipNext();
      }
    });

    return unsubscribe;
  }, [skipNext]);

  // Bind remote lock screen & notification action handlers (play, pause, next, prev, seek, like)
  const toggleLikeRef = useRef(toggleLike);
  toggleLikeRef.current = toggleLike;
  const skipNextRef = useRef(skipNext);
  skipNextRef.current = skipNext;
  const skipPreviousRef = useRef(skipPrevious);
  skipPreviousRef.current = skipPrevious;
  const playRef = useRef(play);
  playRef.current = play;
  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  const seekToRef = useRef(seekTo);
  seekToRef.current = seekTo;

  useEffect(() => {
    audioPlayer.setMediaControlHandlers({
      onPlay: () => playRef.current(),
      onPause: () => pauseRef.current(),
      onNext: () => skipNextRef.current(),
      onPrevious: () => skipPreviousRef.current(),
      onSeek: (ms) => seekToRef.current(ms),
      onToggleLike: () => {
        if (currentSongRef.current) {
          toggleLikeRef.current(currentSongRef.current);
        }
      },
    });
  }, []);

  /**
   * Force the player into a specific state — used by JamContext
   * when receiving sync-state from the server.
   * Sets isSyncingRef to suppress local status callbacks during the operation.
   */
  const _forceState = useCallback(
    async (opts: { songId: string; isPlaying: boolean; positionMs: number }) => {
      isSyncingRef.current = true;
      try {
        // If the song changed, load the new one
        if (currentSongRef.current?.id !== opts.songId && opts.songId) {
          setIsLoading(true);
          try {
            const song = await getSongById(opts.songId);
            if (song) {
              setCurrentSong(song);
              currentSongRef.current = song;
              await audioPlayer.loadAndPlay(song.streamUrl, {
                title: song.title || 'Unknown Title',
                artist: song.artist || 'Unknown Artist',
                albumTitle: song.album || song.title || 'Jam Music',
                artworkUrl: song.imageUrl || DEFAULT_FALLBACK_ARTWORK,
              });
              addRecent(song);
              await audioPlayer.seekTo(opts.positionMs);
              if (!opts.isPlaying) {
                await audioPlayer.pause();
              }
            }
          } catch (error) {
            console.error('[Player] Failed to force song change:', error);
          } finally {
            setIsLoading(false);
          }
        } else {
          // Same song — only seek if drift exceeds tolerance
          const drift = Math.abs(positionMsRef.current - opts.positionMs);
          if (drift > CONFIG.DRIFT_TOLERANCE_MS) {
            await audioPlayer.seekTo(opts.positionMs);
          }
          // Only toggle play state if it actually differs
          const currentStatus = await audioPlayer.getStatus();
          const locallyPlaying = currentStatus?.isPlaying ?? false;
          if (opts.isPlaying && !locallyPlaying) {
            await audioPlayer.play();
          } else if (!opts.isPlaying && locallyPlaying) {
            await audioPlayer.pause();
          }
        }
        // Update React state to match server truth
        setIsPlaying(opts.isPlaying);
        setPositionMs(opts.positionMs);
      } finally {
        // Allow a short settling period before re-enabling status callbacks
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 150);
      }
    },
    [recordTrackStarted, addRecent]
  );

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        positionMs,
        durationMs,
        isLoading,
        crossfadeEnabled,
        setCrossfadeEnabled,
        playSong,
        play,
        pause,
        togglePlayPause,
        seekTo,
        skipNext,
        skipPrevious,
        stashTrack,
        isTrackStashed,
        _forceState,
        setIsInJam,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within a PlayerProvider');
  return ctx;
}
