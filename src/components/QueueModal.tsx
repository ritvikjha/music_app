import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useQueue } from '../context/QueueContext';
import { usePlayer } from '../context/PlayerContext';
import { AnimatedEqualizer } from './AnimatedEqualizer';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { Song } from '../types';

interface QueueModalProps {
  visible: boolean;
  onClose: () => void;
}

export function QueueModal({ visible, onClose }: QueueModalProps) {
  const { queue, currentIndex, upcomingQueue, removeAt, clear, playNow } = useQueue();
  const { currentSong, playSong, isPlaying } = usePlayer();

  const handleClear = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    Alert.alert('Clear Queue', 'Remove all upcoming songs from queue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: () => {
          clear();
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        },
      },
    ]);
  };

  const handlePlaySong = (song: Song) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    playNow(song, queue);
    playSong(song);
  };

  const handleRemove = (song: Song, upcomingIndex: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    // The actual index in the full queue array is currentIndex + 1 + upcomingIndex
    const actualIndex = currentIndex + 1 + upcomingIndex;
    removeAt(actualIndex);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Play Queue</Text>
              {upcomingQueue.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{upcomingQueue.length}</Text>
                </View>
              )}
            </View>

            <View style={styles.headerRight}>
              {upcomingQueue.length > 0 && (
                <TouchableOpacity
                  onPress={handleClear}
                  style={styles.clearBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Now Playing Section */}
          {currentSong && (
            <View style={styles.nowPlayingSection}>
              <Text style={styles.sectionLabel}>NOW PLAYING</Text>
              <View style={styles.nowPlayingCard}>
                <Image source={{ uri: currentSong.imageUrl }} style={styles.songArt} />
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {currentSong.title}
                  </Text>
                  <Text style={styles.songArtist} numberOfLines={1}>
                    {currentSong.artist}
                  </Text>
                </View>
                {isPlaying && (
                  <View style={styles.eqWrapper}>
                    <AnimatedEqualizer size={16} color={colors.accent} />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Up Next Section */}
          <View style={styles.upNextSection}>
            <Text style={styles.sectionLabel}>UP NEXT</Text>

            {upcomingQueue.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="musical-notes-outline"
                  size={44}
                  color={colors.textSecondary}
                  style={{ opacity: 0.5 }}
                />
                <Text style={styles.emptyTitle}>Your queue is empty</Text>
                <Text style={styles.emptySubtitle}>
                  Add songs to queue from search or library to keep music playing
                </Text>
              </View>
            ) : (
              <FlatList
                data={upcomingQueue}
                keyExtractor={(item, idx) => `queue-${item.id}-${idx}`}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={styles.queueItem}
                    activeOpacity={0.7}
                    onPress={() => handlePlaySong(item)}
                  >
                    <Text style={styles.queueIndex}>{index + 1}</Text>
                    <Image source={{ uri: item.imageUrl }} style={styles.queueArt} />
                    <View style={styles.queueInfo}>
                      <Text style={styles.queueSongTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.queueSongArtist} numberOfLines={1}>
                        {item.artist}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemove(item, index);
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    height: '75%',
    backgroundColor: '#14131A',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
    paddingTop: spacing.md,
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
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  badge: {
    backgroundColor: colors.accentAlpha25,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.accent,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  clearBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.error,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nowPlayingSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  nowPlayingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(184, 166, 224, 0.08)',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  songArt: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundInput,
  },
  songInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  songTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.accent,
    marginBottom: 2,
  },
  songArtist: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  eqWrapper: {
    marginRight: spacing.sm,
  },
  upNextSection: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: 40,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider,
  },
  queueIndex: {
    width: 24,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  queueArt: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundInput,
    marginLeft: spacing.xs,
  },
  queueInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  queueSongTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  queueSongArtist: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  removeBtn: {
    padding: spacing.xs,
  },
});
