import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Share,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { useJam } from '../context/JamContext';
import { useToast } from '../context/ToastContext';
import { syncManager } from '../services/playbackSyncManager';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { Friend, FriendRequest } from '../types';

const STORAGE_KEY = '@jam_friends_list';
const INCOMING_REQ_KEY = '@jam_incoming_friend_requests';
const SENT_REQ_KEY = '@jam_sent_friend_requests';

export function SquadSection() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [friendInput, setFriendInput] = useState('');
  const { fullTag, user } = useAuth();
  const { isInRoom, roomId, createRoom } = useJam();
  const { showToast } = useToast();
  const router = useRouter();

  // Load saved friends and friend requests from storage
  useEffect(() => {
    (async () => {
      try {
        const savedFriends = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedFriends) {
          const parsed = JSON.parse(savedFriends);
          if (Array.isArray(parsed)) setFriends(parsed);
        }

        const savedIncoming = await AsyncStorage.getItem(INCOMING_REQ_KEY);
        if (savedIncoming) {
          const parsed = JSON.parse(savedIncoming);
          if (Array.isArray(parsed)) setIncomingRequests(parsed);
        }

        const savedSent = await AsyncStorage.getItem(SENT_REQ_KEY);
        if (savedSent) {
          const parsed = JSON.parse(savedSent);
          if (Array.isArray(parsed)) setSentRequests(parsed);
        }
      } catch (err) {
        console.error('[Squad] Failed to load squad data:', err);
      }
    })();
  }, []);

  // Register personal inbox for real-time peer friend requests
  useEffect(() => {
    if (user?.username && user?.tag) {
      syncManager.setUserInbox(user.username, user.tag);
    }
  }, [user]);

  // Subscribe to real-time friend signaling
  useEffect(() => {
    const unsubReq = syncManager.onFriendRequest((req) => {
      // Check if this request is targeted to me
      if (
        user &&
        req.to.username.toLowerCase() !== user.username.toLowerCase() &&
        req.to.tag !== user.tag
      ) {
        return;
      }

      setFriends((currFriends) => {
        // Check if already friends
        const isAlreadyFriend = currFriends.some(
          (f) =>
            f.username.toLowerCase() === req.from.username.toLowerCase() &&
            f.tag === req.from.tag
        );
        if (isAlreadyFriend) return currFriends;

        setIncomingRequests((prev) => {
          if (
            prev.some(
              (r) =>
                r.id === req.id ||
                (r.from.username.toLowerCase() === req.from.username.toLowerCase() &&
                  r.from.tag === req.from.tag)
            )
          ) {
            return prev;
          }
          const updated = [req, ...prev];
          AsyncStorage.setItem(INCOMING_REQ_KEY, JSON.stringify(updated)).catch(() => {});
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
          showToast(`🔔 Friend request from ${req.from.username}#${req.from.tag}!`, 'info');
          return updated;
        });

        return currFriends;
      });
    });

    const unsubAccept = syncManager.onFriendAccept((data) => {
      // Remove from our pending sent requests
      setSentRequests((prev) => {
        const updated = prev.filter(
          (r) =>
            !(
              r.to.username.toLowerCase() === data.from.username.toLowerCase() &&
              r.to.tag === data.from.tag
            )
        );
        AsyncStorage.setItem(SENT_REQ_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });

      // Add to our squad list
      setFriends((prev) => {
        const isAlready = prev.some(
          (f) =>
            f.username.toLowerCase() === data.from.username.toLowerCase() &&
            f.tag === data.from.tag
        );
        if (isAlready) return prev;

        const newFriend: Friend = {
          id: Date.now().toString(),
          username: data.from.username,
          tag: data.from.tag,
          isOnline: true,
          activity: 'Ready to Jam',
        };
        const updated = [newFriend, ...prev];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        showToast(`🎉 ${data.from.username}#${data.from.tag} accepted your friend request!`, 'success');
        return updated;
      });
    });

    const unsubDecline = syncManager.onFriendDecline((data) => {
      setSentRequests((prev) => {
        const updated = prev.filter(
          (r) =>
            !(
              r.to.username.toLowerCase() === data.from.username.toLowerCase() &&
              r.to.tag === data.from.tag
            )
        );
        AsyncStorage.setItem(SENT_REQ_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      showToast(`${data.from.username}#${data.from.tag} declined your request.`, 'info');
    });

    return () => {
      unsubReq();
      unsubAccept();
      unsubDecline();
    };
  }, [user, showToast]);

  const saveFriends = async (updated: Friend[]) => {
    setFriends(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('[Squad] Failed to save friends:', err);
    }
  };

  const handleAddFriend = () => {
    const raw = friendInput.trim();
    if (!raw) return;

    // Strict validation: Must match "Username#1234" (4-digit tag)
    const match = raw.match(/^([a-zA-Z0-9_\-\. ]+)#([0-9]{4})$/);
    if (!match) {
      Alert.alert(
        'Specific Tag Required',
        'You can only send friend requests to a specific friend tag.\n\nPlease enter their full name and 4-digit tag (e.g. Alex#9201).\n\nAsk your friend to tap the Share button in their Squad to copy their exact tag!'
      );
      return;
    }

    const targetUsername = match[1].trim();
    const targetTag = match[2].trim();

    // Prevent sending request to oneself
    if (
      user &&
      targetUsername.toLowerCase() === user.username.toLowerCase() &&
      targetTag === user.tag
    ) {
      Alert.alert('Cannot Add Yourself', 'You cannot send a friend request to your own tag.');
      return;
    }

    // Prevent duplicate friend
    const isAlreadyFriend = friends.some(
      (f) =>
        f.username.toLowerCase() === targetUsername.toLowerCase() &&
        f.tag === targetTag
    );
    if (isAlreadyFriend) {
      Alert.alert('Already Added', `${targetUsername}#${targetTag} is already in your squad.`);
      return;
    }

    // Prevent duplicate pending request
    const isAlreadySent = sentRequests.some(
      (r) =>
        r.to.username.toLowerCase() === targetUsername.toLowerCase() &&
        r.to.tag === targetTag
    );
    if (isAlreadySent) {
      Alert.alert(
        'Request Already Sent',
        `A friend request has already been sent to ${targetUsername}#${targetTag}. Waiting for them to accept.`
      );
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    // Send real-time peer request
    const newReq = syncManager.sendFriendRequest(targetUsername, targetTag, {
      username: user?.username || 'Player',
      tag: user?.tag || '0000',
    });

    const updatedSent = [newReq, ...sentRequests];
    setSentRequests(updatedSent);
    AsyncStorage.setItem(SENT_REQ_KEY, JSON.stringify(updatedSent)).catch(() => {});

    setFriendInput('');
    setShowAddModal(false);
    Keyboard.dismiss();
    showToast(`Friend request sent to ${targetUsername}#${targetTag}!`, 'success');
  };

  const handleAcceptRequest = (req: FriendRequest) => {
    if (!user) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    // Send acceptance confirmation over socket
    syncManager.acceptFriendRequest(req, {
      username: user.username,
      tag: user.tag,
    });

    // Add friend to local squad
    const newFriend: Friend = {
      id: Date.now().toString(),
      username: req.from.username,
      tag: req.from.tag,
      isOnline: true,
      activity: 'Ready to Jam',
    };
    const updatedFriends = [newFriend, ...friends];
    saveFriends(updatedFriends);

    // Remove from incoming requests
    const updatedIncoming = incomingRequests.filter((r) => r.id !== req.id);
    setIncomingRequests(updatedIncoming);
    AsyncStorage.setItem(INCOMING_REQ_KEY, JSON.stringify(updatedIncoming)).catch(() => {});

    showToast(`Added ${req.from.username}#${req.from.tag} to your Squad! 🎉`, 'success');
  };

  const handleDeclineRequest = (req: FriendRequest) => {
    if (!user) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    // Notify sender over socket
    syncManager.declineFriendRequest(req, {
      username: user.username,
      tag: user.tag,
    });

    // Remove from incoming requests
    const updatedIncoming = incomingRequests.filter((r) => r.id !== req.id);
    setIncomingRequests(updatedIncoming);
    AsyncStorage.setItem(INCOMING_REQ_KEY, JSON.stringify(updatedIncoming)).catch(() => {});

    showToast(`Declined request from ${req.from.username}`, 'info');
  };

  const handleCancelSentRequest = (req: FriendRequest) => {
    const updatedSent = sentRequests.filter((r) => r.id !== req.id);
    setSentRequests(updatedSent);
    AsyncStorage.setItem(SENT_REQ_KEY, JSON.stringify(updatedSent)).catch(() => {});
    showToast(`Cancelled request to ${req.to.username}#${req.to.tag}`, 'info');
  };

  const handleRemoveFriend = (friend: Friend) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}

    Alert.alert(
      'Remove Friend',
      `Remove ${friend.username}#${friend.tag} from your squad?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updated = friends.filter((f) => f.id !== friend.id);
            saveFriends(updated);
            showToast(`Removed ${friend.username}`, 'info');
          },
        },
      ]
    );
  };

  const handleInviteToJam = async (friend: Friend) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    if (isInRoom && roomId) {
      await Share.share({
        message: `Hey ${friend.username}! Join my live Jam listening room on Jam Music: https://jam.music/room/${roomId} (Room Code: ${roomId})`,
      });
    } else {
      Alert.alert(
        'Start a Jam?',
        `Start a Jam room right now to listen in sync with ${friend.username}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Jam Room',
            onPress: async () => {
              const newRoomId = await createRoom();
              router.push('/jam');
              await Share.share({
                message: `Hey ${friend.username}! I just started a Jam room on Jam Music: https://jam.music/room/${newRoomId} (Room Code: ${newRoomId})`,
              });
            },
          },
        ]
      );
    }
  };

  const handleShareTag = async () => {
    try {
      Haptics.selectionAsync();
      await Share.share({
        message: `Add me on Jam Music! My tag is ${fullTag || user?.username}. Let's listen to music together in real-time sync!`,
      });
    } catch (e) {
      console.warn('Share tag error:', e);
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="people" size={17} color={colors.accent} />
          <Text style={styles.sectionTitle}>My Squad</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{friends.length}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.shareTagBtn}
            onPress={handleShareTag}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="share-social-outline" size={16} color={colors.accent} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addSquadBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color={colors.background} />
            <Text style={styles.addSquadBtnText}>Add Friend</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Incoming Friend Requests ───────────────────────────────── */}
      {incomingRequests.length > 0 && (
        <View style={styles.incomingSection}>
          <View style={styles.incomingSectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="notifications" size={14} color="#00F2FE" />
              <Text style={styles.incomingSectionTitle}>INCOMING SQUAD REQUESTS</Text>
            </View>
            <View style={styles.incomingBadge}>
              <Text style={styles.incomingBadgeText}>{incomingRequests.length}</Text>
            </View>
          </View>
          {incomingRequests.map((req) => (
            <View key={req.id} style={styles.incomingCard}>
              <View style={styles.incomingCardLeft}>
                <View style={styles.incomingAvatar}>
                  <Text style={styles.incomingAvatarText}>
                    {req.from.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.incomingUsername}>{req.from.username}</Text>
                  <Text style={styles.incomingUserTag}>#{req.from.tag} wants to add you</Text>
                </View>
              </View>
              <View style={styles.incomingCardRight}>
                <TouchableOpacity
                  style={styles.incomingAcceptBtn}
                  onPress={() => handleAcceptRequest(req)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={14} color="#050508" />
                  <Text style={styles.incomingAcceptBtnText}>ACCEPT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.incomingDeclineBtn}
                  onPress={() => handleDeclineRequest(req)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ─── Pending Sent Requests ──────────────────────────────────── */}
      {sentRequests.length > 0 && (
        <View style={styles.sentRequestsWrap}>
          <Text style={styles.sentRequestsTitle}>PENDING SENT REQUESTS:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {sentRequests.map((req) => (
              <View key={req.id} style={styles.sentPill}>
                <Text style={styles.sentPillText}>
                  {req.to.username}#{req.to.tag} (waiting...)
                </Text>
                <TouchableOpacity
                  onPress={() => handleCancelSentRequest(req)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Friends Cards Scroll */}
      {friends.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="people-outline"
            size={36}
            color={colors.textSecondary}
            style={{ opacity: 0.4 }}
          />
          <Text style={styles.emptyTitle}>No squad members yet</Text>
          <Text style={styles.emptySubtitle}>
            Add a friend by their exact tag (e.g. Alex#9201) to listen together in sync!
          </Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={15} color={colors.background} />
            <Text style={styles.emptyAddBtnText}>Send Friend Request</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.friendsScroll}
        >
          {friends.map((friend) => (
            <View key={friend.id} style={styles.friendCard}>
              <TouchableOpacity
                style={styles.removeFriendBtn}
                onPress={() => handleRemoveFriend(friend)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close" size={14} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.avatarWrap}>
                <Text style={styles.avatarText}>
                  {friend.username.charAt(0).toUpperCase()}
                </Text>
                <View style={styles.onlineDot} />
              </View>

              <Text style={styles.friendName} numberOfLines={1}>
                {friend.username}
              </Text>
              <Text style={styles.friendTag}>#{friend.tag}</Text>

              <TouchableOpacity
                style={styles.inviteBtn}
                activeOpacity={0.8}
                onPress={() => handleInviteToJam(friend)}
              >
                <Ionicons name="radio" size={12} color={colors.accent} />
                <Text style={styles.inviteBtnText}>Invite</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Friend Modal */}
      <Modal
        visible={showAddModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="person-add-outline" size={20} color={colors.accent} />
                <Text style={styles.modalTitle}>Send Friend Request</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHelpText}>
              Enter your friend's exact username and 4-digit tag (e.g. "Alex#9201"). They will receive your request in real time!
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Username#1234 (e.g. Alex#9201)"
              placeholderTextColor={colors.textSecondary}
              value={friendInput}
              onChangeText={setFriendInput}
              autoFocus
              onSubmitEditing={handleAddFriend}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  !friendInput.trim() && { opacity: 0.5 },
                ]}
                onPress={handleAddFriend}
                disabled={!friendInput.trim()}
              >
                <Text style={styles.confirmBtnText}>Send Request</Text>
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
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.accentAlpha25,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 4,
  },
  shareTagBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accentAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
  },
  addSquadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  addSquadBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background,
  },
  friendsScroll: {
    gap: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  friendCard: {
    width: 120,
    backgroundColor: '#161522',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  removeFriendBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentAlpha10,
    borderWidth: 1.5,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
    position: 'relative',
  },
  avatarText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.accent,
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
    borderColor: '#161522',
  },
  friendName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  friendTag: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentAlpha25,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.35)',
  },
  inviteBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
  },
  emptyCard: {
    backgroundColor: '#161522',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 3,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full,
  },
  emptyAddBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalSheet: {
    backgroundColor: '#161522',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  modalHelpText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  modalInput: {
    height: 46,
    backgroundColor: '#1F1E2E',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  confirmBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.background,
  },
  incomingSection: {
    backgroundColor: '#151426',
    borderRadius: 16,
    padding: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.35)',
  },
  incomingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  incomingSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00F2FE',
    letterSpacing: 0.5,
  },
  incomingBadge: {
    backgroundColor: 'rgba(0, 242, 254, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  incomingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00F2FE',
  },
  incomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1D32',
    borderRadius: 12,
    padding: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  incomingCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  incomingAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00F2FE',
  },
  incomingAvatarText: {
    color: '#00F2FE',
    fontWeight: '900',
    fontSize: 14,
  },
  incomingUsername: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 13,
  },
  incomingUserTag: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  incomingCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  incomingAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00F2FE',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  incomingAcceptBtnText: {
    color: '#050508',
    fontWeight: '900',
    fontSize: 11,
  },
  incomingDeclineBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  sentRequestsWrap: {
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  sentRequestsTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  sentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sentPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
});
