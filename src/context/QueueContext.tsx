import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Song, RepeatMode, PlayerModes } from '../types';

const PLAYER_MODES_KEY = '@jam_player_modes';
const AUTOPLAY_KEY = '@jam_autoplay_mode';

interface QueueContextValue {
  queue: Song[];
  currentIndex: number;
  upcomingQueue: Song[];
  history: Song[];
  shuffle: boolean;
  repeatMode: RepeatMode;
  autoplay: boolean;

  playNow: (song: Song, contextList?: Song[]) => void;
  playNext: (song: Song) => void;
  addToQueue: (song: Song) => void;
  addSongsToQueue: (songs: Song[]) => void;
  removeAt: (index: number) => void;
  move: (fromIndex: number, toIndex: number) => void;
  clear: () => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  toggleAutoplay: () => void;
  setAutoplay: (enabled: boolean) => void;

  getNextSong: () => Song | null;
  getPreviousSong: () => Song | null;
  recordPlayedSong: (song: Song) => void;
}

const QueueContext = createContext<QueueContextValue | undefined>(undefined);

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [history, setHistory] = useState<Song[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [autoplay, setAutoplayState] = useState(true);

  // Hydrate player modes (shuffle, repeatMode, autoplay) from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PLAYER_MODES_KEY);
        if (stored) {
          const parsed: PlayerModes = JSON.parse(stored);
          if (typeof parsed.shuffle === 'boolean') setShuffle(parsed.shuffle);
          if (['off', 'all', 'one'].includes(parsed.repeatMode)) setRepeatMode(parsed.repeatMode);
        }
        const storedAutoplay = await AsyncStorage.getItem(AUTOPLAY_KEY);
        if (storedAutoplay !== null) {
          setAutoplayState(storedAutoplay === 'true');
        }
      } catch (err) {
        console.warn('[QueueContext] Failed to load modes:', err);
      }
    })();
  }, []);

  // Persist modes when changed
  const saveModes = useCallback(async (newShuffle: boolean, newRepeat: RepeatMode) => {
    try {
      await AsyncStorage.setItem(
        PLAYER_MODES_KEY,
        JSON.stringify({ shuffle: newShuffle, repeatMode: newRepeat })
      );
    } catch (err) {
      console.warn('[QueueContext] Failed to persist modes:', err);
    }
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => {
      const next = !prev;
      saveModes(next, repeatMode);
      return next;
    });
  }, [repeatMode, saveModes]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => {
      const cycle: Record<RepeatMode, RepeatMode> = {
        off: 'all',
        all: 'one',
        one: 'off',
      };
      const next = cycle[prev];
      saveModes(shuffle, next);
      return next;
    });
  }, [shuffle, saveModes]);

  const toggleAutoplay = useCallback(() => {
    setAutoplayState((prev) => {
      const next = !prev;
      AsyncStorage.setItem(AUTOPLAY_KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const setAutoplay = useCallback((enabled: boolean) => {
    setAutoplayState(enabled);
    AsyncStorage.setItem(AUTOPLAY_KEY, String(enabled)).catch(() => {});
  }, []);

  /**
   * Set up queue context and start a song.
   * If a contextList is passed (e.g. search results or playlist), the queue becomes that list.
   */
  const playNow = useCallback(
    (song: Song, contextList?: Song[]) => {
      let newQueue: Song[];
      let targetIndex = 0;

      if (contextList && contextList.length > 0) {
        newQueue = [...contextList];
        const found = newQueue.findIndex((s) => s.id === song.id);
        if (found !== -1) {
          targetIndex = found;
        } else {
          newQueue.unshift(song);
          targetIndex = 0;
        }
      } else {
        newQueue = [song];
        targetIndex = 0;
      }

      setQueue(newQueue);
      setCurrentIndex(targetIndex);
    },
    []
  );

  /**
   * Insert song right after the current playing song.
   */
  const playNext = useCallback(
    (song: Song) => {
      setQueue((prev) => {
        if (prev.length === 0) {
          setCurrentIndex(0);
          return [song];
        }
        const insertIdx = Math.max(0, currentIndex + 1);
        const updated = [...prev];
        updated.splice(insertIdx, 0, song);
        return updated;
      });
    },
    [currentIndex]
  );

  /**
   * Append a song to the end of the queue.
   */
  const addToQueue = useCallback(
    (song: Song) => {
      setQueue((prev) => {
        if (prev.length === 0) {
          setCurrentIndex(0);
          return [song];
        }
        return [...prev, song];
      });
    },
    []
  );

  /**
   * Batch append multiple songs (e.g. from Autoplay / Endless Radio).
   */
  const addSongsToQueue = useCallback(
    (songs: Song[]) => {
      if (!songs || songs.length === 0) return;
      setQueue((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const newUnique = songs.filter((s) => !existingIds.has(s.id));
        if (newUnique.length === 0) return prev;
        if (prev.length === 0) {
          setCurrentIndex(0);
          return newUnique;
        }
        return [...prev, ...newUnique];
      });
    },
    []
  );

  /**
   * Remove a song at a specific queue index.
   */
  const removeAt = useCallback(
    (index: number) => {
      setQueue((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        const updated = [...prev];
        updated.splice(index, 1);
        if (index < currentIndex) {
          setCurrentIndex((curr) => Math.max(0, curr - 1));
        } else if (index === currentIndex && updated.length <= currentIndex) {
          setCurrentIndex(Math.max(0, updated.length - 1));
        }
        return updated;
      });
    },
    [currentIndex]
  );

  /**
   * Reorder items within upcoming songs.
   */
  const move = useCallback(
    (fromIndex: number, toIndex: number) => {
      setQueue((prev) => {
        if (
          fromIndex < 0 ||
          fromIndex >= prev.length ||
          toIndex < 0 ||
          toIndex >= prev.length
        ) {
          return prev;
        }
        const updated = [...prev];
        const [removed] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, removed);

        // Adjust currentIndex if moved relative to it
        if (fromIndex === currentIndex) {
          setCurrentIndex(toIndex);
        } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
          setCurrentIndex((curr) => curr - 1);
        } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
          setCurrentIndex((curr) => curr + 1);
        }

        return updated;
      });
    },
    [currentIndex]
  );

  /**
   * Clear upcoming songs in the queue.
   */
  const clear = useCallback(() => {
    setQueue((prev) => {
      if (currentIndex >= 0 && currentIndex < prev.length) {
        return [prev[currentIndex]];
      }
      return [];
    });
    setCurrentIndex(0);
  }, [currentIndex]);

  /**
   * Record a song into the local history stack (for previous navigation).
   */
  const recordPlayedSong = useCallback((song: Song) => {
    setHistory((prev) => {
      // Keep up to 30 items
      const filtered = prev.filter((s) => s.id !== song.id);
      return [song, ...filtered].slice(0, 30);
    });
  }, []);

  /**
   * Calculate and advance to the next song based on shuffle and repeatMode.
   */
  const getNextSong = useCallback((): Song | null => {
    if (queue.length === 0) return null;

    if (repeatMode === 'one' && currentIndex >= 0 && currentIndex < queue.length) {
      return queue[currentIndex];
    }

    if (shuffle) {
      if (queue.length <= 1) return queue[0] || null;
      let nextIdx = currentIndex;
      let attempts = 0;
      while (nextIdx === currentIndex && attempts < 10) {
        nextIdx = Math.floor(Math.random() * queue.length);
        attempts++;
      }
      setCurrentIndex(nextIdx);
      return queue[nextIdx];
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      setCurrentIndex(nextIndex);
      return queue[nextIndex];
    }

    if (repeatMode === 'all' && queue.length > 0) {
      setCurrentIndex(0);
      return queue[0];
    }

    return null;
  }, [queue, currentIndex, repeatMode, shuffle]);

  /**
   * Retrieve the previous song from history or queue.
   */
  const getPreviousSong = useCallback((): Song | null => {
    if (currentIndex > 0 && currentIndex < queue.length) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      return queue[prevIdx];
    }

    // Fall back to history stack
    if (history.length > 1) {
      const [current, prevSong] = history;
      if (prevSong) {
        setHistory((hist) => hist.slice(1));
        return prevSong;
      }
    }

    if (queue.length > 0 && currentIndex >= 0) {
      return queue[currentIndex];
    }

    return null;
  }, [queue, currentIndex, history]);

  const upcomingQueue = queue.slice(currentIndex + 1);

  return (
    <QueueContext.Provider
      value={{
        queue,
        currentIndex,
        upcomingQueue,
        history,
        shuffle,
        repeatMode,
        autoplay,
        playNow,
        playNext,
        addToQueue,
        addSongsToQueue,
        removeAt,
        move,
        clear,
        toggleShuffle,
        cycleRepeatMode,
        toggleAutoplay,
        setAutoplay,
        getNextSong,
        getPreviousSong,
        recordPlayedSong,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue(): QueueContextValue {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
}
