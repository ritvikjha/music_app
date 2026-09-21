import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { MiniPlayer } from '../components/MiniPlayer';
import { GlowCard } from '../components/GlowCard';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

const STATS_KEY = '@jam_listening_stats';

interface ListeningStats {
  songsPlayed: number;
  totalMinutes: number;
}

/**
 * Profile screen — shows user identity, unique tag, stats, and settings.
 */
export default function ProfileScreen() {
  const { user, fullTag, logout } = useAuth();
  const [stats, setStats] = useState<ListeningStats>({ songsPlayed: 0, totalMinutes: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STATS_KEY);
        if (stored) setStats(JSON.parse(stored));
      } catch {
        // stats are optional
      }
    })();
  }, []);

  const handleCopyTag = async () => {
    if (fullTag) {
      await Clipboard.setStringAsync(fullTag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const initial = user?.username?.charAt(0).toUpperCase() ?? '?';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar & Identity */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarLarge, shadows.lavenderGlowIntense]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <TouchableOpacity style={styles.tagRow} onPress={handleCopyTag} activeOpacity={0.7}>
            <Text style={styles.tagText}>{fullTag}</Text>
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={16}
              color={copied ? colors.online : colors.textSecondary}
            />
          </TouchableOpacity>
          {copied && <Text style={styles.copiedHint}>Copied to clipboard!</Text>}
        </View>

        {/* Unique Tag Info Card */}
        <GlowCard style={styles.infoCard}>
          <View style={styles.infoCardInner}>
            <Ionicons name="finger-print" size={22} color={colors.accent} />
            <View style={styles.infoCardText}>
              <Text style={styles.infoCardTitle}>Your Unique Tag</Text>
              <Text style={styles.infoCardDesc}>
                Share your tag with friends so they can add you. Each user has a unique tag to prevent
                wrong-person adds.
              </Text>
            </View>
          </View>
        </GlowCard>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.songsPlayed}</Text>
            <Text style={styles.statLabel}>Songs Played</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalMinutes}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.settingsText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
            <Ionicons name="volume-medium-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.settingsText}>Audio Quality</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.settingsText}>About Jam</Text>
            <Text style={styles.versionText}>v1.0.0</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingTop: spacing.xl,
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    marginBottom: spacing.lg,
  },
  avatarInitial: {
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.bold,
    color: colors.accent,
  },
  username: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  tagText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  copiedHint: {
    fontSize: typography.sizes.xs,
    color: colors.online,
    marginTop: spacing.xs,
  },
  infoCard: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  infoCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoCardText: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoCardDesc: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  statNumber: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  settingsSection: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  settingsText: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
  },
  versionText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: 'rgba(224, 138, 138, 0.08)',
  },
  logoutText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.error,
  },
});
