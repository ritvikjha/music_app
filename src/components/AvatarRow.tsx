import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';

interface AvatarRowProps {
  count: number;
  maxVisible?: number;
  members?: Array<{ id?: string; username?: string; isHost?: boolean }>;
}

/**
 * Row of circular avatars representing room members with glowing border.
 */
export function AvatarRow({ count, maxVisible = 5, members }: AvatarRowProps) {
  const visible = Math.min(count, maxVisible);
  const overflow = count - visible;

  const avatarColors = [
    colors.accent, // Spotify green
    '#3B82F6', // Blue
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#64748B', // Slate
  ];

  return (
    <View style={styles.container}>
      {Array.from({ length: visible }).map((_, i) => {
        const member = members && members[i];
        const letter = member?.username
          ? member.username.charAt(0).toUpperCase()
          : String.fromCharCode(65 + (i % 26));
        const isHost = member?.isHost || i === 0;

        return (
          <View
            key={i}
            style={[
              styles.avatar,
              {
                backgroundColor: avatarColors[i % avatarColors.length],
                marginLeft: i > 0 ? -10 : 0,
                zIndex: visible - i,
              },
            ]}
          >
            <Text style={styles.avatarText}>{letter}</Text>
            {isHost && (
              <View style={styles.hostCrown}>
                <Ionicons name="sparkles" size={8} color="#FFD700" />
              </View>
            )}
          </View>
        );
      })}
      {overflow > 0 && (
        <View style={[styles.avatar, styles.overflowBadge, { marginLeft: -10, zIndex: 0 }]}>
          <Text style={styles.overflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  avatarText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  overflowBadge: {
    backgroundColor: colors.backgroundInput,
    borderColor: colors.divider,
  },
  overflowText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  hostCrown: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
});
