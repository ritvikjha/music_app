import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import type { MostLikelyToItem } from '../../types';

interface MostLikelyToGameProps {
  roster: string[];
  myName: string;
  currentItem: MostLikelyToItem;
  currentIndex: number;
  totalItems: number;
  mltVotes: { [itemId: string]: { [voter: string]: string } };
  onVote: (votedFor: string, voterName?: string) => void;
  onNext: () => void;
  onBackToHub: () => void;
}

export function MostLikelyToGame({
  roster,
  myName,
  currentItem,
  currentIndex,
  totalItems,
  mltVotes,
  onVote,
  onNext,
  onBackToHub,
}: MostLikelyToGameProps) {
  const isDuoMode = roster.length === 2;
  const currentVotes = mltVotes[currentItem.id] || {};
  const myVote = currentVotes[myName];
  const totalVotes = Object.keys(currentVotes).length;

  // Calculate highest vote count among roster
  const voteCounts = roster.map(
    (p) => Object.values(currentVotes).filter((v) => v === p).length
  );
  const maxVotes = Math.max(...voteCounts, 0);

  return (
    <View style={styles.container}>
      {/* ─── Navigation Header ────────────────────────────────────────────── */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBackToHub}
          activeOpacity={0.75}
        >
          <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
          <Text style={styles.backBtnText}>Game Hub</Text>
        </TouchableOpacity>

        <View style={styles.gameRoundBar}>
          <Text style={styles.gameRoundText}>
            ROUND {currentIndex + 1} OF {totalItems}
          </Text>
        </View>

        <View style={styles.syncedTag}>
          <Text style={styles.syncedTagText}>
            {isDuoMode ? '👑 2-PLAYER SHOWDOWN' : '👑 SQUAD VOTE'}
          </Text>
        </View>
      </View>

      {/* ─── Prompt Card ──────────────────────────────────────────────────── */}
      <View style={styles.mltCard}>
        <View style={styles.mltBadge}>
          <Text style={styles.mltBadgeText}>ROUND #{currentIndex + 1}</Text>
        </View>
        <Text style={styles.mltPromptLead}>WHO IS MOST LIKELY TO...</Text>
        <Text style={styles.mltPromptText}>{currentItem.prompt}</Text>
      </View>

      {/* Prompt Subtitle */}
      <Text style={styles.votePromptSubtitle}>
        {isDuoMode
          ? 'TAP WHO WOULD DO THIS:'
          : 'TAP A FRIEND TO CAST YOUR VOTE:'}
      </Text>

      {/* ─── Player Candidate Grid ────────────────────────────────────────── */}
      <View style={styles.mltGrid}>
        {roster.map((player) => {
          const playerVotes = Object.values(currentVotes).filter(
            (v) => v === player
          ).length;
          const isWinner = totalVotes > 0 && maxVotes > 0 && playerVotes === maxVotes;
          const isSelectedByMe = myVote === player;

          return (
            <TouchableOpacity
              key={player}
              style={[
                styles.candidateCard,
                isDuoMode && styles.candidateCardDuo,
                isSelectedByMe && styles.candidateSelected,
                isWinner && styles.candidateWinner,
              ]}
              onPress={() => onVote(player, myName)}
              activeOpacity={0.85}
            >
              {isWinner && (
                <View style={styles.crownBadge}>
                  <Text style={styles.crownBadgeText}>👑 GUILTY</Text>
                </View>
              )}

              <View
                style={[
                  styles.candidateAvatar,
                  isSelectedByMe && styles.candidateAvatarSelected,
                ]}
              >
                <Text
                  style={[
                    styles.candidateAvatarText,
                    isSelectedByMe && styles.candidateAvatarTextSelected,
                  ]}
                >
                  {player.charAt(0).toUpperCase()}
                </Text>
              </View>

              <Text style={styles.candidateName} numberOfLines={1}>
                {player}
              </Text>

              <View style={styles.voteCounterPill}>
                <Text style={styles.voteCountText}>
                  {playerVotes} {playerVotes === 1 ? 'vote' : 'votes'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── Next Round CTA Button ────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.nextRoundButton}
        onPress={onNext}
        activeOpacity={0.85}
      >
        <Text style={styles.nextRoundButtonText}>NEXT ROUND</Text>
        <Ionicons name="arrow-forward" size={16} color="#000000" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  backBtnText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  gameRoundBar: {
    backgroundColor: colors.backgroundInput,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  gameRoundText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  syncedTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  syncedTagText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.3,
  },

  // Prompt Card
  mltCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    ...shadows.cardShadow,
    marginBottom: spacing.md,
  },
  mltBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    marginBottom: spacing.xs + 2,
  },
  mltBadgeText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  mltPromptLead: {
    color: '#F59E0B',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  mltPromptText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    lineHeight: 26,
  },

  votePromptSubtitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.6,
    marginVertical: spacing.sm,
    textAlign: 'center',
  },

  // Candidate Grid
  mltGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  candidateCard: {
    width: '48%',
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderCard,
    position: 'relative',
  },
  candidateCardDuo: {
    width: '48%',
    paddingVertical: spacing.lg,
  },
  candidateSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentAlpha10,
    ...shadows.emeraldGlow,
  },
  candidateWinner: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  crownBadge: {
    position: 'absolute',
    top: -9,
    backgroundColor: '#F59E0B',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  crownBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
    color: '#000000',
  },
  candidateAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundInput,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  candidateAvatarSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentAlpha25,
  },
  candidateAvatarText: {
    color: colors.textPrimary,
    fontWeight: typography.weights.extrabold,
    fontSize: typography.sizes.md,
  },
  candidateAvatarTextSelected: {
    color: colors.accentLight,
  },
  candidateName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    marginBottom: 4,
    maxWidth: '90%',
  },
  voteCounterPill: {
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  voteCountText: {
    color: colors.textSecondary,
    fontSize: 9.5,
    fontWeight: typography.weights.extrabold,
  },

  // Next Round Button
  nextRoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  nextRoundButtonText: {
    color: '#000000',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
