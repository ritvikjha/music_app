import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import type { WouldYouRatherItem } from '../../types';

interface WouldYouRatherGameProps {
  roster: string[];
  myName: string;
  currentItem: WouldYouRatherItem;
  currentIndex: number;
  totalItems: number;
  wyrVotes: { [itemId: string]: { [username: string]: 'A' | 'B' } };
  isInRoom: boolean;
  onVote: (option: 'A' | 'B', voterName?: string) => void;
  onNext: () => void;
  onBackToHub: () => void;
}

export function WouldYouRatherGame({
  roster,
  myName,
  currentItem,
  currentIndex,
  totalItems,
  wyrVotes,
  isInRoom,
  onVote,
  onNext,
  onBackToHub,
}: WouldYouRatherGameProps) {
  const isDuoMode = roster.length === 2;
  const currentVotes = wyrVotes[currentItem.id] || {};
  const myVote = currentVotes[myName];

  const player1 = roster[0] || myName;
  const player2 = roster[1] || 'Player 2';
  const player1Vote = currentVotes[player1];
  const player2Vote = currentVotes[player2];

  const totalVotes = Object.keys(currentVotes).length;
  const countA = Object.values(currentVotes).filter((v) => v === 'A').length;
  const countB = Object.values(currentVotes).filter((v) => v === 'B').length;

  const percentA =
    totalVotes > 0
      ? Math.round((countA / totalVotes) * 100)
      : currentItem.percentA || 50;
  const percentB =
    totalVotes > 0
      ? Math.round((countB / totalVotes) * 100)
      : currentItem.percentB || 50;

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
            DILEMMA {currentIndex + 1} OF {totalItems}
          </Text>
        </View>

        <View style={styles.syncedTag}>
          <Text style={styles.syncedTagText}>
            {isDuoMode ? '⚡ 2-PLAYER DUEL' : '👥 SQUAD VOTE'}
          </Text>
        </View>
      </View>

      {/* ─── 2-Player Pass & Play HUD ─────────────────────────────────────── */}
      {isDuoMode && !isInRoom && (
        <View style={styles.duoVoteHUD}>
          <View style={styles.duoVoteCard}>
            <Text style={styles.duoVoteName} numberOfLines={1}>
              {player1}
            </Text>
            <View style={styles.duoVoteRow}>
              <TouchableOpacity
                style={[
                  styles.duoMiniPill,
                  player1Vote === 'A' && styles.duoMiniPillA,
                ]}
                onPress={() => onVote('A', player1)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.duoMiniText,
                    player1Vote === 'A' && styles.duoMiniTextActive,
                  ]}
                >
                  Opt A
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.duoMiniPill,
                  player1Vote === 'B' && styles.duoMiniPillB,
                ]}
                onPress={() => onVote('B', player1)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.duoMiniText,
                    player1Vote === 'B' && styles.duoMiniTextActive,
                  ]}
                >
                  Opt B
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.duoVoteCard}>
            <Text style={styles.duoVoteName} numberOfLines={1}>
              {player2}
            </Text>
            <View style={styles.duoVoteRow}>
              <TouchableOpacity
                style={[
                  styles.duoMiniPill,
                  player2Vote === 'A' && styles.duoMiniPillA,
                ]}
                onPress={() => onVote('A', player2)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.duoMiniText,
                    player2Vote === 'A' && styles.duoMiniTextActive,
                  ]}
                >
                  Opt A
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.duoMiniPill,
                  player2Vote === 'B' && styles.duoMiniPillB,
                ]}
                onPress={() => onVote('B', player2)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.duoMiniText,
                    player2Vote === 'B' && styles.duoMiniTextActive,
                  ]}
                >
                  Opt B
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ─── 2-Player Match / Rivalry Banner ──────────────────────────────── */}
      {isDuoMode && player1Vote && player2Vote && (
        <View
          style={[
            styles.duoResultBanner,
            player1Vote === player2Vote
              ? styles.duoMatch
              : styles.duoClash,
          ]}
        >
          <Text style={styles.duoResultText}>
            {player1Vote === player2Vote
              ? '💖 PERFECT MATCH! You both picked the same!'
              : '⚡ OPPOSITES ATTRACT! You picked different choices!'}
          </Text>
        </View>
      )}

      {/* ─── Option A Card ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[
          styles.wyrOptionCard,
          styles.wyrCardA,
          myVote === 'A' && styles.wyrCardSelectedA,
        ]}
        onPress={() => onVote('A', myName)}
        activeOpacity={0.88}
      >
        <View style={styles.wyrCardTop}>
          <View
            style={[
              styles.optionPill,
              { backgroundColor: colors.accentAlpha25 },
            ]}
          >
            <Text style={[styles.optionPillText, { color: colors.accent }]}>
              OPTION A
            </Text>
          </View>
          {myVote === 'A' && (
            <View style={styles.votedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={15}
                color={colors.accent}
              />
              <Text style={styles.votedBadgeText}>YOUR VOTE</Text>
            </View>
          )}
        </View>

        <Text style={styles.wyrOptionText}>{currentItem.optionA}</Text>

        {/* Reveal Meter */}
        {myVote && (
          <View style={styles.meterContainer}>
            <View style={styles.meterTrack}>
              <View
                style={[
                  styles.meterFillA,
                  { width: `${percentA}%` },
                ]}
              />
            </View>
            <Text style={styles.percentTextA}>
              {percentA}% ({countA} of {totalVotes || 1} votes)
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ─── Lightning VS Badge ────────────────────────────────────────────── */}
      <View style={styles.vsBadgeContainer}>
        <View style={styles.vsBadge}>
          <Text style={styles.vsBadgeText}>⚡ OR ⚡</Text>
        </View>
      </View>

      {/* ─── Option B Card ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[
          styles.wyrOptionCard,
          styles.wyrCardB,
          myVote === 'B' && styles.wyrCardSelectedB,
        ]}
        onPress={() => onVote('B', myName)}
        activeOpacity={0.88}
      >
        <View style={styles.wyrCardTop}>
          <View
            style={[
              styles.optionPill,
              { backgroundColor: 'rgba(244, 63, 94, 0.2)' },
            ]}
          >
            <Text style={[styles.optionPillText, { color: colors.neonPink }]}>
              OPTION B
            </Text>
          </View>
          {myVote === 'B' && (
            <View style={styles.votedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={15}
                color={colors.neonPink}
              />
              <Text
                style={[styles.votedBadgeText, { color: colors.neonPink }]}
              >
                YOUR VOTE
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.wyrOptionText}>{currentItem.optionB}</Text>

        {/* Reveal Meter */}
        {myVote && (
          <View style={styles.meterContainer}>
            <View style={styles.meterTrack}>
              <View
                style={[
                  styles.meterFillB,
                  { width: `${percentB}%` },
                ]}
              />
            </View>
            <Text style={styles.percentTextB}>
              {percentB}% ({countB} of {totalVotes || 1} votes)
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ─── Next Dilemma CTA Button ───────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.nextRoundButton}
        onPress={onNext}
        activeOpacity={0.85}
      >
        <Text style={styles.nextRoundButtonText}>NEXT DILEMMA</Text>
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
    backgroundColor: colors.accentAlpha10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderNeon,
  },
  syncedTagText: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.3,
  },

  // 2-Player Pass & Play HUD
  duoVoteHUD: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  duoVoteCard: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderCard,
    alignItems: 'center',
  },
  duoVoteName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.extrabold,
    marginBottom: spacing.xs + 2,
  },
  duoVoteRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  duoMiniPill: {
    backgroundColor: colors.backgroundInput,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  duoMiniPillA: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  duoMiniPillB: {
    backgroundColor: colors.neonPink,
    borderColor: colors.neonPink,
  },
  duoMiniText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  duoMiniTextActive: {
    color: '#000000',
    fontWeight: typography.weights.bold,
  },

  // Result Banner
  duoResultBanner: {
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  duoMatch: {
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
    borderColor: colors.accent,
  },
  duoClash: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: colors.neonPink,
  },
  duoResultText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.extrabold,
  },

  // Cards
  wyrOptionCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    ...shadows.cardShadow,
  },
  wyrCardA: {
    borderColor: colors.borderNeon,
  },
  wyrCardB: {
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  wyrCardSelectedA: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
  },
  wyrCardSelectedB: {
    borderColor: colors.neonPink,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
  },
  wyrCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  optionPill: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  optionPillText: {
    fontSize: 10,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  votedBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  wyrOptionText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    lineHeight: 22,
    marginVertical: spacing.xs,
  },

  // Reveal Meter
  meterContainer: {
    marginTop: spacing.md,
  },
  meterTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.backgroundInput,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  meterFillA: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  meterFillB: {
    height: '100%',
    backgroundColor: colors.neonPink,
    borderRadius: 4,
  },
  percentTextA: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  percentTextB: {
    color: colors.neonPink,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },

  // VS Badge
  vsBadgeContainer: {
    alignItems: 'center',
    marginVertical: -12,
    zIndex: 10,
  },
  vsBadge: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: colors.borderCard,
  },
  vsBadgeText: {
    color: '#FFE600',
    fontSize: 11,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 1,
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
