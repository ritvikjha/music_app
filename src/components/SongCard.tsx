import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated as RNAnimated, Alert, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../theme';
import { AnimatedEqualizer } from './AnimatedEqualizer';
import type { Song } from '../types';
import { offlineStorage } from '../services/offlineStorage';

import { SpotifyTouchable } from './SpotifyTouchable';

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
 * Horizontal song card with authentic Spotify tactile spring physics, equalizer indicator, and queue action.
 */
export function SongCard({ song, onPress, onAddToQueue, onLongPress, isPlaying }: SongCardProps) {
  const router = useRouter();
  const [isStashed, setIsStashed] = useState(false);
  const [isStashing, setIsStashing] = useState(false);
  const [stashProgress, setStashProgress] = useState(0);

  useEffect(() => {
    let active = true;
    offlineStorage.isStashed(song.id).then((value) => {
      if (active) setIsStashed(value);
    });
    return () => { active = false; };
  }, [song.id]);

  const handleStashAction = async () => {
    setIsStashing(true);
    try {
      if (isStashed) {
        await offlineStorage.removeStash(song.id);
        setIsStashed(false);
      } else {
        await offlineStorage.stashTrack(song, (progress) => setStashProgress(progress.fraction));
        setIsStashed(true);
      }
    } catch (error) {
      Alert.alert('Offline stash', error instanceof Error ? error.message : 'Could not update offline stash.');
    } finally {
      setIsStashing(false);
    }
  };

  const showSongActions = () => {
    if (onLongPress) {
      onLongPress(song);
      return;
    }
    Alert.alert(song.title, 'Keep this track available offline?', [
      { text: 'Cancel', style: 'cancel' },
      { text: isStashed ? 'Remove offline copy' : 'Stash offline', onPress: handleStashAction },
    ]);
  };

  const handlePress = () => {
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
    <SpotifyTouchable
      style={[styles.container, isPlaying && styles.containerActive]}
      onPress={handlePress}
      onLongPress={() => {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch {}
        showSongActions();
      }}
      activeScale={0.96}
      activeOpacity={0.88}
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
        <View style={styles.metadataRow}>
          <TouchableOpacity onPress={(event) => { event.stopPropagation(); router.push({ pathname: '/artist/[id]', params: { id: song.artistId || song.artist } }); }}>
            <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
          </TouchableOpacity>
          {song.album ? (
            <TouchableOpacity onPress={(event) => { event.stopPropagation(); router.push({ pathname: '/album/[id]', params: { id: song.albumId || song.album } }); }}>
              <Text style={styles.album} numberOfLines={1}> · {song.album}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.trailing}>
        {isStashing ? (
          <View style={styles.stashIndicator}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.stashPercent}>{Math.round(stashProgress * 100)}%</Text>
          </View>
        ) : isStashed ? (
          <Ionicons name="cloud-done" size={16} color={colors.accent} style={styles.stashIndicator} />
        ) : null}
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
    </SpotifyTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  containerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: colors.backgroundInput,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  titleActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  artist: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  album: {
    fontSize: 12,
    color: colors.textMuted,
    maxWidth: 120,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 44,
  },
  queueButton: {
    marginRight: 10,
    padding: 4,
  },
  stashIndicator: {
    alignItems: 'center',
    marginRight: 8,
  },
  stashPercent: {
    color: colors.accent,
    fontSize: 9,
  },
  duration: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '400',
  },
});
