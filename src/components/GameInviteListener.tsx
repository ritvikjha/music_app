import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useJam } from '../context/JamContext';
import { useToast } from '../context/ToastContext';
import { syncManager } from '../services/playbackSyncManager';

export function GameInviteListener() {
  const { user } = useAuth();
  const { joinRoom } = useJam();
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (user?.username && user.tag) syncManager.setUserInbox(user.username, user.tag);
  }, [user?.username, user?.tag]);

  useEffect(() => {
    const offError = syncManager.onGameInviteError((message) => showToast(message, 'error'));
    const offSent = syncManager.onGameInviteSent((username) => showToast(`Invite delivered to ${username}.`, 'success'));
    return () => { offError(); offSent(); };
  }, [showToast]);

  useEffect(() => {
    const offInvite = syncManager.onGameInvite((invite) => {
      Alert.alert(
        `${invite.from.username} invited you to Jam`,
        invite.gameType ? `Join their ${invite.gameType === 'trivia_duel' ? 'Trivia Duel' : invite.gameType === 'word_duel' ? 'Word Duel' : 'Two Truths & a Lie'}?` : 'Join their room to play a game together.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Join', onPress: () => {
            joinRoom(invite.roomId);
            router.push(invite.gameType ? '/(tabs)/games' : '/(tabs)/jam');
            showToast(`Joining ${invite.from.username}…`, 'info');
          } },
        ]
      );
    });
    return offInvite;
  }, [joinRoom, router, showToast]);

  return null;
}
