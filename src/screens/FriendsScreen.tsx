import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Keyboard,
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { useJam } from '../context/JamContext';
import { useToast } from '../context/ToastContext';
import { MiniPlayer } from '../components/MiniPlayer';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import type { Friend } from '../types';

const STORAGE_KEY = '@jam_friends_list';

function getInitials(name: string): string {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

/**
 * Generate a random 4-digit tag if friend was added without one.
 */
function randomTag(): string {
  return Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
}

/**
 * Friends screen — add, manage, and invite real friends.
 * Supports unique tag identification (e.g. Ritvik#4821) so users know
 * they are adding the exact right friend.
 */
export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newFriendInput, setNewFriendInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();
  const { fullTag } = useAuth();
  const { isInRoom, roomId, createRoom } = useJam();
  const { showToast } = useToast();

  // Load saved friends on mount
  useEffect(() => {
    async function loadFriends() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Ensure every friend has a tag for backwards compatibility
            const migrated = parsed.map((f: Friend) => ({
              ...f,
              tag: f.tag || randomTag(),
            }));
            setFriends(migrated);
          }
        }
      } catch (err) {
        console.error('[Friends] Failed to load friends:', err);
      }
    }
    loadFriends();
  }, []);

  // Save friends helper
  const saveFriends = async (updated: Friend[]) => {
    setFriends(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('[Friends] Failed to save friends:', err);
    }
  };

  // Add friend handler — parses "Name#Tag" or just "Name"
  const handleAddFriend = () => {
    const raw = newFriendInput.trim();
    if (!raw) return;

    let username = raw;
    let tag = '';

    if (raw.includes('#')) {
      const parts = raw.split('#');
      username = parts[0].trim();
      tag = parts[1].trim();
    }

    if (!username) {
      Alert.alert('Invalid Name', 'Please enter a valid friend name.');
      return;
    }

    // Auto-generate tag if not provided
    if (!tag) {
      tag = randomTag();
    }

    // Check duplicate by both username and tag
    const isDuplicate = friends.some(
      (f) =>
        f.username.toLowerCase() === username.toLowerCase() &&
        f.tag === tag
    );

    if (isDuplicate) {
      Alert.alert('Already Added', `${username}#${tag} is already in your friends list.`);
      return;
    }

    const newFriend: Friend = {
      id: Date.now().toString(),
      username,
      tag,
      isOnline: true,
      activity: 'Ready to Jam',
    };

    const updated = [newFriend, ...friends];
    saveFriends(updated);
    setNewFriendInput('');
    setIsAdding(false);
    Keyboard.dismiss();
  };

  // Remove friend handler
  const handleRemoveFriend = (friend: Friend) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.username}#${friend.tag}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updated = friends.filter((f) => f.id !== friend.id);
            saveFriends(updated);
          },
        },
      ]
    );
  };

  // Invite friend to Jam
  const handleInvite = async (friend: Friend) => {
    if (isInRoom && roomId) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await Share.share({
          message: `Hey ${friend.username}! Join my live Jam music room '${roomId}' to listen together in sync! 🎧\n\nRoom code: ${roomId}`,
          title: `Jam Invite for ${friend.username}`,
        });
        showToast(`Invite sent to ${friend.username}!`, 'success');
      } catch (err) {
        console.warn('[Friends] Share error:', err);
      }
    } else {
      Alert.alert(
        'Create a Jam Room',
        `Start a Jam room to listen together with ${friend.username}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Jam Room',
            onPress: () => {
              createRoom();
              router.push('/(tabs)/jam');
              showToast(`Room created! Ready to invite ${friend.username}`, 'info');
            },
          },
        ]
      );
    }
  };

  // Filtered friends list
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase().trim();
    return friends.filter(
      (f) =>
        f.username.toLowerCase().includes(q) ||
        f.tag.toLowerCase().includes(q) ||
        `${f.username.toLowerCase()}#${f.tag}`.includes(q)
    );
  }, [friends, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Top action bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Friends</Text>
          <Text style={styles.headerSubtitle}>
            {fullTag ? `Your Tag: ${fullTag}` : 'Connect and listen together'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.toggleAddButton, isAdding && styles.toggleAddButtonActive]}
          onPress={() => setIsAdding((prev) => !prev)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isAdding ? 'close' : 'person-add'}
            size={19}
            color={isAdding ? colors.textPrimary : colors.accent}
          />
        </TouchableOpacity>
      </View>

      {/* Live Jam Room Banner */}
      {isInRoom && roomId ? (
        <TouchableOpacity
          style={styles.liveRoomBanner}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/jam')}
        >
          <View style={styles.liveBannerLeft}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBannerTitle}>
              Active Jam Room: <Text style={styles.liveBannerCode}>{roomId}</Text>
            </Text>
          </View>
          <Text style={styles.liveBannerHint}>Tap 'Invite' on any friend ➔</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptySessionBanner}>
          <Ionicons name="radio" size={14} color={colors.accent} />
          <Text style={styles.emptySessionText}>
            Tap "Invite" on any friend to start listening together!
          </Text>
        </View>
      )}

      {/* Add friend input card */}
      {isAdding && (
        <View style={styles.addCard}>
          <Text style={styles.addCardLabel}>Add friend by username or tag</Text>
          <Text style={styles.addCardHint}>
            Tip: Ask your friend for their Tag from their Profile (e.g. Ritvik#4821)
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ritvik#4821 or Ritvik"
              placeholderTextColor={colors.textSecondary}
              value={newFriendInput}
              onChangeText={setNewFriendInput}
              autoCapitalize="none"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddFriend}
            />
            <TouchableOpacity
              style={[
                styles.confirmButton,
                !newFriendInput.trim() && styles.confirmButtonDisabled,
              ]}
              onPress={handleAddFriend}
              disabled={!newFriendInput.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search friends bar if we have friends */}
      {friends.length > 0 && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or #tag..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Friends list or Empty state */}
      {friends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, shadows.lavenderGlow]}>
            <Ionicons name="people-outline" size={44} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>No Friends Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your friends using their unique tag to invite them to live Jam listening rooms.
          </Text>
          <TouchableOpacity
            style={[styles.emptyAddButton, shadows.lavenderGlow]}
            onPress={() => setIsAdding(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={18} color={colors.background} />
            <Text style={styles.emptyAddButtonText}>Add a Friend</Text>
          </TouchableOpacity>
        </View>
      ) : filteredFriends.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search-outline" size={36} color={colors.textSecondary} />
          <Text style={styles.noResultsText}>No friends matching "{searchQuery}"</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.friendItem}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getInitials(item.username)}
                  </Text>
                </View>
                {item.isOnline && <View style={styles.onlineDot} />}
              </View>

              <View style={styles.friendInfo}>
                <View style={styles.nameTagRow}>
                  <Text style={styles.friendName}>{item.username}</Text>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>#{item.tag}</Text>
                  </View>
                </View>
                <Text style={styles.friendStatus}>{item.activity || 'Ready to Jam'}</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.inviteButton}
                  onPress={() => handleInvite(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="radio" size={14} color={colors.accent} />
                  <Text style={styles.inviteText}>Jam</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleRemoveFriend(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.accent,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  toggleAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  toggleAddButtonActive: {
    backgroundColor: colors.backgroundInput,
  },
  addCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  addCardLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addCardHint: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  confirmButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.35,
  },
  confirmButtonText: {
    color: colors.background,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 90,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundInput,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  avatarText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.background,
  },
  friendInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  friendName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  tagBadge: {
    backgroundColor: colors.accentAlpha10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  tagBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.accent,
    fontWeight: typography.weights.semibold,
  },
  friendStatus: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentAlpha10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  inviteText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.accent,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    marginTop: -40,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  emptyAddButtonText: {
    color: colors.background,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  noResultsContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  noResultsText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  liveRoomBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(184, 166, 224, 0.12)',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  liveBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.online,
  },
  liveBannerTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  liveBannerCode: {
    color: colors.accent,
    fontWeight: typography.weights.bold,
  },
  liveBannerHint: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
  },
  emptySessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  emptySessionText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    flex: 1,
  },
});
