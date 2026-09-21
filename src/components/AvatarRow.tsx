import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';

interface AvatarRowProps {
  count: number;
  maxVisible?: number;
}

/**
 * Row of circular avatars representing room members.
 * Shows initials for demo purposes (no real avatar URLs yet).
 */
export function AvatarRow({ count, maxVisible = 5 }: AvatarRowProps) {
  const visible = Math.min(count, maxVisible);
  const overflow = count - visible;

  // Generate placeholder avatars with different hues
  const avatarColors = [
    '#9A85C9',
    '#B8A6E0',
    '#7E6DB5',
    '#C4B8E8',
    '#8B7AAE',
  ];

  return (
    <View style={styles.container}>
      {Array.from({ length: visible }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.avatar,
            {
              backgroundColor: avatarColors[i % avatarColors.length],
              marginLeft: i > 0 ? -8 : 0,
              zIndex: visible - i,
            },
          ]}
        >
          <Text style={styles.avatarText}>
            {String.fromCharCode(65 + (i % 26))}
          </Text>
        </View>
      ))}
      {overflow > 0 && (
        <View style={[styles.avatar, styles.overflowBadge, { marginLeft: -8, zIndex: 0 }]}>
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
});
