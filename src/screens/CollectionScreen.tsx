import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SongCard } from '../components/SongCard';
import { MiniPlayer } from '../components/MiniPlayer';
import { useQueue } from '../context/QueueContext';
import { usePlayer } from '../context/PlayerContext';
import { useToast } from '../context/ToastContext';
import { getAlbumSongs, getArtistSongs } from '../services/saavn';
import { colors, spacing, typography } from '../theme';
import type { Song } from '../types';

export function CollectionScreen({ kind }: { kind: 'artist' | 'album' }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const value = Array.isArray(id) ? id[0] : id || '';
  const router = useRouter();
  const { playNow, addToQueue } = useQueue();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { showToast } = useToast();
  const [result, setResult] = useState<{ query: string; songs: Song[] } | null>(null);
  const songs = result?.query === `${kind}:${value}` ? result.songs : [];
  const loading = result?.query !== `${kind}:${value}`;

  useEffect(() => {
    let active = true;
    (kind === 'artist' ? getArtistSongs(value) : getAlbumSongs(value))
      .then((items) => { if (active) setResult({ query: `${kind}:${value}`, songs: items }); })
      .catch(() => { if (active) setResult({ query: `${kind}:${value}`, songs: [] }); });
    return () => { active = false; };
  }, [kind, value]);

  const handleSongPress = (song: Song) => {
    playNow(song, songs);
    playSong(song);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{kind === 'artist' ? 'ARTIST' : 'ALBUM'}</Text>
          <Text style={styles.title} numberOfLines={1}>{value}</Text>
        </View>
      </View>
      {loading ? <ActivityIndicator style={styles.loading} color={colors.accent} /> : songs.length ? (
        <FlatList
          data={songs}
          keyExtractor={(song, index) => `${song.id}-${index}`}
          renderItem={({ item }) => <SongCard song={item} onPress={handleSongPress} onAddToQueue={(song) => { addToQueue(song); showToast('Added to queue', 'success'); }} isPlaying={currentSong?.id === item.id && isPlaying} />}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No tracks found</Text>
          <Text style={styles.emptyText}>Try opening this artist or album from a search result.</Text>
        </View>
      )}
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  heading: { flex: 1 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  title: { color: colors.textPrimary, fontSize: typography.sizes.xxl, fontWeight: '700' },
  loading: { marginTop: spacing.xxxl },
  list: { paddingBottom: spacing.xl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyTitle: { color: colors.textPrimary, fontSize: typography.sizes.lg, fontWeight: '700' },
  emptyText: { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
});
