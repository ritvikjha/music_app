import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors, spacing, borderRadius, typography } from '../theme';
import type { Song } from '../types';

interface LyricsModalProps {
  visible: boolean;
  onClose: () => void;
  song: Song | null;
  positionMs?: number;
}

interface SyncedLine {
  timeMs: number;
  text: string;
}

/**
 * Parse LRC format lyrics [mm:ss.xx] Text into SyncedLine objects
 */
function parseLrc(lrc: string): SyncedLine[] {
  const lines = lrc.split('\n');
  const result: SyncedLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10);
      const timeMs = minutes * 60000 + seconds * 1000 + ms;
      const text = match[4].trim();
      result.push({ timeMs, text });
    }
  }
  return result;
}

export function LyricsModal({ visible, onClose, song, positionMs = 0 }: LyricsModalProps) {
  const [loading, setLoading] = useState(false);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [syncedLyrics, setSyncedLyrics] = useState<SyncedLine[]>([]);
  const [hasError, setHasError] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible || !song) return;

    let isMounted = true;
    setLoading(true);
    setHasError(false);
    setPlainLyrics(null);
    setSyncedLyrics([]);

    (async () => {
      try {
        // Clean title (remove (From "Movie") or [Remix] tags for better matching)
        const cleanTitle = song.title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
        const cleanArtist = song.artist.split(',')[0].trim();

        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(
          cleanArtist
        )}&track_name=${encodeURIComponent(cleanTitle)}`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'JamMusicApp/1.0',
          },
        });

        if (!response.ok) {
          throw new Error('Lyrics not found');
        }

        const data = await response.json();
        if (!isMounted) return;

        if (data.syncedLyrics) {
          const parsed = parseLrc(data.syncedLyrics);
          if (parsed.length > 0) {
            setSyncedLyrics(parsed);
          } else if (data.plainLyrics) {
            setPlainLyrics(data.plainLyrics);
          }
        } else if (data.plainLyrics) {
          setPlainLyrics(data.plainLyrics);
        } else {
          setHasError(true);
        }
      } catch (err) {
        if (isMounted) setHasError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible, song]);

  // Find active line index for synchronized lyrics
  let activeIndex = -1;
  if (syncedLyrics.length > 0) {
    for (let i = syncedLyrics.length - 1; i >= 0; i--) {
      if (positionMs >= syncedLyrics[i].timeMs) {
        activeIndex = i;
        break;
      }
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="mic" size={20} color={colors.accent} />
              <Text style={styles.title}>Lyrics</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Song Subheader */}
          {song && (
            <View style={styles.songSubheader}>
              <Text style={styles.songTitle} numberOfLines={1}>
                {song.title}
              </Text>
              <Text style={styles.songArtist} numberOfLines={1}>
                {song.artist}
              </Text>
            </View>
          )}

          {/* Lyrics Content */}
          <View style={styles.contentContainer}>
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.statusText}>Searching for lyrics...</Text>
              </View>
            ) : hasError || (!plainLyrics && syncedLyrics.length === 0) ? (
              <View style={styles.centerContainer}>
                <Ionicons
                  name="musical-note-outline"
                  size={48}
                  color={colors.textSecondary}
                  style={{ opacity: 0.4 }}
                />
                <Text style={styles.emptyTitle}>No lyrics available</Text>
                <Text style={styles.emptySubtitle}>
                  Lyrics for "{song?.title}" haven't been added yet.
                </Text>
              </View>
            ) : syncedLyrics.length > 0 ? (
              <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.lyricsScroll}
              >
                {syncedLyrics.map((line, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <Text
                      key={`sync-${idx}`}
                      style={[
                        styles.syncedLine,
                        isActive && styles.activeSyncedLine,
                      ]}
                    >
                      {line.text || '♪'}
                    </Text>
                  );
                })}
              </ScrollView>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.lyricsScroll}
              >
                <Text style={styles.plainLyricsText}>{plainLyrics}</Text>
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    height: '80%',
    backgroundColor: '#121118',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songSubheader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  songTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.accent,
  },
  songArtist: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  statusText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  lyricsScroll: {
    paddingVertical: spacing.xl,
    paddingBottom: 60,
  },
  syncedLine: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: 'rgba(230, 226, 240, 0.35)',
    marginVertical: 8,
    lineHeight: 28,
  },
  activeSyncedLine: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.accent,
    textShadowColor: colors.accentAlpha25,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  plainLyricsText: {
    fontSize: typography.sizes.md,
    lineHeight: 28,
    color: colors.textPrimary,
  },
});
