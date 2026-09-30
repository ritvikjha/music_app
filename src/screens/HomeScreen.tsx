import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
  Dimensions,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  searchSongs,
  getTrending,
  getTopSearches,
  getSearchSuggestions,
  searchSongsWithFilter,
  generateVibeQueue,
  getRelatedSongs,
  type VibeResult,
} from '../services/saavn';
import { usePlayer } from '../context/PlayerContext';
import { useJam } from '../context/JamContext';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { useQueue } from '../context/QueueContext';
import { useToast } from '../context/ToastContext';
import { SongCard } from '../components/SongCard';
import { MiniPlayer } from '../components/MiniPlayer';
import { SkeletonList } from '../components/Skeleton';
import { TrendingCarousel } from '../components/TrendingCarousel';
import { CyberListeningWrapModal } from '../components/CyberListeningWrapModal';
import { colors, spacing, borderRadius, typography } from '../theme';
import { networkMonitor } from '../services/networkMonitor';
import { offlineStorage } from '../services/offlineStorage';
import { getCachedSearch, saveCachedSearch } from '../services/searchCache';
import type { Song } from '../types';

const REGIONAL_FILTERS = ['All', 'Hindi', 'Punjabi', 'English', 'Lo-Fi', 'Instrumental'];

const CURATED_VIBES = [
  { id: 'v1', label: '🔥 Trending', query: 'Trending Hits' },
  { id: 'v2', label: '⚡ EDM & Phonk', query: 'Phonk EDM' },
  { id: 'v3', label: '🎧 Lo-Fi Chill', query: 'Lofi Chill' },
  { id: 'v4', label: '🚀 Bollywood Hits', query: 'Bollywood Top Hits' },
  { id: 'v5', label: '💎 Synthwave', query: 'Synthwave Retro' },
  { id: 'v6', label: '🎸 Indie Vibes', query: 'Indie Hits' },
];

const VIBE_PRESETS = [
  { id: 'p1', label: 'Night drive', prompt: 'cyberpunk synthwave' },
  { id: 'p2', label: '🌧️ Midnight Lo-Fi', prompt: 'lofi chill' },
  { id: 'p3', label: '🥊 Adrenaline Gym', prompt: 'workout gym' },
  { id: 'p4', label: '☕ Monsoon Melancholy', prompt: 'monsoon acoustic' },
  { id: 'p5', label: 'Desi party', prompt: 'party club punjabi' },
  { id: 'p6', label: 'Sunset drive', prompt: 'sunset drive chill' },
];

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Suggestions & Regional Filters
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  // Search History state & storage
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('@jam_recent_searches').then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setRecentSearches(parsed);
        } catch {}
      }
    });
  }, []);

  // AI Vibe Generator state
  const [isVibeModalVisible, setIsVibeModalVisible] = useState(false);
  const [vibePrompt, setVibePrompt] = useState('');
  const [isGeneratingVibe, setIsGeneratingVibe] = useState(false);
  const [generatedVibe, setGeneratedVibe] = useState<VibeResult | null>(null);

  // Cyber Wrap state
  const [isWrapVisible, setIsWrapVisible] = useState(false);

  // Trending / Discovery state
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [searchChips, setSearchChips] = useState<string[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [discoveryError, setDiscoveryError] = useState(false);
  const [isOnline, setIsOnline] = useState(networkMonitor.isOnline);

  const { playSong, currentSong, isPlaying } = usePlayer();
  const { isInRoom, roomId, jamChangeSong, jamAddToQueue } = useJam();
  const { user, fullTag } = useAuth();
  const { likedSongs, recentSongs, listeningStats } = useLibrary();
  const { playNow, addToQueue } = useQueue();
  const { showToast } = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    const unsubscribe = networkMonitor.addListener(setIsOnline);
    return () => { unsubscribe(); };
  }, []);


  // Search bar glow animation
  const glowAnim = useRef(new RNAnimated.Value(0)).current;
  // Empty state pulse animation
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  // Spotify dynamic sticky header scroll interpolation
  const scrollY = useRef(new RNAnimated.Value(0)).current;

  // Top Header Background & Border Interpolations [0, 80]
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Hero Title / Featured Banner Parallax [0, 160]
  const bannerTranslateY = scrollY.interpolate({
    inputRange: [0, 160],
    outputRange: [0, -40],
    extrapolate: 'clamp',
  });
  const bannerOpacity = scrollY.interpolate({
    inputRange: [0, 160],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const bannerScale = scrollY.interpolate({
    inputRange: [0, 160],
    outputRange: [1, 0.92],
    extrapolate: 'clamp',
  });

  // Header Title Swap when hero title scrolls past threshold (> 100)
  const greetingFade = scrollY.interpolate({
    inputRange: [60, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const miniTitleTranslateY = scrollY.interpolate({
    inputRange: [80, 120],
    outputRange: [15, 0],
    extrapolate: 'clamp',
  });
  const miniTitleOpacity = scrollY.interpolate({
    inputRange: [80, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Fetch trending content on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsTrendingLoading(true);
      try {
        const [trending, chips] = await Promise.all([
          getTrending(),
          getTopSearches(),
        ]);
        if (!cancelled) {
          if (trending.length > 0) {
            setTrendingSongs(trending);
            setDiscoveryError(false);
            AsyncStorage.setItem('@jam_trending_cache_v1', JSON.stringify(trending)).catch(() => {});
          } else {
            setDiscoveryError(true);
          }
          setSearchChips(chips);
        }
      } catch (err) {
        console.error('[Home] Failed to load trending:', err);
        if (!cancelled) setDiscoveryError(true);
      } finally {
        if (!cancelled) setIsTrendingLoading(false);
      }
    })();
    AsyncStorage.getItem('@jam_trending_cache_v1').then((raw) => {
      if (cancelled || !raw) return;
      try {
        const cached: unknown = JSON.parse(raw);
        if (Array.isArray(cached) && cached.length) setTrendingSongs((current) => current.length ? current : cached as Song[]);
      } catch {}
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const seed = recentSongs[0] || likedSongs[0];
    let cancelled = false;
    if (!seed) return () => { cancelled = true; };
    getRelatedSongs(seed, 6).then((songs) => {
      if (!cancelled) setRecommendedSongs(songs.filter((song) => song.id !== seed.id));
    }).catch((error) => {
      if (!cancelled) setRecommendedSongs([]);
      console.warn('[Home] Recommendations unavailable:', error);
    });
    return () => { cancelled = true; };
  }, [recentSongs, likedSongs]);

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

  const saveSearchQuery = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      AsyncStorage.setItem('@jam_recent_searches', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const doSearch = useCallback(
    async (q: string, filter?: string) => {
      const targetFilter = filter ?? activeFilter;
      const requestId = ++searchRequestRef.current;
      if (!isOnline) {
        setIsSearching(false);
        setHasSearched(true);
        setSearchError(null);
        const cached = await getCachedSearch(q);
        if (requestId !== searchRequestRef.current) return;
        setResults(cached);
        setSearchError(cached.length ? 'You are offline. Showing saved results.' : 'You are offline. Reconnect and try again. Your saved songs are in Library.');
        return;
      }
      if (!q.trim() && targetFilter === 'All') {
        setIsSearching(false);
        setResults([]);
        setHasSearched(false);
        setSearchError(null);
        return;
      }
      setIsSearching(true);
      setHasSearched(true);
      setSearchError(null);
      setShowSuggestions(false);
      try {
        let songs: Song[] = [];
        if (targetFilter && targetFilter !== 'All') {
          const effectiveQuery = q.trim() || `${targetFilter} songs`;
          songs = await searchSongsWithFilter(effectiveQuery, targetFilter);
        } else {
          songs = await searchSongs(q);
        }
        if (songs.length === 0 && !networkMonitor.isOnline) {
          showToast('You appear to be offline. Stashed songs are still available in Library.', 'error');
        }
        if (requestId !== searchRequestRef.current) return;
        setResults(songs);
        if (songs.length > 0) await saveCachedSearch(q, songs);
        if (q.trim().length >= 2) {
          saveSearchQuery(q.trim());
        }
      } catch (error) {
        console.error('Search failed:', error);
        const cached = await getCachedSearch(q);
        if (requestId !== searchRequestRef.current) return;
        setResults(cached);
        setSearchError(cached.length ? 'Could not refresh results. Showing your saved copy.' : 'Could not load songs right now. Check your connection and try again.');
      } finally {
        if (requestId === searchRequestRef.current) setIsSearching(false);
      }
    },
    [activeFilter, isOnline, saveSearchQuery, showToast]
  );

  const handleRemoveRecentSearch = useCallback((itemToRemove: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== itemToRemove);
      AsyncStorage.setItem('@jam_recent_searches', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const handleClearAllSearches = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setRecentSearches([]);
    AsyncStorage.removeItem('@jam_recent_searches').catch(() => {});
  }, []);

  const handleSelectRecentSearch = useCallback((item: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setQuery(item);
    doSearch(item);
  }, [doSearch]);

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);

      // Instant live autocomplete suggestions
      if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current);
      if (text.trim().length >= 2) {
        suggestionDebounceRef.current = setTimeout(async () => {
          const suggs = await getSearchSuggestions(text);
          setSuggestions(suggs);
          setShowSuggestions(suggs.length > 0);
        }, 200);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }

      // Search results debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(text), 500);
    },
    [doSearch]
  );

  const handleSelectSuggestion = useCallback(
    (suggestionText: string) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      setQuery(suggestionText);
      setShowSuggestions(false);
      doSearch(suggestionText);
    },
    [doSearch]
  );

  const handleFilterSelect = useCallback(
    (filter: string) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      setActiveFilter(filter);
      doSearch(query, filter);
    },
    [doSearch, query]
  );

  const handleRunVibeGenerator = async (customPrompt?: string) => {
    if (!isOnline) {
      showToast('Vibe mixes need an internet connection.', 'error');
      return;
    }
    const promptToUse = (customPrompt || vibePrompt).trim();
    if (!promptToUse) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setIsGeneratingVibe(true);
    try {
      const vibe = await generateVibeQueue(promptToUse, currentSong);
      setGeneratedVibe(vibe);
    } catch (err) {
      console.warn('[Home] Vibe error:', err);
      showToast('Could not generate vibe queue', 'error');
    } finally {
      setIsGeneratingVibe(false);
    }
  };

  const handleStartVibeSession = async () => {
    if (!generatedVibe || generatedVibe.songs.length === 0) return;
    const firstSong = generatedVibe.songs[0];
    if (!isOnline && (isInRoom || !(await offlineStorage.isStashed(firstSong.id)))) {
      showToast('This track needs an internet connection.', 'error');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    if (isInRoom) {
      generatedVibe.songs.forEach((s) => jamAddToQueue(s));
      showToast(`Added ${generatedVibe.vibeTitle} to Jam Queue`, 'success');
    } else {
      playNow(firstSong, generatedVibe.songs);
      playSong(firstSong);
      showToast(`Vibe active: ${generatedVibe.vibeTitle}`, 'success');
    }
    setIsVibeModalVisible(false);
  };

  const handleSongPress = useCallback(
    async (song: Song, listContext: Song[]) => {
      if (!isOnline && (isInRoom || !(await offlineStorage.isStashed(song.id)))) {
        showToast('This track needs an internet connection. Check Library for offline saves.', 'error');
        return;
      }
      if (isInRoom) {
        if (currentSong) {
          jamAddToQueue(song);
          showToast(`Added ${song.title} to Jam Queue`, 'success');
        } else {
          jamChangeSong(song);
          showToast(`Playing ${song.title}`, 'info');
        }
      } else {
        playNow(song, listContext);
        playSong(song);
      }
    },
    [isInRoom, currentSong, jamAddToQueue, jamChangeSong, playNow, playSong, showToast, isOnline]
  );

  const handleAddToQueue = useCallback(
    (song: Song) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      if (isInRoom) {
        jamAddToQueue(song);
        showToast(`Added ${song.title} to Jam Queue`, 'success');
      } else {
        addToQueue(song);
        showToast(`Added ${song.title} to queue`, 'info');
      }
    },
    [isInRoom, jamAddToQueue, addToQueue, showToast]
  );

  const handleClear = useCallback(() => {
    searchRequestRef.current += 1;
    setIsSearching(false);
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setShowSuggestions(false);
    setHasSearched(false);
    setSearchError(null);
  }, []);

  const handleOpenLibrary = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    router.push('/library');
  };

  const handleChipPress = useCallback(
    (searchTerm: string) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      setQuery(searchTerm);
      doSearch(searchTerm);
    },
    [doSearch]
  );

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.08)', colors.accent],
  });

  const showRecent = !hasSearched && recentSongs.length > 0;

  const retryDiscovery = useCallback(async () => {
    setIsTrendingLoading(true);
    try {
      const songs = await getTrending();
      if (songs.length > 0) {
        setTrendingSongs(songs);
        setDiscoveryError(false);
        AsyncStorage.setItem('@jam_trending_cache_v1', JSON.stringify(songs)).catch(() => {});
      } else {
        setDiscoveryError(true);
      }
    } catch (error) {
      console.warn('[Home] Trending retry failed:', error);
      setDiscoveryError(true);
    } finally {
      setIsTrendingLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    try {
      const [freshTrending, freshSearches] = await Promise.all([
        getTrending().catch(() => []),
        getTopSearches().catch(() => []),
      ]);
      if (freshTrending.length > 0) {
        setTrendingSongs(freshTrending);
        setDiscoveryError(false);
        AsyncStorage.setItem('@jam_trending_cache_v1', JSON.stringify(freshTrending)).catch(() => {});
      }
      if (freshSearches.length > 0) {
        setSearchChips(freshSearches);
      }
    } catch (error) {
      console.warn('[Home] Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Render Discovery Content (AI Vibe + Vibes + Trending + Recently Played)
  const renderDiscoveryContent = () => (
    <RNAnimated.ScrollView
      style={styles.discoveryScroll}
      contentContainerStyle={{ paddingBottom: currentSong ? 160 : 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
          progressBackgroundColor={colors.backgroundElevated}
        />
      }
      onScroll={RNAnimated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      )}
      scrollEventThrottle={16}
    >
      {/* ─── AI Vibe & Mood Generator Feature Card with Parallax ──── */}
      <RNAnimated.View
        style={{
          transform: [
            { translateY: bannerTranslateY },
            { scale: bannerScale },
          ],
          opacity: bannerOpacity,
        }}
      >
        <TouchableOpacity
          style={styles.vibeBanner}
          onPress={() => setIsVibeModalVisible(true)}
          activeOpacity={0.88}
        >
          <View style={styles.vibeBannerGradient}>
            <View style={styles.vibeBannerLeft}>
              <View style={styles.vibeBadge}>
                <Ionicons name="sparkles" size={12} color={colors.accent} />
                <Text style={styles.vibeBadgeText}>VIBE MIX</Text>
              </View>
              <Text style={styles.vibeBannerTitle}>Find your next mood</Text>
              <Text style={styles.vibeBannerDesc}>
                Get an instant mix built around what you feel like hearing.
              </Text>
            </View>
            <View style={styles.vibeActionIcon}>
              <Ionicons name="arrow-forward" size={20} color={colors.accent} />
            </View>
          </View>
        </TouchableOpacity>
      </RNAnimated.View>

      {/* ─── Quick Vibe Radar Chips ────────────────────────────────────── */}
      <View style={styles.chipsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {CURATED_VIBES.map((vibe) => {
            const isSelected = query.toLowerCase() === vibe.query.toLowerCase();
            return (
              <TouchableOpacity
                key={vibe.id}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => handleChipPress(vibe.query)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {vibe.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          {searchChips.slice(0, 4).map((chip, index) => {
            const isSelected = query.toLowerCase() === chip.toLowerCase();
            return (
              <TouchableOpacity
                key={`search-chip-${index}`}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => handleChipPress(chip)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>#{chip}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Recommended Songs ────────────────────────────────────────── */}
      {recommendedSongs.length > 0 && (recentSongs.length > 0 || likedSongs.length > 0) && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <View style={styles.recentTitleWrap}>
              <Ionicons name="sparkles" size={15} color={colors.accent} />
              <Text style={styles.recentTitle}>Picked for you</Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Based on {recentSongs[0] || likedSongs[0] ? (recentSongs[0] || likedSongs[0]).title : 'your taste'}
            </Text>
          </View>
          {recommendedSongs.slice(0, 5).map((item) => (
            <SongCard key={`recommended-${item.id}`} song={item}
              onPress={(song) => handleSongPress(song, recommendedSongs)}
              onAddToQueue={handleAddToQueue} isPlaying={currentSong?.id === item.id && isPlaying} />
          ))}
        </View>
      )}

      {/* ─── Trending Radar Carousel ──────────────────────────────────── */}
      {isTrendingLoading ? (
        <View style={styles.trendingPlaceholder}>
          <View style={styles.trendingPlaceholderHeader}>
            <Ionicons name="flame" size={18} color={colors.accent} />
            <Text style={styles.sectionHeaderTitle}>Trending now</Text>
          </View>
          <View style={styles.trendingPlaceholderCards}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.trendingPlaceholderCard} />
            ))}
          </View>
        </View>
      ) : trendingSongs.length > 0 ? (
        <TrendingCarousel
          songs={trendingSongs}
          onSongPress={(song) => handleSongPress(song, trendingSongs)}
          onAddToQueue={handleAddToQueue}
          currentSongId={currentSong?.id}
        />
      ) : null}

      {/* ─── Recent Rotation ─────────────────────────────────────────── */}
      {showRecent && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <View style={styles.recentTitleWrap}>
              <Ionicons name="time" size={15} color={colors.textSecondary} />
              <Text style={styles.recentTitle}>Recently played</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{recentSongs.length} tracks</Text>
            </View>
          </View>
          {recentSongs.map((item, index) => (
            <SongCard
              key={`recent-${item.id}-${index}`}
              song={item}
              onPress={(song) => handleSongPress(song, recentSongs)}
              onAddToQueue={handleAddToQueue}
              isPlaying={currentSong?.id === item.id && isPlaying}
            />
          ))}
        </View>
      )}

      {discoveryError && !isTrendingLoading && (
        <View style={styles.discoveryError}>
          <Text style={styles.discoveryErrorText}>{trendingSongs.length ? 'Could not refresh trending songs. Showing your saved list.' : 'Popular songs could not load right now.'}</Text>
          <TouchableOpacity onPress={retryDiscovery} style={styles.discoveryRetry}>
            <Text style={styles.discoveryRetryText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Empty state when no recent and no trending ───────────────── */}
      {!showRecent && trendingSongs.length === 0 && !isTrendingLoading && (
        <View style={styles.centered}>
          <RNAnimated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons name="musical-notes-outline" size={64} color={colors.accent} style={{ opacity: 0.35 }} />
          </RNAnimated.View>
          <Text style={styles.emptyTitle}>FIND YOUR VIBE</Text>
          <Text style={styles.emptyText}>Search for any track, artist, or tap a quick vibe radar chip.</Text>
        </View>
      )}
    </RNAnimated.ScrollView>
  );

  const initialLetter = (user?.username || 'M').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      {/* ─── Futuristic Header with Avatar, Dynamic Sticky Interpolation & Status ── */}
      <View style={[styles.greetingContainer, { paddingTop: insets.top + spacing.xs }]}>
        {/* Sticky Background & Border appearing on scroll [0, 80] */}
        <RNAnimated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#121212',
              opacity: headerBgOpacity,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 255, 255, 0.08)',
            },
          ]}
        />

        <View style={styles.avatarGreetingRow}>
          {/* Avatar Ring */}
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarLetter}>{initialLetter}</Text>
          </TouchableOpacity>

          <RNAnimated.View style={[styles.greetingTextContainer, { opacity: greetingFade }]}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <View style={styles.nameRow}>
              <Text style={styles.greetingName} numberOfLines={1}>
                {user?.username ?? 'Music Lover'}
              </Text>
              {user?.tag && (
                <View style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>#{user.tag}</Text>
                </View>
              )}
            </View>
          </RNAnimated.View>

          {/* Mini Track Title Swap sliding up when hero scrolls past threshold (> 100) */}
          <RNAnimated.View
            pointerEvents="none"
            style={[
              styles.miniHeaderTitleWrap,
              {
                transform: [{ translateY: miniTitleTranslateY }],
                opacity: miniTitleOpacity,
              },
            ]}
          >
            <Text style={styles.miniHeaderTitle} numberOfLines={1}>
              {currentSong ? currentSong.title : 'Jam Music'}
            </Text>
            <Text style={styles.miniHeaderSubtitle} numberOfLines={1}>
              {currentSong ? `Playing · ${currentSong.artist}` : 'Explore Daily Mixes'}
            </Text>
          </RNAnimated.View>
        </View>

        <View style={styles.headerRightActions}>
          {/* Cyber Listening Wrap Modal Trigger */}
          <TouchableOpacity
            style={styles.wrapHeaderButton}
            onPress={() => setIsWrapVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.wrapHeaderGradient}>
              <Ionicons name="sparkles" size={15} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Live Jam Room Badge if active */}
          {isInRoom && roomId && (
            <TouchableOpacity
              style={styles.headerJamBadge}
              onPress={() => router.push('/(tabs)/jam')}
              activeOpacity={0.8}
            >
              <View style={styles.livePulseDot} />
              <Text style={styles.headerJamText}>JAM #{roomId}</Text>
            </TouchableOpacity>
          )}

          {/* Quick Library shortcut */}
          <TouchableOpacity
            style={styles.libraryHeaderButton}
            onPress={handleOpenLibrary}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="heart" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Search Bar & Auto-Suggestions ───────────────────── */}
      <View style={styles.searchContainer}>
        <RNAnimated.View style={[styles.searchBar, { borderColor }]}>
          <Ionicons
            name="search"
            size={18}
            color="#000000"
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tracks, artists, moods..."
            placeholderTextColor="#6A6A6A"
            value={query}
            editable={isOnline}
            onChangeText={handleQueryChange}
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => doSearch(query)}
            onFocus={() => {
              setIsFocused(true);
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setShowSuggestions(false), 250);
            }}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color="#000000" />
            </TouchableOpacity>
          )}
        </RNAnimated.View>

        {/* Recent Search History Drawer */}
        {query.length === 0 && isFocused && recentSearches.length > 0 && (
          <View style={styles.recentSearchesContainer}>
            <View style={styles.recentSearchesHeader}>
              <View style={styles.recentSearchesTitleRow}>
                <Ionicons name="time-outline" size={13} color={colors.accent} />
                <Text style={styles.recentSearchesTitle}>RECENT SEARCHES</Text>
              </View>
              <TouchableOpacity
                onPress={handleClearAllSearches}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearRecentText}>Clear all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.recentChipsWrap}>
              {recentSearches.map((item, idx) => (
                <View key={`recent-search-${idx}`} style={styles.recentSearchChip}>
                  <TouchableOpacity
                    style={styles.recentChipMain}
                    onPress={() => handleSelectRecentSearch(item)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="search" size={12} color={colors.textSecondary} />
                    <Text style={styles.recentChipText} numberOfLines={1}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.recentChipRemove}
                    onPress={() => handleRemoveRecentSearch(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={12} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Auto-Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={`sugg-${index}`}
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="search-outline" size={13} color={colors.accentSecondary} />
                <Text style={styles.suggestionText} numberOfLines={1}>
                  {item}
                </Text>
                <Ionicons name="arrow-back-outline" size={13} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Regional & Genre Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {REGIONAL_FILTERS.map((filt) => {
            const isSelected = activeFilter === filt;
            return (
              <TouchableOpacity
                key={filt}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => handleFilterSelect(filt)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                  {filt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Search Results vs Discovery Canvas ───────────────────────── */}
      {isSearching ? (
        <View style={styles.skeletonContainer}>
          <SkeletonList count={8} />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={searchError ? <Text style={styles.searchErrorBanner}>{searchError}</Text> : null}
          renderItem={({ item }) => (
            <SongCard
              song={item}
              onPress={(song) => handleSongPress(song, results)}
              onAddToQueue={handleAddToQueue}
              isPlaying={currentSong?.id === item.id && isPlaying}
            />
          )}
          contentContainerStyle={{ paddingBottom: currentSong ? 160 : 100 }}
          showsVerticalScrollIndicator={false}
        />
      ) : hasSearched ? (
        <View style={styles.centered}>
          <Ionicons name={searchError ? 'cloud-offline-outline' : 'search-outline'} size={44} color={colors.textSecondary} style={{ opacity: 0.65 }} />
          <Text style={styles.emptyTitle}>{searchError ? 'SEARCH UNAVAILABLE' : 'NO RESULTS FOUND'}</Text>
          <Text style={styles.emptyText}>{searchError || 'Check your spelling or try searching by artist name.'}</Text>
          {searchError && <TouchableOpacity style={styles.retryButton} onPress={() => doSearch(query)}><Text style={styles.retryButtonText}>TRY AGAIN</Text></TouchableOpacity>}
        </View>
      ) : (
        renderDiscoveryContent()
      )}

      {/* ─── AI Vibe Generator Modal ─────────────────────────────────── */}
      <Modal
        visible={isVibeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsVibeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.vibeModalCard}>
            <View style={styles.vibeModalGradient}>
              <View style={styles.vibeModalHeader}>
                <View style={styles.vibeModalBadge}>
                  <Ionicons name="sparkles" size={12} color={colors.accent} />
                  <Text style={styles.vibeModalBadgeText}>MOOD MIX</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsVibeModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.vibeModalTitle}>Build a mood mix</Text>
              <Text style={styles.vibeModalSubtitle}>
                Choose a mood or describe what you feel like listening to.
              </Text>

              {/* Presets Grid */}
              <View style={styles.vibePresetsGrid}>
                {VIBE_PRESETS.map((vp) => (
                  <TouchableOpacity
                    key={vp.id}
                    style={styles.vibePresetChip}
                    onPress={() => {
                      setVibePrompt(vp.prompt);
                      handleRunVibeGenerator(vp.prompt);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.vibePresetText}>{vp.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Prompt Input */}
              <View style={styles.vibeInputRow}>
                <TextInput
                  style={styles.vibeTextInput}
                  placeholder="Or describe custom vibe (e.g. rainy jazz)..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={vibePrompt}
                  onChangeText={setVibePrompt}
                  onSubmitEditing={() => handleRunVibeGenerator()}
                />
                <TouchableOpacity
                  style={styles.vibeGenerateBtn}
                  onPress={() => handleRunVibeGenerator()}
                  disabled={isGeneratingVibe || !vibePrompt.trim()}
                >
                  {isGeneratingVibe ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Generated Vibe Preview */}
              {generatedVibe && (
                <View style={styles.generatedVibeCard}>
                  <View style={styles.generatedVibeTop}>
                    <Text style={styles.generatedVibeTitle}>{generatedVibe.vibeTitle}</Text>
                    <View style={styles.generatedTagBadge}>
                      <Text style={styles.generatedTagText}>{generatedVibe.tag}</Text>
                    </View>
                  </View>
                  <Text style={styles.generatedVibeDesc}>{generatedVibe.description}</Text>
                  <Text style={styles.generatedCountText}>
                    ⚡ {generatedVibe.songs.length} Tracks Prepared & Decrypted
                  </Text>

                  <TouchableOpacity
                    style={styles.startVibeBtn}
                    onPress={handleStartVibeSession}
                    activeOpacity={0.85}
                  >
                    <View style={styles.startVibeGradient}>
                      <Ionicons name="play" size={16} color="#FFFFFF" />
                      <Text style={styles.startVibeText}>START VIBE SESSION</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Cyber Listening Wrap Modal */}
      <CyberListeningWrapModal
        visible={isWrapVisible}
        onClose={() => setIsWrapVisible(false)}
        favorites={likedSongs}
        history={recentSongs}
        currentSong={currentSong}
        listeningStats={listeningStats}
      />

      {/* Persistent Mini Player */}
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    zIndex: 10,
    position: 'relative',
  },
  miniHeaderTitleWrap: {
    position: 'absolute',
    left: 54,
    right: 8,
    justifyContent: 'center',
  },
  miniHeaderTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.2,
  },
  miniHeaderSubtitle: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },
  avatarGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm + 2,
    position: 'relative',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.accent,
  },
  greetingTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerJamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accentAlpha10,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  headerJamText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.accent,
    letterSpacing: 0.4,
  },
  libraryHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentAlpha10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  recentSearchesContainer: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  recentSearchesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentSearchesTitle: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  clearRecentText: {
    fontSize: typography.sizes.xs,
    color: colors.accent,
    fontWeight: '500',
  },
  recentChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recentSearchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.full,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  recentChipMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: 160,
  },
  recentChipText: {
    fontSize: typography.sizes.xs,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  recentChipRemove: {
    padding: 3,
    marginLeft: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm + 1,
    color: '#000000',
    paddingVertical: 0,
    fontWeight: '500',
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  discoveryScroll: {
    flex: 1,
  },
  chipsSection: {
    marginBottom: spacing.lg,
  },
  chipsContainer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xs + 2,
  },
  chip: {
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full,
    borderWidth: 0,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  chipTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  sectionHeaderTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.extrabold,
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  trendingPlaceholder: {
    marginBottom: spacing.lg,
  },
  trendingPlaceholderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  trendingPlaceholderCards: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  trendingPlaceholderCard: {
    width: Dimensions.get('window').width * 0.42,
    height: Dimensions.get('window').width * 0.42 * 1.25,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  recentSection: {
    marginTop: spacing.xs,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  recentTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  recentTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 0.8,
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
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    minHeight: 220,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    letterSpacing: 0.8,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  searchErrorBanner: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  discoveryError: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.backgroundElevated, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  discoveryErrorText: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, flex: 1 },
  discoveryRetry: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.backgroundInput, borderRadius: borderRadius.full },
  discoveryRetryText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
  retryButton: { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.accent, borderRadius: borderRadius.full },
  retryButtonText: { color: colors.background, fontSize: 11, fontWeight: '800' },
  wrapHeaderButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  wrapHeaderGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsContainer: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  suggestionText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 0,
  },
  filterPillActive: {
    backgroundColor: colors.accent,
  },
  filterPillText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  vibeBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  vibeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  vibeBannerLeft: {
    flex: 1,
    paddingRight: 10,
  },
  vibeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accentAlpha10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  vibeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accentLight,
    letterSpacing: 1,
  },
  vibeBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  vibeBannerDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 15,
  },
  vibeActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundInput,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  vibeModalCard: {
    width: Math.min(Dimensions.get('window').width - 32, 420),
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  vibeModalGradient: {
    padding: 20,
    backgroundColor: colors.backgroundElevated,
  },
  vibeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vibeModalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentAlpha10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vibeModalBadgeText: {
    color: colors.accentLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vibeModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  vibeModalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 16,
  },
  vibePresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  vibePresetChip: {
    backgroundColor: colors.backgroundInput,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  vibePresetText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  vibeInputRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundInput,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderCard,
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  vibeTextInput: {
    flex: 1,
    height: 44,
    color: colors.textPrimary,
    fontSize: 13,
  },
  vibeGenerateBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatedVibeCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  generatedVibeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  generatedVibeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.accentLight,
    flex: 1,
  },
  generatedTagBadge: {
    backgroundColor: colors.accentAlpha10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  generatedTagText: {
    fontSize: 9,
    color: colors.accentLight,
    fontWeight: '700',
  },
  generatedVibeDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  generatedCountText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 14,
    fontWeight: '600',
  },
  startVibeBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.accent,
  },
  startVibeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    backgroundColor: colors.accent,
  },
  startVibeText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
