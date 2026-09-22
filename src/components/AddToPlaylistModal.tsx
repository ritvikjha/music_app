import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePlaylists } from '../context/PlaylistContext';
import { useToast } from '../context/ToastContext';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { Song, Playlist } from '../types';

interface AddToPlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  song: Song | null;
}

export function AddToPlaylistModal({ visible, onClose, song }: AddToPlaylistModalProps) {
  const { playlists, createPlaylist, addSongToPlaylist } = usePlaylists();
  const { showToast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  if (!song) return null;

  const handleSelectPlaylist = async (playlist: Playlist) => {
    const isAlreadyIn = playlist.songs.some((s) => s.id === song.id);
    if (isAlreadyIn) {
      showToast(`Already in "${playlist.name}"`, 'info');
      onClose();
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const success = await addSongToPlaylist(playlist.id, song);
    if (success) {
      showToast(`Added to "${playlist.name}" 🎵`, 'success');
    }
    onClose();
  };

  const handleCreateAndAdd = async () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const created = await createPlaylist(trimmed);
    await addSongToPlaylist(created.id, song);
    showToast(`Created "${trimmed}" and added song!`, 'success');
    setNewPlaylistName('');
    setIsCreating(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="bookmark-outline" size={20} color={colors.accent} />
              </View>
              <Text style={styles.headerTitle}>Add to Playlist</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Song Preview Card */}
          <View style={styles.songCard}>
            <Image
              source={{ uri: song.imageUrl }}
              style={styles.songThumb}
              defaultSource={require('../../assets/images/icon.png')}
            />
            <View style={styles.songInfo}>
              <Text style={styles.songTitle} numberOfLines={1}>
                {song.title}
              </Text>
              <Text style={styles.songArtist} numberOfLines={1}>
                {song.artist}
              </Text>
            </View>
          </View>

          {/* New Playlist Action / Input */}
          {isCreating ? (
            <View style={styles.createRow}>
              <TextInput
                style={styles.createInput}
                placeholder="Playlist name..."
                placeholderTextColor={colors.textSecondary}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                autoFocus
                onSubmitEditing={handleCreateAndAdd}
              />
              <TouchableOpacity
                style={[
                  styles.createConfirmBtn,
                  !newPlaylistName.trim() && { opacity: 0.5 },
                ]}
                onPress={handleCreateAndAdd}
                disabled={!newPlaylistName.trim()}
              >
                <Text style={styles.createConfirmText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createCancelBtn}
                onPress={() => {
                  setIsCreating(false);
                  setNewPlaylistName('');
                }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.newPlaylistBtn}
              activeOpacity={0.8}
              onPress={() => setIsCreating(true)}
            >
              <View style={styles.newPlaylistIconWrap}>
                <Ionicons name="add" size={22} color={colors.accent} />
              </View>
              <Text style={styles.newPlaylistText}>New Playlist</Text>
            </TouchableOpacity>
          )}

          {/* Playlists List */}
          <Text style={styles.listHeading}>YOUR PLAYLISTS</Text>
          {playlists.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="albums-outline" size={40} color={colors.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyText}>No playlists created yet</Text>
              <Text style={styles.emptySubtext}>Tap "+ New Playlist" above to start your first mix!</Text>
            </View>
          ) : (
            <FlatList
              data={playlists}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isAlreadyIn = item.songs.some((s) => s.id === song.id);
                return (
                  <TouchableOpacity
                    style={[styles.playlistItem, isAlreadyIn && styles.playlistItemActive]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPlaylist(item)}
                  >
                    {item.coverUrl ? (
                      <Image source={{ uri: item.coverUrl }} style={styles.playlistCover} />
                    ) : (
                      <View style={styles.playlistFallbackCover}>
                        <Ionicons name="musical-note" size={20} color={colors.accent} />
                      </View>
                    )}

                    <View style={styles.playlistInfo}>
                      <Text style={styles.playlistName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.playlistCount}>
                        {item.songs.length} {item.songs.length === 1 ? 'song' : 'songs'}
                      </Text>
                    </View>

                    {isAlreadyIn ? (
                      <View style={styles.alreadyBadge}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                        <Text style={styles.alreadyText}>Added</Text>
                      </View>
                    ) : (
                      <View style={styles.addIconCircle}>
                        <Ionicons name="add" size={20} color={colors.textPrimary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    maxHeight: '80%',
    backgroundColor: '#12121A',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.18)',
    paddingTop: spacing.md,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentAlpha25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181724',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  songThumb: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundInput,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  songArtist: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  newPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A26',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.28)',
    gap: spacing.sm,
  },
  newPlaylistIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentAlpha25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newPlaylistText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.accent,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  createInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#1C1B28',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  createConfirmBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createConfirmText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.background,
  },
  createCancelBtn: {
    padding: spacing.xs,
  },
  listHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  playlistItemActive: {
    opacity: 0.75,
  },
  playlistCover: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundInput,
  },
  playlistFallbackCover: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: '#1C1B28',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  playlistCount: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  alreadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentAlpha25,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  alreadyText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  addIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
