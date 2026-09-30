import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '../theme';
import { networkMonitor } from '../services/networkMonitor';

export const OfflineStatusPill: React.FC = () => {
  const [isOnline, setIsOnline] = useState(networkMonitor.isOnline);

  useEffect(() => {
    return networkMonitor.addListener((status) => {
      setIsOnline(status);
    });
  }, []);

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Ionicons name="cloud-offline" size={13} color={colors.error} />
        <Text style={styles.pillText}>OFFLINE MODE • LOCAL STASH ACTIVE</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(243, 114, 127, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(243, 114, 127, 0.35)',
  },
  pillText: {
    color: colors.error,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
