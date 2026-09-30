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
  Modal,
  Share,
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
import { offlineStorage } from '../services/offlineStorage';
import { networkMonitor } from '../services/networkMonitor';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { Song, Playlist } from '../types';

type LibraryTab = 'liked' | 'playlists' | 'recent' | 'stashed';

export function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('liked');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [playlistNameDraft, setPlaylistNameDraft] = useState('');
  const [stashedSongs, setStashedSongs] = useState<Song[]>([]);
  const [stashBytes, setStashBytes] = useState(0);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { likedSongs, recentSongs, clearRecent } = useLibrary();
  const { playlists, createPlaylist, deletePlaylist, removeSongFromPlaylist, renamePlaylist, moveSongInPlaylist } = usePlaylists();
  const { playNow, addToQueue } = useQueue();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { isInRoom, jamChangeSong, jamAddToQueue } = useJam();
  const { showToast } = useToast();

  useEffect(() => {
    if (activeTab !== 'stashed') return;
    let active = true;
    Promise.all([offlineStorage.getAllStashedSongs(), offlineStorage.getStashSummary()]).then(([songs, summary]) => {
      if (!active) return;
      setStashedSongs(songs);
      setStashBytes(summary.totalBytes);
    });
    return () => { active = false; };
  }, [activeTab]);

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
    if (!networkMonitor.isOnline) {
      offlineStorage.isStashed(song.id).then((isStashed) => {
        if (!isStashed) showToast('This track is not saved offline yet.', 'error');
        else if (isInRoom) showToast('Reconnecting is required to play in a Jam room.', 'error');
        else { playNow(song, list); playSong(song); }
      });
      return;
    }
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

  const handleSharePlaylist = async (playlist: Playlist) => {
    const tracklist = playlist.songs.map((song, index) => `${index + 1}. ${song.title} — ${song.artist}`).join('\n');
    const payload = encodeURIComponent(JSON.stringify({ name: playlist.name, description: playlist.description, songs: playlist.songs }));
    await Share.share({ title: playlist.name, message: `Listen to my Jam playlist: ${playlist.name}\njam://playlist/share?data=${payload}\n\n${tracklist || 'No tracks yet.'}` });
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
        ) : null}

        <Text style={[styles.title, !activePlaylist && styles.titleLarge]}>
          {activePlaylist ? activePlaylist.name : 'Your Library'}
        </Text>

        <View style={styles.headerRightActions}>
          {activePlaylist ? (
            <TouchableOpacity
              onPress={() => handleDeletePlaylist(activePlaylist)}
              style={styles.headerActionBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          ) : (
            <>
              {activeTab === 'recent' && recentSongs.length > 0 && (
                <TouchableOpacity onPress={clearRecent} style={styles.clearButton}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  setActiveTab('playlists');
                  setIsCreating(true);
                }}
                style={styles.headerActionBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="add" size={26} color={colors.textPrimary} />
              </TouchableOpacity>
            </>
          )}
        </View>
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
                <View style={styles.playlistHeroActions}>
                  <TouchableOpacity
                    style={styles.playAllBtn}
                    onPress={() => handlePlayAll(activePlaylist.songs)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="play" size={15} color="#000000" />
                    <Text style={styles.playAllBtnText}>Play All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.shufflePlaylistBtn}
                    onPress={() => {
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                      const shuffled = [...activePlaylist.songs].sort(() => Math.random() - 0.5);
                      handlePlayAll(shuffled);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="shuffle" size={15} color={colors.accent} />
                    <Text style={styles.shufflePlaylistBtnText}>Shuffle</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity onPress={() => { setPlaylistNameDraft(activePlaylist.name); setRenameModalVisible(true); }}>
                  <Text style={{ color: colors.accent, fontWeight: '700' }}>Rename</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleSharePlaylist(activePlaylist)}>
                  <Text style={{ color: colors.accent, fontWeight: '700' }}>Share playlist</Text>
                </TouchableOpacity>
              </View>
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
                  <View style={{ justifyContent: 'center', gap: 10, paddingHorizontal: 5 }}>
                    <TouchableOpacity onPress={() => moveSongInPlaylist(activePlaylist.id, item.id, -1)} accessibilityLabel="Move song up">
                      <Ionicons name="chevron-up" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveSongInPlaylist(activePlaylist.id, item.id, 1)} accessibilityLabel="Move song down">
                      <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
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
              <Text style={[styles.tabText, activeTab === 'liked' && styles.tabTextActive]}>
                Liked ({likedSongs.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'playlists' && styles.tabItemActive]}
              onPress={() => setActiveTab('playlists')}
            >
              <Text style={[styles.tabText, activeTab === 'playlists' && styles.tabTextActive]}>
                Playlists ({playlists.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'recent' && styles.tabItemActive]}
              onPress={() => setActiveTab('recent')}
            >
              <Text style={[styles.tabText, activeTab === 'recent' && styles.tabTextActive]}>
                Recent ({recentSongs.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'stashed' && styles.tabItemActive]}
              onPress={() => setActiveTab('stashed')}
            >
              <Text style={[styles.tabText, activeTab === 'stashed' && styles.tabTextActive]}>Offline</Text>
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
                        <Ionicons name="musical-notes" size={22} color={colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.playlistRowInfo}>
                      <Text style={styles.playlistRowName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.playlistRowCount}>
                        Playlist • {item.songs.length} {item.songs.length === 1 ? 'song' : 'songs'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )
          ) : (
            /* Liked, recent, or offline */
            (activeTab === 'liked' ? likedSongs : activeTab === 'recent' ? recentSongs : stashedSongs).length === 0 ? (
              <View style={styles.emptyContainer}>
                <RNAnimated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Ionicons
                    name={activeTab === 'liked' ? 'heart-outline' : activeTab === 'recent' ? 'time-outline' : 'cloud-download-outline'}
                    size={56}
                    color={colors.accentAlpha25}
                  />
                </RNAnimated.View>
                <Text style={styles.emptyTitle}>
                  {activeTab === 'liked' ? 'No liked songs yet' : activeTab === 'recent' ? 'No recent playback' : 'Nothing stashed yet'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeTab === 'liked'
                    ? 'Tap the heart icon on any song in the player to save it here.'
                    : activeTab === 'recent' ? 'Songs you play will automatically appear here.' : 'Long-press any song and choose “Stash offline” to keep it here.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={activeTab === 'liked' ? likedSongs : activeTab === 'recent' ? recentSongs : stashedSongs}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                ListHeaderComponent={
                  activeTab === 'stashed' ? (
                    <View style={styles.stashSummary}>
                      <Ionicons name="cloud-done" size={18} color={colors.accent} />
                      <Text style={styles.stashSummaryText}>{stashedSongs.length} saved offline · {stashBytes < 1024 * 1024 ? `${Math.max(1, Math.round(stashBytes / 1024))} KB` : `${(stashBytes / (1024 * 1024)).toFixed(1)} MB`}</Text>
                    </View>
                  ) : activeTab === 'liked' && likedSongs.length > 0 ? (
                    <View style={styles.likedHeroCard}>
                      <View style={styles.likedHeroContent}>
                        <View style={styles.likedHeroInfo}>
                          <View style={styles.likedBadge}>
                            <Ionicons name="sparkles" size={10} color="#000000" />
                            <Text style={styles.likedBadgeText}>VAULT</Text>
                          </View>
                          <Text style={styles.likedHeroTitle}>Favorite Tracks</Text>
                          <Text style={styles.likedHeroSubtitle}>
                            {likedSongs.length} {likedSongs.length === 1 ? 'song' : 'songs'} saved
                          </Text>
                        </View>
                        <View style={styles.likedHeroActions}>
                          <TouchableOpacity
                            style={styles.shuffleHeroBtn}
                            onPress={() => {
                              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                              const shuffled = [...likedSongs].sort(() => Math.random() - 0.5);
                              handleSongPress(shuffled[0], shuffled);
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="shuffle" size={15} color={colors.accent} />
                            <Text style={styles.shuffleHeroBtnText}>Shuffle</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.playAllHeroBtn}
                            onPress={() => {
                              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                              handleSongPress(likedSongs[0], likedSongs);
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="play" size={15} color="#000000" />
                            <Text style={styles.playAllHeroBtnText}>Play All</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ) : null
                }
                renderItem={({ item }) => (
                  <SongCard
                    song={item}
                    onPress={(s) =>
                      handleSongPress(s, activeTab === 'liked' ? likedSongs : activeTab === 'recent' ? recentSongs : stashedSongs)
                    }
                    onAddToQueue={handleAddToQueue}
                    onLongPress={activeTab === 'stashed' ? async (song) => {
                      Alert.alert('Remove offline copy?', `“${song.title}” will no longer be available without internet.`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: async () => {
                          await offlineStorage.removeStash(song.id);
                          setStashedSongs((songs) => songs.filter((item) => item.id !== song.id));
                          const summary = await offlineStorage.getStashSummary();
                          setStashBytes(summary.totalBytes);
                        } },
                      ]);
                    } : undefined}
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
      <Modal visible={renameModalVisible} transparent animationType="fade" onRequestClose={() => setRenameModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.72)' }}>
          <View style={{ backgroundColor: colors.backgroundElevated, borderRadius: 18, padding: 20 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 14 }}>Rename playlist</Text>
            <TextInput value={playlistNameDraft} onChangeText={setPlaylistNameDraft} autoFocus maxLength={50}
              placeholder="Playlist name" placeholderTextColor={colors.textSecondary}
              style={{ color: colors.textPrimary, borderBottomWidth: 1, borderColor: colors.accent, paddingVertical: 10 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 18, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setRenameModalVisible(false)}><Text style={{ color: colors.textSecondary }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={async () => { if (activePlaylist) await renamePlaylist(activePlaylist.id, playlistNameDraft); setRenameModalVisible(false); }}>
                <Text style={{ color: colors.accent, fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  titleLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundElevated,
  },
  clearText: {
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    fontWeight: typography.weights.semibold,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  tabItemActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  stashSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  stashSummaryText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.lg,
  },
  emptyActionBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: '#000000',
  },
  listContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 160,
  },
  createCard: {
    backgroundColor: colors.backgroundElevated,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  createCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  createCardInput: {
    backgroundColor: colors.backgroundInput,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  createCardConfirmText: {
    color: '#000000',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  playlistRowCover: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: colors.backgroundElevated,
  },
  playlistRowCoverPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: spacing.sm,
  },
  heroCover: {
    width: 72,
    height: 72,
    borderRadius: 4,
  },
  heroCoverPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 4,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  playAllBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: '#000000',
  },
  playlistSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeSongBtn: {
    padding: spacing.sm,
  },
  playlistBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  playlistTrackBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  playlistTrackBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.4,
  },
  playlistHeroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  shufflePlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  shufflePlaylistBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.accent,
  },
  // Liked Songs Hero Banner
  likedHeroCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    padding: spacing.md,
    overflow: 'hidden',
  },
  likedHeroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  likedHeroInfo: {
    flex: 1,
  },
  likedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginBottom: 4,
  },
  likedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },
  likedHeroTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  likedHeroSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  likedHeroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shuffleHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  shuffleHeroBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  playAllHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  playAllHeroBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
});

