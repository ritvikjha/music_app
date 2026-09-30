import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface RoomHeaderProps {
  isInRoom: boolean;
  roomId?: string | null;
  memberCount?: number;
  roster: string[];
  myName: string;
  messagesCount: number;
  onCopyRoom: () => void;
  onShareRoom: () => void;
  onLeaveRoom: () => void;
  onConnectOnline: () => void;
  onOpenChat: () => void;
  onAddPlayer: () => void;
  onRenamePlayer: (index: number, name: string) => void;
  onRemovePlayer: (name: string) => void;
  onSendEmojiBlast: (emoji: string) => void;
}

export function RoomHeader({
  isInRoom,
  roomId,
  memberCount = 1,
  roster,
  myName,
  messagesCount,
  onCopyRoom,
  onShareRoom,
  onLeaveRoom,
  onConnectOnline,
  onOpenChat,
  onAddPlayer,
  onRenamePlayer,
  onRemovePlayer,
  onSendEmojiBlast,
}: RoomHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

  return (
    <View style={styles.container}>
      {/* ─── Single-Line Compact Summary Bar ───────────────────────────────── */}
      <View style={styles.summaryBar}>
        <TouchableOpacity
          style={styles.summaryLeft}
          onPress={toggleExpand}
          activeOpacity={0.75}
        >
          <View style={[styles.statusDot, isInRoom ? styles.statusOnline : styles.statusPassPlay]} />
          <Text style={styles.summaryTitle} numberOfLines={1}>
            {isInRoom ? (
              <>
                ROOM <Text style={styles.summaryHighlight}>#{roomId}</Text> • {memberCount} online
              </>
            ) : (
              <>
                PASS & PLAY • <Text style={styles.summaryHighlight}>{roster.length} players</Text>
              </>
            )}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.textSecondary}
            style={{ marginLeft: spacing.xs }}
          />
        </TouchableOpacity>

        {/* Action Controls & Top Chat Button */}
        <View style={styles.summaryRight}>
          {!isInRoom && (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={onConnectOnline}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={11} color="#000000" />
              <Text style={styles.connectButtonText}>CONNECT</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.chatButton}
            onPress={onOpenChat}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-ellipses" size={14} color={colors.accent} />
            <Text style={styles.chatButtonText}>CHAT</Text>
            {messagesCount > 0 && (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>{messagesCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Expandable Details Drawer ─────────────────────────────────────── */}
      {isExpanded && (
        <View style={styles.expandedDrawer}>
          {/* Room Controls (when in online room) */}
          {isInRoom ? (
            <View style={styles.roomActionsRow}>
              <TouchableOpacity
                style={styles.roomActionBtn}
                onPress={onCopyRoom}
                activeOpacity={0.7}
              >
                <Ionicons name="copy-outline" size={14} color={colors.accent} />
                <Text style={styles.roomActionText}>Copy Code</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roomActionBtn}
                onPress={onShareRoom}
                activeOpacity={0.7}
              >
                <Ionicons name="share-social-outline" size={14} color={colors.accent} />
                <Text style={styles.roomActionText}>Share Room</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roomActionBtn, styles.roomActionLeave]}
                onPress={onLeaveRoom}
                activeOpacity={0.7}
              >
                <Ionicons name="exit-outline" size={14} color={colors.error} />
                <Text style={[styles.roomActionText, { color: colors.error }]}>Leave</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.passPlayBanner}>
              <Text style={styles.passPlayBannerText}>
                Take turns on one phone or connect online to sync all screens in real-time.
              </Text>
            </View>
          )}

          {/* Player Chips Strip */}
          <View style={styles.playerSection}>
            <View style={styles.playerHeader}>
              <Text style={styles.playerSectionTitle}>PLAYERS IN GAME ({roster.length}):</Text>
              <Text style={styles.playerSectionHint}>Tap name to edit</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {roster.map((player, idx) => {
                const isMe = idx === 0;
                return (
                  <View
                    key={player + idx}
                    style={[styles.playerChip, isMe && styles.playerChipMe]}
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarLetter}>
                        {player.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => onRenamePlayer(idx, player)}
                      style={styles.playerNameWrap}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.playerName} numberOfLines={1}>
                        {player}
                      </Text>
                      <Ionicons
                        name="pencil"
                        size={10}
                        color={colors.textSecondary}
                        style={{ marginLeft: 3 }}
                      />
                    </TouchableOpacity>

                    {roster.length > 2 && !isMe && (
                      <TouchableOpacity
                        onPress={() => onRemovePlayer(player)}
                        style={styles.removeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={13} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              <TouchableOpacity
                style={styles.addPlayerBtn}
                onPress={onAddPlayer}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={13} color="#000000" />
                <Text style={styles.addPlayerBtnText}>+ ADD</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Quick Reaction Blast Strip */}
          <View style={styles.reactionStrip}>
            <Text style={styles.reactionLabel}>REACTIONS:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reactionRow}
            >
              {['🔥', '😂', '💀', '😱', '👏', '🍾'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionBtn}
                  onPress={() => onSendEmojiBlast(emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  statusOnline: {
    backgroundColor: colors.online,
  },
  statusPassPlay: {
    backgroundColor: '#FFE600',
  },
  summaryTitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3,
  },
  summaryHighlight: {
    color: colors.accent,
    fontWeight: typography.weights.extrabold,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 3,
  },
  connectButtonText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  chatButtonText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  chatBadge: {
    backgroundColor: colors.neonPink,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 2,
  },
  chatBadgeText: {
    color: colors.textPrimary,
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
  },

  // Expanded Drawer
  expandedDrawer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    backgroundColor: colors.backgroundElevated,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  roomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  roomActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  roomActionLeave: {
    borderColor: 'rgba(255, 77, 109, 0.3)',
    marginLeft: 'auto',
  },
  roomActionText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  passPlayBanner: {
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  passPlayBannerText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },

  // Player Section
  playerSection: {
    marginBottom: spacing.sm,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  playerSectionTitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  playerSectionHint: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs - 1,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.lg,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  playerChipMe: {
    borderColor: colors.borderNeon,
    backgroundColor: colors.accentAlpha10,
  },
  avatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  avatarLetter: {
    color: colors.textPrimary,
    fontWeight: typography.weights.extrabold,
    fontSize: 10,
  },
  playerNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 90,
  },
  playerName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  removeBtn: {
    marginLeft: 6,
  },
  addPlayerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  addPlayerBtnText: {
    color: '#000000',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3,
  },

  // Reaction Strip
  reactionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  reactionLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.bold,
    marginRight: spacing.sm,
    letterSpacing: 0.5,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  reactionBtn: {
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  reactionEmoji: {
    fontSize: 15,
  },
});
