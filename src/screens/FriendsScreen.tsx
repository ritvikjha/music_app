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
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { useJam } from '../context/JamContext';
import { useToast } from '../context/ToastContext';
import { syncManager } from '../services/playbackSyncManager';
import { MiniPlayer } from '../components/MiniPlayer';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import type { Friend, UserPresence, LiveActivityFeedItem } from '../types';

const STORAGE_KEY = '@jam_friends_list';
const FOLLOWING_STORAGE_KEY = '@jam_following_list';

function getInitials(name: string): string {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

function randomTag(): string {
  return Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
}

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.floor(diffHour / 24)}d ago`;
}

/**
 * Friends screen — add, manage, and invite real friends.
 * Module 1: Social Graph & Live Presence + Custom Playlists & Deep Links + Live Activity Hub
 */
export default function FriendsScreen() {
  const [activeTab, setActiveTab] = useState<'squad' | 'activity'>('squad');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [followingList, setFollowingList] = useState<string[]>([]);
  const [newFriendInput, setNewFriendInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Live presence and activity feed state
  const [presences, setPresences] = useState<UserPresence[]>([]);
  const [activityFeed, setActivityFeed] = useState<LiveActivityFeedItem[]>([]);

  const router = useRouter();
  const { user, fullTag } = useAuth();
  const { isInRoom, roomId, createRoom, joinRoom } = useJam();
  const { showToast } = useToast();

  // Load saved friends and following list on mount
  useEffect(() => {
    async function loadData() {
      try {
        const savedFriends = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedFriends) {
          const parsed = JSON.parse(savedFriends);
          if (Array.isArray(parsed)) {
            const migrated = parsed.map((f: Friend) => ({
              ...f,
              tag: f.tag || randomTag(),
            }));
            setFriends(migrated);
          }
        }

        const savedFollowing = await AsyncStorage.getItem(FOLLOWING_STORAGE_KEY);
        if (savedFollowing) {
          const parsedFollowing = JSON.parse(savedFollowing);
          if (Array.isArray(parsedFollowing)) {
            setFollowingList(parsedFollowing);
          }
        }
      } catch (err) {
        console.error('[Friends] Failed to load data:', err);
      }
    }
    loadData();
  }, []);

  // Subscribe to live presences & activity feed from Socket.io server
  useEffect(() => {
    // 1. Subscribe to presence broadcasts
    const unsubPresence = syncManager.onPresenceSync((latestPresences) => {
      setPresences(latestPresences);
    });

    // 2. Subscribe to real-time activity feed events
    const unsubActivityUpdate = syncManager.onActivityFeedUpdate((item) => {
      setActivityFeed((prev) => [item, ...prev.filter((x) => x.id !== item.id)].slice(0, 40));
    });

    // 3. Subscribe to initial bulk activity feed
    const unsubActivitySync = syncManager.onActivityFeedSync((feed) => {
      setActivityFeed(feed);
    });

    // Request initial state from server
    syncManager.requestPresenceSync();
    syncManager.requestActivityFeedSync();

    // Periodic heartbeat to refresh presences
    const interval = setInterval(() => {
      syncManager.requestPresenceSync();
    }, 15000);

    return () => {
      unsubPresence();
      unsubActivityUpdate();
      unsubActivitySync();
      clearInterval(interval);
    };
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

  // Follow / Unfollow toggle
  const handleToggleFollow = async (friend: Friend) => {
    const friendKey = `${friend.username}#${friend.tag}`;
    const isCurrentlyFollowing = followingList.includes(friendKey);
    let updatedFollowing: string[];

    if (isCurrentlyFollowing) {
      updatedFollowing = followingList.filter((k) => k !== friendKey);
      showToast(`Unfollowed ${friend.username}`, 'info');
    } else {
      updatedFollowing = [...followingList, friendKey];
      showToast(`Now following ${friend.username}!`, 'success');
      // Emit activity event for follow
      syncManager.emitActivityEvent({
        type: 'vibe_started',
        user: { username: user?.username || 'You', tag: user?.tag },
        meta: `followed ${friend.username}#${friend.tag}`,
      });
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFollowingList(updatedFollowing);
    try {
      await AsyncStorage.setItem(FOLLOWING_STORAGE_KEY, JSON.stringify(updatedFollowing));
    } catch (err) {
      console.error('[Friends] Failed to update following:', err);
    }
  };

  // Add friend handler
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

    if (!tag) {
      tag = randomTag();
    }

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
    showToast(`Added ${username}#${tag}`, 'success');
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

  // Invite friend to Jam with deep-link generation
  const handleInvite = async (friend: Friend) => {
    if (isInRoom && roomId) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        syncManager.sendGameInvite(friend.username, friend.tag, roomId);
        showToast(`Sending invite to ${friend.username}…`, 'info');
      } catch (err) {
        console.warn('[Friends] Share error:', err);
      }
    } else {
      Alert.alert(
        'Create a Jam Room',
        `Start a Jam room to listen together in sub-second sync with ${friend.username}?`,
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

  // Share custom playlist deep link
  const handleSharePlaylist = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const deepLink = `jam://playlist/favorites`;
      await Share.share({
        message: `🔥 Check out my curated Cyber Jam Playlist on Jam Music!\n\nOpen playlist:\n${deepLink}`,
        title: 'Share Playlist',
      });
      showToast('Playlist invite ready!', 'info');
    } catch (err) {
      console.warn('[Friends] Share playlist error:', err);
    }
  };

  // Join a friend's active room directly
  const handleJoinFriendRoom = (targetRoomId: string, friendName: string, isGame = false) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    joinRoom(targetRoomId);
    router.push(isGame ? '/(tabs)/games' : '/(tabs)/jam');
    showToast(isGame ? `Joining ${friendName}'s game…` : `Tuning into ${friendName}'s room…`, 'info');
  };

  // Find active presence for a specific friend
  const getFriendPresence = useCallback(
    (friend: Friend): UserPresence | undefined => {
      return presences.find((p) => {
        if (p.tag && friend.tag && p.tag === friend.tag) return true;
        return p.username.toLowerCase() === friend.username.toLowerCase();
      });
    },
    [presences]
  );

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
          <Text style={styles.headerTitle}>Social & Friends</Text>
          <Text style={styles.headerSubtitle}>
            {fullTag ? `Tag: ${fullTag}` : 'Connect and listen together'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.sharePlaylistButton}
            onPress={handleSharePlaylist}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social-outline" size={17} color={colors.accentSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleAddButton, isAdding && styles.toggleAddButtonActive]}
            onPress={() => setIsAdding((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isAdding ? 'close' : 'person-add'}
              size={18}
              color={isAdding ? colors.textPrimary : colors.accent}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Tab Navigation: Squad vs Live Activity */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'squad' && styles.tabButtonActive]}
          onPress={() => setActiveTab('squad')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="people"
            size={15}
            color={activeTab === 'squad' ? '#000000' : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'squad' && styles.tabButtonTextActive,
            ]}
          >
            Squad ({friends.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'activity' && styles.tabButtonActive]}
          onPress={() => setActiveTab('activity')}
          activeOpacity={0.8}
        >
          <View style={styles.livePulseDot} />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'activity' && styles.tabButtonTextActive,
            ]}
          >
            Live Activity Hub
          </Text>
        </TouchableOpacity>
      </View>

      {/* Live Jam Room Active Banner */}
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
          <Text style={styles.liveBannerHint}>Invite Friends ➔</Text>
        </TouchableOpacity>
      ) : null}

      {/* TAB 1: SQUAD & FRIENDS */}
      {activeTab === 'squad' && (
        <>
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

          {/* Search friends bar */}
          {friends.length > 0 && (
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search friends by name or #tag..."
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
              <Text style={styles.emptyTitle}>No Friends in Squad</Text>
              <Text style={styles.emptySubtitle}>
                Add your friends using their unique tag to invite them to live Jam listening rooms and see what they are listening to in real time.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={() => setIsAdding(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={18} color="#000000" />
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
              renderItem={({ item }) => {
                const presence = getFriendPresence(item);
                const isListening = !!(presence?.isPlaying && presence?.currentSong);
                const isOnline = !!presence?.isOnline && Date.now() - presence.lastSeen < 45000;
                const friendKey = `${item.username}#${item.tag}`;
                const isFollowing = followingList.includes(friendKey);

                return (
                  <View style={styles.friendItem}>
                    <View style={styles.avatarContainer}>
                      <View
                        style={[
                          styles.avatar,
                          isListening && styles.avatarActiveListening,
                        ]}
                      >
                        <Text style={styles.avatarText}>
                          {getInitials(item.username)}
                        </Text>
                      </View>
                      {isOnline && (
                        <View
                          style={[
                            styles.onlineDot,
                            isListening && styles.listeningDot,
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.friendInfo}>
                      <View style={styles.nameTagRow}>
                        <Text style={styles.friendName}>{item.username}</Text>
                        <View style={styles.tagBadge}>
                          <Text style={styles.tagBadgeText}>#{item.tag}</Text>
                        </View>
                        {isFollowing && (
                          <View style={styles.followingBadge}>
                            <Text style={styles.followingBadgeText}>FOLLOWING</Text>
                          </View>
                        )}
                      </View>

                      {/* Real-time "Listening To..." Song Badge */}
                      {isListening && presence?.currentSong ? (
                        <View style={styles.listeningBadgeCard}>
                          <View style={styles.equalizerMini}>
                            <View style={[styles.eqBar, { height: 10 }]} />
                            <View style={[styles.eqBar, { height: 14 }]} />
                            <View style={[styles.eqBar, { height: 8 }]} />
                          </View>
                          <Text style={styles.listeningSongTitle} numberOfLines={1}>
                            {presence.currentSong.title}
                            <Text style={styles.listeningSongArtist}>
                              {' '}• {presence.currentSong.artist}
                            </Text>
                          </Text>
                        </View>
                      ) : presence?.currentGame && isOnline ? (
                        <Text style={styles.friendStatus}>
                          Playing {presence.currentGame.type === 'word_duel' ? 'Word Duel' : presence.currentGame.type === 'trivia_duel' ? 'Trivia Duel' : 'Two Truths & a Lie'}
                        </Text>
                      ) : isOnline ? (
                        <Text style={styles.friendStatus}>Online now</Text>
                      ) : (
                        <Text style={styles.friendStatus}>Offline</Text>
                      )}
                    </View>

                    <View style={styles.actionButtons}>
                      {/* Tune In if friend has a room */}
                      {presence?.currentGame && isOnline ? (
                        <TouchableOpacity
                          style={styles.tuneInButton}
                          onPress={() => handleJoinFriendRoom(presence.currentGame!.roomId, item.username, true)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="game-controller" size={13} color="#000000" />
                          <Text style={styles.tuneInText}>Join game</Text>
                        </TouchableOpacity>
                      ) : presence?.roomId && isOnline ? (
                        <TouchableOpacity
                          style={styles.tuneInButton}
                          onPress={() => handleJoinFriendRoom(presence.roomId!, item.username)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="headset" size={13} color="#000000" />
                          <Text style={styles.tuneInText}>Tune In</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.inviteButton}
                          onPress={() => handleInvite(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="radio" size={13} color="#000000" />
                          <Text style={styles.inviteText}>Jam</Text>
                        </TouchableOpacity>
                      )}

                      {/* Follow / Unfollow */}
                      <TouchableOpacity
                        style={[
                          styles.followButton,
                          isFollowing && styles.followButtonActive,
                        ]}
                        onPress={() => handleToggleFollow(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isFollowing ? 'checkmark-circle' : 'add-circle-outline'}
                          size={18}
                          color={isFollowing ? colors.accent : colors.textSecondary}
                        />
                      </TouchableOpacity>

                      {/* Remove Friend */}
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
                );
              }}
            />
          )}
        </>
      )}

      {/* TAB 2: LIVE ACTIVITY HUB */}
      {activeTab === 'activity' && (
        <ScrollView
          style={styles.activityScroll}
          contentContainerStyle={styles.activityContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.activityHeaderRow}>
            <View style={styles.activityHeaderLeft}>
              <View style={styles.livePulseDotLarge} />
              <Text style={styles.activitySectionTitle}>Real-Time Activity Pulse</Text>
            </View>
            <TouchableOpacity
              style={styles.refreshActivityBtn}
              onPress={() => {
                syncManager.requestActivityFeedSync();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                showToast('Activity refreshed', 'info');
              }}
            >
              <Ionicons name="reload" size={13} color={colors.textSecondary} />
              <Text style={styles.refreshActivityText}>Sync</Text>
            </TouchableOpacity>
          </View>

          {activityFeed.length === 0 ? (
            <View style={styles.emptyActivityBox}>
              <Ionicons name="pulse-outline" size={40} color={colors.accentSecondary} />
              <Text style={styles.emptyActivityTitle}>Awaiting Live Activity</Text>
              <Text style={styles.emptyActivitySub}>
                Room creations, track upvotes, and top playlist additions will stream here live over Socket.io.
              </Text>
            </View>
          ) : (
            activityFeed.map((item) => {
              const isRoom = item.type === 'room_created';
              const isVote = item.type === 'track_upvoted';
              const isPlaylist = item.type === 'playlist_added';

              return (
                <View key={item.id} style={styles.activityCard}>
                  <View
                    style={[
                      styles.activityIconCircle,
                      isRoom && { backgroundColor: 'rgba(29, 185, 84, 0.15)' },
                      isVote && { backgroundColor: 'rgba(244, 63, 94, 0.15)' },
                      isPlaylist && { backgroundColor: 'rgba(29, 185, 84, 0.15)' },
                    ]}
                  >
                    <Ionicons
                      name={
                        isRoom
                          ? 'radio'
                          : isVote
                          ? 'flame'
                          : isPlaylist
                          ? 'musical-notes'
                          : 'sparkles'
                      }
                      size={18}
                      color={
                        isRoom
                          ? colors.accent
                          : isVote
                          ? colors.neonPink
                          : isPlaylist
                          ? colors.neonViolet
                          : colors.accentSecondary
                      }
                    />
                  </View>

                  <View style={styles.activityContent}>
                    <View style={styles.activityUserRow}>
                      <Text style={styles.activityUserName}>{item.user.username}</Text>
                      {item.user.tag ? (
                        <Text style={styles.activityUserTag}>#{item.user.tag}</Text>
                      ) : null}
                      <Text style={styles.activityTime}>{formatTimeAgo(item.timestamp)}</Text>
                    </View>

                    <Text style={styles.activityMeta}>{item.meta}</Text>

                    {item.roomId ? (
                      <View style={styles.activityRoomActionRow}>
                        <TouchableOpacity
                          style={styles.joinRoomActivityBtn}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            joinRoom(item.roomId!);
                            router.push('/(tabs)/jam');
                            showToast(`Joined Room #${item.roomId}`, 'success');
                          }}
                        >
                          <Ionicons name="play" size={11} color="#000000" />
                          <Text style={styles.joinRoomActivityText}>Join #{item.roomId}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.accent,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sharePlaylistButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  toggleAddButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  toggleAddButtonActive: {
    backgroundColor: colors.backgroundInput,
    borderColor: colors.accentAlpha25,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundElevated,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.accent,
  },
  tabButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  tabButtonTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.neonPink,
  },
  livePulseDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neonPink,
  },
  liveRoomBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accentAlpha10,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  addCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  confirmButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.35,
  },
  confirmButtonText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: typography.sizes.sm,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 130,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
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
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  avatarActiveListening: {
    borderColor: colors.accent,
  },
  avatarText: {
    fontSize: typography.sizes.md,
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
  listeningDot: {
    backgroundColor: colors.accent,
  },
  friendInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.xs,
  },
  nameTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  friendName: {
    fontSize: typography.sizes.sm + 1,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  tagBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  tagBadgeText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  followingBadge: {
    backgroundColor: colors.accentAlpha15,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  followingBadgeText: {
    fontSize: 9,
    color: colors.accent,
    fontWeight: '700',
  },
  friendStatus: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listeningBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.25)',
    gap: 5,
  },
  equalizerMini: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 14,
  },
  eqBar: {
    width: 2.5,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  listeningSongTitle: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
    flex: 1,
  },
  listeningSongArtist: {
    color: colors.textSecondary,
    fontWeight: '400',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  inviteText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: '#000000',
  },
  tuneInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  tuneInText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: '#000000',
  },
  followButton: {
    padding: 6,
  },
  followButtonActive: {
    opacity: 0.9,
  },
  deleteButton: {
    padding: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  emptyAddButtonText: {
    color: '#000000',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
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
  activityScroll: {
    flex: 1,
  },
  activityContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 110,
    paddingTop: spacing.xs,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activitySectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  refreshActivityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  refreshActivityText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyActivityBox: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: spacing.md,
  },
  emptyActivityTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyActivitySub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: spacing.md,
  },
  activityIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  activityUserName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  activityUserTag: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  activityTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  activityMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  activityRoomActionRow: {
    marginTop: spacing.xs + 2,
  },
  joinRoomActivityBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  joinRoomActivityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
});
