import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibrary } from '../context/LibraryContext';
import { useQueue } from '../context/QueueContext';
import { usePlayer } from '../context/PlayerContext';
import { useJam } from '../context/JamContext';
import { SongCard } from '../components/SongCard';
import { MiniPlayer } from '../components/MiniPlayer';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { Song } from '../types';

type LibraryTab = 'liked' | 'recent';

export function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('liked');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { likedSongs, recentSongs, clearRecent } = useLibrary();
  const { playNow } = useQueue();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { isInRoom, jamChangeSong } = useJam();

  // Pulse animation for empty states
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const anim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  const displayedList = activeTab === 'liked' ? likedSongs : recentSongs;

  const handleSongPress = (song: Song) => {
    if (isInRoom) {
      jamChangeSong(song);
    } else {
      playNow(song, displayedList);
      playSong(song);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Your Library</Text>
        {activeTab === 'recent' && recentSongs.length > 0 ? (
          <TouchableOpacity onPress={clearRecent} style={styles.clearButton}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Segmented Control */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'liked' && styles.tabItemActive]}
          onPress={() => setActiveTab('liked')}
        >
          <Ionicons
            name={activeTab === 'liked' ? 'heart' : 'heart-outline'}
            size={16}
            color={activeTab === 'liked' ? colors.accent : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'liked' && styles.tabTextActive,
            ]}
          >
            Liked ({likedSongs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'recent' && styles.tabItemActive]}
          onPress={() => setActiveTab('recent')}
        >
          <Ionicons
            name={activeTab === 'recent' ? 'time' : 'time-outline'}
            size={16}
            color={activeTab === 'recent' ? colors.accent : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'recent' && styles.tabTextActive,
            ]}
          >
            Recent ({recentSongs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Song List or Empty State */}
      {displayedList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <RNAnimated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons
              name={activeTab === 'liked' ? 'heart-outline' : 'time-outline'}
              size={56}
              color={colors.accentAlpha25}
            />
          </RNAnimated.View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'liked' ? 'No liked songs yet' : 'No recent playback'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'liked'
              ? 'Tap the heart icon on any song in the player to save it here.'
              : 'Songs you play will automatically appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedList}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => (
            <SongCard
              song={item}
              onPress={handleSongPress}
              isPlaying={currentSong?.id === item.id && isPlaying}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Mini Player */}
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearText: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
    fontWeight: typography.weights.medium,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
  },
  tabItemActive: {
    backgroundColor: colors.accentAlpha10,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.accent,
    fontWeight: typography.weights.semibold,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl * 1.5,
    marginBottom: 60,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
