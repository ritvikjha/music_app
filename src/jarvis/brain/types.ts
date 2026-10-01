/**
 * src/jarvis/brain/types.ts
 *
 * Comprehensive Intent and Brain Schema for Jarvis.
 * Defines all Intent names, slot structures, and conversation context.
 *
 * Levels 1–5 Intent coverage:
 * - Level 1: Device controls, protocols (handled natively in Kotlin)
 * - Level 2: Mood music, open-ended chat (LLM)
 * - Level 3: Memory (remember/recall), reminders, personalized playback
 * - Level 4: Tools (weather, web search, math, calendar, contacts)
 * - Level 5: Ambient (morning briefing, proactive triggers, vision)
 */

export type IntentName =
  // Music Playback
  | 'PLAY_SONG'
  | 'PLAY_ARTIST'
  | 'PLAY_TRENDING'
  | 'PLAY_SIMILAR'
  | 'PLAY_MOOD'        // Level 2: mood/vibe-based music ("play something chill")
  | 'PLAY_MY_USUAL'    // Level 3: personalized based on learned taste
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
  // Conversation
  | 'CHAT'
  | 'UNKNOWN'
  // Device Controls (Level 1 — handled natively in Kotlin)
  | 'SET_TIMER'
  | 'SET_ALARM'
  | 'FLASHLIGHT'
  | 'OPEN_APP'
  | 'CALL'
  | 'WHATSAPP_MESSAGE'
  | 'STATUS_REPORT'
  | 'PROTOCOL_NIGHT'
  | 'PROTOCOL_PARTY'
  | 'PROTOCOL_STEALTH'
  | 'PROTOCOL_MORNING'
  | 'PROTOCOL_DRIVE'
  | 'PROTOCOL_FOCUS'
  // Level 3: Memory & Reminders
  | 'REMEMBER'         // "Remember my WiFi password is X"
  | 'RECALL'           // "What's my WiFi password?"
  | 'SET_REMINDER'     // "Remind me to call Rahul at 5 PM"
  // Level 4: Tool-Using Agent
  | 'GET_WEATHER'      // "What's the weather?"
  | 'GET_TIME'         // "What time is it?" (also handled natively)
  | 'GET_DATE'         // "What's today's date?" (also handled natively)
  | 'WEB_SEARCH'       // "Search for X" / general knowledge
  | 'CALCULATE'        // "What's 15% of 3400?" (also handled natively)
  | 'CONVERT_UNITS'    // "Convert 5 miles to km"
  | 'CHECK_CALENDAR'   // "What's on my calendar?"
  | 'CONTACT_LOOKUP'   // "What's Rahul's number?"
  // Level 5: Ambient & Vision
  | 'MORNING_BRIEFING' // Proactive morning summary
  | 'VISION_QUERY'     // "What am I looking at?"
  // Level 6: General App UI Automation & Attention
  | 'GREETING'
  | 'APP_AUTOMATION'
  | 'START_AUTO_SCROLL'
  | 'STOP_AUTOMATION'
  | 'TAP_ELEMENT'
  | 'TYPE_TEXT';



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

export interface UserNote {
  key: string;
  value: string;
  timestamp: number;
}

export interface MusicProfile {
  topGenres: string[];
  topArtists: string[];
  recentMoods: string[];
  playCount: number;
  skipCount: number;
}

export interface BrainContext {
  // Core playback state
  currentSongTitle?: string;
  currentSongArtist?: string;
  isPlaying?: boolean;
  queueLength?: number;
  history?: ConversationTurn[]; // last 3 turns
  deviceId?: string;

  // Level 3: Memory & Personalization
  userNotes?: UserNote[];         // last 5 relevant notes
  musicProfile?: MusicProfile;    // learned music taste
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: string;

  // Level 4: Device state for tool context
  batteryPercent?: number;
  isCharging?: boolean;
  networkType?: 'wifi' | 'cellular' | 'offline';
}
