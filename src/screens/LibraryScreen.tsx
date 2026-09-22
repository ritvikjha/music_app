import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useLibrary } from '../context/LibraryContext';
import { usePlaylists } from '../context/PlaylistContext';
import { useQueue } from '../context/QueueContext';
import { usePlayer } from '../context/PlayerContext';
import { useJam } from '../context/JamContext';
import { useToast } from '../context/ToastContext';
import { SongCard } from '../components/SongCard';
import { MiniPlayer } from '../components/MiniPlayer';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { Song, Playlist } from '../types';

type LibraryTab = 'liked' | 'playlists' | 'recent';

export function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('liked');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { likedSongs, recentSongs, clearRecent } = useLibrary();
  const { playlists, createPlaylist, deletePlaylist, removeSongFromPlaylist } = usePlaylists();
  const { playNow, addToQueue } = useQueue();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { isInRoom, jamChangeSong, jamAddToQueue } = useJam();
  const { showToast } = useToast();

  // Pulse animation for empty states
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const anim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  // Keep selected playlist in sync with context updates
  const activePlaylist = selectedPlaylist
    ? playlists.find((p) => p.id === selectedPlaylist.id) || null
    : null;

  const handleSongPress = (song: Song, list: Song[]) => {
    if (isInRoom) {
      if (currentSong) {
        jamAddToQueue(song);
        showToast(`Added ${song.title} to Jam Queue`, 'success');
      } else {
        jamChangeSong(song);
        showToast(`Playing ${song.title}`, 'info');
      }
    } else {
      playNow(song, list);
      playSong(song);
    }
  };

  const handleAddToQueue = (song: Song) => {
    if (isInRoom) {
      jamAddToQueue(song);
      showToast(`Added ${song.title} to Jam Queue`, 'success');
    } else {
      addToQueue(song);
      showToast(`Added ${song.title} to queue`, 'info');
    }
  };

  const handleCreatePlaylist = async () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    const created = await createPlaylist(trimmed);
    showToast(`Created "${trimmed}"`, 'success');
    setNewPlaylistName('');
    setIsCreating(false);
    setSelectedPlaylist(created);
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    Alert.alert('Delete Playlist', `Are you sure you want to delete "${playlist.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePlaylist(playlist.id);
          setSelectedPlaylist(null);
          showToast(`Deleted "${playlist.name}"`, 'info');
        },
      },
    ]);
  };

  const handlePlayAll = (songs: Song[]) => {
    if (songs.length === 0) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    handleSongPress(songs[0], songs);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        {activePlaylist ? (
          <TouchableOpacity
            onPress={() => setSelectedPlaylist(null)}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerPlaceholder}>
            <Ionicons name="albums" size={22} color={colors.accent} />
          </View>
        )}

        <Text style={styles.title}>
          {activePlaylist ? activePlaylist.name : 'Your Library'}
        </Text>

        {activePlaylist ? (
          <TouchableOpacity
            onPress={() => handleDeletePlaylist(activePlaylist)}
            style={styles.headerActionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        ) : activeTab === 'recent' && recentSongs.length > 0 ? (
          <TouchableOpacity onPress={clearRecent} style={styles.clearButton}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        ) : activeTab === 'playlists' ? (
          <TouchableOpacity
            onPress={() => setIsCreating(true)}
            style={styles.headerActionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add" size={24} color={colors.accent} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* If inside an active playlist */}
      {activePlaylist ? (
        <View style={styles.playlistDetailContainer}>
          {/* Playlist Info Header */}
          <View style={styles.playlistHero}>
            {activePlaylist.coverUrl ? (
              <Image source={{ uri: activePlaylist.coverUrl }} style={styles.heroCover} />
            ) : (
              <View style={styles.heroCoverPlaceholder}>
                <Ionicons name="musical-notes" size={40} color={colors.accent} />
              </View>
            )}
            <View style={styles.heroMeta}>
              <Text style={styles.heroTitle}>{activePlaylist.name}</Text>
              <Text style={styles.heroSubtitle}>
                {activePlaylist.songs.length} {activePlaylist.songs.length === 1 ? 'song' : 'songs'}
              </Text>
              {activePlaylist.songs.length > 0 && (
                <TouchableOpacity
                  style={styles.playAllBtn}
                  onPress={() => handlePlayAll(activePlaylist.songs)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={16} color={colors.background} />
                  <Text style={styles.playAllBtnText}>Play All</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Songs in Playlist */}
          {activePlaylist.songs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-notes-outline" size={48} color={colors.accentAlpha25} />
              <Text style={styles.emptyTitle}>Playlist is empty</Text>
              <Text style={styles.emptySubtitle}>
                Search for songs and tap "Add to Playlist" to build this collection!
              </Text>
            </View>
          ) : (
            <FlatList
              data={activePlaylist.songs}
              keyExtractor={(item, index) => `pl-song-${item.id}-${index}`}
              renderItem={({ item }) => (
                <View style={styles.playlistSongRow}>
                  <View style={{ flex: 1 }}>
                    <SongCard
                      song={item}
                      onPress={(s) => handleSongPress(s, activePlaylist.songs)}
                      onAddToQueue={handleAddToQueue}
                      isPlaying={currentSong?.id === item.id && isPlaying}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.removeSongBtn}
                    onPress={() => removeSongFromPlaylist(activePlaylist.id, item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      ) : (
        /* Top Tabs: Liked | Playlists | Recent */
        <>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'liked' && styles.tabItemActive]}
              onPress={() => setActiveTab('liked')}
            >
              <Ionicons
                name={activeTab === 'liked' ? 'heart' : 'heart-outline'}
                size={15}
                color={activeTab === 'liked' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'liked' && styles.tabTextActive]}>
                Liked ({likedSongs.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'playlists' && styles.tabItemActive]}
              onPress={() => setActiveTab('playlists')}
            >
              <Ionicons
                name={activeTab === 'playlists' ? 'albums' : 'albums-outline'}
                size={15}
                color={activeTab === 'playlists' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'playlists' && styles.tabTextActive]}>
                Playlists ({playlists.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'recent' && styles.tabItemActive]}
              onPress={() => setActiveTab('recent')}
            >
              <Ionicons
                name={activeTab === 'recent' ? 'time' : 'time-outline'}
                size={15}
                color={activeTab === 'recent' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'recent' && styles.tabTextActive]}>
                Recent ({recentSongs.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* New Playlist Input Card if isCreating */}
          {activeTab === 'playlists' && isCreating && (
            <View style={styles.createCard}>
              <Text style={styles.createCardLabel}>CREATE NEW PLAYLIST</Text>
              <TextInput
                style={styles.createCardInput}
                placeholder="Playlist name..."
                placeholderTextColor={colors.textSecondary}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreatePlaylist}
              />
              <View style={styles.createCardActions}>
                <TouchableOpacity
                  style={styles.createCardCancel}
                  onPress={() => {
                    setIsCreating(false);
                    setNewPlaylistName('');
                  }}
                >
                  <Text style={styles.createCardCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.createCardConfirm,
                    !newPlaylistName.trim() && { opacity: 0.5 },
                  ]}
                  disabled={!newPlaylistName.trim()}
                  onPress={handleCreatePlaylist}
                >
                  <Text style={styles.createCardConfirmText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tab Content */}
          {activeTab === 'playlists' ? (
            playlists.length === 0 ? (
              <View style={styles.emptyContainer}>
                <RNAnimated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Ionicons name="albums-outline" size={56} color={colors.accentAlpha25} />
                </RNAnimated.View>
                <Text style={styles.emptyTitle}>No playlists yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create your first custom playlist to group your favorite songs!
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setIsCreating(true)}
                >
                  <Ionicons name="add" size={18} color={colors.background} />
                  <Text style={styles.emptyActionBtnText}>Create Playlist</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={playlists}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.playlistRow}
                    activeOpacity={0.7}
                    onPress={() => setSelectedPlaylist(item)}
                  >
                    {item.coverUrl ? (
                      <Image source={{ uri: item.coverUrl }} style={styles.playlistRowCover} />
                    ) : (
                      <View style={styles.playlistRowCoverPlaceholder}>
                        <Ionicons name="musical-notes" size={24} color={colors.accent} />
                      </View>
                    )}
                    <View style={styles.playlistRowInfo}>
                      <Text style={styles.playlistRowName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.playlistRowCount}>
                        {item.songs.length} {item.songs.length === 1 ? 'song' : 'songs'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              />
            )
          ) : (
            /* Liked or Recent */
            (activeTab === 'liked' ? likedSongs : recentSongs).length === 0 ? (
              <View style={styles.emptyContainer}>
                <RNAnimated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Ionicons
                    name={activeTab === 'liked' ? 'heart-outline' : 'time-outline'}
                    size={56}
                    color={colors.accentAlpha25}
                  />
                </RNAnimated.View>
                <Text style={styles.emptyTitle}>
                  {activeTab === 'liked' ? 'No liked songs yet' : 'No recent playback'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeTab === 'liked'
                    ? 'Tap the heart icon on any song in the player to save it here.'
                    : 'Songs you play will automatically appear here.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={activeTab === 'liked' ? likedSongs : recentSongs}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={({ item }) => (
                  <SongCard
                    song={item}
                    onPress={(s) =>
                      handleSongPress(s, activeTab === 'liked' ? likedSongs : recentSongs)
                    }
                    onAddToQueue={handleAddToQueue}
                    isPlaying={currentSong?.id === item.id && isPlaying}
                  />
                )}
                contentContainerStyle={styles.listContent}
              />
            )
          )}
        </>
      )}

      {/* Mini Player */}
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearText: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
    fontWeight: typography.weights.semibold,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  tabItemActive: {
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  tabText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.accent,
    fontWeight: typography.weights.bold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.lg,
  },
  emptyActionBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 90,
  },
  createCard: {
    backgroundColor: colors.backgroundElevated,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  createCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  createCardInput: {
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  createCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  createCardCancel: {
    paddingHorizontal: spacing.sm,
  },
  createCardCancelText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  createCardConfirm: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  createCardConfirmText: {
    color: colors.background,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider,
  },
  playlistRowCover: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundInput,
  },
  playlistRowCoverPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accentAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  playlistRowInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  playlistRowName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  playlistRowCount: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  playlistDetailContainer: {
    flex: 1,
  },
  playlistHero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(184, 166, 224, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: spacing.sm,
  },
  heroCover: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
  },
  heroCoverPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.accentAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  heroMeta: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  heroTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  heroSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  playAllBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.background,
  },
  playlistSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeSongBtn: {
    padding: spacing.sm,
  },
});
