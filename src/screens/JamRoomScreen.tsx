import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Share,
  Image,
  ScrollView,
  Animated as RNAnimated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useJam } from '../context/JamContext';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { searchSongs } from '../services/saavn';
import { AvatarRow } from '../components/AvatarRow';
import { SongCard } from '../components/SongCard';
import { GlowCard } from '../components/GlowCard';
import { MiniPlayer } from '../components/MiniPlayer';
import { SkeletonList } from '../components/Skeleton';
import { AnimatedEqualizer } from '../components/AnimatedEqualizer';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import type { Song } from '../types';

/**
 * Jam Room screen — create/join rooms, shared synchronized playback,
 * and shared FIFO queue.
 */
export default function JamRoomScreen() {
  const {
    isInRoom,
    roomId,
    memberCount,
    isConnected,
    jamQueue,
    createRoom,
    joinRoom,
    leaveRoom,
    jamChangeSong,
    jamAddToQueue,
    jamRemoveFromQueue,
  } = useJam();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Join room input
  const [joinCode, setJoinCode] = useState('');

  // In-room search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Pulse animation for live badge
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    if (isInRoom && isConnected) {
      const pulseLoop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 900,
            useNativeDriver: true,
          }),
          RNAnimated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    }
  }, [isInRoom, isConnected, pulseAnim]);

  const handleCreateRoom = useCallback(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    createRoom();
    showToast('Jam room created!', 'success');
  }, [createRoom, showToast]);

  const handleJoin = useCallback(() => {
    if (joinCode.trim().length >= 4) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      joinRoom(joinCode.trim().toUpperCase());
      setJoinCode('');
      showToast('Joined Jam room!', 'success');
    }
  }, [joinCode, joinRoom, showToast]);

  const handleCopyCode = useCallback(async () => {
    if (roomId) {
      await Clipboard.setStringAsync(roomId);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      showToast(`Room code ${roomId} copied!`, 'success');
    }
  }, [roomId, showToast]);

  const handleShareRoom = useCallback(async () => {
    if (roomId) {
      try {
        await Share.share({
          message: `Join my Jam music listening room! Code: ${roomId}`,
          title: 'Jam Room Invite',
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    }
  }, [roomId]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchSongs(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      showToast('Search failed. Please try again.', 'error');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, showToast]);

  const handleSongPlayNow = useCallback(
    (song: Song) => {
      jamChangeSong(song);
      playSong(song);
      setSearchResults([]);
      setSearchQuery('');
      showToast(`Playing ${song.title}`, 'info');
    },
    [jamChangeSong, playSong, showToast]
  );

  const handleAddToJamQueue = useCallback(
    (song: Song) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      jamAddToQueue(song);
      showToast(`Added ${song.title} to Jam Queue`, 'success');
    },
    [jamAddToQueue, showToast]
  );

  const handleRemoveFromJamQueue = useCallback(
    (songId: string, title?: string) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      jamRemoveFromQueue(songId);
      showToast(title ? `Removed ${title} from queue` : 'Removed from queue', 'info');
    },
    [jamRemoveFromQueue, showToast]
  );

  const confirmLeaveRoom = useCallback(() => {
    Alert.alert('Leave Jam Room', 'Are you sure you want to leave this Jam?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          leaveRoom();
          showToast('Left Jam room', 'info');
        },
      },
    ]);
  }, [leaveRoom, showToast]);

  const currentUsername = user?.username ?? '';

  // ─── Not in a room ─────────────────────────────────────────────────────────
  if (!isInRoom) {
    return (
      <View style={styles.container}>
        <View style={styles.notInRoom}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={[styles.heroIcon, shadows.lavenderGlow]}>
              <Ionicons name="radio" size={40} color={colors.accent} />
            </View>
            <Text style={styles.heroTitle}>Start a Jam</Text>
            <Text style={styles.heroSubtitle}>
              Listen to music together with friends in real-time sync
            </Text>
          </View>

          {/* Create room */}
          <TouchableOpacity
            style={[styles.createButton, shadows.lavenderGlow]}
            onPress={handleCreateRoom}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={22} color={colors.background} />
            <Text style={styles.createButtonText}>Create New Room</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR JOIN WITH CODE</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Join room */}
          <View style={styles.joinContainer}>
            <TextInput
              style={styles.joinInput}
              placeholder="ROOM CODE"
              placeholderTextColor={colors.textSecondary}
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              maxLength={8}
              returnKeyType="join"
              onSubmitEditing={handleJoin}
            />
            <TouchableOpacity
              style={[
                styles.joinButton,
                joinCode.trim().length < 4 && styles.joinButtonDisabled,
              ]}
              onPress={handleJoin}
              disabled={joinCode.trim().length < 4}
              activeOpacity={0.8}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>
        <MiniPlayer />
      </View>
    );
  }

  // ─── In a room ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Room header card */}
        <GlowCard style={styles.roomCard}>
          <View style={styles.roomCardInner}>
            <View style={styles.roomTopRow}>
              <View style={styles.roomCodeContainer}>
                <Text style={styles.roomLabel}>JAM ROOM CODE</Text>
                <View style={styles.roomCodeRow}>
                  <Text style={styles.roomCode}>{roomId}</Text>
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={handleCopyCode}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="copy-outline" size={18} color={colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={handleShareRoom}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-social-outline" size={18} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.connectionBadge}>
                <RNAnimated.View
                  style={[
                    styles.connectionDot,
                    {
                      backgroundColor: isConnected ? colors.online : colors.error,
                      transform: isConnected ? [{ scale: pulseAnim }] : [],
                    },
                  ]}
                />
                <Text style={styles.connectionText}>
                  {isConnected ? 'LIVE SYNC' : 'Reconnecting...'}
                </Text>
              </View>
            </View>

            {/* Members */}
            <View style={styles.membersRow}>
              <AvatarRow count={memberCount} />
              <Text style={styles.memberText}>
                {memberCount} {memberCount === 1 ? "person jammin'" : "people jammin'"}
              </Text>
            </View>

            {/* Current song */}
            {currentSong && (
              <View style={styles.currentSongInfo}>
                {isPlaying ? (
                  <AnimatedEqualizer size={16} color={colors.accent} />
                ) : (
                  <Ionicons name="musical-notes" size={14} color={colors.accent} />
                )}
                <Text style={styles.currentSongText} numberOfLines={1}>
                  {currentSong.title} — {currentSong.artist}
                </Text>
              </View>
            )}
          </View>
        </GlowCard>

        {/* Up Next FIFO Shared Queue Section */}
        <View style={styles.queueSection}>
          <View style={styles.queueHeader}>
            <Ionicons name="list" size={16} color={colors.accent} />
            <Text style={styles.queueTitle}>
              Up Next · {jamQueue.length} {jamQueue.length === 1 ? 'song' : 'songs'}
            </Text>
          </View>

          {jamQueue.length === 0 ? (
            <View style={styles.emptyQueueCard}>
              <Text style={styles.emptyQueueText}>
                No upcoming songs. Search and add tracks to the shared queue below!
              </Text>
            </View>
          ) : (
            <View style={styles.queueList}>
              {jamQueue.map((entry, index) => {
                const isOwn =
                  entry.addedBy === currentUsername ||
                  entry.addedBy?.startsWith(currentUsername) ||
                  !entry.addedBy;

                return (
                  <View key={`jam-q-${entry.songId}-${index}`} style={styles.queueItem}>
                    {entry.song?.imageUrl ? (
                      <Image source={{ uri: entry.song.imageUrl }} style={styles.queueThumb} />
                    ) : (
                      <View style={styles.queueThumbFallback}>
                        <Ionicons name="musical-note" size={18} color={colors.accent} />
                      </View>
                    )}
                    <View style={styles.queueInfo}>
                      <Text style={styles.queueItemTitle} numberOfLines={1}>
                        {entry.song?.title || 'Loading song...'}
                      </Text>
                      <Text style={styles.queueItemSubtitle} numberOfLines={1}>
                        {entry.song?.artist || 'JioSaavn'} • Added by {entry.addedBy || 'Jammer'}
                      </Text>
                    </View>

                    {isOwn && (
                      <TouchableOpacity
                        onPress={() => handleRemoveFromJamQueue(entry.songId, entry.song?.title)}
                        style={styles.queueRemoveBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Search songs to queue in room */}
        <View style={styles.roomSearch}>
          <Text style={styles.searchSectionTitle}>Add Songs to Jam</Text>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search to play or queue..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search results or skeleton loading */}
        {isSearching ? (
          <View style={styles.searchResultsSkeleton}>
            <SkeletonList count={5} />
          </View>
        ) : searchResults.length > 0 ? (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.resultsHeaderHint}>Tap to play now or tap + to queue</Text>
            {searchResults.map((item) => (
              <SongCard
                key={`inroom-search-${item.id}`}
                song={item}
                onPress={handleSongPlayNow}
                onAddToQueue={handleAddToJamQueue}
                isPlaying={currentSong?.id === item.id}
              />
            ))}
          </View>
        ) : null}

        {/* Leave button */}
        <View style={styles.leaveContainer}>
          <TouchableOpacity
            style={styles.leaveButton}
            onPress={confirmLeaveRoom}
            activeOpacity={0.8}
          >
            <Ionicons name="exit-outline" size={18} color={colors.error} />
            <Text style={styles.leaveText}>Leave Room</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },

  // ─── Not in room ───────────────────────────────────────────────────────────
  notInRoom: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.accentAlpha25,
  },
  heroTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  createButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  createButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.background,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xxl,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  dividerText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
    letterSpacing: 1,
  },
  joinContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  joinInput: {
    flex: 1,
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.lg,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.divider,
    letterSpacing: 4,
    textAlign: 'center',
    fontWeight: typography.weights.bold,
  },
  joinButton: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  joinButtonDisabled: {
    opacity: 0.35,
    borderColor: colors.divider,
  },
  joinButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.accent,
  },

  // ─── In room ───────────────────────────────────────────────────────────────
  roomCard: {
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  roomCardInner: {
    padding: spacing.xl,
  },
  roomTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  roomCodeContainer: {},
  roomLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  roomCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roomCode: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: colors.accent,
    letterSpacing: 4,
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.backgroundInput,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundInput,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  memberText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  currentSongInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentAlpha10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },
  currentSongText: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
    fontWeight: typography.weights.medium,
    flex: 1,
  },

  // ─── Queue Section ─────────────────────────────────────────────────────────
  queueSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  queueTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  emptyQueueCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  emptyQueueText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  queueList: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  queueThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.backgroundInput,
  },
  queueThumbFallback: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.backgroundInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueInfo: {
    flex: 1,
    marginLeft: spacing.sm + 2,
    marginRight: spacing.sm,
  },
  queueItemTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  queueItemSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  queueRemoveBtn: {
    padding: 6,
  },

  // ─── Room Search ───────────────────────────────────────────────────────────
  roomSearch: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchSectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  searchResultsSkeleton: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  searchResultsContainer: {
    marginTop: spacing.sm,
  },
  resultsHeaderHint: {
    fontSize: typography.sizes.xs,
    color: colors.accent,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },

  // ─── Leave Container ───────────────────────────────────────────────────────
  leaveContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  leaveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(224, 138, 138, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(224, 138, 138, 0.25)',
  },
  leaveText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.error,
  },
});
