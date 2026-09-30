import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, type ErrorBoundaryProps } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PlayerScreen from '../screens/PlayerScreen';
import { colors, spacing, borderRadius } from '../theme';

/**
 * Expo Router ErrorBoundary export for the /player route.
 * Shows a simple dark screen with a back button and never closes the whole app.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();

  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorCard}>
        <View style={styles.iconCircle}>
          <Ionicons name="musical-notes" size={32} color={colors.accent} />
        </View>
        <Text style={styles.errorTitle}>Player Unavailable</Text>
        <Text style={styles.errorSubtitle}>
          We couldn't open the full player for this track. Playback will continue in the background.
        </Text>
        {__DEV__ && error?.message ? (
          <Text style={styles.devError} numberOfLines={2}>
            {error.message}
          </Text>
        ) : null}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={retry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={16} color="#000000" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function PlayerRoute() {
  return <PlayerScreen />;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#181818',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(30, 215, 96, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 215, 96, 0.25)',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#B3B3B3',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  devError: {
    fontSize: 11,
    color: '#FF4D6D',
    marginBottom: 16,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: borderRadius.pill,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.pill,
  },
  retryBtnText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 13,
  },
});
