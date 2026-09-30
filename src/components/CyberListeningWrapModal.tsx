import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { colors, borderRadius, spacing, typography } from '../theme';
import type { Song } from '../types';

interface CyberListeningWrapModalProps {
  visible: boolean;
  onClose: () => void;
  favorites: Song[];
  history: Song[];
  currentSong: Song | null;
  listeningStats: { tracksStarted: number; listeningMs: number; activeDays: string[]; trackPlays: Record<string, number>; artistPlays: Record<string, number> };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CyberListeningWrapModal: React.FC<CyberListeningWrapModalProps> = ({
  visible,
  onClose,
  favorites,
  history,
  currentSong,
  listeningStats,
}) => {
  const totalTracksPlayed = listeningStats.tracksStarted;
  const totalMinutes = Math.round(listeningStats.listeningMs / 60000);

  // Derive top songs from history/favorites
  const allSongs = Array.from(new Map([...history, ...favorites].map((song) => [song.id, song])).values());
  if (currentSong && !allSongs.some((song) => song.id === currentSong.id)) allSongs.unshift(currentSong);
  const topTracks = [...allSongs]
    .sort((a, b) => (listeningStats.trackPlays[b.id] || 0) - (listeningStats.trackPlays[a.id] || 0))
    .slice(0, 3);
  const topArtists = Object.entries(listeningStats.artistPlays).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const days = new Set(listeningStats.activeDays);
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  if (!days.has(todayKey)) today.setDate(today.getDate() - 1);
  let streak = 0;
  while (days.has(today.toISOString().slice(0, 10))) {
    streak += 1;
    today.setDate(today.getDate() - 1);
  }

  const handleShare = async () => {
    try {
      const topSongNames = topTracks.map((t, idx) => `${idx + 1}. ${t.title} - ${t.artist}`).join('\n');
      const artistNames = topArtists.map(([artist], idx) => `${idx + 1}. ${artist}`).join('\n');
      const shareMessage = `My Jam listening wrap\n\nListening time: ${totalMinutes} minutes\nTracks played: ${totalTracksPlayed}\nListening streak: ${streak} days\n\nTop artists:\n${artistNames || 'Keep listening to build your artist chart.'}\n\nTop tracks:\n${topSongNames || 'Keep listening to build your track chart.'}`;

      await Share.share({
        title: 'My Cyber Listening Wrap',
        message: shareMessage,
      });
    } catch (err) {
      console.warn('[Wrap] Share error:', err);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.backdrop} />

        <Animated.View entering={ZoomIn.duration(350)} style={styles.cardContainer}>
          <View style={styles.cardGradient}>
            {/* Top Close Bar */}
            <View style={styles.headerRow}>
              <View style={styles.cyberBadge}>
                <Ionicons name="sparkles" size={13} color={colors.accent} />
                <Text style={styles.cyberBadgeText}>JAM WRAP</Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Persona Headline */}
              <Animated.View entering={FadeInDown.delay(100)}>
                <Text style={styles.personaTitle}>YOUR JAM HIGHLIGHTS</Text>
                <Text style={styles.personaSubtitle}>
                  A snapshot of what you have listened to on Jam.
                </Text>
              </Animated.View>

              {/* Stat Grid */}
              <Animated.View entering={FadeInDown.delay(200)} style={styles.statGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{totalMinutes}</Text>
                  <Text style={styles.statLabel}>MINUTES LISTENED</Text>
                </View>
                <View style={[styles.statBox, styles.statBoxBorder]}>
                  <Text style={[styles.statVal, { color: '#00F5FF' }]}>{totalTracksPlayed}</Text>
                  <Text style={styles.statLabel}>TRACKS PLAYED</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, { color: '#FF007F' }]}>{streak}</Text>
                  <Text style={styles.statLabel}>DAY STREAK</Text>
                </View>
              </Animated.View>

              {/* Top Tracks Podium */}
              {topTracks.length > 0 && (
                <Animated.View entering={FadeInDown.delay(400)} style={styles.sectionWrap}>
                  <Text style={styles.sectionTitle}>HEAVY ROTATION</Text>
                  <View style={styles.podiumList}>
                    {topTracks.map((song, i) => (
                      <View key={song.id || i} style={styles.podiumItem}>
                        <Text style={styles.podiumRank}>#{i + 1}</Text>
                        {song.imageUrl ? (
                          <Image source={{ uri: song.imageUrl }} style={styles.podiumImg} />
                        ) : (
                          <View style={[styles.podiumImg, styles.placeholderImg]}>
                            <Ionicons name="musical-note" size={16} color="#8A2BE2" />
                          </View>
                        )}
                        <View style={styles.podiumInfo}>
                          <Text style={styles.podiumTitle} numberOfLines={1}>
                            {song.title}
                          </Text>
                          <Text style={styles.podiumArtist} numberOfLines={1}>
                            {song.artist}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              )}

              {/* Action Buttons */}
              {topArtists.length > 0 && (
                <Animated.View entering={FadeInDown.delay(450)} style={styles.sectionWrap}>
                  <Text style={styles.sectionTitle}>TOP ARTISTS</Text>
                  {topArtists.map(([artist, count], index) => (
                    <Text key={artist} style={styles.podiumArtist}>#{index + 1} {artist} · {count} {count === 1 ? 'play' : 'plays'}</Text>
                  ))}
                </Animated.View>
              )}
              {/* Action Buttons */}
              <Animated.View entering={FadeIn.delay(500)} style={styles.actionContainer}>
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={handleShare}
                  activeOpacity={0.85}
                >
                  <View style={styles.shareGradient}>
                    <Ionicons name="share-social" size={18} color="#FFFFFF" />
                    <Text style={styles.shareText}>SHARE CYBER WRAP</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  cardContainer: {
    width: Math.min(SCREEN_WIDTH - 32, 420),
    maxHeight: '88%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: colors.backgroundElevated,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.backgroundElevated,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cyberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentAlpha10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
  },
  cyberBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  personaTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 4,
  },
  personaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
    marginBottom: 18,
  },
  statGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.8,
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  vibeBars: {
    gap: 10,
  },
  vibeRow: {
    gap: 4,
  },
  vibeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vibeName: {
    fontSize: 12,
    color: '#E0E0E0',
    fontWeight: '600',
  },
  vibePercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  podiumList: {
    gap: 8,
  },
  podiumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  podiumRank: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.accent,
    width: 28,
    textAlign: 'center',
  },
  podiumImg: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.albumArt,
    marginRight: 10,
  },
  placeholderImg: {
    backgroundColor: colors.backgroundInput,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumInfo: {
    flex: 1,
  },
  podiumTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  podiumArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  actionContainer: {
    marginTop: 8,
  },
  shareBtn: {
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
    backgroundColor: colors.accent,
  },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    backgroundColor: colors.accent,
  },
  shareText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
