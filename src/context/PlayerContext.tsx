import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { audioPlayer } from '../services/audioPlayer';
import { getSongById } from '../services/saavn';
import { useQueue } from './QueueContext';
import { useLibrary } from './LibraryContext';
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

  positionMsRef.current = positionMs;
  repeatModeRef.current = repeatMode;
  currentSongRef.current = currentSong;

  const setIsInJam = useCallback((inJam: boolean) => {
    isInJamRef.current = inJam;
  }, []);

  // Subscribe to audio status updates
  useEffect(() => {
    const unsubscribe = audioPlayer.onStatusUpdate((status) => {
      setIsPlaying(status.isPlaying);
      setPositionMs(status.positionMillis ?? 0);
      setDurationMs(status.durationMillis ?? 0);
    });
    return unsubscribe;
  }, []);

  const playSong = useCallback(
    async (song: Song) => {
      setIsLoading(true);
      setCurrentSong(song);
      recordPlayedSong(song);
      addRecent(song);

      try {
        await audioPlayer.loadAndPlay(song.streamUrl);
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
   */
  const _forceState = useCallback(
    async (opts: { songId: string; isPlaying: boolean; positionMs: number }) => {
      // If the song changed, load the new one
      if (currentSongRef.current?.id !== opts.songId && opts.songId) {
        setIsLoading(true);
        try {
          const song = await getSongById(opts.songId);
          if (song) {
            setCurrentSong(song);
            await audioPlayer.loadAndPlay(song.streamUrl);
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
        // Same song — just adjust position and play state
        await audioPlayer.seekTo(opts.positionMs);
        if (opts.isPlaying) {
          await audioPlayer.play();
        } else {
          await audioPlayer.pause();
        }
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
