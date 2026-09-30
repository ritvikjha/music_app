import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Song, Playlist } from '../types';

const PLAYLISTS_KEY = '@jam_playlists';

interface PlaylistContextValue {
  playlists: Playlist[];
  createPlaylist: (name: string, description?: string, songs?: Song[]) => Promise<Playlist>;
  deletePlaylist: (id: string) => Promise<void>;
  addSongToPlaylist: (playlistId: string, song: Song) => Promise<boolean>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  renamePlaylist: (playlistId: string, name: string) => Promise<void>;
  moveSongInPlaylist: (playlistId: string, songId: string, direction: -1 | 1) => Promise<void>;
  getPlaylist: (id: string) => Playlist | undefined;
  isLoading: boolean;
}

const PlaylistContext = createContext<PlaylistContextValue | undefined>(undefined);

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from storage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PLAYLISTS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setPlaylists(parsed);
          }
        }
      } catch (err) {
        console.warn('[PlaylistContext] Hydration error:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const savePlaylists = async (updated: Playlist[]) => {
    setPlaylists(updated);
    try {
      await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[PlaylistContext] Persist error:', err);
    }
  };

  const createPlaylist = useCallback(
    async (name: string, description?: string, songs: Song[] = []): Promise<Playlist> => {
      const newPlaylist: Playlist = {
        id: `pl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: name.trim() || 'New Playlist',
        description: description?.trim(),
        createdAt: Date.now(),
        songs,
        coverUrl: songs[0]?.imageUrl,
      };

      const updated = [newPlaylist, ...playlists];
      await savePlaylists(updated);
      return newPlaylist;
    },
    [playlists]
  );

  const deletePlaylist = useCallback(
    async (id: string) => {
      const updated = playlists.filter((p) => p.id !== id);
      await savePlaylists(updated);
    },
    [playlists]
  );

  const addSongToPlaylist = useCallback(
    async (playlistId: string, song: Song): Promise<boolean> => {
      let added = false;
      const updated = playlists.map((p) => {
        if (p.id === playlistId) {
          const exists = p.songs.some((s) => s.id === song.id);
          if (!exists) {
            added = true;
            const updatedSongs = [...p.songs, song];
            return {
              ...p,
              songs: updatedSongs,
              coverUrl: p.coverUrl || song.imageUrl,
            };
          }
        }
        return p;
      });

      if (added) {
        await savePlaylists(updated);
      }
      return added;
    },
    [playlists]
  );

  const removeSongFromPlaylist = useCallback(
    async (playlistId: string, songId: string) => {
      const updated = playlists.map((p) => {
        if (p.id === playlistId) {
          const filtered = p.songs.filter((s) => s.id !== songId);
          return {
            ...p,
            songs: filtered,
            coverUrl: filtered.length > 0 ? filtered[0].imageUrl : undefined,
          };
        }
        return p;
      });
      await savePlaylists(updated);
    },
    [playlists]
  );

  const renamePlaylist = useCallback(async (playlistId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await savePlaylists(playlists.map((playlist) => playlist.id === playlistId ? { ...playlist, name: trimmed } : playlist));
  }, [playlists]);

  const moveSongInPlaylist = useCallback(async (playlistId: string, songId: string, direction: -1 | 1) => {
    const updated = playlists.map((playlist) => {
      if (playlist.id !== playlistId) return playlist;
      const from = playlist.songs.findIndex((song) => song.id === songId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= playlist.songs.length) return playlist;
      const songs = [...playlist.songs];
      [songs[from], songs[to]] = [songs[to], songs[from]];
      return { ...playlist, songs, coverUrl: songs[0]?.imageUrl };
    });
    await savePlaylists(updated);
  }, [playlists]);

  const getPlaylist = useCallback(
    (id: string) => {
      return playlists.find((p) => p.id === id);
    },
    [playlists]
  );

  return (
    <PlaylistContext.Provider
      value={{
        playlists,
        createPlaylist,
        deletePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        renamePlaylist,
        moveSongInPlaylist,
        getPlaylist,
        isLoading,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylists() {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylists must be used within a PlaylistProvider');
  }
  return context;
}
