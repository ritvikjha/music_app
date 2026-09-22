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
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import type { Song } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.42;
const CARD_HEIGHT = CARD_WIDTH * 1.25;

interface TrendingCarouselProps {
  songs: Song[];
  onSongPress: (song: Song) => void;
  onAddToQueue?: (song: Song) => void;
  currentSongId?: string;
}

function TrendingCard({
  song,
  onPress,
  onAddToQueue,
  isActive,
}: {
  song: Song;
  onPress: () => void;
  onAddToQueue?: () => void;
  isActive: boolean;
}) {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    RNAnimated.timing(scaleAnim, {
      toValue: 0.95,
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

  return (
    <RNAnimated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={() => {
          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[styles.card, isActive && styles.cardActive]}
      >
        <Image source={{ uri: song.imageUrl }} style={styles.cardImage} />

        {/* Gradient overlay at bottom */}
        <View style={styles.cardGradient}>
          <View style={styles.cardGradientInner} />
        </View>

        {/* Song info overlay */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.cardArtist} numberOfLines={1}>
            {song.artist}
          </Text>
        </View>

        {/* Play indicator for active card */}
        {isActive && (
          <View style={styles.activeIndicator}>
            <Ionicons name="musical-note" size={12} color={colors.accent} />
          </View>
        )}

        {/* Quick add to queue button */}
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
            <Ionicons name="add-circle" size={22} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </RNAnimated.View>
  );
}

/**
 * Horizontal carousel of trending song cards with album art,
 * gradient overlay, and press animations.
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
        <Ionicons name="trending-up" size={18} color={colors.accent} />
        <Text style={styles.headerTitle}>Trending Now</Text>
      </View>
      <FlatList
        data={songs}
        keyExtractor={(item) => `trending-${item.id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TrendingCard
            song={item}
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
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  cardWrapper: {
    // Allows shadow to be visible
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundElevated,
    ...shadows.cardShadow,
  },
  cardActive: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    ...shadows.lavenderGlow,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  cardGradientInner: {
    flex: 1,
    // Simulated gradient using backgroundColor with opacity
    backgroundColor: 'rgba(10, 10, 15, 0.85)',
    // Only show at bottom half
    marginTop: '45%',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(10, 10, 15, 0.7)',
  },
  cardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardArtist: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  activeIndicator: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.accentAlpha25,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  queueBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
