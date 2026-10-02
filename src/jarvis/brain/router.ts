/**
 * src/jarvis/brain/router.ts
 *
 * Two-tier Intent Router:
 * Tier 1 (Local): Evaluates regex + pattern rules in under 5ms with 0 network calls.
 * Tier 2 (LLM): Falls back to the server proxy if local confidence < 0.8 or speech is a general query/chat.
 *
 * Validates the schema before trusting any LLM output.
 */

import type { IntentResult, IntentName, BrainContext } from './types';
import { parseLocalIntent } from './localIntents';
import { queryLlmBrain } from './llmClient';

export const VALID_INTENTS: Set<IntentName> = new Set([
  'PLAY_SONG',
  'PLAY_ARTIST',
  'PLAY_TRENDING',
  'PLAY_SIMILAR',
  'PAUSE',
  'RESUME',
  'NEXT',
  'PREVIOUS',
  'SEEK',
  'VOLUME_SET',
  'VOLUME_UP',
  'VOLUME_DOWN',
  'LIKE',
  'UNLIKE',
  'ADD_TO_QUEUE',
  'PLAY_NEXT',
  'SHUFFLE',
  'REPEAT',
  'SLEEP_TIMER',
  'CANCEL_SLEEP_TIMER',
  'WHAT_IS_PLAYING',
  'OPEN_SCREEN',
  'CLEAR_QUEUE',
  'CHAT',
  'UNKNOWN',
  'SET_TIMER',
  'SET_ALARM',
  'FLASHLIGHT',
  'OPEN_APP',
  'CALL',
  'WHATSAPP_MESSAGE',
  'STATUS_REPORT',
  'PROTOCOL_NIGHT',
  'PROTOCOL_PARTY',
  'PROTOCOL_STEALTH',
  'PROTOCOL_MORNING',
  'PROTOCOL_DRIVE',
  'PROTOCOL_FOCUS',
  // Level 2 & 3
  'PLAY_MOOD',
  'PLAY_MY_USUAL',
  'REMEMBER',
  'RECALL',
  'SET_REMINDER',
  // Level 4
  'GET_WEATHER',
  'GET_TIME',
  'GET_DATE',
  'WEB_SEARCH',
  'CALCULATE',
  'CONVERT_UNITS',
  'CHECK_CALENDAR',
  'CONTACT_LOOKUP',
  // Level 5
  'MORNING_BRIEFING',
  'VISION_QUERY',
  // Level 6
  'GREETING',
  'APP_AUTOMATION',
  'START_AUTO_SCROLL',
  'STOP_AUTOMATION',
  'TAP_ELEMENT',
  'TYPE_TEXT',
]);

export interface MemoryTurn {
  intent: IntentName;
  slots: Record<string, any>;
  spokenReply: string;
  timestamp: number;
}

const rollingMemory: MemoryTurn[] = [];
const MAX_MEMORY_TURNS = 3;

/**
 * Get recent short-term memory buffer (last 3 interactions).
 */
export function getShortTermMemory(): MemoryTurn[] {
  return [...rollingMemory];
}

/**
 * Record a turn into conversational short-term memory.
 */
export function recordMemoryTurn(result: IntentResult) {
  if (result.intent === 'UNKNOWN') return;
  rollingMemory.unshift({
    intent: result.intent,
    slots: { ...result.slots },
    spokenReply: result.spokenReply,
    timestamp: Date.now(),
  });
  if (rollingMemory.length > MAX_MEMORY_TURNS) {
    rollingMemory.pop();
  }
}

/**
 * Resolve pronouns/anaphora based on conversational short-term memory:
 * - "Play more from him" -> "Play songs by <lastArtist>"
 * - "Message him <text>" -> "WhatsApp <lastContact> <text>"
 * - "Open it" -> "Open <lastApp>"
 */
export function resolveAnaphora(rawTranscript: string, context?: BrainContext): string {
  let text = rawTranscript.trim();
  const lower = text.toLowerCase();

  // Find last referenced artist from memory or active playing context
  const lastArtist =
    rollingMemory.find((m) => m.slots?.artist || (m.intent === 'PLAY_ARTIST' && m.slots?.artist))?.slots?.artist ||
    context?.currentSongArtist;

  // Find last referenced contact
  const lastContact = rollingMemory.find((m) => m.slots?.contact)?.slots?.contact;

  // Find last referenced app
  const lastApp = rollingMemory.find((m) => m.slots?.app)?.slots?.app;

  // 1. Artist anaphora: "play more from him/her", "play him/her", "uske aur gaane chalao"
  if (lastArtist && (
    /^(?:play\s+)?(?:more\s+(?:from|by)|songs\s+by)\s+(?:him|her)$/i.test(lower) ||
    /^(?:play|chalao)\s+(?:him|her)$/i.test(lower) ||
    /^(?:uske\s+(?:aur\s+)?gaane(?:\s+chalao)?|aur\s+gaane\s+chalao)$/i.test(lower)
  )) {
    text = `play songs by ${lastArtist}`;
    console.log(`[Jarvis Memory] Resolved anaphora "him/her" -> "${lastArtist}"`);
  }

  // 2. Contact anaphora: "message him/her <msg>", "whatsapp him/her <msg>", "call him/her"
  if (lastContact) {
    const msgMatch = lower.match(/^(?:whatsapp|message|send\s+a\s+message\s+to|use\s+message\s+karo|use\s+whatsapp\s+karo)\s+(?:him|her|them)?\s*(.+)$/i);
    if (msgMatch) {
      text = `whatsapp ${lastContact} ${msgMatch[1]}`;
      console.log(`[Jarvis Memory] Resolved anaphora contact "him/her" -> "${lastContact}"`);
    } else if (/^(?:call|dial|use\s+call\s+karo|use\s+phone\s+lagao)\s*(?:him|her|them)?$/i.test(lower)) {
      text = `call ${lastContact}`;
      console.log(`[Jarvis Memory] Resolved anaphora call "him/her" -> "${lastContact}"`);
    }
  }

  // 3. App anaphora: "open it", "close it", "use kholo", "ise kholo"
  if (lastApp && /^(?:open|launch|ise\s+kholo|use\s+kholo)\s*(?:it)?$/i.test(lower)) {
    text = `open ${lastApp}`;
    console.log(`[Jarvis Memory] Resolved anaphora app "it" -> "${lastApp}"`);
  }

  // 4. Playback / Song anaphora
  if (/^(?:like|favorite)\s+it$/i.test(lower) || /^(?:isko\s+like\s+karo)$/i.test(lower)) {
    text = 'like';
  } else if (/^(?:unlike|dislike)\s+it$/i.test(lower) || /^(?:isko\s+unlike\s+karo)$/i.test(lower)) {
    text = 'unlike';
  } else if (/^(?:pause|stop)\s+it$/i.test(lower) || /^(?:isko\s+roko)$/i.test(lower)) {
    text = 'pause';
  } else if (/^(?:resume|play)\s+it$/i.test(lower) || /^(?:isko\s+chalao)$/i.test(lower)) {
    text = 'resume';
  }

  return text;
}


/**
 * Validates that an object strictly adheres to the IntentResult schema.
 * Prevents hallucinations or corrupted LLM responses from causing runtime errors.
 */
export function validateIntentResult(res: any): res is IntentResult {
  if (!res || typeof res !== 'object') return false;

  if (typeof res.intent !== 'string' || !VALID_INTENTS.has(res.intent as IntentName)) {
    return false;
  }

  if (!res.slots || typeof res.slots !== 'object' || Array.isArray(res.slots)) {
    return false;
  }

  if (typeof res.confidence !== 'number' || res.confidence < 0 || res.confidence > 1) {
    return false;
  }

  if (typeof res.spokenReply !== 'string' || res.spokenReply.trim().length === 0) {
    return false;
  }

  return true;
}

/**
 * Main intent resolution entry point.
 * Tier 1: Runs local rules first.
 * Tier 2: Triggers server LLM proxy if needed.
 */
export async function parseIntent(
  rawTranscript: string,
  context?: BrainContext
): Promise<IntentResult> {
  const startTime = Date.now();

  if (!rawTranscript || rawTranscript.trim().length === 0) {
    return {
      intent: 'UNKNOWN',
      slots: {},
      confidence: 0,
      spokenReply: "I didn't hear anything.",
      source: 'local',
      latencyMs: Date.now() - startTime,
    };
  }

  // 0. Contextual Anaphora Resolution ("Play more from him", "Message him", "Open it")
  const transcript = resolveAnaphora(rawTranscript, context);

  // Tier 1: Local Rule-Based Matcher (< 5 ms)
  const localResult = parseLocalIntent(transcript, context);

  // If local rule matched with high confidence and is not a conversational chat query
  if (localResult.confidence >= 0.8 && localResult.intent !== 'CHAT') {
    localResult.latencyMs = Date.now() - startTime;
    recordMemoryTurn(localResult);
    return localResult;
  }

  // Tier 2: Fallback to Server Proxy LLM
  console.log(`[Jarvis Router] Routing to LLM proxy (local intent: ${localResult.intent}, confidence: ${localResult.confidence})`);
  try {
    const rawLlmResult = await queryLlmBrain(transcript, context);

    if (validateIntentResult(rawLlmResult)) {
      rawLlmResult.latencyMs = Date.now() - startTime;

      // If the LLM successfully resolved an intent
      if (rawLlmResult.intent !== 'UNKNOWN') {
        recordMemoryTurn(rawLlmResult);
        return rawLlmResult;
      }
    } else {
      console.warn('[Jarvis Router] LLM output failed schema validation:', rawLlmResult);
    }
  } catch (err) {
    console.warn('[Jarvis Router] LLM call error:', err);
  }

  // If local detected a CHAT or question, preserve CHAT even if server proxy is offline
  if (localResult.intent === 'CHAT') {
    localResult.latencyMs = Date.now() - startTime;
    recordMemoryTurn(localResult);
    return localResult;
  }

  // If LLM returned UNKNOWN or failed, but local match had moderate signal (>= 0.4), use local
  if (localResult.confidence >= 0.4) {
    localResult.latencyMs = Date.now() - startTime;
    recordMemoryTurn(localResult);
    return localResult;
  }

  // Final fallback: Universal On-Device Cognitive Brain
  // Instead of failing with "Sorry, I can't help with that", handle any open-ended question,
  // personal identity query, humor, or knowledge query in one go.
  return resolveUniversalFallback(transcript, startTime);
}

/**
 * Universal fallback handler for un-patterned open queries.
 * Eliminates the need to manually add regexes for every conversational scenario.
 */
function resolveUniversalFallback(transcript: string, startTime: number): IntentResult {
  const clean = transcript.trim().toLowerCase().replace(/[?.!,;]+$/, '');

  // 1. User Identity & Name
  if (/(?:my\s+name|who\s+am\s+i|who\s+i\s+am|mera\s+naam|main\s+kaun\s+hu)/i.test(clean)) {
    return {
      intent: 'RECALL',
      slots: { query: 'name', type: 'user_name' },
      confidence: 0.95,
      spokenReply: 'Your name is Ritvik, sir. All core access controls are linked to your profile.',
      source: 'local',
      latencyMs: Date.now() - startTime,
    };
  }

  // 2. Jarvis Identity & Self-Awareness
  if (/(?:who\s+are\s+you|what\s+is\s+your\s+name|what(?:'s)?\s+your\s+name|tum\s+kaun\s+ho|tumhara\s+naam)/i.test(clean)) {
    return {
      intent: 'CHAT',
      slots: { query: transcript },
      confidence: 0.95,
      spokenReply: 'I am JARVIS, your Just A Rather Very Intelligent System. Ready and at your service, sir.',
      source: 'local',
      latencyMs: Date.now() - startTime,
    };
  }

  if (/(?:who\s+(?:made|created|built|developed)\s+you|tumhe\s+kisne\s+banaya|creator)/i.test(clean)) {
    return {
      intent: 'CHAT',
      slots: { query: transcript },
      confidence: 0.95,
      spokenReply: 'I was engineered by Ritvik as an advanced on-device AI system.',
      source: 'local',
      latencyMs: Date.now() - startTime,
    };
  }

  // 3. Humor & Jokes
  if (/(?:joke|hasao|funny|laugh)/i.test(clean)) {
    const jokes = [
      'Why do programmers prefer dark mode? Because light attracts bugs, sir.',
      'There are 10 types of people in the world: those who understand binary, and those who do not.',
      'An algorithm is what programmers use when they do not want to explain what they did, sir.',
      'Artificial intelligence is no match for natural stupidity, though I strive to bridge the gap.'
    ];
    return {
      intent: 'CHAT',
      slots: { query: transcript },
      confidence: 0.95,
      spokenReply: jokes[Math.floor(Math.random() * jokes.length)],
      source: 'local',
      latencyMs: Date.now() - startTime,
    };
  }

  // 4. Gratitude & Social
  if (/(?:thank\s+you|thanks|shukriya|dhanyawad|good\s+job|well\s+done|great\s+job)/i.test(clean)) {
    const replies = [
      'Always a pleasure to be of service, sir.',
      'Anytime, sir. Standing by for your next instruction.',
      'Glad I could be of assistance, sir.',
      'All in a day\'s work, sir.'
    ];
    return {
      intent: 'CHAT',
      slots: { query: transcript },
      confidence: 0.95,
      spokenReply: replies[Math.floor(Math.random() * replies.length)],
      source: 'local',
      latencyMs: Date.now() - startTime,
    };
  }

  // 5. Universal Open Knowledge & Question Route:
  // Automatically runs on-device Wikipedia & DuckDuckGo search via executor
  return {
    intent: 'CHAT',
    slots: { query: transcript },
    confidence: 0.75,
    spokenReply: 'Let me check that for you.',
    source: 'local',
    latencyMs: Date.now() - startTime,
  };
}


export { normalizeTranscript } from './normalize';
export { parseLocalIntent } from './localIntents';
export { queryLlmBrain } from './llmClient';
export const routeTranscript = parseIntent;
export * from './types';
