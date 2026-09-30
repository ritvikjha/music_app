import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedEqualizer } from './AnimatedEqualizer';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import type { Song } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.44, 175);
const CARD_HEIGHT = CARD_WIDTH * 1.28;

interface TrendingCarouselProps {
  songs: Song[];
  onSongPress: (song: Song) => void;
  onAddToQueue?: (song: Song) => void;
  currentSongId?: string;
}

function TrendingCard({
  song,
  index,
  onPress,
  onAddToQueue,
  isActive,
}: {
  song: Song;
  index: number;
  onPress: () => void;
  onAddToQueue?: () => void;
  isActive: boolean;
}) {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    RNAnimated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    RNAnimated.timing(scaleAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const rankStr = (index + 1).toString().padStart(2, '0');

  return (
    <RNAnimated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={() => {
          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.92}
        style={[styles.card, isActive && styles.cardActive]}
      >
        <Image source={{ uri: song.imageUrl }} style={styles.cardImage} />

        {/* Futuristic rank badge on top-left */}
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{rankStr}</Text>
        </View>

        {/* Quick add to queue button on top-right */}
        {onAddToQueue && (
          <TouchableOpacity
            style={styles.queueBtn}
            onPress={(e) => {
              e.stopPropagation();
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
              onAddToQueue();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Center Active Equalizer or Play Overlay */}
        {isActive ? (
          <View style={styles.activeCenterBadge}>
            <AnimatedEqualizer size={20} color={colors.accent} />
          </View>
        ) : (
          <View style={styles.playIconOverlay}>
            <Ionicons name="play" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </View>
        )}

        {/* Dark translucent backdrop gradient overlay for text */}
        <View style={styles.cardGradient} />

        {/* Song info overlay at bottom */}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, isActive && styles.cardTitleActive]} numberOfLines={2}>
            {song.title}
          </Text>
          <Text style={styles.cardArtist} numberOfLines={1}>
            {song.artist}
          </Text>
        </View>
      </TouchableOpacity>
    </RNAnimated.View>
  );
}

/**
 * Enhanced Horizontal carousel of trending song cards with glowing ranks,
 * active animated equalizer badges, and touch response.
 */
export function TrendingCarousel({
  songs,
  onSongPress,
  onAddToQueue,
  currentSongId,
}: TrendingCarouselProps) {
  if (songs.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="flame" size={18} color={colors.accent} />
          <Text style={styles.headerTitle}>Trending now</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{songs.length} songs</Text>
        </View>
      </View>
      <FlatList
        data={songs}
        keyExtractor={(item) => `trending-${item.id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <TrendingCard
            song={item}
            index={index}
            onPress={() => onSongPress(item)}
            onAddToQueue={onAddToQueue ? () => onAddToQueue(item) : undefined}
            isActive={currentSongId === item.id}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.md,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  countText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: spacing.screen,
    gap: spacing.md,
  },
  cardWrapper: {
    borderRadius: borderRadius.lg,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#181818',
    position: 'relative',
  },
  cardActive: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  rankBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 2,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  queueBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  activeCenterBadge: {
    position: 'absolute',
    top: '36%',
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  playIconOverlay: {
    position: 'absolute',
    top: '36%',
    alignSelf: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.85,
    zIndex: 2,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    zIndex: 3,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    lineHeight: 16,
  },
  cardTitleActive: {
    color: colors.accent,
  },
  cardArtist: {
    fontSize: 11,
    color: '#B3B3B3',
    fontWeight: '400',
  },
});
