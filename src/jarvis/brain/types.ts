/**
 * src/jarvis/brain/types.ts
 *
 * Comprehensive Intent and Brain Schema for Jarvis.
 * Defines all Intent names, slot structures, and conversation context.
 */

export type IntentName =
  | 'PLAY_SONG'
  | 'PLAY_ARTIST'
  | 'PLAY_TRENDING'
  | 'PLAY_SIMILAR'
  | 'PAUSE'
  | 'RESUME'
  | 'NEXT'
  | 'PREVIOUS'
  | 'SEEK'
  | 'VOLUME_SET'
  | 'VOLUME_UP'
  | 'VOLUME_DOWN'
  | 'LIKE'
  | 'UNLIKE'
  | 'ADD_TO_QUEUE'
  | 'PLAY_NEXT'
  | 'SHUFFLE'
  | 'REPEAT'
  | 'SLEEP_TIMER'
  | 'CANCEL_SLEEP_TIMER'
  | 'WHAT_IS_PLAYING'
  | 'OPEN_SCREEN'
  | 'CLEAR_QUEUE'
  | 'LEAVE_ROOM'
  | 'CHAT'
  | 'UNKNOWN'
  // Reserved for future stages (defined now):
  | 'SET_TIMER'
  | 'SET_ALARM'
  | 'FLASHLIGHT'
  | 'OPEN_APP'
  | 'CALL'
  | 'WHATSAPP_MESSAGE'
  | 'STATUS_REPORT'
  | 'PROTOCOL_NIGHT'
  | 'PROTOCOL_PARTY'
  | 'PROTOCOL_STEALTH';



export type ScreenTarget =
  | 'home'
  | 'library'
  | 'jam'
  | 'games'
  | 'profile'
  | 'player'
  | 'friends';

export type RepeatMode = 'off' | 'all' | 'one';

export interface IntentResult {
  /** The identified user intent */
  intent: IntentName;
  /** Extracted entity slots (e.g. query, artist, percent, seconds) */
  slots: Record<string, any>;
  /** Confidence score between 0.0 and 1.0 */
  confidence: number;
  /** Natural, concise response string ready for TTS or display */
  spokenReply: string;
  /** Whether this action requires user confirmation before executing */
  needsConfirmation?: boolean;
  /** Whether the intent was resolved instantly locally or via LLM proxy */
  source: 'local' | 'llm';
  /** Latency in milliseconds for resolving the intent */
  latencyMs?: number;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface BrainContext {
  currentSongTitle?: string;
  currentSongArtist?: string;
  isPlaying?: boolean;
  queueLength?: number;
  history?: ConversationTurn[]; // last 3 turns
  deviceId?: string;
}
