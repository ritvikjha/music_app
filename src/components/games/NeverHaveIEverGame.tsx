import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import type { NeverHaveIEverItem } from '../../types';

interface NeverHaveIEverGameProps {
  roster: string[];
  myName: string;
  currentItem: NeverHaveIEverItem;
  currentIndex: number;
  totalItems: number;
  playerLives: { [username: string]: number };
  onLoseLife: (username: string) => void;
  onNext: () => void;
  onResetLives: () => void;
  onInnocent: () => void;
  onBackToHub: () => void;
}

export function NeverHaveIEverGame({
  roster,
  myName,
  currentItem,
  currentIndex,
  totalItems,
  playerLives,
  onLoseLife,
  onNext,
  onResetLives,
  onInnocent,
  onBackToHub,
}: NeverHaveIEverGameProps) {
  const isDuoMode = roster.length === 2;
  const player1 = roster[0] || myName;
  const player2 = roster[1] || 'Player 2';

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
            STATEMENT {currentIndex + 1} OF {totalItems}
          </Text>
        </View>

        <View style={styles.syncedTag}>
          <Text style={styles.syncedTagText}>
            {isDuoMode ? '❤️ 2-PLAYER DUEL' : '👥 SQUAD LIVES'}
          </Text>
        </View>
      </View>

      {/* ─── Lives Board ──────────────────────────────────────────────────── */}
      {isDuoMode ? (
        /* 2-Player Head-to-Head Duel Board */
        <View style={styles.duoLivesContainer}>
          {/* Player 1 */}
          <View style={styles.duoLifeCard}>
            <Text style={[styles.duoPlayerName, { color: colors.accent }]} numberOfLines={1}>
              {player1}
            </Text>
            <View style={styles.duoHeartsRow}>
              {[1, 2, 3, 4, 5].map((h) => {
                const lives = playerLives[player1] ?? 5;
                return (
                  <Text key={h} style={[styles.heartIcon, h > lives && styles.heartLost]}>
                    {h > lives ? '🖤' : '❤️'}
                  </Text>
                );
              })}
            </View>
            <Text style={styles.duoRemainingLives}>
              {(playerLives[player1] ?? 5) > 0
                ? `${playerLives[player1] ?? 5} HEARTS`
                : '💀 OUT!'}
            </Text>
            <TouchableOpacity
              style={styles.duoIHaveBtn1}
              onPress={() => onLoseLife(player1)}
              activeOpacity={0.8}
            >
              <Text style={styles.duoIHaveText}>I HAVE! (-1 ❤️)</Text>
            </TouchableOpacity>
          </View>

          {/* VS Divider */}
          <View style={styles.duoVsDivider}>
            <Text style={styles.duoVsText}>VS</Text>
          </View>

          {/* Player 2 */}
          <View style={styles.duoLifeCard}>
            <Text style={[styles.duoPlayerName, { color: colors.neonPink }]} numberOfLines={1}>
              {player2}
            </Text>
            <View style={styles.duoHeartsRow}>
              {[1, 2, 3, 4, 5].map((h) => {
                const lives = playerLives[player2] ?? 5;
                return (
                  <Text key={h} style={[styles.heartIcon, h > lives && styles.heartLost]}>
                    {h > lives ? '🖤' : '❤️'}
                  </Text>
                );
              })}
            </View>
            <Text style={styles.duoRemainingLives}>
              {(playerLives[player2] ?? 5) > 0
                ? `${playerLives[player2] ?? 5} HEARTS`
                : '💀 OUT!'}
            </Text>
            <TouchableOpacity
              style={styles.duoIHaveBtn2}
              onPress={() => onLoseLife(player2)}
              activeOpacity={0.8}
            >
              <Text style={styles.duoIHaveText}>I HAVE! (-1 ❤️)</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Multi-player Squad Scoreboard */
        <View style={styles.livesBoard}>
          <Text style={styles.livesBoardTitle}>SQUAD CYBER LIVES</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.livesRow}
          >
            {roster.map((name) => {
              const lives = playerLives[name] ?? 5;
              const isDead = lives <= 0;
              return (
                <View
                  key={name}
                  style={[styles.playerLifeChip, isDead && styles.playerDeadChip]}
                >
                  <Text style={styles.playerLifeName} numberOfLines={1}>
                    {name}
                  </Text>
                  <View style={styles.heartsRow}>
                    {[1, 2, 3, 4, 5].map((h) => (
                      <Text
                        key={h}
                        style={[styles.heartIcon, h > lives && styles.heartLost]}
                      >
                        {h > lives ? '🖤' : '❤️'}
                      </Text>
                    ))}
                  </View>
                  {isDead ? (
                    <Text style={styles.deadLabel}>💀 ELIMINATED</Text>
                  ) : (
                    <TouchableOpacity
                      style={styles.quickLoseBtn}
                      onPress={() => onLoseLife(name)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickLoseText}>-1 ❤️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ─── Statement Prompt Card ────────────────────────────────────────── */}
      <View style={styles.nhieCard}>
        <View style={styles.nhieHeader}>
          <View style={styles.nhieBadge}>
            <Text style={styles.nhieBadgeText}>STATEMENT #{currentIndex + 1}</Text>
          </View>
          <Text style={styles.nhieLead}>NEVER HAVE I EVER...</Text>
        </View>

        <Text style={styles.nhieStatementText}>{currentItem.statement}</Text>
      </View>

      {/* ─── Innocent Action ──────────────────────────────────────────────── */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.innocentButton}
          onPress={onInnocent}
          activeOpacity={0.85}
        >
          <Ionicons name="heart" size={16} color={colors.accent} />
          <Text style={styles.innocentButtonText}>WE ARE INNOCENT (NEVER)</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Controls ─────────────────────────────────────────────────────── */}
      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={onNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>NEXT STATEMENT</Text>
          <Ionicons name="arrow-forward" size={16} color="#000000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={onResetLives}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={14} color={colors.textSecondary} />
          <Text style={styles.resetButtonText}>RESET ALL HEARTS</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  syncedTagText: {
    color: '#A855F7',
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.3,
  },

  // 2-Player Duel Board
  duoLivesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  duoLifeCard: {
    flex: 1,
    alignItems: 'center',
  },
  duoPlayerName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.extrabold,
    marginBottom: spacing.xs,
  },
  duoHeartsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: spacing.xs,
  },
  heartIcon: {
    fontSize: 13,
  },
  heartLost: {
    opacity: 0.3,
  },
  duoRemainingLives: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  duoIHaveBtn1: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  duoIHaveBtn2: {
    backgroundColor: colors.neonPink,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  duoIHaveText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: typography.weights.extrabold,
  },
  duoVsDivider: {
    paddingHorizontal: spacing.sm,
  },
  duoVsText: {
    color: '#FFE600',
    fontSize: 12,
    fontWeight: typography.weights.extrabold,
  },

  // Multi-Player Squad Scoreboard
  livesBoard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  livesBoardTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  livesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  playerLifeChip: {
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  playerDeadChip: {
    borderColor: colors.error,
    opacity: 0.6,
  },
  playerLifeName: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    marginBottom: 4,
  },
  heartsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  deadLabel: {
    color: colors.error,
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
  },
  quickLoseBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 2,
  },
  quickLoseText: {
    color: colors.neonPink,
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
  },

  // Statement Card
  nhieCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    ...shadows.cardShadow,
  },
  nhieHeader: {
    marginBottom: spacing.md,
  },
  nhieBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    marginBottom: spacing.xs + 2,
  },
  nhieBadgeText: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  nhieLead: {
    color: '#A855F7',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 1,
  },
  nhieStatementText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    lineHeight: 26,
  },

  // Actions
  actionsRow: {
    marginTop: spacing.md,
  },
  innocentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentAlpha10,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderNeon,
  },
  innocentButtonText: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },

  // Bottom Controls
  bottomControls: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  nextText: {
    color: '#000000',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 4,
  },
  resetButtonText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
});
