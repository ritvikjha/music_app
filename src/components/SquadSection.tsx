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
import { colors, spacing, borderRadius, typography } from '../theme';
import type { Friend } from '../types';

const STORAGE_KEY = '@jam_friends_list';

function randomTag(): string {
  return Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
}

export function SquadSection() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [friendInput, setFriendInput] = useState('');
  const { fullTag, user } = useAuth();
  const { isInRoom, roomId, createRoom } = useJam();
  const { showToast } = useToast();
  const router = useRouter();

  // Load saved friends
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const migrated = parsed.map((f: Friend) => ({
              ...f,
              tag: f.tag || randomTag(),
            }));
            setFriends(migrated);
          }
        }
      } catch (err) {
        console.error('[Squad] Failed to load friends:', err);
      }
    })();
  }, []);

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

    let username = raw;
    let tag = '';

    if (raw.includes('#')) {
      const parts = raw.split('#');
      username = parts[0].trim();
      tag = parts[1].trim();
    }

    if (!username) {
      Alert.alert('Invalid Name', 'Please enter a valid friend username.');
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
      Alert.alert('Already Added', `${username}#${tag} is already in your squad.`);
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const newFriend: Friend = {
      id: Date.now().toString(),
      username,
      tag,
      isOnline: true,
      activity: 'Ready to Jam',
    };

    const updated = [newFriend, ...friends];
    saveFriends(updated);
    setFriendInput('');
    setShowAddModal(false);
    Keyboard.dismiss();
    showToast(`Added ${username}#${tag} to your Squad!`, 'success');
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
            Add your friends by their tag (e.g. Ritvik#4821) to listen together in sync!
          </Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={15} color={colors.background} />
            <Text style={styles.emptyAddBtnText}>Add First Friend</Text>
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
                <Text style={styles.modalTitle}>Add Friend to Squad</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHelpText}>
              Enter your friend's name and 4-digit tag (e.g. "Ritvik#4821" or just "Ritvik"):
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="FriendName#1234"
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
                <Text style={styles.confirmBtnText}>Add Friend</Text>
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
});
