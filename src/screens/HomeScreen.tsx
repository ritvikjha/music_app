import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { searchSongs } from '../services/saavn';
import { usePlayer } from '../context/PlayerContext';
import { useJam } from '../context/JamContext';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { useQueue } from '../context/QueueContext';
import { SongCard } from '../components/SongCard';
import { MiniPlayer } from '../components/MiniPlayer';
import { SkeletonList } from '../components/Skeleton';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { Song } from '../types';

/**
 * Home screen — greeting, search songs via JioSaavn, recently played, and library link.
 */
export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const { playSong, currentSong, isPlaying } = usePlayer();
  const { isInRoom, jamChangeSong } = useJam();
  const { user } = useAuth();
  const { recentSongs } = useLibrary();
  const { playNow } = useQueue();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search bar glow animation
  const glowAnim = useRef(new RNAnimated.Value(0)).current;
  // Empty state pulse animation
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    RNAnimated.timing(glowAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isFocused, glowAnim]);

  // Pulse the empty state icon
  useEffect(() => {
    const animation = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const songs = await searchSongs(q);
      setResults(songs);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(text), 500);
    },
    [doSearch]
  );

  const handleSongPress = useCallback(
    (song: Song, listContext: Song[]) => {
      if (isInRoom) {
        // In a Jam room — route through sync manager
        jamChangeSong(song);
      } else {
        playNow(song, listContext);
        playSong(song);
      }
    },
    [isInRoom, jamChangeSong, playNow, playSong]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  }, []);

  const handleOpenLibrary = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push('/library');
  };

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.divider, colors.accent],
  });

  const showRecent = !hasSearched && recentSongs.length > 0;

  return (
    <View style={styles.container}>
      {/* Greeting & Header Action */}
      <View style={[styles.greetingContainer, { paddingTop: spacing.md }]}>
        <View style={styles.greetingTextContainer}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.greetingName}>{user?.username ?? 'Music Lover'}</Text>
        </View>
        <TouchableOpacity
          style={styles.libraryHeaderButton}
          onPress={handleOpenLibrary}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="heart" size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Search bar with animated glow */}
      <View style={styles.searchContainer}>
        <RNAnimated.View style={[styles.searchBar, { borderColor }]}>
          <Ionicons name="search" size={18} color={isFocused ? colors.accent : colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="What do you want to listen to?"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={handleQueryChange}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => doSearch(query)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </RNAnimated.View>
      </View>

      {/* Results, Recent, Skeleton, or Empty state */}
      {isSearching ? (
        <View style={styles.skeletonContainer}>
          <SkeletonList count={8} />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SongCard
              song={item}
              onPress={(song) => handleSongPress(song, results)}
              isPlaying={currentSong?.id === item.id && isPlaying}
            />
          )}
          contentContainerStyle={{ paddingBottom: currentSong ? 80 : spacing.lg }}
          showsVerticalScrollIndicator={false}
        />
      ) : showRecent ? (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.recentTitle}>Recently Played</Text>
          </View>
          <FlatList
            data={recentSongs}
            keyExtractor={(item, index) => `recent-${item.id}-${index}`}
            renderItem={({ item }) => (
              <SongCard
                song={item}
                onPress={(song) => handleSongPress(song, recentSongs)}
                isPlaying={currentSong?.id === item.id && isPlaying}
              />
            )}
            contentContainerStyle={{ paddingBottom: currentSong ? 80 : spacing.lg }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View style={styles.centered}>
          {hasSearched ? (
            <>
              <Ionicons name="search-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={styles.emptyText}>No results found</Text>
            </>
          ) : (
            <>
              <RNAnimated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Ionicons name="musical-notes-outline" size={64} color={colors.accent} style={{ opacity: 0.3 }} />
              </RNAnimated.View>
              <Text style={styles.emptyTitle}>Find your vibe</Text>
              <Text style={styles.emptyText}>Search for songs to start listening</Text>
            </>
          )}
        </View>
      )}

      {/* Mini player */}
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  greetingTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  greetingName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  libraryHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  recentSection: {
    flex: 1,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  recentTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
