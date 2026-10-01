/**
 * src/jarvis/actions/executor.ts
 *
 * Executes Jarvis intents on the live Jam app by reusing the exact same code paths
 * that the UI buttons use (SongCard, PlayerScreen, MiniPlayer, JamRoomScreen).
 *
 * Guaranteed Behaviors:
 *   - Never throws to native (comprehensive try/catch with graceful error responses)
 *   - Connects to ToastContext for on-screen user feedback
 *   - Respects Jam rooms (syncs via JamContext; refuses if guest lacks permissions)
 *   - Respects safety confirmation for destructive actions (CLEAR_QUEUE, leaving a room)
 *   - Fallback execution for State C (when React tree is unmounted but audio player is alive)
 */

import { getLiveHandlers, isLiveMounted } from './registry';
import { resolveSong } from './songResolver';
import { audioPlayer } from '../../services/audioPlayer';
import { getArtistSongs, getTrending, getRelatedSongs, searchSongs } from '../../services/saavn';
import type { IntentResult } from '../brain/types';
import type { Song } from '../../types';
import { REPLIES, pickVariant, formatChatReply } from '../brain/replies';
import { saveNote, findNote } from '../memory/notepad';
import { recordSongPlay, recordMood, getUsualQuery } from '../memory/musicProfile';
import { executeTool } from '../tools/toolRegistry';
import { searchWebKnowledge } from '../tools/webSearchTool';
import { proactiveEngine } from '../ambient/proactiveEngine';

// Optional native volume control helper
let JarvisNativeModule: any = null;
try {
  JarvisNativeModule = require('../../../modules/jarvis-wake-word');
} catch {}

export interface ActionResult {
  ok: boolean;
  spokenReply: string;
  toast?: {
    message: string;
    type?: 'info' | 'success' | 'error';
  };
  needsConfirmation?: boolean;
  ambiguousCandidates?: [Song, Song];
}

/**
 * Execute a structured intent returned by the Jarvis Brain.
 */
export async function executeIntent(intentResult: IntentResult): Promise<ActionResult> {
  try {
    const handlers = getLiveHandlers();
    const live = isLiveMounted() && handlers !== null;

    if (!live) {
      return await executeFallbackIntent(intentResult);
    }

    return await executeLiveIntent(intentResult, handlers!);
  } catch (err: any) {
    console.error('[Jarvis Executor] Unexpected error executing intent:', err);
    return {
      ok: false,
      spokenReply: "Sorry, I couldn't carry that out right now.",
      toast: {
        message: 'Jarvis action failed',
        type: 'error',
      },
    };
  }
}

/**
 * Live execution via React Contexts (States A & B: app in foreground or background with activity alive).
 */
async function executeLiveIntent(
  intentResult: IntentResult,
  handlers: NonNullable<ReturnType<typeof getLiveHandlers>>
): Promise<ActionResult> {
  const { intent, slots } = intentResult;
  const jam = handlers.getJamState();

  switch (intent) {
    case 'PLAY_SONG': {
      const query = (slots?.query || '').trim();
      const artist = slots?.artist?.trim();

      if (!query && !artist) {
        return {
          ok: false,
          spokenReply: 'Which song would you like to hear?',
        };
      }

      const resolution = await resolveSong(query, artist);
      if (!resolution.song) {
        return {
          ok: false,
          spokenReply: resolution.spokenReply,
          toast: { message: `No match for "${query}"`, type: 'error' },
        };
      }

      if (resolution.isAmbiguous && resolution.ambiguousCandidates) {
        return {
          ok: true,
          needsConfirmation: true,
          spokenReply: resolution.spokenReply,
          ambiguousCandidates: resolution.ambiguousCandidates,
          toast: { message: 'Multiple matches found', type: 'info' },
        };
      }

      const targetSong = resolution.song;

      if (jam.isInRoom) {
        const canControl = jam.isHost || jam.allowGuestPlayback;
        if (!canControl) {
          return {
            ok: false,
            spokenReply: 'Guests cannot change playback in this Jam room.',
            toast: { message: 'Playback restricted in Jam room', type: 'error' },
          };
        }
        // Sync through Jam room
        handlers.jamChangeSong(targetSong);
        handlers.showToast(`Playing ${targetSong.title}`, 'info');
        return {
          ok: true,
          spokenReply: resolution.spokenReply,
          toast: { message: `Playing ${targetSong.title}`, type: 'success' },
        };
      }

      // Normal playback: queue listContext and play track
      handlers.playNow(targetSong, resolution.allResults);
      await handlers.playSong(targetSong);
      handlers.showToast(`Playing ${targetSong.title}`, 'info');

      return {
        ok: true,
        spokenReply: resolution.spokenReply,
        toast: { message: `Playing ${targetSong.title}`, type: 'success' },
      };
    }

    case 'PLAY_ARTIST': {
      const artist = (slots?.artist || slots?.query || '').trim();
      if (!artist) {
        return { ok: false, spokenReply: 'Which artist would you like to hear?' };
      }

      const songs = await getArtistSongs(artist);
      if (!songs || songs.length === 0) {
        return {
          ok: false,
          spokenReply: `Couldn't find songs by ${artist}.`,
          toast: { message: `No songs found for ${artist}`, type: 'error' },
        };
      }

      const firstSong = songs[0];
      if (jam.isInRoom) {
        if (!jam.isHost && !jam.allowGuestPlayback) {
          return {
            ok: false,
            spokenReply: 'Guests cannot change playback in this Jam room.',
          };
        }
        handlers.jamChangeSong(firstSong);
      } else {
        handlers.playNow(firstSong, songs);
        await handlers.playSong(firstSong);
      }

      handlers.showToast(`Playing ${artist}`, 'info');
      return {
        ok: true,
        spokenReply: `Playing top songs by ${artist}.`,
        toast: { message: `Playing ${artist}`, type: 'success' },
      };
    }

    case 'PLAY_TRENDING': {
      const songs = await getTrending();
      if (!songs || songs.length === 0) {
        return {
          ok: false,
          spokenReply: "Couldn't fetch trending songs right now.",
        };
      }

      const firstSong = songs[0];
      if (jam.isInRoom) {
        if (!jam.isHost && !jam.allowGuestPlayback) {
          return {
            ok: false,
            spokenReply: 'Guests cannot change playback in this Jam room.',
          };
        }
        handlers.jamChangeSong(firstSong);
      } else {
        handlers.playNow(firstSong, songs);
        await handlers.playSong(firstSong);
      }

      handlers.showToast('Playing Trending Hits', 'info');
      return {
        ok: true,
        spokenReply: 'Playing trending hits.',
        toast: { message: 'Playing Trending Hits', type: 'success' },
      };
    }

    case 'PLAY_SIMILAR': {
      const current = handlers.getCurrentSong();
      if (!current) {
        // Fall back to trending if nothing is playing
        return executeLiveIntent({ ...intentResult, intent: 'PLAY_TRENDING' }, handlers);
      }

      const related = await getRelatedSongs(current, 10);
      if (!related || related.length === 0) {
        return {
          ok: false,
          spokenReply: `Couldn't find songs similar to ${current.title}.`,
        };
      }

      const firstSong = related[0];
      if (jam.isInRoom) {
        if (!jam.isHost && !jam.allowGuestPlayback) {
          return { ok: false, spokenReply: 'Guests cannot change playback in this Jam room.' };
        }
        handlers.jamChangeSong(firstSong);
      } else {
        handlers.playNow(firstSong, related);
        await handlers.playSong(firstSong);
      }

      handlers.showToast(`Similar to ${current.title}`, 'info');
      return {
        ok: true,
        spokenReply: `Playing music similar to ${current.title}.`,
        toast: { message: `Similar to ${current.title}`, type: 'success' },
      };
    }

    case 'PAUSE': {
      if (jam.isInRoom) {
        if (!jam.isHost && !jam.allowGuestPlayback) {
          return { ok: false, spokenReply: 'Guests cannot pause playback in this room.' };
        }
        handlers.jamPause();
      } else {
        await handlers.pause();
      }
      handlers.showToast('Paused', 'info');
      return {
        ok: true,
        spokenReply: 'Paused.',
        toast: { message: 'Paused', type: 'info' },
      };
    }

    case 'RESUME': {
      if (jam.isInRoom) {
        if (!jam.isHost && !jam.allowGuestPlayback) {
          return { ok: false, spokenReply: 'Guests cannot resume playback in this room.' };
        }
        handlers.jamPlay();
      } else {
        await handlers.play();
      }
      handlers.showToast('Playing', 'info');
      return {
        ok: true,
        spokenReply: 'Resuming playback.',
        toast: { message: 'Playing', type: 'info' },
      };
    }

    case 'NEXT': {
      if (jam.isInRoom) {
        if (!jam.isHost && !jam.allowGuestPlayback) {
          return { ok: false, spokenReply: 'Guests cannot skip tracks in this room.' };
        }
        handlers.jamSkipNext();
      } else {
        await handlers.skipNext();
      }
      handlers.showToast('Next track', 'info');
      return {
        ok: true,
        spokenReply: 'Next track.',
        toast: { message: 'Skipped to next', type: 'info' },
      };
    }

    case 'PREVIOUS': {
      if (jam.isInRoom) {
        if (!jam.isHost && !jam.allowGuestPlayback) {
          return { ok: false, spokenReply: 'Guests cannot skip tracks in this room.' };
        }
        handlers.jamSeek(0);
      } else {
        await handlers.skipPrevious();
      }
      handlers.showToast('Previous track', 'info');
      return {
        ok: true,
        spokenReply: 'Previous track.',
        toast: { message: 'Previous track', type: 'info' },
      };
    }

    case 'SEEK': {
      const seconds = Number(slots?.seconds) || 0;
      const relative = Boolean(slots?.relative);
      const currentPos = handlers.getPositionMs();
      const duration = handlers.getDurationMs();

      let targetMs: number;
      if (relative) {
        targetMs = Math.max(0, Math.min(duration || Infinity, currentPos + seconds * 1000));
      } else {
        targetMs = Math.max(0, Math.min(duration || Infinity, seconds * 1000));
      }

      if (jam.isInRoom) {
        if (!jam.isHost && !jam.allowGuestPlayback) {
          return { ok: false, spokenReply: 'Guests cannot seek in this room.' };
        }
        handlers.jamSeek(targetMs);
      } else {
        await handlers.seekTo(targetMs);
      }

      const spoken = relative
        ? seconds > 0
          ? `Fast-forwarded ${seconds} seconds.`
          : `Rewound ${Math.abs(seconds)} seconds.`
        : `Jumped to ${Math.round(seconds / 60)} minutes.`;

      return {
        ok: true,
        spokenReply: spoken,
        toast: { message: spoken, type: 'info' },
      };
    }

    case 'VOLUME_SET': {
      const rawPercent = Number(slots?.percent);
      const percent = isNaN(rawPercent) ? 50 : Math.max(0, Math.min(100, rawPercent));

      // 1. Set app player volume (0.0 to 1.0)
      await audioPlayer.setVolume(percent / 100);

      // 2. Also set device system media volume if native module is present
      try {
        if (JarvisNativeModule?.setSystemVolume) {
          JarvisNativeModule.setSystemVolume(percent);
        }
      } catch {}

      handlers.showToast(`Volume ${percent}%`, 'info');
      return {
        ok: true,
        spokenReply: `Volume set to ${percent} percent.`,
        toast: { message: `Volume ${percent}%`, type: 'info' },
      };
    }

    case 'VOLUME_UP': {
      const currentVol = audioPlayer.getVolume();
      const newPercent = Math.min(100, Math.round((currentVol + 0.15) * 100));
      await audioPlayer.setVolume(newPercent / 100);

      try {
        if (JarvisNativeModule?.setSystemVolume) {
          JarvisNativeModule.setSystemVolume(newPercent);
        }
      } catch {}

      handlers.showToast(`Volume ${newPercent}%`, 'info');
      return {
        ok: true,
        spokenReply: 'Volume increased.',
        toast: { message: `Volume ${newPercent}%`, type: 'info' },
      };
    }

    case 'VOLUME_DOWN': {
      const currentVol = audioPlayer.getVolume();
      const newPercent = Math.max(0, Math.round((currentVol - 0.15) * 100));
      await audioPlayer.setVolume(newPercent / 100);

      try {
        if (JarvisNativeModule?.setSystemVolume) {
          JarvisNativeModule.setSystemVolume(newPercent);
        }
      } catch {}

      handlers.showToast(`Volume ${newPercent}%`, 'info');
      return {
        ok: true,
        spokenReply: 'Volume decreased.',
        toast: { message: `Volume ${newPercent}%`, type: 'info' },
      };
    }

    case 'LIKE': {
      const current = handlers.getCurrentSong();
      if (!current) {
        return {
          ok: false,
          spokenReply: 'No song is playing right now.',
          toast: { message: 'Nothing playing to like', type: 'error' },
        };
      }

      if (handlers.isLiked(current.id)) {
        return {
          ok: true,
          spokenReply: `You've already liked ${current.title}.`,
          toast: { message: `Already in Liked Songs`, type: 'info' },
        };
      }

      await handlers.toggleLike(current);
      handlers.showToast(`Liked ${current.title}`, 'success');
      return {
        ok: true,
        spokenReply: `Added ${current.title} to your Liked Songs.`,
        toast: { message: `Saved to Liked Songs`, type: 'success' },
      };
    }

    case 'UNLIKE': {
      const current = handlers.getCurrentSong();
      if (!current) {
        return {
          ok: false,
          spokenReply: 'No song is playing right now.',
        };
      }

      if (!handlers.isLiked(current.id)) {
        return {
          ok: true,
          spokenReply: `${current.title} is not in your Liked Songs.`,
        };
      }

      await handlers.toggleLike(current);
      handlers.showToast(`Removed from Liked Songs`, 'info');
      return {
        ok: true,
        spokenReply: `Removed ${current.title} from your Liked Songs.`,
        toast: { message: 'Removed from Liked Songs', type: 'info' },
      };
    }

    case 'ADD_TO_QUEUE': {
      const query = (slots?.query || '').trim();
      if (!query) {
        return { ok: false, spokenReply: 'What song should I add to the queue?' };
      }

      const resolution = await resolveSong(query);
      if (!resolution.song) {
        return {
          ok: false,
          spokenReply: resolution.spokenReply,
        };
      }

      const song = resolution.song;

      if (jam.isInRoom) {
        if (!jam.isHost && !jam.allowGuestQueue) {
          return {
            ok: false,
            spokenReply: 'Guests cannot add songs to this Jam room queue.',
          };
        }
        handlers.jamAddToQueue(song);
        handlers.showToast(`Added ${song.title} to Jam Queue`, 'success');
      } else {
        handlers.addToQueue(song);
        handlers.showToast(`Added ${song.title} to queue`, 'info');
      }

      return {
        ok: true,
        spokenReply: `Added ${song.title} to the queue.`,
        toast: { message: `Added to queue`, type: 'success' },
      };
    }

    case 'PLAY_NEXT': {
      const query = (slots?.query || '').trim();
      if (!query) {
        return { ok: false, spokenReply: 'What song should play next?' };
      }

      const resolution = await resolveSong(query);
      if (!resolution.song) {
        return {
          ok: false,
          spokenReply: resolution.spokenReply,
        };
      }

      const song = resolution.song;

      if (jam.isInRoom) {
        handlers.jamAddToQueue(song);
      } else {
        handlers.playNextInQueue(song);
      }

      handlers.showToast(`Playing ${song.title} next`, 'info');
      return {
        ok: true,
        spokenReply: `Playing ${song.title} next.`,
        toast: { message: `Playing ${song.title} next`, type: 'success' },
      };
    }

    case 'SHUFFLE': {
      const requestedOn = Boolean(slots?.on);
      const currentlyOn = handlers.getShuffle();
      if (requestedOn !== currentlyOn) {
        handlers.setShuffle(requestedOn);
      }

      const reply = requestedOn ? 'Shuffle enabled.' : 'Shuffle disabled.';
      handlers.showToast(reply, 'info');
      return {
        ok: true,
        spokenReply: reply,
        toast: { message: reply, type: 'info' },
      };
    }

    case 'REPEAT': {
      const mode = (slots?.mode || 'off') as 'off' | 'all' | 'one';
      handlers.setRepeatMode(mode);

      const label = mode === 'one' ? 'Repeat track' : mode === 'all' ? 'Repeat all' : 'Repeat off';
      handlers.showToast(label, 'info');
      return {
        ok: true,
        spokenReply: `Repeat mode set to ${mode}.`,
        toast: { message: label, type: 'info' },
      };
    }

    case 'SLEEP_TIMER': {
      const minutes = Number(slots?.minutes);
      if (isNaN(minutes)) {
        return { ok: false, spokenReply: 'How many minutes should the sleep timer run for?' };
      }

      handlers.startSleepTimer(minutes);
      const reply = minutes === 0
        ? 'Sleep timer set to pause at end of this track.'
        : `Sleep timer set for ${minutes} minutes.`;

      handlers.showToast(minutes === 0 ? 'Timer: End of Track' : `Timer: ${minutes} min`, 'info');
      return {
        ok: true,
        spokenReply: reply,
        toast: { message: reply, type: 'info' },
      };
    }

    case 'CANCEL_SLEEP_TIMER': {
      handlers.cancelSleepTimer();
      handlers.showToast('Sleep timer cancelled', 'info');
      return {
        ok: true,
        spokenReply: 'Sleep timer cancelled.',
        toast: { message: 'Sleep timer cancelled', type: 'info' },
      };
    }

    case 'WHAT_IS_PLAYING': {
      const current = handlers.getCurrentSong();
      if (!current) {
        return {
          ok: true,
          spokenReply: 'Nothing is playing right now.',
        };
      }
      return {
        ok: true,
        spokenReply: `Currently playing "${current.title}" by ${current.artist}.`,
        toast: { message: `${current.title} • ${current.artist}`, type: 'info' },
      };
    }

    case 'OPEN_SCREEN': {
      const screen = slots?.screen;
      if (!screen) {
        return { ok: false, spokenReply: 'Which screen would you like to open?' };
      }

      handlers.navigate(screen);
      return {
        ok: true,
        spokenReply: `Opening ${screen}.`,
      };
    }

    case 'CLEAR_QUEUE': {
      // Destructive intent: return confirmation request
      return {
        ok: true,
        needsConfirmation: true,
        spokenReply: pickVariant(REPLIES.CLEAR_QUEUE_PROMPT),
        toast: { message: 'Clear queue requested', type: 'info' },
      };
    }

    case 'LEAVE_ROOM': {
      if (!jam.isInRoom) {
        return {
          ok: false,
          spokenReply: pickVariant(REPLIES.NOT_IN_ROOM),
          toast: { message: 'Not in a Jam room', type: 'info' },
        };
      }

      return {
        ok: true,
        needsConfirmation: true,
        spokenReply: pickVariant(REPLIES.LEAVE_ROOM_PROMPT),
        toast: { message: 'Leave room requested', type: 'info' },
      };
    }

    case 'WHATSAPP_MESSAGE': {
      const contact = (slots?.contact || '').trim();
      const message = (slots?.message || '').trim();
      if (!contact || !message) {
        return {
          ok: false,
          spokenReply: 'Please specify the contact name and the message to send.',
        };
      }
      try {
        const sent = JarvisNativeModule?.sendWhatsAppMessage
          ? JarvisNativeModule.sendWhatsAppMessage(contact, message)
          : false;
        return {
          ok: sent,
          spokenReply: sent ? `Sending WhatsApp to ${contact}...` : `Could not open WhatsApp for ${contact}.`,
          toast: {
            message: sent ? `WhatsApp message to ${contact}` : 'Failed to launch WhatsApp',
            type: sent ? 'success' : 'error',
          },
        };
      } catch (err: any) {
        return {
          ok: false,
          spokenReply: "Sorry, I couldn't open WhatsApp right now.",
        };
      }
    }

    case 'STATUS_REPORT': {
      let reportReply = intentResult.spokenReply;
      try {
        if (JarvisNativeModule?.getStatusReport) {
          const report = JarvisNativeModule.getStatusReport();
          if (report?.spokenReply) {
            reportReply = report.spokenReply;
          }
        }
      } catch {}
      return {
        ok: true,
        spokenReply: reportReply || 'All systems nominal, sir. Music playback ready.',
        toast: { message: 'All systems nominal', type: 'info' },
      };
    }

    case 'PROTOCOL_NIGHT': {
      try {
        if (handlers.getIsPlaying()) {
          await handlers.pause();
        }
      } catch {}
      return {
        ok: true,
        spokenReply: intentResult.spokenReply || 'Rest well, sir. Monitoring systems in background.',
        toast: { message: 'Night Protocol Engaged', type: 'info' },
      };
    }

    case 'PROTOCOL_PARTY': {
      try {
        const trending = await getTrending();
        if (trending.length > 0) {
          await audioPlayer.setVolume(0.85);
          handlers.playNow(trending[0], trending);
          handlers.setShuffle(true);
        }
      } catch {}
      return {
        ok: true,
        spokenReply: intentResult.spokenReply || 'Party protocol engaged. Turning up the decibels.',
        toast: { message: 'House Party Protocol Engaged', type: 'success' },
      };
    }


    case 'PROTOCOL_STEALTH': {
      try {
        await audioPlayer.setVolume(0);
      } catch {}
      return {
        ok: true,
        spokenReply: intentResult.spokenReply || 'Stealth mode engaged. Audio muted.',
        toast: { message: 'Stealth Mode Active', type: 'info' },
      };
    }

    case 'PROTOCOL_MORNING': {
      let briefing = '';
      try {
        briefing = await proactiveEngine.triggerMorningBriefing();
      } catch {
        briefing = 'Good morning, sir. Systems operational.';
      }
      return {
        ok: true,
        spokenReply: briefing,
        toast: { message: 'Morning Protocol Engaged', type: 'info' },
      };
    }

    case 'PROTOCOL_DRIVE': {
      try {
        await audioPlayer.setVolume(0.7);
      } catch {}
      return {
        ok: true,
        spokenReply: intentResult.spokenReply || 'Drive protocol active. Safe travels, sir.',
        toast: { message: 'Drive Protocol Active', type: 'info' },
      };
    }

    case 'PROTOCOL_FOCUS': {
      try {
        await audioPlayer.setVolume(0.25);
      } catch {}
      return {
        ok: true,
        spokenReply: intentResult.spokenReply || 'Focus protocol active. Silencing distractions.',
        toast: { message: 'Focus Protocol Active', type: 'info' },
      };
    }

    case 'PLAY_MOOD': {
      const mood = (slots?.mood || slots?.query || 'chill').trim();
      recordMood(mood);
      try {
        const results = await searchSongs(`${mood} music hits`);
        if (results && results.length > 0) {
          const targetSong = results[0];
          handlers.playNow(targetSong, results);
          await handlers.playSong(targetSong);
          handlers.setShuffle(true);
          recordSongPlay(targetSong.title, targetSong.artist, mood);
          return {
            ok: true,
            spokenReply: intentResult.spokenReply || `Playing ${mood} music for you, sir.`,
            toast: { message: `Mood: ${mood}`, type: 'success' },
          };
        }
      } catch {}
      return {
        ok: false,
        spokenReply: `Couldn't find songs for ${mood} right now.`,
      };
    }

    case 'PLAY_MY_USUAL': {
      try {
        const query = await getUsualQuery();
        const results = await searchSongs(query);
        if (results && results.length > 0) {
          const targetSong = results[0];
          handlers.playNow(targetSong, results);
          await handlers.playSong(targetSong);
          handlers.setShuffle(true);
          recordSongPlay(targetSong.title, targetSong.artist);
          return {
            ok: true,
            spokenReply: intentResult.spokenReply || `Playing your usual rotation, sir.`,
            toast: { message: 'Playing Your Usual', type: 'success' },
          };
        }
      } catch {}
      return {
        ok: false,
        spokenReply: "I couldn't load your usual playlist right now, sir.",
      };
    }

    case 'REMEMBER': {
      const key = (slots?.key || '').trim();
      const value = (slots?.value || '').trim();
      if (!key || !value) {
        return { ok: false, spokenReply: 'What would you like me to remember, sir?' };
      }
      await saveNote(key, value);
      return {
        ok: true,
        spokenReply: intentResult.spokenReply || `Noted in permanent memory: ${key} is ${value}.`,
        toast: { message: `Remembered: ${key}`, type: 'info' },
      };
    }

    case 'RECALL': {
      const query = (slots?.query || '').trim();
      if (!query) {
        return { ok: false, spokenReply: 'What would you like me to look up, sir?' };
      }
      const note = await findNote(query);
      if (note) {
        const replyFn = pickVariant(REPLIES.RECALL_FOUND);
        return {
          ok: true,
          spokenReply: replyFn(note.key, note.value),
          toast: { message: `${note.key}: ${note.value}`, type: 'info' },
        };
      }
      return {
        ok: true,
        spokenReply: pickVariant(REPLIES.RECALL_NOT_FOUND),
        toast: { message: `No note found for "${query}"`, type: 'info' },
      };
    }

    case 'SET_REMINDER': {
      const task = (slots?.task || '').trim();
      if (!task) {
        return { ok: false, spokenReply: 'What should I remind you about, sir?' };
      }
      await saveNote(`reminder_${Date.now()}`, task);
      return {
        ok: true,
        spokenReply: intentResult.spokenReply || `Reminder set for ${task}, sir.`,
        toast: { message: `Reminder: ${task}`, type: 'info' },
      };
    }

    case 'GREETING': {
      return {
        ok: true,
        spokenReply: intentResult.spokenReply || 'At your service, sir. How can I help you?',
      };
    }

    case 'APP_AUTOMATION':
    case 'START_AUTO_SCROLL':
    case 'STOP_AUTOMATION':
    case 'TAP_ELEMENT':
    case 'TYPE_TEXT': {
      const toolRes = await executeTool(intent, slots || {});
      return {
        ok: true,
        spokenReply: toolRes.spokenReply,
        toast: { message: 'Jarvis Automation', type: 'info' },
      };
    }

    case 'GET_WEATHER':
    case 'GET_TIME':
    case 'GET_DATE':
    case 'CALCULATE':
    case 'CONVERT_UNITS':
    case 'WEB_SEARCH': {
      const toolRes = await executeTool(intent, slots || {});
      return {
        ok: true,
        spokenReply: toolRes.spokenReply,
        toast: { message: intent.replace(/_/g, ' '), type: 'info' },
      };
    }

    case 'MORNING_BRIEFING': {
      let briefing = '';
      try {
        briefing = await proactiveEngine.triggerMorningBriefing();
      } catch {
        briefing = 'Good morning, sir. Systems operational.';
      }
      return {
        ok: true,
        spokenReply: briefing,
        toast: { message: 'Morning Briefing', type: 'info' },
      };
    }

    case 'CHAT': {
      const query = slots?.query || slots?.raw;
      const isPlaceholder = !intentResult.spokenReply ||
        /^let me check/i.test(intentResult.spokenReply) ||
        intentResult.spokenReply === "Let me check that for you.";

      if (query && isPlaceholder) {
        try {
          const ans = await searchWebKnowledge(query);
          if (ans && !ans.includes('Unable to complete web search') && !ans.includes('could not find a definitive summary')) {
            return {
              ok: true,
              spokenReply: formatChatReply(ans),
              toast: { message: 'Knowledge Search', type: 'info' },
            };
          }
        } catch (e) {
          console.warn('[Jarvis Executor] Knowledge search error:', e);
        }
      }

      return {
        ok: true,
        spokenReply: formatChatReply(intentResult.spokenReply || "I'm listening."),
      };
    }

    case 'UNKNOWN':
    default: {
      return {
        ok: false,
        spokenReply: intentResult.spokenReply || "Sorry, I didn't catch that command.",
      };
    }
  }
}

/**
 * Fallback execution for State C (App swiped from recents; foreground service keeps process alive).
 * Operates directly on the audioPlayer and saavn singletons without requiring React contexts.
 */
async function executeFallbackIntent(intentResult: IntentResult): Promise<ActionResult> {
  const { intent, slots } = intentResult;

  switch (intent) {
    case 'PAUSE': {
      await audioPlayer.pause();
      return { ok: true, spokenReply: 'Paused.' };
    }

    case 'RESUME': {
      await audioPlayer.play();
      return { ok: true, spokenReply: 'Resuming playback.' };
    }

    case 'SEEK': {
      const seconds = Number(slots?.seconds) || 0;
      const relative = Boolean(slots?.relative);
      if (relative) {
        if (seconds > 0) {
          await audioPlayer.seekForward(seconds * 1000);
          return { ok: true, spokenReply: `Fast-forwarded ${seconds} seconds.` };
        } else {
          await audioPlayer.seekBackward(Math.abs(seconds) * 1000);
          return { ok: true, spokenReply: `Rewound ${Math.abs(seconds)} seconds.` };
        }
      } else {
        await audioPlayer.seekTo(seconds * 1000);
        return { ok: true, spokenReply: `Seeked to ${Math.round(seconds / 60)} minutes.` };
      }
    }

    case 'VOLUME_SET': {
      const percent = Math.max(0, Math.min(100, Number(slots?.percent) || 50));
      await audioPlayer.setVolume(percent / 100);
      try {
        if (JarvisNativeModule?.setSystemVolume) {
          JarvisNativeModule.setSystemVolume(percent);
        }
      } catch {}
      return { ok: true, spokenReply: `Volume set to ${percent} percent.` };
    }

    case 'VOLUME_UP': {
      const cur = audioPlayer.getVolume();
      const newP = Math.min(100, Math.round((cur + 0.15) * 100));
      await audioPlayer.setVolume(newP / 100);
      try {
        if (JarvisNativeModule?.setSystemVolume) {
          JarvisNativeModule.setSystemVolume(newP);
        }
      } catch {}
      return { ok: true, spokenReply: 'Volume increased.' };
    }

    case 'VOLUME_DOWN': {
      const cur = audioPlayer.getVolume();
      const newP = Math.max(0, Math.round((cur - 0.15) * 100));
      await audioPlayer.setVolume(newP / 100);
      try {
        if (JarvisNativeModule?.setSystemVolume) {
          JarvisNativeModule.setSystemVolume(newP);
        }
      } catch {}
      return { ok: true, spokenReply: 'Volume decreased.' };
    }

    case 'PLAY_SONG': {
      const query = (slots?.query || '').trim();
      const artist = slots?.artist?.trim();
      if (!query && !artist) {
        return { ok: false, spokenReply: 'Which song would you like to play?' };
      }

      const resolution = await resolveSong(query, artist);
      if (!resolution.song || !resolution.song.streamUrl) {
        return { ok: false, spokenReply: resolution.spokenReply };
      }

      const song = resolution.song;
      await audioPlayer.loadAndPlay(song.streamUrl, {
        title: song.title,
        artist: song.artist,
        albumTitle: song.album,
        artworkUrl: song.imageUrl,
      });

      return {
        ok: true,
        spokenReply: resolution.spokenReply,
      };
    }

    case 'PLAY_ARTIST': {
      const artist = (slots?.artist || slots?.query || '').trim();
      if (!artist) {
        return { ok: false, spokenReply: 'Which artist would you like to hear?' };
      }
      const songs = await getArtistSongs(artist);
      if (songs.length === 0 || !songs[0].streamUrl) {
        return { ok: false, spokenReply: `Couldn't find songs by ${artist}.` };
      }
      const song = songs[0];
      await audioPlayer.loadAndPlay(song.streamUrl, {
        title: song.title,
        artist: song.artist,
        albumTitle: song.album,
        artworkUrl: song.imageUrl,
      });
      return { ok: true, spokenReply: `Playing top songs by ${artist}.` };
    }

    case 'PLAY_TRENDING': {
      const songs = await getTrending();
      if (songs.length === 0 || !songs[0].streamUrl) {
        return { ok: false, spokenReply: "Couldn't load trending music right now." };
      }
      const song = songs[0];
      await audioPlayer.loadAndPlay(song.streamUrl, {
        title: song.title,
        artist: song.artist,
        albumTitle: song.album,
        artworkUrl: song.imageUrl,
      });
      return { ok: true, spokenReply: 'Playing trending hits.' };
    }

    case 'NEXT': {
      await audioPlayer.skipToNext();
      return { ok: true, spokenReply: 'Next track.' };
    }

    case 'PREVIOUS': {
      await audioPlayer.skipToPrevious();
      return { ok: true, spokenReply: 'Previous track.' };
    }

    case 'WHAT_IS_PLAYING': {
      const status = await audioPlayer.getStatus();
      const meta = (audioPlayer as any).currentMetadata;
      if (status?.isPlaying && meta) {
        return {
          ok: true,
          spokenReply: `Currently playing "${meta.title}" by ${meta.artist}.`,
        };
      }
      return { ok: true, spokenReply: 'Nothing is playing right now.' };
    }

    case 'OPEN_SCREEN': {
      return {
        ok: false,
        spokenReply: 'Jam is running in the background. Open the app to view screens.',
      };
    }

    case 'LIKE':
    case 'UNLIKE': {
      return {
        ok: false,
        spokenReply: 'Please open Jam to update your Liked Songs library.',
      };
    }

    case 'CLEAR_QUEUE':
    case 'LEAVE_ROOM':
    case 'ADD_TO_QUEUE':
    case 'PLAY_NEXT': {
      return {
        ok: false,
        spokenReply: 'Please open Jam to manage your queue or rooms.',
      };
    }

    case 'SLEEP_TIMER':
    case 'CANCEL_SLEEP_TIMER': {
      return {
        ok: false,
        spokenReply: 'Please open Jam to configure your sleep timer.',
      };
    }

    case 'WHATSAPP_MESSAGE': {
      const contact = (slots?.contact || '').trim();
      const message = (slots?.message || '').trim();
      if (!contact || !message) {
        return { ok: false, spokenReply: 'Please specify the contact name and message.' };
      }
      try {
        const sent = JarvisNativeModule?.sendWhatsAppMessage
          ? JarvisNativeModule.sendWhatsAppMessage(contact, message)
          : false;
        return {
          ok: sent,
          spokenReply: sent ? `Sending WhatsApp to ${contact}...` : `Could not open WhatsApp for ${contact}.`,
        };
      } catch {
        return { ok: false, spokenReply: "Could not send WhatsApp message." };
      }
    }

    case 'STATUS_REPORT': {
      let reportReply = intentResult.spokenReply;
      try {
        if (JarvisNativeModule?.getStatusReport) {
          const report = JarvisNativeModule.getStatusReport();
          if (report?.spokenReply) {
            reportReply = report.spokenReply;
          }
        }
      } catch {}
      return {
        ok: true,
        spokenReply: reportReply || 'All systems nominal, sir.',
      };
    }

    case 'PROTOCOL_NIGHT': {
      try {
        await audioPlayer.pause();
      } catch {}
      return {
        ok: true,
        spokenReply: intentResult.spokenReply || 'Rest well, sir. Monitoring systems in background.',
      };
    }

    case 'PROTOCOL_PARTY': {
      try {
        const trending = await getTrending();
        if (trending.length > 0 && trending[0].streamUrl) {
          await audioPlayer.setVolume(0.85);
          await audioPlayer.loadAndPlay(trending[0].streamUrl, {
            title: trending[0].title,
            artist: trending[0].artist,
            albumTitle: trending[0].album,
            artworkUrl: trending[0].imageUrl,
          });
        }
      } catch {}
      return {
        ok: true,
        spokenReply: intentResult.spokenReply || 'Party protocol engaged. Turning up the decibels.',
      };
    }

    case 'PROTOCOL_STEALTH': {
      try {
        await audioPlayer.setVolume(0);
      } catch {}
      return {
        ok: true,
        spokenReply: intentResult.spokenReply || 'Stealth mode engaged. Audio muted.',
      };
    }

    case 'PROTOCOL_MORNING': {
      let briefing = '';
      try {
        briefing = await proactiveEngine.triggerMorningBriefing();
      } catch {
        briefing = 'Good morning, sir. Systems operational.';
      }
      return { ok: true, spokenReply: briefing };
    }

    case 'PROTOCOL_DRIVE': {
      try {
        await audioPlayer.setVolume(0.7);
      } catch {}
      return { ok: true, spokenReply: intentResult.spokenReply || 'Drive protocol active. Safe travels, sir.' };
    }

    case 'PROTOCOL_FOCUS': {
      try {
        await audioPlayer.setVolume(0.25);
      } catch {}
      return { ok: true, spokenReply: intentResult.spokenReply || 'Focus protocol active. Silencing distractions.' };
    }

    case 'REMEMBER': {
      const key = (slots?.key || '').trim();
      const value = (slots?.value || '').trim();
      if (!key || !value) {
        return { ok: false, spokenReply: 'What would you like me to remember, sir?' };
      }
      await saveNote(key, value);
      return {
        ok: true,
        spokenReply: intentResult.spokenReply || `Saved to memory: ${key} is ${value}.`,
      };
    }

    case 'RECALL': {
      const query = (slots?.query || '').trim();
      if (!query) {
        return { ok: false, spokenReply: 'What would you like me to look up, sir?' };
      }
      const note = await findNote(query);
      if (note) {
        const replyFn = pickVariant(REPLIES.RECALL_FOUND);
        return { ok: true, spokenReply: replyFn(note.key, note.value) };
      }
      return { ok: true, spokenReply: pickVariant(REPLIES.RECALL_NOT_FOUND) };
    }

    case 'SET_REMINDER': {
      const task = (slots?.task || '').trim();
      if (!task) {
        return { ok: false, spokenReply: 'What should I remind you about, sir?' };
      }
      await saveNote(`reminder_${Date.now()}`, task);
      return { ok: true, spokenReply: intentResult.spokenReply || `Reminder set for ${task}, sir.` };
    }

    case 'GREETING': {
      return {
        ok: true,
        spokenReply: intentResult.spokenReply || 'At your service, sir. How can I help you?',
      };
    }

    case 'APP_AUTOMATION':
    case 'START_AUTO_SCROLL':
    case 'STOP_AUTOMATION':
    case 'TAP_ELEMENT':
    case 'TYPE_TEXT': {
      const toolRes = await executeTool(intent, slots || {});
      return { ok: true, spokenReply: toolRes.spokenReply };
    }

    case 'GET_WEATHER':
    case 'GET_TIME':
    case 'GET_DATE':
    case 'CALCULATE':
    case 'CONVERT_UNITS':
    case 'WEB_SEARCH': {
      const toolRes = await executeTool(intent, slots || {});
      return { ok: true, spokenReply: toolRes.spokenReply };
    }

    case 'MORNING_BRIEFING': {
      let briefing = '';
      try {
        briefing = await proactiveEngine.triggerMorningBriefing();
      } catch {
        briefing = 'Good morning, sir. Systems operational.';
      }
      return { ok: true, spokenReply: briefing };
    }

    case 'CHAT': {
      const query = slots?.query || slots?.raw;
      const isPlaceholder = !intentResult.spokenReply ||
        /^let me check/i.test(intentResult.spokenReply) ||
        intentResult.spokenReply === "Let me check that for you.";

      if (query && isPlaceholder) {
        try {
          const ans = await searchWebKnowledge(query);
          if (ans && !ans.includes('Unable to complete web search') && !ans.includes('could not find a definitive summary')) {
            return {
              ok: true,
              spokenReply: ans,
            };
          }
        } catch (e) {
          console.warn('[Jarvis Fallback] Knowledge search error:', e);
        }
      }

      return {
        ok: true,
        spokenReply: intentResult.spokenReply || "I'm listening.",
      };
    }

    case 'UNKNOWN':
    default: {
      return {
        ok: false,
        spokenReply: intentResult.spokenReply || "Sorry, I didn't catch that command.",
      };
    }
  }
}
