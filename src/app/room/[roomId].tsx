import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useJam } from '../../context/JamContext';
import { colors } from '../../theme';
import LoginScreen from '../../screens/LoginScreen';
import { useToast } from '../../context/ToastContext';

/** Deep links such as jam://room/ABC123 land here and join after session restore. */
export default function RoomInviteRoute() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const { joinRoom, isInRoom, roomId: activeRoomId } = useJam();
  const router = useRouter();
  const { showToast } = useToast();
  const handled = useRef(false);
  const code = (Array.isArray(roomId) ? roomId[0] : roomId || '').trim().toUpperCase();

  useEffect(() => {
    if (isLoading || handled.current) return;
    if (!isAuthenticated) return;
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      handled.current = true;
      showToast('This Jam invite code is invalid.', 'error');
      router.replace('/(tabs)/jam');
      return;
    }
    handled.current = true;
    if (!isInRoom || activeRoomId !== code) joinRoom(code);
    router.replace('/(tabs)/jam');
  }, [isLoading, isAuthenticated, code, isInRoom, activeRoomId, joinRoom, router, showToast]);

  if (!isLoading && !isAuthenticated) return <LoginScreen />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.accent} />
      <Text style={{ color: colors.textPrimary, marginTop: 12 }}>Opening Jam invite…</Text>
    </View>
  );
}
