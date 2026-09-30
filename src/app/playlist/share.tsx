import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { usePlaylists } from '../../context/PlaylistContext';
import LoginScreen from '../../screens/LoginScreen';
import type { Song } from '../../types';
import { colors } from '../../theme';
import { useToast } from '../../context/ToastContext';

export default function SharedPlaylistRoute() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const { createPlaylist, isLoading: playlistsLoading } = usePlaylists();
  const router = useRouter();
  const { showToast } = useToast();
  const imported = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isLoading || playlistsLoading || !isAuthenticated || imported.current) return;
    imported.current = true;
    (async () => {
      try {
        const raw = Array.isArray(data) ? data[0] : data;
        if (!raw || raw.length > 20000) throw new Error('Invalid playlist link');
        const parsed = JSON.parse(raw) as { name?: string; description?: string; songs?: Song[] };
        if (!Array.isArray(parsed.songs) || parsed.songs.length === 0 || parsed.songs.length > 100) throw new Error('Invalid playlist');
        const songs = parsed.songs.filter((song) => song && typeof song.id === 'string' && typeof song.title === 'string' && typeof song.artist === 'string');
        if (songs.length === 0) throw new Error('Playlist has no valid songs');
        await createPlaylist(parsed.name?.slice(0, 60) || 'Shared Playlist', parsed.description, songs);
        showToast('Playlist imported to your library.', 'success');
        router.replace('/(tabs)/library');
      } catch {
        setError(true);
        showToast('Could not import this playlist link.', 'error');
      }
    })();
  }, [data, isLoading, playlistsLoading, isAuthenticated, createPlaylist, router, showToast]);

  if (!isLoading && !isAuthenticated) return <LoginScreen />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 24 }}>
      {error ? <Text style={{ color: colors.textPrimary, textAlign: 'center' }}>This playlist link is invalid or could not be imported.</Text> : <ActivityIndicator color={colors.accent} />}
      {!error && <Text style={{ color: colors.textPrimary, marginTop: 12 }}>Importing shared playlist…</Text>}
    </View>
  );
}
