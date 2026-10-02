import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../context/AuthContext';
import { LibraryProvider } from '../context/LibraryContext';
import { PlaylistProvider } from '../context/PlaylistContext';
import { QueueProvider } from '../context/QueueContext';
import { PlayerProvider } from '../context/PlayerContext';
import * as SystemUI from 'expo-system-ui';
import { JamProvider } from '../context/JamContext';
import { ToastProvider } from '../context/ToastContext';
import { SleepTimerProvider } from '../context/SleepTimerContext';
import { colors } from '../theme';
import { OfflineStatusPill } from '../components/OfflineStatusPill';
import { GameInviteListener } from '../components/GameInviteListener';
import { JarvisBridge } from '../jarvis/JarvisBridge';
import { JarvisMiniOrb } from '../jarvis/ui/JarvisMiniOrb';

/**
 * Root layout — wraps the entire app in providers and configures
 * the navigation stack with our dark aesthetic.
 */
export default function RootLayout() {
  React.useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <AuthProvider>
        <LibraryProvider>
          <PlaylistProvider>
            <QueueProvider>
              <PlayerProvider>
                <SleepTimerProvider>
                  <JamProvider>
                    <ToastProvider>
                    <JarvisBridge />
                    <JarvisMiniOrb />
                    <StatusBar style="light" />
                    <OfflineStatusPill />
                    <GameInviteListener />
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.background },
                        animation: 'slide_from_bottom',
                      }}
                    >
                      <Stack.Screen name="index" />
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen
                        name="player"
                        options={{
                          presentation: 'modal',
                          animation: 'slide_from_bottom',
                          animationDuration: 280,
                          gestureEnabled: true,
                          gestureDirection: 'vertical',
                          fullScreenGestureEnabled: true,
                        }}
                      />
                      <Stack.Screen
                        name="friends"
                        options={{
                          animation: 'slide_from_right',
                        }}
                      />
                      <Stack.Screen
                        name="room/[roomId]"
                        options={{
                          headerShown: false,
                          animation: 'fade',
                        }}
                      />
                    </Stack>
                    </ToastProvider>
                  </JamProvider>
                </SleepTimerProvider>
              </PlayerProvider>
            </QueueProvider>
          </PlaylistProvider>
        </LibraryProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
