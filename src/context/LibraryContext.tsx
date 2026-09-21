import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSongById } from '../services/saavn';
import type { Song } from '../types';

const LIKED_SONGS_LEGACY_KEY = '@jam_liked_songs';
const LIKED_SONGS_V2_KEY = '@jam_liked_songs_v2';
const RECENT_SONGS_KEY = '@jam_recent_songs';

interface LibraryContextValue {
  likedSongs: Song[];
  recentSongs: Song[];
  toggleLike: (song: Song) => Promise<void>;
  isLiked: (songId: string) => boolean;
  addRecent: (song: Song) => Promise<void>;
  clearRecent: () => Promise<void>;
  isLoading: boolean;
}

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate likes & recents with migration of legacy liked song IDs
  useEffect(() => {
    (async () => {
      try {
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
