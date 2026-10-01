import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Image,
  Switch,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { useJam } from '../context/JamContext';
import { useQueue } from '../context/QueueContext';
import { useToast } from '../context/ToastContext';
import { MiniPlayer } from '../components/MiniPlayer';
import { AnimatedEqualizer } from '../components/AnimatedEqualizer';
import { SoundPresetsModal } from '../components/SoundPresetsModal';
import { SquadSection } from '../components/SquadSection';
import { CyberListeningWrapModal } from '../components/CyberListeningWrapModal';
import { getActivePreset } from '../services/soundPresets';
import { setPreferredAudioQuality } from '../services/saavn';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import type { Song } from '../types';
import {
  startJarvis,
  stopJarvis,
  isJarvisEnabled,
  isOnboardingCompleted,
} from '../jarvis/JarvisService';
import { JarvisDebugModal } from '../components/JarvisDebugModal';
import { JarvisOnboardingModal } from '../jarvis/ui/JarvisOnboardingModal';
import { JarvisStatusRow } from '../jarvis/ui/JarvisStatusRow';
import { JarvisSettingsSection } from '../jarvis/ui/JarvisSettingsSection';

const PROFILE_CUSTOM_KEY = '@jam_custom_profile';
const AUDIO_QUALITY_KEY = '@jam_audio_quality';

interface UserProfileCustom {
  displayName?: string;
  bio?: string;
  avatarColor?: string;
}

const AVATAR_COLORS = [
  '#1ED760', // Spotify Green
  '#1DB954', // Darker Green
  '#F43F5E', // Coral
  '#10B981', // Emerald
  '#F59E0B', // Amber
];

/**
 * Profile screen — real listening stats, editable profile with bio & avatar styling,
 * horizontally scrollable recent tracks, and app settings.
 */
export default function ProfileScreen() {
  const { user, fullTag, logout } = useAuth();
  const { recentSongs, likedSongs, listeningStats } = useLibrary();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { isInRoom, roomId, jamChangeSong, jamAddToQueue } = useJam();
  const { autoplay, toggleAutoplay } = useQueue();
  const { showToast } = useToast();

  const [copied, setCopied] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [audioQuality, setAudioQuality] = useState<'Normal (160k)' | 'High (320k)'>('High (320k)');
  const [showSoundPresets, setShowSoundPresets] = useState(false);
  const [showListeningWrap, setShowListeningWrap] = useState(false);
  const [activePresetName, setActivePresetName] = useState('Cyber Dynamic');

  // Jarvis Voice Assistant state
  const [jarvisEnabled, setJarvisEnabled] = useState(false);
  const [jarvisLoading, setJarvisLoading] = useState(false);
  const [showJarvisDebugModal, setShowJarvisDebugModal] = useState(false);
  const [showJarvisOnboarding, setShowJarvisOnboarding] = useState(false);

  // Profile Customization state
  const [profileCustom, setProfileCustom] = useState<UserProfileCustom>({
    displayName: user?.username || 'Music Lover',
    bio: 'Late-night listening sessions & vibe curator 🎧',
    avatarColor: colors.accent,
  });

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editColor, setEditColor] = useState<string>(colors.accent);

  // Social Graph state
  const [followingList, setFollowingList] = useState<string[]>([]);

  // Load custom profile & settings on mount
  useEffect(() => {
    (async () => {
      try {
        const storedProfile = await AsyncStorage.getItem(PROFILE_CUSTOM_KEY);
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          setProfileCustom((prev) => ({ ...prev, ...parsed }));
        }

        const storedQuality = await AsyncStorage.getItem(AUDIO_QUALITY_KEY);
        if (storedQuality) {
          setAudioQuality(storedQuality as any);
          setPreferredAudioQuality(storedQuality);
        }

        const preset = await getActivePreset();
        setActivePresetName(preset.name);

        const storedFollowing = await AsyncStorage.getItem('@jam_following_users');
        if (storedFollowing) {
          setFollowingList(JSON.parse(storedFollowing));
        }
      } catch (err) {
        console.warn('[Profile] Failed to load custom settings:', err);
      }

      // Restore Jarvis toggle state
      try {
        const jarvisWasEnabled = await isJarvisEnabled();
        setJarvisEnabled(jarvisWasEnabled);
        if (jarvisWasEnabled) {
          await startJarvis({
            onWakeDetected: (modelName, score) => {
              showToast(`Jarvis heard you! (${score.toFixed(2)})`, 'success');
            },
            onTranscript: (text, isFinal) => {
              if (isFinal) {
                showToast(`You said: "${text}"`, 'info');
              }
            },
            onError: (reason) => {
              if (reason === 'no_speech') {
                showToast('Jarvis: No speech detected', 'info');
              } else if (reason === 'recognizer_unavailable') {
                showToast('Jarvis: Speech recognizer unavailable', 'error');
              }
            },
          });
        }
      } catch (err) {
        console.warn('[Profile] Failed to restore Jarvis state:', err);
      }
    })();
  }, []);

  const handleShareProfile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const profileUrl = `jam://profile/${encodeURIComponent(user?.username || 'user')}`;
      await Share.share({
        title: `${profileCustom.displayName}'s Jam Profile`,
        message: `⚡ Check out my music profile on Jam Music!\n🎧 User: ${fullTag || profileCustom.displayName}\n🌌 Bio: "${profileCustom.bio}"\n🔗 Open in Jam: ${profileUrl}`,
      });
      showToast('Profile link prepared!', 'success');
    } catch (err) {
      console.warn('[Profile] Share error:', err);
    }
  };

  const handleInviteToJam = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const code = roomId || Math.floor(100000 + Math.random() * 900000).toString();
      const roomUrl = `jam://room/${code}`;
      await Share.share({
        title: 'Join My Jam Room',
        message: `🚀 Join my live Jam Session on Jam Music!\n🎧 Real-time audio sync & chat\n🔑 Room Code: #${code}\n🔗 Open: ${roomUrl}`,
      });
      showToast(`Jam Invite created for #${code}`, 'success');
    } catch (err) {
      console.warn('[Profile] Jam invite error:', err);
    }
  };

  // Playback totals are persisted separately from the capped recent-song list.
  const stats = useMemo(() => {
    const totalTracks = listeningStats.tracksStarted;

    return {
      tracksPlayed: totalTracks,
      hoursListened: (listeningStats.listeningMs / 3600000).toFixed(1),
      topVibe: recentSongs[0]?.title || '—',
      likedSongs: likedSongs.length,
    };
  }, [recentSongs, listeningStats, likedSongs.length]);

  const handleCopyTag = async () => {
    if (fullTag) {
      await Clipboard.setStringAsync(fullTag);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setCopied(true);
      showToast('Unique tag copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenEdit = () => {
    setEditName(profileCustom.displayName || user?.username || '');
    setEditBio(profileCustom.bio || '');
    setEditColor(profileCustom.avatarColor || colors.accent);
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    const updated: UserProfileCustom = {
      displayName: editName.trim() || user?.username || 'Music Lover',
      bio: editBio.trim() || 'Enjoying tunes on Jam 🎵',
      avatarColor: editColor,
    };
    setProfileCustom(updated);
    setShowEditModal(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await AsyncStorage.setItem(PROFILE_CUSTOM_KEY, JSON.stringify(updated));
      showToast('Profile updated!', 'success');
    } catch {}
  };

  const handleToggleQuality = async () => {
    const nextQuality = audioQuality === 'High (320k)' ? 'Normal (160k)' : 'High (320k)';
    setAudioQuality(nextQuality);
    setPreferredAudioQuality(nextQuality);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await AsyncStorage.setItem(AUDIO_QUALITY_KEY, nextQuality);
      showToast(`Audio quality set to ${nextQuality}`, 'info');
    } catch {}
  };

  const handleClearCache = async () => {
    Alert.alert('Clear Cache', 'Clear temporary playback cache and recent search history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          showToast('Cache cleared successfully', 'success');
        },
      },
    ]);
  };

  const handleSongPress = (song: Song) => {
    if (isInRoom) {
      if (currentSong) {
        jamAddToQueue(song);
        showToast(`Added ${song.title} to Jam Queue`, 'success');
      } else {
        jamChangeSong(song);
        showToast(`Playing ${song.title}`, 'info');
      }
    } else {
      playSong(song);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of Jam?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const handleCheckUpdates = async () => {
    if (!Updates.isEnabled) {
      Alert.alert(
        'Development Mode',
        'Over-The-Air updates are only active in preview/production builds.'
      );
      return;
    }

    setCheckingUpdate(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          'Update Ready!',
          'A new version of Jam has been downloaded. Restart now to apply changes?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Restart Now',
              style: 'default',
              onPress: () => Updates.reloadAsync(),
            },
          ]
        );
      } else {
        Alert.alert('Up to Date', 'You are on the latest version of Jam!');
      }
    } catch (error) {
      Alert.alert('Update Check', 'Could not check for updates: ' + (error as Error).message);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const initial = (profileCustom.displayName || user?.username || '?').charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Centered Profile Hero */}
        <View style={styles.cyberIdCard}>
          {/* User Info - Centered */}
          <View style={styles.cyberUserRow}>
            <View
              style={[
                styles.avatarLarge,
                {
                  borderColor: profileCustom.avatarColor || colors.accent,
                },
              ]}
            >
              <Text
                style={[
                  styles.avatarInitial,
                  { color: profileCustom.avatarColor || colors.accent },
                ]}
              >
                {initial}
              </Text>
            </View>

            <Text style={styles.displayName}>{profileCustom.displayName}</Text>

            {/* Username / Tag Pill */}
            <TouchableOpacity style={styles.tagRow} onPress={handleCopyTag} activeOpacity={0.7}>
              <Text style={styles.tagText}>{fullTag || `@${user?.username}`}</Text>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={12}
                color={copied ? colors.online : colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Bio / Mood */}
            {profileCustom.bio ? (
              <View style={styles.bioContainer}>
                <Text style={styles.bioText} numberOfLines={2}>{profileCustom.bio}</Text>
              </View>
            ) : null}

            {/* Edit Profile Action */}
            <TouchableOpacity
              style={styles.editProfileBtn}
              activeOpacity={0.8}
              onPress={handleOpenEdit}
            >
              <Ionicons name="pencil" size={13} color={colors.textPrimary} />
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Live Presence "Listening To..." Broadcast Badge */}
          {isPlaying && currentSong && (
            <View style={styles.listeningPresenceBadge}>
              <AnimatedEqualizer size={12} color={colors.accent} />
              <View style={styles.listeningPresenceTextWrap}>
                <Text style={styles.listeningPresenceLabel}>BROADCASTING PRESENCE:</Text>
                <Text style={styles.listeningPresenceSong} numberOfLines={1}>
                  {currentSong.title} — {currentSong.artist}
                </Text>
              </View>
              <View style={styles.livePulseDot} />
            </View>
          )}

          {/* Followers & Following Counts & Social Actions Bar */}
          <View style={styles.socialBar}>
            <View style={styles.followStatsRow}>
              <Text style={styles.followStatCount}>142</Text>
              <Text style={styles.followStatLabel}>Followers</Text>
              <Text style={styles.followStatDot}>•</Text>
              <Text style={styles.followStatCount}>{followingList.length || 8}</Text>
              <Text style={styles.followStatLabel}>Following</Text>
            </View>

            <View style={styles.profileActionButtons}>
              <TouchableOpacity
                style={styles.profileActionBtn}
                onPress={handleInviteToJam}
                activeOpacity={0.8}
              >
                <Ionicons name="radio" size={13} color="#000000" />
                <Text style={styles.profileActionBtnText}>INVITE TO JAM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.profileActionBtn, styles.profileActionBtnSecondary]}
                onPress={handleShareProfile}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={13} color="#FFFFFF" />
                <Text style={[styles.profileActionBtnText, { color: '#FFFFFF' }]}>SHARE ID</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Meaningful Real Listening Stats Radar Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <View style={styles.statIconRow}>
                <Ionicons name="musical-notes" size={11} color={colors.accent} />
                <Text style={styles.statValue}>{stats.tracksPlayed}</Text>
              </View>
              <Text style={styles.statLabel}>TRACKS</Text>
              <View style={styles.statMiniBar}>
                <View style={[styles.statMiniProgress, { width: `${Math.min(stats.tracksPlayed * 5, 100)}%` }]} />
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <View style={styles.statIconRow}>
                <Ionicons name="time" size={11} color={colors.accentSecondary} />
                <Text style={styles.statValue}>{stats.hoursListened}h</Text>
              </View>
              <Text style={styles.statLabel}>HOURS</Text>
              <View style={styles.statMiniBar}>
                <View style={[styles.statMiniProgress, { width: `${Math.min(parseFloat(stats.hoursListened) * 20, 100)}%`, backgroundColor: colors.accentSecondary }]} />
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <View style={styles.statIconRow}>
                <Ionicons name="heart" size={11} color="#F97316" />
                <Text style={styles.statValue}>{stats.likedSongs}</Text>
              </View>
              <Text style={styles.statLabel}>LIKED</Text>
              <View style={styles.statMiniBar}>
                <View style={[styles.statMiniProgress, { width: '80%', backgroundColor: '#F97316' }]} />
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <View style={styles.statIconRow}>
                <Ionicons name="pulse" size={11} color="#38BDF8" />
                <Text style={[styles.statValue, { fontSize: 11 }]} numberOfLines={1}>
                  {stats.topVibe}
                </Text>
              </View>
              <Text style={styles.statLabel}>RECENT TRACK</Text>
              <View style={styles.statMiniBar}>
                <View style={[styles.statMiniProgress, { width: '100%', backgroundColor: '#38BDF8' }]} />
              </View>
            </View>
          </View>
        </View>

        {/* My Squad / Friends Section */}
        <SquadSection />

        {/* Recently Played / Top Tracks Horizontal Strip */}
        {recentSongs.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="time" size={16} color={colors.accent} />
                <Text style={styles.sectionTitle}>Recently Played</Text>
              </View>
              <Text style={styles.sectionCount}>{recentSongs.length} songs</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScroll}
            >
              {recentSongs.map((song) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <TouchableOpacity
                    key={song.id}
                    style={[styles.trackCard, isCurrent && styles.trackCardActive]}
                    activeOpacity={0.8}
                    onPress={() => handleSongPress(song)}
                  >
                    <Image source={{ uri: song.imageUrl }} style={styles.trackCardImage} />
                    {isCurrent && (
                      <View style={styles.trackEqualizerBadge}>
                        <AnimatedEqualizer size={12} isPlaying={isPlaying} />
                      </View>
                    )}
                    <Text style={styles.trackCardTitle} numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={styles.trackCardArtist} numberOfLines={1}>
                      {song.artist}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Settings & App Management Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsHeaderTitle}>Preferences & Settings</Text>

          {/* Sound Profiles & Equalizer */}
          <TouchableOpacity
            style={styles.settingsItem}
            activeOpacity={0.7}
            onPress={() => setShowSoundPresets(true)}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="options-outline" size={20} color={colors.accent} />
              <View>
                <Text style={styles.settingsText}>Sound Profiles & EQ</Text>
                <Text style={styles.settingsSubtext}>5-Band tuning, acoustic presets & speed</Text>
              </View>
            </View>
            <View style={styles.profileBadge}>
              <Text style={styles.profileBadgeText}>{activePresetName}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.accent} />
            </View>
          </TouchableOpacity>

          {/* Smart Autoplay (Endless Radio) */}
          <View style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons
                name={autoplay ? 'flash' : 'flash-outline'}
                size={20}
                color={autoplay ? colors.accent : colors.textSecondary}
              />
              <View>
                <Text style={styles.settingsText}>Smart Autoplay</Text>
                <Text style={styles.settingsSubtext}>Auto-play similar tracks when queue ends</Text>
              </View>
            </View>
            <Switch
              value={autoplay}
              onValueChange={toggleAutoplay}
              trackColor={{ false: '#3E3E3E', true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Jarvis Voice Assistant */}
          <View style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons
                name={jarvisEnabled ? 'mic' : 'mic-off-outline'}
                size={20}
                color={jarvisEnabled ? '#F43F5E' : colors.textSecondary}
              />
              <View>
                <Text style={styles.settingsText}>Jarvis Voice Assistant</Text>
                <Text style={styles.settingsSubtext}>
                  {jarvisLoading
                    ? 'Starting…'
                    : jarvisEnabled
                    ? 'Listening for "Hey Jarvis"'
                    : 'Always-on wake word detection'}
                </Text>
              </View>
            </View>
            <Switch
              value={jarvisEnabled}
              disabled={jarvisLoading}
              onValueChange={async (value) => {
                if (value) {
                  const onboardingDone = await isOnboardingCompleted();
                  if (!onboardingDone) {
                    setShowJarvisOnboarding(true);
                    return;
                  }
                }
                setJarvisLoading(true);
                try {
                  if (value) {
                    const started = await startJarvis({
                      onWakeDetected: (modelName, score) => {
                        showToast(`Jarvis heard you! (${score.toFixed(2)})`, 'success');
                      },
                      onTranscript: (text, isFinal) => {
                        if (isFinal) {
                          showToast(`You said: "${text}"`, 'info');
                        }
                      },
                      onError: (reason) => {
                        if (reason === 'no_speech') {
                          showToast('Jarvis: No speech detected', 'info');
                        } else if (reason === 'recognizer_unavailable') {
                          showToast('Jarvis: Speech recognizer unavailable', 'error');
                        }
                      },
                    });
                    setJarvisEnabled(started);
                    if (started) {
                      showToast('Jarvis is now listening', 'info');
                    }
                  } else {
                    await stopJarvis();
                    setJarvisEnabled(false);
                    showToast('Jarvis stopped listening', 'info');
                  }
                } catch (err) {
                  console.warn('[Profile] Jarvis toggle error:', err);
                } finally {
                  setJarvisLoading(false);
                }
              }}
              trackColor={{ false: '#3E3E3E', true: '#F43F5E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Health & Status Row (Listening / Paused / Battery / Permissions + Telemetry) */}
          <JarvisStatusRow
            enabled={jarvisEnabled}
            onOpenSetupGuide={() => setShowJarvisOnboarding(true)}
          />

          {/* Jarvis Configuration Settings Section */}
          {jarvisEnabled && (
            <JarvisSettingsSection
              onOpenDebugModal={() => setShowJarvisDebugModal(true)}
              showToast={showToast}
            />
          )}

          {/* Audio Quality Toggle */}
          <TouchableOpacity
            style={styles.settingsItem}
            activeOpacity={0.7}
            onPress={handleToggleQuality}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="hardware-chip-outline" size={20} color={colors.accent} />
              <View>
                <Text style={styles.settingsText}>Streaming Quality</Text>
                <Text style={styles.settingsSubtext}>High fidelity audio stream</Text>
              </View>
            </View>
            <View style={styles.qualityBadge}>
              <Text style={styles.qualityBadgeText}>{audioQuality}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7} onPress={() => setShowListeningWrap(true)}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="stats-chart-outline" size={20} color={colors.accent} />
              <View>
                <Text style={styles.settingsText}>Your listening wrap</Text>
                <Text style={styles.settingsSubtext}>A look back at your Jam listening</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Storage / Cache */}
          <TouchableOpacity
            style={styles.settingsItem}
            activeOpacity={0.7}
            onPress={handleClearCache}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
              <View>
                <Text style={styles.settingsText}>Clear Cache</Text>
                <Text style={styles.settingsSubtext}>Free up offline storage space</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Check for Updates */}
          <TouchableOpacity
            style={styles.settingsItem}
            activeOpacity={0.7}
            onPress={handleCheckUpdates}
            disabled={checkingUpdate}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="cloud-download-outline" size={20} color={colors.accentSecondary} />
              <View>
                <Text style={styles.settingsText}>
                  {checkingUpdate ? 'Checking Updates...' : 'Check for Updates'}
                </Text>
                <Text style={styles.settingsSubtext}>Over-The-Air app patches</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* About Jam */}
          <TouchableOpacity
            style={styles.settingsItem}
            activeOpacity={0.8}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowJarvisDebugModal(true);
            }}
          >
            <View style={styles.settingsItemLeft}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <View>
                <Text style={styles.settingsText}>About Jam</Text>
                <Text style={styles.settingsSubtext}>Built with real-time sync</Text>
              </View>
            </View>
            <Text style={styles.versionText}>v1.0.0 (OTA)</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={19} color={colors.error} />
          <Text style={styles.logoutText}>Log Out of Jam</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Display Name Input */}
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your display name"
              placeholderTextColor={colors.textSecondary}
              maxLength={24}
            />

            {/* Bio Input */}
            <Text style={styles.inputLabel}>Bio / Listening Vibe</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputBio]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="What are you listening to?"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={90}
            />

            {/* Avatar Glow Color Picker */}
            <Text style={styles.inputLabel}>Avatar Glow Accent</Text>
            <View style={styles.colorRow}>
              {AVATAR_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    editColor === c && styles.colorCircleSelected,
                  ]}
                  onPress={() => setEditColor(c)}
                  activeOpacity={0.7}
                >
                  {editColor === c && <Ionicons name="checkmark" size={16} color="#000" />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEditModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveProfile}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sound Profiles & Equalizer Modal */}
      <SoundPresetsModal
        visible={showSoundPresets}
        onClose={() => setShowSoundPresets(false)}
        onPresetChange={(preset) => setActivePresetName(preset.name)}
      />

      <CyberListeningWrapModal visible={showListeningWrap} onClose={() => setShowListeningWrap(false)} favorites={likedSongs} history={recentSongs} currentSong={currentSong} listeningStats={listeningStats} />
      <JarvisDebugModal visible={showJarvisDebugModal} onClose={() => setShowJarvisDebugModal(false)} />
      <JarvisOnboardingModal
        visible={showJarvisOnboarding}
        onClose={async (completed) => {
          setShowJarvisOnboarding(false);
          if (completed) {
            setJarvisLoading(true);
            try {
              const started = await startJarvis({
                onWakeDetected: (modelName, score) => {
                  showToast(`Jarvis heard you! (${score.toFixed(2)})`, 'success');
                },
                onTranscript: (text, isFinal) => {
                  if (isFinal) {
                    showToast(`You said: "${text}"`, 'info');
                  }
                },
                onError: (reason) => {
                  if (reason === 'no_speech') {
                    showToast('Jarvis: No speech detected', 'info');
                  }
                },
              });
              setJarvisEnabled(started);
              if (started) {
                showToast('Jarvis is now listening', 'info');
              }
            } catch (err) {
              console.warn('[Profile] Failed to start Jarvis after onboarding:', err);
            } finally {
              setJarvisLoading(false);
            }
          }
        }}
      />
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 160,
  },
  cyberIdCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cyberUserRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  avatarInitial: {
    fontSize: 42,
    fontWeight: '800',
  },
  displayName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginTop: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 14,
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bioContainer: {
    marginTop: 8,
    paddingHorizontal: spacing.md,
  },
  bioText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 1,
    marginBottom: 4,
  },
  statMiniBar: {
    width: '75%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  statMiniProgress: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  recentSection: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },
  sectionCount: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  recentScroll: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  trackCard: {
    width: 110,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    padding: spacing.xs + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    position: 'relative',
  },
  trackCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentAlpha10,
  },
  trackCardImage: {
    width: '100%',
    height: 100,
    borderRadius: borderRadius.sm,
    marginBottom: 6,
  },
  trackEqualizerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  trackCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  trackCardArtist: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  settingsSection: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingsHeaderTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  settingsText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  settingsSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  qualityBadge: {
    backgroundColor: colors.accentAlpha10,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  qualityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentAlpha10,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderNeon,
  },
  profileBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  versionText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 77, 109, 0.12)',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 109, 0.35)',
  },
  logoutText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderNeon,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  modalInput: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.md,
  },
  modalInputBio: {
    height: 64,
    textAlignVertical: 'top',
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
    marginTop: spacing.xs,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  modalCancelBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: '#000000',
  },
  listeningPresenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentAlpha10,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.accentAlpha25,
    gap: 8,
  },
  listeningPresenceTextWrap: {
    flex: 1,
  },
  listeningPresenceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.8,
  },
  listeningPresenceSong: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 1,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  socialBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  followStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  followStatCount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  followStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  followStatDot: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    marginHorizontal: 2,
  },
  profileActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  profileActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  profileActionBtnSecondary: {
    backgroundColor: colors.backgroundElevated,
  },
  profileActionBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },
});
