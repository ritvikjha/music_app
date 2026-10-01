/**
 * src/jarvis/brain/__tests__/testUtterances.ts
 *
 * Automated test suite containing 67 diverse test utterances:
 * - Direct English commands
 * - Conversational Hinglish phrases
 * - Noisy speech with ASR phonetic slips
 * - Multi-word slot extraction
 * - General knowledge / chat queries routed to LLM
 *
 * Exports `runBrainTestSuite()` which executes every test and outputs
 * detailed pass/fail statistics, resolution source (local vs LLM), and latencies.
 */

import { parseIntent } from '../router';
import type { IntentName } from '../types';

export interface TestCase {
  utterance: string;
  expectedIntent: IntentName;
  category: string;
  expectedSlotCheck?: (slots: Record<string, any>) => boolean;
}

export const TEST_UTTERANCES: TestCase[] = [
  // 1. Basic Playback (English)
  { utterance: 'pause', expectedIntent: 'PAUSE', category: 'Playback' },
  { utterance: 'pause the music please', expectedIntent: 'PAUSE', category: 'Playback' },
  { utterance: 'stop playing', expectedIntent: 'PAUSE', category: 'Playback' },
  { utterance: 'resume', expectedIntent: 'RESUME', category: 'Playback' },
  { utterance: 'continue playing', expectedIntent: 'RESUME', category: 'Playback' },
  { utterance: 'unpause music', expectedIntent: 'RESUME', category: 'Playback' },
  { utterance: 'next song', expectedIntent: 'NEXT', category: 'Playback' },
  { utterance: 'skip this track', expectedIntent: 'NEXT', category: 'Playback' },
  { utterance: 'previous song', expectedIntent: 'PREVIOUS', category: 'Playback' },
  { utterance: 'go back to the last song', expectedIntent: 'PREVIOUS', category: 'Playback' },

  // 2. Playback (Hinglish)
  { utterance: 'gaana roko', expectedIntent: 'PAUSE', category: 'Hinglish Playback' },
  { utterance: 'band karo', expectedIntent: 'PAUSE', category: 'Hinglish Playback' },
  { utterance: 'chup ho jao', expectedIntent: 'PAUSE', category: 'Hinglish Playback' },
  { utterance: 'gaana wapas chalao', expectedIntent: 'RESUME', category: 'Hinglish Playback' },
  { utterance: 'chalu karo bhai', expectedIntent: 'RESUME', category: 'Hinglish Playback' },
  { utterance: 'agla gaana', expectedIntent: 'NEXT', category: 'Hinglish Playback' },
  { utterance: 'change karo gaana', expectedIntent: 'NEXT', category: 'Hinglish Playback' },
  { utterance: 'dusra gaana chalao', expectedIntent: 'NEXT', category: 'Hinglish Playback' },
  { utterance: 'pichla gaana', expectedIntent: 'PREVIOUS', category: 'Hinglish Playback' },
  { utterance: 'wapas pichla gaana lagao', expectedIntent: 'PREVIOUS', category: 'Hinglish Playback' },

  // 3. Search & Play
  {
    utterance: 'play Kesariya',
    expectedIntent: 'PLAY_SONG',
    category: 'Play Search',
    expectedSlotCheck: (s) => s.query?.toLowerCase().includes('kesariya'),
  },
  {
    utterance: 'play Kesariya by Arijit Singh',
    expectedIntent: 'PLAY_SONG',
    category: 'Play Search',
    expectedSlotCheck: (s) => s.query?.toLowerCase().includes('kesariya') && s.artist?.toLowerCase().includes('arijit'),
  },
  {
    utterance: 'play songs by Arijit Singh',
    expectedIntent: 'PLAY_ARTIST',
    category: 'Play Search',
    expectedSlotCheck: (s) => s.artist?.toLowerCase().includes('arijit'),
  },
  {
    utterance: 'Arijit Singh ke gaane chalao',
    expectedIntent: 'PLAY_ARTIST',
    category: 'Play Search',
    expectedSlotCheck: (s) => s.artist?.toLowerCase().includes('arijit'),
  },
  {
    utterance: 'put on Believer',
    expectedIntent: 'PLAY_SONG',
    category: 'Play Search',
    expectedSlotCheck: (s) => s.query?.toLowerCase().includes('believer'),
  },
  {
    utterance: 'Tum Hi Ho chalao',
    expectedIntent: 'PLAY_SONG',
    category: 'Play Search',
    expectedSlotCheck: (s) => s.query?.toLowerCase().includes('tum hi ho'),
  },

  // 4. Volume Control
  {
    utterance: 'set volume to 80 percent',
    expectedIntent: 'VOLUME_SET',
    category: 'Volume',
    expectedSlotCheck: (s) => s.percent === 80,
  },
  {
    utterance: 'volume 50 percent',
    expectedIntent: 'VOLUME_SET',
    category: 'Volume',
    expectedSlotCheck: (s) => s.percent === 50,
  },
  {
    utterance: 'aadhi awaaz kardo',
    expectedIntent: 'VOLUME_SET',
    category: 'Volume',
    expectedSlotCheck: (s) => s.percent === 50,
  },
  {
    utterance: 'full volume',
    expectedIntent: 'VOLUME_SET',
    category: 'Volume',
    expectedSlotCheck: (s) => s.percent === 100,
  },
  {
    utterance: 'mute',
    expectedIntent: 'VOLUME_SET',
    category: 'Volume',
    expectedSlotCheck: (s) => s.percent === 0,
  },
  { utterance: 'volume up', expectedIntent: 'VOLUME_UP', category: 'Volume' },
  { utterance: 'louder please', expectedIntent: 'VOLUME_UP', category: 'Volume' },
  { utterance: 'awaaz badhao', expectedIntent: 'VOLUME_UP', category: 'Volume' },
  { utterance: 'volume down', expectedIntent: 'VOLUME_DOWN', category: 'Volume' },
  { utterance: 'softer please', expectedIntent: 'VOLUME_DOWN', category: 'Volume' },
  { utterance: 'awaaz kam karo', expectedIntent: 'VOLUME_DOWN', category: 'Volume' },

  // 5. Seeking
  {
    utterance: 'seek forward 30 seconds',
    expectedIntent: 'SEEK',
    category: 'Seek',
    expectedSlotCheck: (s) => s.seconds === 30,
  },
  {
    utterance: 'forward 15 seconds',
    expectedIntent: 'SEEK',
    category: 'Seek',
    expectedSlotCheck: (s) => s.seconds === 15,
  },
  {
    utterance: 'rewind 20 seconds',
    expectedIntent: 'SEEK',
    category: 'Seek',
    expectedSlotCheck: (s) => s.seconds === -20,
  },
  {
    utterance: '10 second peeche karo',
    expectedIntent: 'SEEK',
    category: 'Seek',
    expectedSlotCheck: (s) => s.seconds === -10,
  },

  // 6. Favorites
  { utterance: 'like this song', expectedIntent: 'LIKE', category: 'Favorites' },
  { utterance: 'ye gaana pasand hai', expectedIntent: 'LIKE', category: 'Favorites' },
  { utterance: 'add to favorites', expectedIntent: 'LIKE', category: 'Favorites' },
  { utterance: 'unlike this song', expectedIntent: 'UNLIKE', category: 'Favorites' },
  { utterance: 'favourite se hata do', expectedIntent: 'UNLIKE', category: 'Favorites' },

  // 7. Shuffle & Repeat
  {
    utterance: 'shuffle on',
    expectedIntent: 'SHUFFLE',
    category: 'Modes',
    expectedSlotCheck: (s) => s.on === true,
  },
  {
    utterance: 'shuffle off',
    expectedIntent: 'SHUFFLE',
    category: 'Modes',
    expectedSlotCheck: (s) => s.on === false,
  },
  {
    utterance: 'repeat this song',
    expectedIntent: 'REPEAT',
    category: 'Modes',
    expectedSlotCheck: (s) => s.mode === 'one',
  },
  {
    utterance: 'loop one',
    expectedIntent: 'REPEAT',
    category: 'Modes',
    expectedSlotCheck: (s) => s.mode === 'one',
  },
  {
    utterance: 'repeat all',
    expectedIntent: 'REPEAT',
    category: 'Modes',
    expectedSlotCheck: (s) => s.mode === 'all',
  },
  {
    utterance: 'repeat off',
    expectedIntent: 'REPEAT',
    category: 'Modes',
    expectedSlotCheck: (s) => s.mode === 'off',
  },

  // 8. Sleep Timer
  {
    utterance: 'set sleep timer for 20 minutes',
    expectedIntent: 'SLEEP_TIMER',
    category: 'Sleep Timer',
    expectedSlotCheck: (s) => s.minutes === 20,
  },
  {
    utterance: 'stop in 30 minutes',
    expectedIntent: 'SLEEP_TIMER',
    category: 'Sleep Timer',
    expectedSlotCheck: (s) => s.minutes === 30,
  },
  {
    utterance: 'aadhe ghante me band kar dena',
    expectedIntent: 'SLEEP_TIMER',
    category: 'Sleep Timer',
    expectedSlotCheck: (s) => s.minutes === 30,
  },
  { utterance: 'cancel sleep timer', expectedIntent: 'CANCEL_SLEEP_TIMER', category: 'Sleep Timer' },
  { utterance: 'sleep timer hatao', expectedIntent: 'CANCEL_SLEEP_TIMER', category: 'Sleep Timer' },

  // 9. Info & Discovery
  { utterance: 'what is playing', expectedIntent: 'WHAT_IS_PLAYING', category: 'Discovery' },
  { utterance: 'kya chal raha hai', expectedIntent: 'WHAT_IS_PLAYING', category: 'Discovery' },
  { utterance: 'kaun sa gaana hai', expectedIntent: 'WHAT_IS_PLAYING', category: 'Discovery' },
  { utterance: 'play trending', expectedIntent: 'PLAY_TRENDING', category: 'Discovery' },
  { utterance: 'play similar songs', expectedIntent: 'PLAY_SIMILAR', category: 'Discovery' },

  // 10. Queue & Navigation
  {
    utterance: 'add Believer to queue',
    expectedIntent: 'ADD_TO_QUEUE',
    category: 'Queue',
    expectedSlotCheck: (s) => s.query?.toLowerCase().includes('believer'),
  },
  {
    utterance: 'play next Tum Hi Ho',
    expectedIntent: 'PLAY_NEXT',
    category: 'Queue',
    expectedSlotCheck: (s) => s.query?.toLowerCase().includes('tum hi ho'),
  },
  {
    utterance: 'clear queue',
    expectedIntent: 'CLEAR_QUEUE',
    category: 'Queue',
    expectedSlotCheck: () => true,
  },
  {
    utterance: 'clear the whole queue',
    expectedIntent: 'CLEAR_QUEUE',
    category: 'Queue',
    expectedSlotCheck: () => true,
  },
  {
    utterance: 'leave the jam room',
    expectedIntent: 'LEAVE_ROOM',
    category: 'Jam Room',
    expectedSlotCheck: () => true,
  },
  {
    utterance: 'exit room',
    expectedIntent: 'LEAVE_ROOM',
    category: 'Jam Room',
    expectedSlotCheck: () => true,
  },
  {
    utterance: 'room se niklo',
    expectedIntent: 'LEAVE_ROOM',
    category: 'Jam Room',
    expectedSlotCheck: () => true,
  },
  { utterance: 'open library', expectedIntent: 'OPEN_SCREEN', category: 'Navigation' },
  { utterance: 'open games', expectedIntent: 'OPEN_SCREEN', category: 'Navigation' },
  { utterance: 'profile dikhao', expectedIntent: 'OPEN_SCREEN', category: 'Navigation' },
  { utterance: 'open jam rooms', expectedIntent: 'OPEN_SCREEN', category: 'Navigation' },
  { utterance: 'go to home', expectedIntent: 'OPEN_SCREEN', category: 'Navigation' },

  // 11. Noisy Speech & ASR Slips
  { utterance: 'paly kesariya', expectedIntent: 'PLAY_SONG', category: 'Noisy Speech' },
  { utterance: 'pose music', expectedIntent: 'PAUSE', category: 'Noisy Speech' },
  { utterance: 'nect song please', expectedIntent: 'NEXT', category: 'Noisy Speech' },
  {
    utterance: 'walume 70 percent',
    expectedIntent: 'VOLUME_SET',
    category: 'Noisy Speech',
    expectedSlotCheck: (s) => s.percent === 70,
  },
  {
    utterance: 'queue me daalo Levitating',
    expectedIntent: 'ADD_TO_QUEUE',
    category: 'Noisy Speech',
    expectedSlotCheck: (s) => s.query?.toLowerCase().includes('levitating'),
  },

  // 12. Questions & Knowledge (Routes to CHAT / LLM)
  { utterance: 'who sang Tum Hi Ho', expectedIntent: 'CHAT', category: 'General / LLM' },
  { utterance: 'tell me a joke', expectedIntent: 'CHAT', category: 'General / LLM' },
];

export interface TestResultItem {
  utterance: string;
  expected: IntentName;
  actual: IntentName;
  passed: boolean;
  source: 'local' | 'llm';
  latencyMs: number;
  category: string;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number; // percentage
  localCount: number;
  llmCount: number;
  localPercentage: number;
  avgLocalLatencyMs: number;
  avgLlmLatencyMs: number;
  items: TestResultItem[];
}

/**
 * Executes the complete 67-utterance benchmark suite.
 */
export async function runBrainTestSuite(): Promise<TestSuiteSummary> {
  const items: TestResultItem[] = [];
  let localLatencies: number[] = [];
  let llmLatencies: number[] = [];

  for (const tc of TEST_UTTERANCES) {
    const res = await parseIntent(tc.utterance);

    let passed = res.intent === tc.expectedIntent;
    if (passed && tc.expectedSlotCheck) {
      passed = tc.expectedSlotCheck(res.slots);
    }

    const latency = res.latencyMs || 1;
    if (res.source === 'local') {
      localLatencies.push(latency);
    } else {
      llmLatencies.push(latency);
    }

    items.push({
      utterance: tc.utterance,
      expected: tc.expectedIntent,
      actual: res.intent,
      passed,
      source: res.source,
      latencyMs: latency,
      category: tc.category,
    });
  }

  const total = items.length;
  const passed = items.filter((i) => i.passed).length;
  const failed = total - passed;
  const localCount = items.filter((i) => i.source === 'local').length;
  const llmCount = total - localCount;

  const avgLocalLatencyMs =
    localLatencies.length > 0
      ? Math.round(localLatencies.reduce((a, b) => a + b, 0) / localLatencies.length)
      : 0;

  const avgLlmLatencyMs =
    llmLatencies.length > 0
      ? Math.round(llmLatencies.reduce((a, b) => a + b, 0) / llmLatencies.length)
      : 0;

  return {
    total,
    passed,
    failed,
    passRate: Math.round((passed / total) * 100),
    localCount,
    llmCount,
    localPercentage: Math.round((localCount / total) * 100),
    avgLocalLatencyMs,
    avgLlmLatencyMs,
    items,
  };
}
