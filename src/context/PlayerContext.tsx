import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { audioPlayer } from '../services/audioPlayer';
import { getSongById } from '../services/saavn';
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

  playSong: (song: Song) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;

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

  const { getNextSong, getPreviousSong, recordPlayedSong, repeatMode } = useQueue();
  const { addRecent } = useLibrary();

  // Track whether we're in a jam room
  const isInJamRef = useRef(false);
  const positionMsRef = useRef(0);
  const repeatModeRef = useRef(repeatMode);
  const currentSongRef = useRef(currentSong);
  // Guard: when true, audioPlayer status updates are ignored to prevent feedback loops
  const isSyncingRef = useRef(false);

  positionMsRef.current = positionMs;
  repeatModeRef.current = repeatMode;
  currentSongRef.current = currentSong;

  const setIsInJam = useCallback((inJam: boolean) => {
    isInJamRef.current = inJam;
  }, []);

  // Subscribe to audio status updates
  useEffect(() => {
    const unsubscribe = audioPlayer.onStatusUpdate((status) => {
      // Skip status updates while _forceState is actively syncing
      // to prevent feedback loops (local status → re-render → resync → repeat)
      if (isSyncingRef.current) return;
      setIsPlaying(status.isPlaying);
      setPositionMs(status.positionMillis ?? 0);
      setDurationMs(status.durationMillis ?? 0);
    });
    return unsubscribe;
  }, []);

  // Keep lock screen & notification metadata synchronized with currentSong
  useEffect(() => {
    if (currentSong) {
      audioPlayer.updateMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        albumTitle: currentSong.album || undefined,
        artworkUrl: currentSong.imageUrl || undefined,
      });
    }
  }, [currentSong]);

  const playSong = useCallback(
    async (song: Song) => {
      setIsLoading(true);
      setCurrentSong(song);
      recordPlayedSong(song);
      addRecent(song);

      try {
        await audioPlayer.loadAndPlay(song.streamUrl, {
          title: song.title,
          artist: song.artist,
          albumTitle: song.album || undefined,
          artworkUrl: song.imageUrl || undefined,
        });
      } catch (error) {
        console.error('[Player] Failed to play song:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [recordPlayedSong, addRecent]
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

  const skipNext = useCallback(async () => {
    const nextSong = getNextSong();
    if (nextSong) {
      await playSong(nextSong);
    } else {
      await audioPlayer.pause();
    }
  }, [getNextSong, playSong]);

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
                title: song.title,
                artist: song.artist,
                albumTitle: song.album || undefined,
                artworkUrl: song.imageUrl || undefined,
              });
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
    []
  );

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        positionMs,
        durationMs,
        isLoading,
        playSong,
        play,
        pause,
        togglePlayPause,
        seekTo,
        skipNext,
        skipPrevious,
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
