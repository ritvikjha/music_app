import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import type { PartyGameMode } from '../../types';
import { SpotifyTouchable } from '../SpotifyTouchable';

interface GameHubProps {
  onSelectGame: (mode: PartyGameMode) => void;
  isInRoom: boolean;
  roomMemberCount: number;
  onConnectOnline: () => void;
}

interface GameCardDef {
  mode: PartyGameMode;
  title: string;
  subtitle: string;
  badge: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  emoji: string;
}

const GAME_CARDS: GameCardDef[] = [
  {
    mode: 'word_duel',
    title: 'Word Duel',
    subtitle: 'Build a word chain. One slip gives your rival a point.',
    badge: 'FIRST TO 5 · 1V1',
    icon: 'text',
    accentColor: '#38BDF8',
    emoji: '🔤',
  },
  {
    mode: 'two_truths_lie',
    title: 'Two Truths & a Lie',
    subtitle: 'Share three statements. Can your opponent spot the fake?',
    badge: 'GUESS THE LIE · 1V1',
    icon: 'eye',
    accentColor: '#A78BFA',
    emoji: '🕵️',
  },
  {
    mode: 'trivia_duel',
    title: 'Trivia Duel',
    subtitle: 'Pick from 11 topics and three difficulty levels.',
    badge: '420 QUESTIONS · 1V1',
    icon: 'help-circle',
    accentColor: '#38BDF8',
    emoji: '🧠',
  },
  {
    mode: 'bottle',
    title: 'Truth or Dare',
    subtitle: 'Spin the bottle with Easy, Normal, & Cheesy difficulty tiers.',
    badge: '3 DIFFICULTY TIERS',
    icon: 'flame',
    accentColor: colors.accent,
    emoji: '🍾',
  },
  {
    mode: 'wyr',
    title: 'Would You Rather',
    subtitle: 'Impossible squad dilemmas with live reveal voting & duels.',
    badge: '32+ DILEMMAS',
    icon: 'git-compare',
    accentColor: colors.accentSecondary,
    emoji: '🤔',
  },
  {
    mode: 'nhie',
    title: 'Never Have I Ever',
    subtitle: 'Lose cyber hearts when guilty — last player standing wins!',
    badge: '5 HEARTS DUEL',
    icon: 'heart-half',
    accentColor: '#A855F7',
    emoji: '✋',
  },
  {
    mode: 'mlt',
    title: 'Most Likely To',
    subtitle: 'Cast your votes on who is most guilty of chaotic squad antics.',
    badge: 'CROWN THE GUILTY',
    icon: 'trophy',
    accentColor: '#F59E0B',
    emoji: '👑',
  },
];

export function GameHub({ onSelectGame, isInRoom, roomMemberCount, onConnectOnline }: GameHubProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroSection}>
        <View style={styles.heroBadge}>
          <Ionicons name="people-outline" size={13} color={colors.accent} />
          <Text style={styles.heroBadgeText}>PLAY WITH FRIENDS</Text>
        </View>
        <Text style={styles.heroTitle}>Choose a game</Text>
        <Text style={styles.heroSubtitle}>
          Quick games for two friends. Play on one phone or invite someone to join online.
        </Text>
      </View>

      <View style={styles.onlineCard}>
        <View style={styles.onlineCopy}>
          <Text style={styles.onlineTitle}>{isInRoom ? `Room connected · ${roomMemberCount} online` : 'Play from two phones'}</Text>
          <Text style={styles.onlineSubtitle}>{isInRoom ? 'Share the room code, then open Word Duel or Two Truths & a Lie.' : 'Create a room and share the code with your friend.'}</Text>
        </View>
        <TouchableOpacity style={styles.onlineAction} onPress={onConnectOnline} activeOpacity={0.82}>
          <Text style={styles.onlineActionText}>{isInRoom ? 'SHARE ROOM' : 'INVITE'}</Text>
          <Ionicons name={isInRoom ? 'share-outline' : 'person-add-outline'} size={14} color="#000000" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardsGrid}>
        {GAME_CARDS.map((game) => {
          return (
            <SpotifyTouchable
              key={game.mode}
              style={[
                styles.card,
                {
                  borderColor: colors.borderCard,
                },
              ]}
              onPress={() => onSelectGame(game.mode)}
              activeScale={0.95}
              activeOpacity={0.88}
            >
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.iconBubble,
                    { backgroundColor: colors.accentAlpha10 },
                  ]}
                >
                  <Ionicons name={game.icon} size={22} color={colors.accent} />
                </View>

                <View
                  style={[
                    styles.badge,
                    { backgroundColor: colors.accentAlpha10 },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: colors.accent }]}>
                    {game.badge}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>{game.title}</Text>
              <Text style={styles.cardSubtitle}>{game.subtitle}</Text>

              <View style={styles.cardFooter}>
                <Text style={[styles.playNowText, { color: colors.accent }]}>
                  PLAY NOW
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={15}
                  color={colors.accent}
                />
              </View>
            </SpotifyTouchable>
          );
        })}
      </View>

      {/* Helpful squad tip footer */}
      <View style={styles.tipsBox}>
        <Ionicons name="bulb-outline" size={16} color={colors.accent} />
        <Text style={styles.tipsText}>
          Tip: You can re-spin anytime, set 30s timers on dares, and swap players on the fly!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 120,
  },
  heroSection: {
    marginBottom: spacing.xl,
  },
  onlineCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.backgroundElevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.borderCard, padding: spacing.md, marginBottom: spacing.xl },
  onlineCopy: { flex: 1, gap: 4 },
  onlineTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  onlineSubtitle: { color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
  onlineAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: borderRadius.full, paddingHorizontal: 14, paddingVertical: 8 },
  onlineActionText: { color: '#000000', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentAlpha10,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderWidth: 0,
    gap: 5,
    marginBottom: spacing.sm,
  },
  heroBadgeText: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.extrabold,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  cardsGrid: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.6,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playNowText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.extrabold,
    letterSpacing: 0.8,
  },
  tipsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderCard,
    gap: spacing.sm,
  },
  tipsText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    flex: 1,
    lineHeight: 18,
  },
});
