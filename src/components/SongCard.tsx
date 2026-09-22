import React, { useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated as RNAnimated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';
import { AnimatedEqualizer } from './AnimatedEqualizer';
import type { Song } from '../types';

interface SongCardProps {
  song: Song;
  onPress: (song: Song) => void;
  onAddToQueue?: (song: Song) => void;
  onLongPress?: (song: Song) => void;
  isPlaying?: boolean;
}

/**
 * Format seconds to mm:ss.
 */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Horizontal song card with press animation, equalizer indicator, and optional queue action.
 */
export function SongCard({ song, onPress, onAddToQueue, onLongPress, isPlaying }: SongCardProps) {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const onPressIn = () => {
    RNAnimated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    RNAnimated.timing(scaleAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onPress(song);
  };

  const handleQueuePress = (e: any) => {
    e.stopPropagation();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onAddToQueue?.(song);
  };

  return (
    <RNAnimated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.container, isPlaying && styles.containerActive]}
        onPress={handlePress}
        onLongPress={onLongPress ? () => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } catch {}
          onLongPress(song);
        } : undefined}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: song.imageUrl }}
          style={styles.artwork}
          defaultSource={require('../../assets/images/icon.png')}
        />
        <View style={styles.info}>
          <Text style={[styles.title, isPlaying && styles.titleActive]} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {song.artist}
          </Text>
        </View>

        <View style={styles.trailing}>
          {onAddToQueue && (
            <TouchableOpacity
              onPress={handleQueuePress}
              style={styles.queueButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
            </TouchableOpacity>
          )}
          {isPlaying ? (
            <AnimatedEqualizer size={18} color={colors.accent} />
          ) : (
            <Text style={styles.duration}>{formatDuration(song.duration)}</Text>
          )}
        </View>
      </TouchableOpacity>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md - 1,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  containerActive: {
    backgroundColor: 'rgba(0, 242, 254, 0.07)',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.backgroundInput,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  titleActive: {
    color: colors.accent,
    fontWeight: typography.weights.bold,
  },
  artist: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 44,
  },
  queueButton: {
    marginRight: 10,
    padding: 2,
  },
  duration: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
