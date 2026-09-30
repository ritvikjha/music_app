import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlowCard } from '../GlowCard';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { DECKS } from '../../data/partyGamesData';
import type { TruthOrDareDeck, TruthOrDareItem } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TURNTABLE_SIZE = Math.min(SCREEN_WIDTH - 48, 280);

interface BottleSpinGameProps {
  roster: string[];
  isSpinning: boolean;
  chosenPlayerIndex: number | null;
  selectedDeck: TruthOrDareDeck;
  activeCard: TruthOrDareItem | null;
  timerSeconds: number;
  isTimerRunning: boolean;
  bottleRotation: Animated.AnimatedInterpolation<string | number>;
  onSpinBottle: () => void;
  onSelectDeck: (deck: TruthOrDareDeck) => void;
  onPickCard: (type: 'truth' | 'dare') => void;
  onStartTimer: (seconds?: number) => void;
  onCompleteCard: () => void;
  onForfeitCard: () => void;
  onCloseCard: () => void;
  onBackToHub: () => void;
  onEditPlayer: (index: number, name: string) => void;
}

export function BottleSpinGame({
  roster,
  isSpinning,
  chosenPlayerIndex,
  selectedDeck,
  activeCard,
  timerSeconds,
  isTimerRunning,
  bottleRotation,
  onSpinBottle,
  onSelectDeck,
  onPickCard,
  onStartTimer,
  onCompleteCard,
  onForfeitCard,
  onCloseCard,
  onBackToHub,
  onEditPlayer,
}: BottleSpinGameProps) {
  const isDuoMode = roster.length === 2;
  const currentDeckInfo = DECKS.find((d) => d.id === selectedDeck) || DECKS[0];
  const chosenPlayerName =
    chosenPlayerIndex !== null && roster[chosenPlayerIndex]
      ? roster[chosenPlayerIndex]
      : 'Player';

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

        <View style={styles.gameModeBadge}>
          <Text style={styles.gameModeIcon}>🍾</Text>
          <Text style={styles.gameModeTitle}>TRUTH OR DARE</Text>
        </View>
      </View>

      {/* ─── Difficulty Selector: 3 Pill Buttons ───────────────────────────── */}
      <View style={styles.difficultyContainer}>
        <Text style={styles.difficultyHeaderLabel}>DIFFICULTY TIER:</Text>
        <View style={styles.difficultySegmentedControl}>
          {DECKS.map((d) => {
            const isActive = selectedDeck === d.id;
            return (
              <TouchableOpacity
                key={d.id}
                style={[
                  styles.difficultyPill,
                  isActive && styles.difficultyPillActive,
                ]}
                onPress={() => onSelectDeck(d.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={d.icon as any}
                  size={14}
                  color={isActive ? '#000000' : d.color}
                />
                <Text
                  style={[
                    styles.difficultyPillText,
                    isActive && styles.difficultyPillTextActive,
                  ]}
                >
                  {d.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.tierDescription}>
          {currentDeckInfo?.description || 'Select difficulty'}
        </Text>
      </View>

      {/* ─── Simplified Turntable Arena ────────────────────────────────────── */}
      <View style={styles.turntable}>
        {/* Single Soft Glow Ring */}
        <View style={styles.turntableGlowRing} />

        {/* Player Seats around the circle */}
        {roster.map((player, idx) => {
          const arc = 360 / roster.length;
          const angle = (idx * arc - 90) * (Math.PI / 180);
          const radius = TURNTABLE_SIZE / 2 - 32;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);
          const isSelected = chosenPlayerIndex === idx;

          return (
            <TouchableOpacity
              key={player + idx}
              onPress={() => onEditPlayer(idx, player)}
              activeOpacity={0.8}
              style={[
                styles.playerNode,
                {
                  transform: [
                    { translateX: x },
                    { translateY: y },
                    { scale: isSelected ? 1.15 : 1 },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.playerAvatarBubble,
                  isSelected && styles.playerAvatarBubbleSelected,
                ]}
              >
                <Text
                  style={[
                    styles.playerAvatarLetter,
                    isSelected && styles.playerAvatarLetterSelected,
                  ]}
                >
                  {player.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View
                style={[
                  styles.playerNameBadge,
                  isSelected && styles.playerNameBadgeSelected,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.playerNodeName,
                    isSelected && styles.playerNodeNameSelected,
                  ]}
                >
                  {player}
                </Text>
              </View>
              {isSelected && (
                <View style={styles.targetIndicatorBadge}>
                  <Ionicons name="sparkles" size={10} color="#000000" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* ─── Single Bottle Shape (100% Native RN Views, No 3rd-party Native Modules) ─── */}
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={onSpinBottle}
          disabled={isSpinning}
          style={styles.turntableCenterTouch}
        >
          <Animated.View
            style={[
              styles.bottleWrapper,
              {
                transform: [{ rotate: bottleRotation }],
              },
            ]}
          >
            <View style={styles.bottleShape}>
              {/* Bottle Cap / Spout */}
              <View style={styles.bottleSpout} />
              {/* Bottle Neck */}
              <View style={styles.bottleNeck} />
              {/* Bottle Body */}
              <View style={styles.bottleBody}>
                <View style={styles.bottleHighlightLine} />
                <View style={styles.bottleAccentPill}>
                  <Text style={styles.bottleAccentText}>JAM</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* Center Bearing Pivot */}
        <View pointerEvents="none" style={styles.centerSpindleBearing}>
          <View style={styles.centerSpindleCore} />
        </View>

        {/* Tap Hint When Idle */}
        {!isSpinning && chosenPlayerIndex === null && (
          <View pointerEvents="none" style={styles.tapToSpinHint}>
            <Text style={styles.tapToSpinHintText}>TAP BOTTLE TO SPIN</Text>
          </View>
        )}
      </View>

      {/* ─── Spin Action CTA Button ────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.spinButton, isSpinning && styles.spinButtonDisabled]}
        onPress={onSpinBottle}
        disabled={isSpinning}
        activeOpacity={0.85}
      >
        <Ionicons
          name="refresh"
          size={18}
          color="#000000"
          style={isSpinning ? styles.spinningIcon : null}
        />
        <Text style={styles.spinButtonText}>
          {isSpinning
            ? 'SPINNING THE BOTTLE...'
            : isDuoMode
            ? '🍾 SPIN BETWEEN YOU TWO'
            : '🍾 SPIN THE BOTTLE'}
        </Text>
      </TouchableOpacity>

      {/* ─── Chosen Player Spotlight Card (Restyled using GlowCard) ───────── */}
      {chosenPlayerIndex !== null && (
        <GlowCard intensity="normal" style={styles.spotlightCard}>
          <View style={styles.spotlightHeaderRow}>
            <View style={styles.spotlightBadge}>
              <Ionicons name="flash" size={11} color="#000000" />
              <Text style={styles.spotlightBadgeText}>TARGET LOCKED</Text>
            </View>
            <TouchableOpacity
              style={styles.respinMiniBtn}
              onPress={onSpinBottle}
              disabled={isSpinning}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={13} color={colors.accent} />
              <Text style={styles.respinMiniText}>Re-spin</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chosenProfileRow}>
            <View style={styles.chosenAvatarLarge}>
              <Text style={styles.chosenAvatarLargeText}>
                {chosenPlayerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.chosenPlayerTitle}>
                {chosenPlayerName}
              </Text>
              <Text style={styles.chosenSubtitle}>
                Select Truth or Dare below to challenge {chosenPlayerName}!
              </Text>
            </View>
          </View>
        </GlowCard>
      )}

      {/* ─── Truth or Dare Pick Buttons ────────────────────────────────────── */}
      <View style={styles.truthDareButtonRow}>
        <TouchableOpacity
          style={styles.truthCardBtn}
          onPress={() => onPickCard('truth')}
          activeOpacity={0.88}
        >
          <View style={styles.truthCardIconBubble}>
            <Ionicons name="help-circle" size={22} color={colors.accent} />
          </View>
          <Text style={styles.truthCardTitle}>💎 TRUTH</Text>
          <Text style={styles.truthCardDesc}>Answer with honesty</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dareCardBtn}
          onPress={() => onPickCard('dare')}
          activeOpacity={0.88}
        >
          <View style={styles.dareCardIconBubble}>
            <Ionicons name="flame" size={22} color={colors.neonPink} />
          </View>
          <Text style={styles.dareCardTitle}>🔥 DARE</Text>
          <Text style={styles.dareCardDesc}>Accept the challenge</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Active Card Display & 30s Interactive Countdown Timer ─────────── */}
      {activeCard && (
        <View
          style={[
            styles.cardContainer,
            activeCard.type === 'dare' ? styles.cardDare : styles.cardTruth,
          ]}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardBadge,
                {
                  backgroundColor:
                    activeCard.type === 'dare'
                      ? 'rgba(244, 63, 94, 0.2)'
                      : colors.accentAlpha25,
                },
              ]}
            >
              <Text
                style={[
                  styles.cardBadgeText,
                  {
                    color:
                      activeCard.type === 'dare'
                        ? colors.neonPink
                        : colors.accent,
                  },
                ]}
              >
                {activeCard.type === 'dare'
                  ? `🔥 ${(activeCard.deck || 'CHALLENGE').toUpperCase()} DARE`
                  : `💎 ${(activeCard.deck || 'CHALLENGE').toUpperCase()} TRUTH`}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onCloseCard}
              style={styles.cardCloseBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {chosenPlayerIndex !== null && (
            <Text style={styles.cardAssignedText}>
              Assigned to{' '}
              <Text style={{ color: colors.accent, fontWeight: '800' }}>
                {chosenPlayerName}
              </Text>
            </Text>
          )}

          <Text style={styles.cardPromptText}>"{activeCard.text}"</Text>

          {/* 30s Countdown Timer */}
          <View style={styles.timerRow}>
            <TouchableOpacity
              style={[
                styles.timerButton,
                isTimerRunning && styles.timerButtonRunning,
              ]}
              onPress={() => onStartTimer(30)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="timer-outline"
                size={16}
                color={isTimerRunning ? '#FFE600' : colors.textPrimary}
              />
              <Text
                style={[
                  styles.timerButtonText,
                  isTimerRunning && { color: '#FFE600' },
                ]}
              >
                {isTimerRunning
                  ? `⏳ ${timerSeconds}s REMAINING`
                  : 'START 30s COUNTDOWN'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Challenge Actions: Complete, Forfeit, Redraw */}
          <View style={styles.cardActionRow}>
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={onCompleteCard}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={16} color="#000000" />
              <Text style={styles.completeBtnText}>COMPLETED</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forfeitBtn}
              onPress={onForfeitCard}
              activeOpacity={0.8}
            >
              <Text style={styles.forfeitBtnText}>💀 FORFEIT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.redrawBtn}
              onPress={() => onPickCard(activeCard.type)}
              activeOpacity={0.8}
            >
              <Ionicons name="shuffle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  navBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
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
  gameModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentAlpha10,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderNeon,
    gap: 4,
  },
  gameModeIcon: {
    fontSize: 12,
  },
  gameModeTitle: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },

  // Difficulty Tier Selector
  difficultyContainer: {
    width: '100%',
    marginVertical: spacing.sm,
  },
  difficultyHeaderLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  difficultySegmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.lg,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderCard,
    gap: 4,
  },
  difficultyPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  difficultyPillActive: {
    backgroundColor: colors.accent,
    ...shadows.emeraldGlow,
  },
  difficultyPillText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  difficultyPillTextActive: {
    color: '#000000',
    fontWeight: typography.weights.extrabold,
  },
  tierDescription: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs - 1,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // Turntable
  turntable: {
    width: TURNTABLE_SIZE,
    height: TURNTABLE_SIZE,
    borderRadius: TURNTABLE_SIZE / 2,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderNeon,
    ...shadows.cardShadow,
  },
  turntableGlowRing: {
    position: 'absolute',
    width: TURNTABLE_SIZE - 20,
    height: TURNTABLE_SIZE - 20,
    borderRadius: (TURNTABLE_SIZE - 20) / 2,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  playerNode: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  playerAvatarBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundInput,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderCard,
  },
  playerAvatarBubbleSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentAlpha25,
    ...shadows.emeraldGlow,
  },
  playerAvatarLetter: {
    color: colors.textPrimary,
    fontWeight: typography.weights.extrabold,
    fontSize: typography.sizes.sm,
  },
  playerAvatarLetterSelected: {
    color: '#FFFFFF',
  },
  playerNameBadge: {
    marginTop: 3,
    backgroundColor: colors.backgroundAlpha80,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  playerNameBadgeSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentAlpha10,
  },
  playerNodeName: {
    fontSize: 9.5,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    maxWidth: 64,
    textAlign: 'center',
  },
  playerNodeNameSelected: {
    color: colors.accent,
    fontWeight: typography.weights.extrabold,
  },
  targetIndicatorBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: colors.accent,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Simplified Bottle Elements (100% native RN Views)
  turntableCenterTouch: {
    position: 'absolute',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  bottleWrapper: {
    width: 40,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottleShape: {
    width: 34,
    height: 120,
    alignItems: 'center',
  },
  bottleSpout: {
    width: 12,
    height: 6,
    backgroundColor: '#FFE600',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  bottleNeck: {
    width: 10,
    height: 24,
    backgroundColor: colors.accentLight,
  },
  bottleBody: {
    width: 34,
    height: 90,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.accentLight,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.emeraldGlow,
  },
  bottleHighlightLine: {
    position: 'absolute',
    top: 0,
    left: 4,
    width: 3,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 2,
  },
  bottleAccentPill: {
    backgroundColor: 'rgba(5, 5, 8, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  bottleAccentText: {
    color: colors.accentLight,
    fontSize: 8,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 1,
  },

  centerSpindleBearing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.backgroundInput,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
    zIndex: 7,
  },
  centerSpindleCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  tapToSpinHint: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: 'rgba(5, 5, 8, 0.75)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  tapToSpinHintText: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },

  // Spin Button
  spinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    width: '100%',
    ...shadows.neonButtonGlow,
  },
  spinButtonDisabled: {
    opacity: 0.65,
  },
  spinningIcon: {
    transform: [{ rotate: '45deg' }],
  },
  spinButtonText: {
    color: '#000000',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Spotlight Card (GlowCard)
  spotlightCard: {
    width: '100%',
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderNeon,
  },
  spotlightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  spotlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  spotlightBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.4,
  },
  respinMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    padding: 3,
  },
  respinMiniText: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  chosenProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  chosenAvatarLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentAlpha25,
    borderWidth: 1.5,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chosenAvatarLargeText: {
    color: colors.accentLight,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.extrabold,
  },
  chosenPlayerTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.extrabold,
  },
  chosenSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },

  // Truth & Dare Buttons
  truthDareButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.md,
  },
  truthCardBtn: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderNeon,
    alignItems: 'center',
  },
  truthCardIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  truthCardTitle: {
    color: colors.accent,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.extrabold,
  },
  truthCardDesc: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  dareCardBtn: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    alignItems: 'center',
  },
  dareCardIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dareCardTitle: {
    color: colors.neonPink,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.extrabold,
  },
  dareCardDesc: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },

  // Active Challenge Card
  cardContainer: {
    width: '100%',
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1.5,
    ...shadows.cardShadow,
  },
  cardTruth: {
    borderColor: colors.borderNeon,
  },
  cardDare: {
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  cardCloseBtn: {
    padding: 4,
  },
  cardAssignedText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    marginBottom: spacing.xs,
  },
  cardPromptText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    lineHeight: 22,
    marginVertical: spacing.sm,
  },

  // Timer
  timerRow: {
    marginVertical: spacing.sm,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  timerButtonRunning: {
    borderColor: '#FFE600',
    backgroundColor: 'rgba(255, 230, 0, 0.1)',
  },
  timerButtonText: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.5,
  },

  // Card Action Buttons
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  completeBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  completeBtnText: {
    color: '#000000',
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  forfeitBtn: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  forfeitBtnText: {
    color: colors.neonPink,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  redrawBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
});
