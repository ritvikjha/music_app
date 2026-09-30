import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSongById } from '../services/saavn';
import type { Song } from '../types';

const LIKED_SONGS_LEGACY_KEY = '@jam_liked_songs';
const LIKED_SONGS_V2_KEY = '@jam_liked_songs_v2';
const RECENT_SONGS_KEY = '@jam_recent_songs';
const LISTENING_STATS_KEY = '@jam_listening_stats';

interface ListeningStats { tracksStarted: number; listeningMs: number; activeDays: string[]; trackPlays: Record<string, number>; artistPlays: Record<string, number> }

interface LibraryContextValue {
  likedSongs: Song[];
  recentSongs: Song[];
  toggleLike: (song: Song) => Promise<void>;
  isLiked: (songId: string) => boolean;
  addRecent: (song: Song) => Promise<void>;
  clearRecent: () => Promise<void>;
  isLoading: boolean;
  listeningStats: ListeningStats;
  recordTrackStarted: (song?: Song) => void;
  recordListeningTime: (elapsedMs: number) => void;
}

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listeningStats, setListeningStats] = useState<ListeningStats>({ tracksStarted: 0, listeningMs: 0, activeDays: [], trackPlays: {}, artistPlays: {} });
  const lastStatsSaveRef = React.useRef(0);

  // Hydrate likes & recents with migration of legacy liked song IDs
  useEffect(() => {
    (async () => {
      try {
        const savedStats = await AsyncStorage.getItem(LISTENING_STATS_KEY);
        if (savedStats) {
          const parsed = JSON.parse(savedStats);
          setListeningStats({ tracksStarted: Number(parsed.tracksStarted) || 0, listeningMs: Number(parsed.listeningMs) || 0, activeDays: Array.isArray(parsed.activeDays) ? parsed.activeDays : [], trackPlays: parsed.trackPlays && typeof parsed.trackPlays === 'object' ? parsed.trackPlays : {}, artistPlays: parsed.artistPlays && typeof parsed.artistPlays === 'object' ? parsed.artistPlays : {} });
        }
        // 1. Load Recents
        const storedRecents = await AsyncStorage.getItem(RECENT_SONGS_KEY);
        if (storedRecents) {
          const parsed = JSON.parse(storedRecents);
          if (Array.isArray(parsed)) {
            setRecentSongs(parsed.slice(0, 20));
          }
        }

        // 2. Load Liked Songs v2
        const storedLikedV2 = await AsyncStorage.getItem(LIKED_SONGS_V2_KEY);
        if (storedLikedV2) {
          const parsed = JSON.parse(storedLikedV2);
          if (Array.isArray(parsed)) {
            setLikedSongs(parsed);
            setIsLoading(false);
            return;
          }
        }

        // 3. Migrate legacy ID set if v2 doesn't exist
        const legacyStored = await AsyncStorage.getItem(LIKED_SONGS_LEGACY_KEY);
        if (legacyStored) {
          const legacyIds: string[] = JSON.parse(legacyStored);
          if (Array.isArray(legacyIds) && legacyIds.length > 0) {
            const resolvedSongs: Song[] = [];
            const failedIds: string[] = [];

            await Promise.all(
              legacyIds.map(async (id) => {
                try {
                  const song = await getSongById(id);
                  if (song) {
                    resolvedSongs.push(song);
                  } else {
                    failedIds.push(id);
                  }
                } catch {
                  failedIds.push(id);
                }
              })
            );

            // Construct minimal placeholder items for failed IDs so no user saved items are lost
            const fallbackSongs: Song[] = failedIds.map((id) => ({
              id,
              title: 'Unknown Song',
              artist: 'Unknown Artist',
              album: 'Saved Song',
              duration: 0,
              imageUrl: '',
              streamUrl: '',
            }));

            const finalLiked = [...resolvedSongs, ...fallbackSongs];
            setLikedSongs(finalLiked);
            await AsyncStorage.setItem(LIKED_SONGS_V2_KEY, JSON.stringify(finalLiked));
          }
        }
      } catch (err) {
        console.warn('[LibraryContext] Hydration error:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const updateListeningStats = useCallback((update: (stats: ListeningStats) => ListeningStats, persistNow = false) => {
    setListeningStats((previous) => {
      const next = update(previous);
      const now = Date.now();
      if (persistNow || now - lastStatsSaveRef.current >= 5000) {
        lastStatsSaveRef.current = now;
        AsyncStorage.setItem(LISTENING_STATS_KEY, JSON.stringify(next)).catch((err) =>
          console.warn('[LibraryContext] Save listening stats failed:', err)
        );
      }
      return next;
    });
  }, []);

  const recordTrackStarted = useCallback((song?: Song) => {
    const today = new Date().toISOString().slice(0, 10);
    updateListeningStats((stats) => ({
      ...stats,
      tracksStarted: stats.tracksStarted + 1,
      activeDays: stats.activeDays.includes(today) ? stats.activeDays : [...stats.activeDays, today].slice(-400),
      trackPlays: song ? { ...stats.trackPlays, [song.id]: (stats.trackPlays[song.id] || 0) + 1 } : stats.trackPlays,
      artistPlays: song ? { ...stats.artistPlays, [song.artist]: (stats.artistPlays[song.artist] || 0) + 1 } : stats.artistPlays,
    }), true);
  }, [updateListeningStats]);

  const recordListeningTime = useCallback((elapsedMs: number) => {
    if (!Number.isFinite(elapsedMs) || elapsedMs <= 0 || elapsedMs > 3000) return;
    updateListeningStats((stats) => ({ ...stats, listeningMs: stats.listeningMs + elapsedMs }));
  }, [updateListeningStats]);

  const toggleLike = useCallback(async (song: Song) => {
    setLikedSongs((prev) => {
      const exists = prev.some((s) => s.id === song.id);
      let updated: Song[];
      if (exists) {
        updated = prev.filter((s) => s.id !== song.id);
      } else {
        updated = [song, ...prev];
      }

      AsyncStorage.setItem(LIKED_SONGS_V2_KEY, JSON.stringify(updated)).catch((err) =>
        console.warn('[LibraryContext] Save like failed:', err)
      );

      return updated;
    });
  }, []);

  const isLiked = useCallback(
    (songId: string): boolean => {
      return likedSongs.some((s) => s.id === songId);
    },
    [likedSongs]
  );

  const addRecent = useCallback(async (song: Song) => {
    setRecentSongs((prev) => {
      const filtered = prev.filter((s) => s.id !== song.id);
      const updated = [song, ...filtered].slice(0, 20);

      AsyncStorage.setItem(RECENT_SONGS_KEY, JSON.stringify(updated)).catch((err) =>
        console.warn('[LibraryContext] Save recent failed:', err)
      );

      return updated;
    });
  }, []);

  const clearRecent = useCallback(async () => {
    setRecentSongs([]);
    try {
      await AsyncStorage.removeItem(RECENT_SONGS_KEY);
    } catch (err) {
      console.warn('[LibraryContext] Clear recent failed:', err);
    }
  }, []);

  return (
    <LibraryContext.Provider
      value={{
        likedSongs,
        recentSongs,
        toggleLike,
        isLiked,
        addRecent,
        clearRecent,
        isLoading,
        listeningStats,
        recordTrackStarted,
        recordListeningTime,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
