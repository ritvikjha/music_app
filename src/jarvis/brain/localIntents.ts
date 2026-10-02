/**
 * src/jarvis/brain/localIntents.ts
 *
 * Fast rule-based intent parser executing locally in under 5 ms with zero network.
 * Handles English and Hinglish patterns across all defined music intents.
 */

import type { IntentResult, ScreenTarget, RepeatMode, BrainContext } from './types';
import { normalizeTranscript } from './normalize';
import { REPLIES, pickVariant } from './replies';

type PatternMatcher = (
  text: string,
  context?: BrainContext
) => IntentResult | null;

// ==========================================
// 1. Playback Control Matchers
// ==========================================

const matchPause: PatternMatcher = (text) => {
  const isPause =
    /^(pause|stop|hold on|freeze|cease)(?:\s+(?:the\s+)?(?:music|playback|song|playing))?$/i.test(text) ||
    /^(ruko|rok do|band karo|gaana roko|chup ho jao|gaana band karo|pause karo|stop karo|ruk ja|bas karo)$/i.test(text);

  if (isPause) {
    return {
      intent: 'PAUSE',
      slots: {},
      confidence: 0.98,
      spokenReply: pickVariant(REPLIES.PAUSE),
      source: 'local',
    };
  }
  return null;
};

const matchResume: PatternMatcher = (text) => {
  const isResume =
    /^(resume|continue|play again|unpause|keep playing|start playing)(?:\s+(?:the\s+)?(?:music|playback|song|playing))?$/i.test(text) ||
    /^(chalu karo|shuru karo|phir se chalao|continue karo|bajao|gaana wapas chalao|unpause karo|bajate raho)$/i.test(text);

  if (isResume) {
    return {
      intent: 'RESUME',
      slots: {},
      confidence: 0.98,
      spokenReply: pickVariant(REPLIES.RESUME),
      source: 'local',
    };
  }
  return null;
};

const matchNext: PatternMatcher = (text) => {
  const isNext =
    /^(next|skip)(?:\s+(?:this\s+|the\s+)?(?:song|track))?$/i.test(text) ||
    /^(agla|agla gaana|aage badhao|change karo|change karo gaana|gaana change karo|dusra gaana|dusra gaana chalao|skip karo|next lagao|agla track)$/i.test(text);

  if (isNext) {
    return {
      intent: 'NEXT',
      slots: {},
      confidence: 0.98,
      spokenReply: pickVariant(REPLIES.NEXT),
      source: 'local',
    };
  }
  return null;
};

const matchPrevious: PatternMatcher = (text) => {
  const isPrevious =
    /^(previous|go back|last song|play previous|back track)(?:\s+(?:to\s+the\s+last\s+song|song|track))?$/i.test(text) ||
    /^(pichla|pichla gaana|peeche karo|wapas pichla gaana|previous lagao|pichhe wala gaana|wapas pichla gaana lagao)$/i.test(text);

  if (isPrevious) {
    return {
      intent: 'PREVIOUS',
      slots: {},
      confidence: 0.98,
      spokenReply: pickVariant(REPLIES.PREVIOUS),
      source: 'local',
    };
  }
  return null;
};

// ==========================================
// 2. Volume & Audio Control Matchers
// ==========================================

const matchVolumeSet: PatternMatcher = (text) => {
  // Pattern: "volume (to)? 50 (percent)?" or "set volume to 80" or "awaaz 50 percent karo"
  const m =
    text.match(/(?:set\s+)?volume\s+(?:to\s+|at\s+)?(\d+)(?:\s*%)?(?:\s*percent)?/i) ||
    text.match(/(\d+)(?:\s*%)?(?:\s*percent)?\s+volume/i) ||
    text.match(/awaaz\s+(?:ko\s+)?(\d+)(?:\s*percent)?/i) ||
    text.match(/(\d+)(?:\s*%)?(?:\s*percent)?\s+awaaz/i);

  if (m) {
    const rawNum = parseInt(m[1], 10);
    if (!isNaN(rawNum) && rawNum >= 0 && rawNum <= 100) {
      return {
        intent: 'VOLUME_SET',
        slots: { percent: rawNum },
        confidence: 0.96,
        spokenReply: `Setting volume to ${rawNum} percent.`,
        source: 'local',
      };
    }
  }

  // Mute / Unmute shortcuts
  if (/^(mute|silent|shunya volume|awaaz band karo)$/i.test(text)) {
    return {
      intent: 'VOLUME_SET',
      slots: { percent: 0 },
      confidence: 0.98,
      spokenReply: 'Muting audio.',
      source: 'local',
    };
  }

  return null;
};

const matchVolumeUp: PatternMatcher = (text) => {
  const isUp =
    /(?:volume\s+(?:up|increase|raise|high|more)|turn\s+(?:it\s+)?up|pump\s+it\s+up)/i.test(text) ||
    /(?:music\s+ka\s+|sound\s+ka\s+|gaane\s+ka\s+)?volume\s*(?:badhao|tez|unche|high|up)/i.test(text) ||
    /(?:awaaz|aawaz)\s*(?:badhao|tez|unche|loud|up)/i.test(text) ||
    /(?:music|sound|gaana)\s*(?:tez|unche)\s*(?:karo|karna|krna)/i.test(text) ||
    /(?:आवाज़|वॉल्यूम)\s*(?:बढ़ाओ|तेज़|अप)/i.test(text);

  if (isUp) {
    return {
      intent: 'VOLUME_UP',
      slots: {},
      confidence: 0.98,
      spokenReply: 'Increasing volume.',
      source: 'local',
    };
  }
  return null;
};

const matchVolumeDown: PatternMatcher = (text) => {
  const isDown =
    /(?:volume\s+(?:down|decrease|lower|less|softer|quieter)|turn\s+(?:it\s+)?down|down\s+the\s+volume)/i.test(text) ||
    /(?:music\s+ka\s+|sound\s+ka\s+|gaane\s+ka\s+)?volume\s*(?:kam|ghatao|dheemi|dheere|down|low|slow)/i.test(text) ||
    /(?:awaaz|aawaz)\s*(?:kam|dheemi|dheere|ghatao|slow)/i.test(text) ||
    /(?:music|sound|gaana)\s*(?:dheema|dheere|kam|slow)/i.test(text) ||
    /(?:volume|awaaz)\s+thod[ai]\s+(?:kam|dheere|dheemi)/i.test(text) ||
    /(?:आवाज़|वॉल्यूम)\s*(?:कम|धीमी|डाउन)/i.test(text);

  if (isDown) {
    return {
      intent: 'VOLUME_DOWN',
      slots: {},
      confidence: 0.98,
      spokenReply: 'Lowering volume.',
      source: 'local',
    };
  }
  return null;
};

// ==========================================
// 3. Seeking & Track Position
// ==========================================

const matchSeek: PatternMatcher = (text) => {
  // Forward: "seek forward 30 seconds", "forward 15 sec", "skip ahead 20s", "10 second aage karo"
  const mFwd =
    text.match(/(?:seek\s+|skip\s+)?(?:forward|ahead)\s+(?:by\s+)?(\d+)\s*(?:seconds|second|s|sec)?/i) ||
    text.match(/(\d+)\s*(?:seconds|second|sec)\s*(?:forward|ahead|aage|aage badhao)/i);

  if (mFwd) {
    const sec = parseInt(mFwd[1], 10);
    return {
      intent: 'SEEK',
      slots: { seconds: sec, relative: true },
      confidence: 0.95,
      spokenReply: `Fast forwarding ${sec} seconds.`,
      source: 'local',
    };
  }

  // Backward: "seek backward 30 seconds", "rewind 15 seconds", "go back 20s", "10 second peeche karo"
  const mBack =
    text.match(/(?:seek\s+|go\s+)?(?:backward|back|rewind)\s+(?:by\s+)?(\d+)\s*(?:seconds|second|s|sec)?/i) ||
    text.match(/(\d+)\s*(?:seconds|second|sec)\s*(?:backward|back|rewind|peeche|peeche karo)/i);

  if (mBack) {
    const sec = parseInt(mBack[1], 10);
    return {
      intent: 'SEEK',
      slots: { seconds: -sec, relative: true },
      confidence: 0.95,
      spokenReply: `Rewinding ${sec} seconds.`,
      source: 'local',
    };
  }

  return null;
};

// ==========================================
// 4. Favorites & Likes
// ==========================================

const matchLike: PatternMatcher = (text) => {
  const isLike =
    /^(like|favorite)(?:\s+(?:this\s+)?song)?$/i.test(text) ||
    /^(add to favorites|i love this song|heart this|save this song)$/i.test(text) ||
    /^(ye gaana pasand hai|favourite me daal do|like karo|ye pasand aaya|dil do|favourite banao)$/i.test(text);

  if (isLike) {
    return {
      intent: 'LIKE',
      slots: {},
      confidence: 0.96,
      spokenReply: 'Added to your favorites.',
      source: 'local',
    };
  }
  return null;
};

const matchUnlike: PatternMatcher = (text) => {
  const isUnlike =
    /^(unlike|dislike)(?:\s+(?:this\s+)?song)?$/i.test(text) ||
    /^(remove from favorites|unfavorite|un-like)$/i.test(text) ||
    /^(unlike karo|(?:favorite|favourite)\s+se\s+hata(?:\s+do)?|pasand nahi hai)$/i.test(text);

  if (isUnlike) {
    return {
      intent: 'UNLIKE',
      slots: {},
      confidence: 0.96,
      spokenReply: 'Removed from your favorites.',
      source: 'local',
    };
  }
  return null;
};

// ==========================================
// 5. Shuffle & Repeat
// ==========================================

const matchShuffle: PatternMatcher = (text) => {
  if (/^(shuffle on|enable shuffle|turn on shuffle|shuffle songs|shuffle playlist|shuffle chalu karo)$/i.test(text)) {
    return {
      intent: 'SHUFFLE',
      slots: { on: true },
      confidence: 0.96,
      spokenReply: 'Shuffle is now on.',
      source: 'local',
    };
  }
  if (/^(shuffle off|disable shuffle|turn off shuffle|stop shuffle|shuffle band karo)$/i.test(text)) {
    return {
      intent: 'SHUFFLE',
      slots: { on: false },
      confidence: 0.96,
      spokenReply: 'Shuffle is now off.',
      source: 'local',
    };
  }
  if (/^(shuffle)$/i.test(text)) {
    return {
      intent: 'SHUFFLE',
      slots: { on: true },
      confidence: 0.92,
      spokenReply: 'Shuffling playback.',
      source: 'local',
    };
  }
  return null;
};

const matchRepeat: PatternMatcher = (text) => {
  if (/^(repeat (?:one|1)|loop (?:one|1)|repeat this song|loop this song|loop track|is gaane ko repeat karo)$/i.test(text)) {
    return {
      intent: 'REPEAT',
      slots: { mode: 'one' as RepeatMode },
      confidence: 0.96,
      spokenReply: 'Repeating current track.',
      source: 'local',
    };
  }
  if (/^(repeat all|repeat on|loop all|loop playlist|sab repeat karo|repeat chalu karo)$/i.test(text)) {
    return {
      intent: 'REPEAT',
      slots: { mode: 'all' as RepeatMode },
      confidence: 0.96,
      spokenReply: 'Repeating all tracks.',
      source: 'local',
    };
  }
  if (/^(repeat off|no repeat|stop repeat|disable repeat|repeat band karo)$/i.test(text)) {
    return {
      intent: 'REPEAT',
      slots: { mode: 'off' as RepeatMode },
      confidence: 0.96,
      spokenReply: 'Repeat is now off.',
      source: 'local',
    };
  }
  return null;
};

// ==========================================
// 6. Sleep Timer
// ==========================================

const matchSleepTimer: PatternMatcher = (text) => {
  // Cancel sleep timer
  if (/^(cancel sleep timer|turn off sleep timer|stop sleep timer|remove sleep timer|sleep timer hatao|sleep timer band karo)$/i.test(text)) {
    return {
      intent: 'CANCEL_SLEEP_TIMER',
      slots: {},
      confidence: 0.96,
      spokenReply: 'Sleep timer cancelled.',
      source: 'local',
    };
  }

  // Set sleep timer: "sleep timer for 20 minutes", "stop in 30 min", "20 minute me band karo"
  const m =
    text.match(/(?:set\s+)?sleep\s+timer\s+(?:for\s+)?(\d+)\s*(?:minutes|minute|min|m)?/i) ||
    text.match(/(?:turn\s+off|stop|band)\s+(?:music\s+)?in\s+(\d+)\s*(?:minutes|minute|min)/i) ||
    text.match(/(\d+)\s*(?:minutes|minute|min)\s+(?:ka\s+)?sleep\s+timer/i) ||
    text.match(/(\d+)\s*(?:minutes|minute|min)\s+me\s+(?:band\s+karo|band\s+kar\s+dena|gaana\s+band)/i);

  if (m) {
    const minutes = parseInt(m[1], 10);
    if (!isNaN(minutes) && minutes > 0) {
      return {
        intent: 'SLEEP_TIMER',
        slots: { minutes },
        confidence: 0.96,
        spokenReply: `Sleep timer set for ${minutes} minutes.`,
        source: 'local',
      };
    }
  }

  return null;
};

// ==========================================
// 7. Track Info & Discovery
// ==========================================

const matchTrackInfo: PatternMatcher = (text) => {
  const isInfo =
    /^(what is playing|what song is this|which song is this|name of this song|current song|who is singing|what track is this)$/i.test(text) ||
    /^(kya chal raha hai|kaun sa gaana chal raha hai|kaun sa gaana hai|ye kaun sa gaana hai|is gaane ka naam kya hai|gaane ka naam)$/i.test(text);

  if (isInfo) {
    return {
      intent: 'WHAT_IS_PLAYING',
      slots: {},
      confidence: 0.96,
      spokenReply: 'Checking current track.',
      source: 'local',
    };
  }
  return null;
};

const matchDiscovery: PatternMatcher = (text) => {
  if (/^(play trending|trending songs|trending music|top songs|top hits|popular songs|trending gaane|aaj ke trending)$/i.test(text)) {
    return {
      intent: 'PLAY_TRENDING',
      slots: {},
      confidence: 0.92,
      spokenReply: 'Playing trending songs.',
      source: 'local',
    };
  }

  if (/^(play similar(?:\s+songs)?|more like this|play songs like this|similar songs|recommend similar|aise aur gaane chalao)$/i.test(text)) {
    return {
      intent: 'PLAY_SIMILAR',
      slots: {},
      confidence: 0.92,
      spokenReply: 'Playing similar songs.',
      source: 'local',
    };
  }

  return null;
};

// ==========================================
// 8. Queue Management
// ==========================================

const matchQueue: PatternMatcher = (text) => {
  // Clear queue
  if (
    /^(?:clear|empty|delete|remove)(?:\s+(?:the|all|my|whole|entire))*\s+queue$/i.test(text) ||
    /^(?:queue|pura queue)\s+(?:saaf|khali|delete)\s+karo$/i.test(text)
  ) {
    return {
      intent: 'CLEAR_QUEUE',
      slots: {},
      confidence: 0.96,
      spokenReply: pickVariant(REPLIES.CLEAR_QUEUE_PROMPT),
      needsConfirmation: true,
      source: 'local',
    };
  }

  // Play next: "play X next", "play next X", "agla gaana X bajao"
  const mNext =
    text.match(/^play\s+(.+?)\s+next$/i) ||
    text.match(/^play\s+next\s+(.+)$/i) ||
    text.match(/^agla\s+gaana\s+(.+?)\s+(?:bajao|chalao|lagao)$/i);

  if (mNext) {
    const q = mNext[1].trim();
    if (q.length > 0) {
      return {
        intent: 'PLAY_NEXT',
        slots: { query: q },
        confidence: 0.93,
        spokenReply: pickVariant(REPLIES.PLAY_NEXT)(q),
        source: 'local',
      };
    }
  }

  // Add to queue: "add X to queue", "queue X", "queue me daalo X"
  const mAdd =
    text.match(/^add\s+(.+?)\s+to\s+queue$/i) ||
    text.match(/^queue\s+(.+)$/i) ||
    text.match(/^queue\s+me\s+daalo\s+(.+)$/i) ||
    text.match(/^(.+?)\s+ko\s+queue\s+me\s+daalo$/i);

  if (mAdd) {
    const q = mAdd[1].trim();
    if (q.length > 0 && q !== 'me daalo') {
      return {
        intent: 'ADD_TO_QUEUE',
        slots: { query: q },
        confidence: 0.93,
        spokenReply: pickVariant(REPLIES.ADD_TO_QUEUE)(q),
        source: 'local',
      };
    }
  }

  return null;
};

// ==========================================
// 8b. Jam Room Leave / Disconnect
// ==========================================

const matchLeaveRoom: PatternMatcher = (text) => {
  if (
    /^(?:leave|exit|disconnect\s+from|quit)(?:\s+(?:the|this|my))?\s+(?:jam|room|jam\s+room)$/i.test(text) ||
    /^(?:jam|room|jam\s+room)\s+(?:chhod do|se niklo|band karo|exit karo)$/i.test(text)
  ) {
    return {
      intent: 'LEAVE_ROOM',
      slots: {},
      confidence: 0.96,
      spokenReply: pickVariant(REPLIES.LEAVE_ROOM_PROMPT),
      needsConfirmation: true,
      source: 'local',
    };
  }
  return null;
};

// ==========================================
// 9. App Navigation
// ==========================================

const SCREEN_MAP: Record<string, ScreenTarget> = {
  home: 'home',
  library: 'library',
  playlists: 'library',
  jam: 'jam',
  'jam room': 'jam',
  'jam rooms': 'jam',
  rooms: 'jam',
  games: 'games',
  trivia: 'games',
  profile: 'profile',
  settings: 'profile',
  player: 'player',
  'full player': 'player',
  'now playing': 'player',
  friends: 'friends',
};

const matchOpenScreen: PatternMatcher = (text) => {
  // "open home", "go to library", "profile dikhao", "jam room kholo"
  const m =
    text.match(/^(?:open|go\s+to|show|navigate\s+to)\s+(home|library|playlists|jam\s+rooms?|jam|games|trivia|profile|settings|player|friends)$/i) ||
    text.match(/^(home|library|jam|games|profile|player|friends)\s+(?:kholo|dikhao|me\s+jao)$/i);

  if (m) {
    const key = m[1].toLowerCase().trim();
    const screen = SCREEN_MAP[key];
    if (screen) {
      return {
        intent: 'OPEN_SCREEN',
        slots: { screen },
        confidence: 0.95,
        spokenReply: `Opening ${screen}.`,
        source: 'local',
      };
    }
  }

  return null;
};

// ==========================================
// 10. Play Song & Play Artist
// ==========================================

const matchPlaySongOrArtist: PatternMatcher = (text) => {
  // Guard against previous/next song phrases containing 'lagao' or 'gaana'
  if (/^(pichla|agla|wapas pichla)/i.test(text)) {
    return null;
  }

  // Play Artist explicitly:
  // "play songs by Arijit Singh", "play artist Shreya Ghoshal", "Arijit Singh ke gaane chalao", "Arijit Singh ke gaane"
  const mArtistExplicit =
    text.match(/^play\s+(?:songs\s+by|artist|music\s+by)\s+(.+)$/i) ||
    text.match(/^(.+?)\s+ke\s+(?:gaane|songs|geet)\s*(?:chalao|bajao|lagao|sunao)?$/i) ||
    text.match(/^(.+?)\s+ke\s+top\s+songs$/i);

  if (mArtistExplicit) {
    const artist = mArtistExplicit[1].trim();
    if (artist.length > 0 && !/^(trending|similar|next|previous)$/i.test(artist)) {
      return {
        intent: 'PLAY_ARTIST',
        slots: { artist },
        confidence: 0.94,
        spokenReply: `Playing songs by ${artist}.`,
        source: 'local',
      };
    }
  }

  // Play Song with Artist: "play Kesariya by Arijit Singh"
  const mSongByArtist = text.match(/^play\s+(?:song\s+)?(.+?)\s+by\s+(.+)$/i);
  if (mSongByArtist) {
    const song = mSongByArtist[1].trim();
    const artist = mSongByArtist[2].trim();
    return {
      intent: 'PLAY_SONG',
      slots: { query: song, artist },
      confidence: 0.95,
      spokenReply: `Playing ${song} by ${artist}.`,
      source: 'local',
    };
  }

  // Play Song / Search:
  // "play Kesariya", "put on Believer", "listen to Despacito", "Kesariya chalao", "Kesariya bajao", "Kesariya lagao"
  const mSong =
    text.match(/^(?:play|put\s+on|listen\s+to|start)\s+(.+)$/i) ||
    text.match(/^(.+?)\s+(?:chalao|bajao|lagao|sunao)$/i) ||
    text.match(/^gaana\s+chalao\s+(.+)$/i);

  if (mSong) {
    const query = mSong[1].trim();
    if (query.length > 0 && !/^(trending|similar|next|previous|similar songs)$/i.test(query)) {
      return {
        intent: 'PLAY_SONG',
        slots: { query },
        confidence: 0.92,
        spokenReply: `Playing ${query}.`,
        source: 'local',
      };
    }
  }

  // Generic "play music" or "gaana chalao" without query -> Resume or Trending
  if (/^(play music|play some music|gaana chalao|kuch chalao|kuch bajao|music bajao)$/i.test(text)) {
    return {
      intent: 'PLAY_TRENDING',
      slots: {},
      confidence: 0.88,
      spokenReply: 'Playing music for you.',
      source: 'local',
    };
  }

  return null;
};

// ==========================================
// 11. Conversational & General Questions (Routed to LLM)
// ==========================================

const matchQuestionsOrChat: PatternMatcher = (text) => {
  // 1. Direct Stark Conversational Greetings
  if (/^(?:hello|hi|hey|good\s+morning|good\s+evening|good\s+afternoon)\b/i.test(text)) {
    return {
      intent: 'CHAT',
      slots: {},
      confidence: 0.95,
      spokenReply: "Hello, sir. How may I assist you today?",
      source: 'local',
    };
  }

  if (/^(?:how\s+are\s+you|kaisa\s+hai|kaise\s+ho)\b/i.test(text)) {
    return {
      intent: 'CHAT',
      slots: {},
      confidence: 0.95,
      spokenReply: "All systems operating at peak efficiency, sir.",
      source: 'local',
    };
  }

  if (/^(?:who\s+are\s+you|what\s+is\s+your\s+name|tum\s+kaun\s+ho)\b/i.test(text)) {
    return {
      intent: 'CHAT',
      slots: {},
      confidence: 0.95,
      spokenReply: "I am Jarvis, your personal AI music and device assistant.",
      source: 'local',
    };
  }

  if (/^(?:what\s+can\s+you\s+do|tum\s+kya\s+kar\s+sakte\s+ho)\b/i.test(text)) {
    return {
      intent: 'CHAT',
      slots: {},
      confidence: 0.95,
      spokenReply: "I can control your music, automate apps, search web knowledge, set alarms, and calculate math.",
      source: 'local',
    };
  }

  // 2. Explanation & Knowledge queries: "explain Dor", "tell me about Coldplay", "who is A.R. Rahman", "what is photosynthesis"
  const knowledgeMatch =
    text.match(/^(?:explain|tell\s+me\s+about|what\s+is|what\s+are|who\s+is|who\s+was|search\s+for|look\s+up|google\s+for)\s+(.+)$/i) ||
    text.match(/^(.+?)\s+(?:kya\s+hai|kaun\s+hai|ke\s+baare\s+me\s+batao|explain\s+karo)$/i);

  if (knowledgeMatch) {
    const rawTopic = (knowledgeMatch[1] || knowledgeMatch[2] || '').trim();
    if (rawTopic.length > 0) {
      return {
        intent: 'WEB_SEARCH',
        slots: { query: rawTopic },
        confidence: 0.95,
        spokenReply: `Looking up ${rawTopic}, sir.`,
        source: 'local',
      };
    }
  }

  // 3. General catch-all question fallback
  const isQuestion =
    /^(who|what|why|when|where|how|tell me|explain|can you tell)\b/i.test(text) ||
    /^(kaun|kya|kyun|kab|kahan|kaise|batao)\b/i.test(text);

  if (isQuestion) {
    return {
      intent: 'CHAT',
      slots: { query: text },
      confidence: 0.75, // Identified as chat query
      spokenReply: "Let me check that for you.",
      source: 'local',
    };
  }

  return null;
};

const matchWhatsAppMessage: PatternMatcher = (text, context) => {
  const isDraft = /\b(?:draft|taiyar)\b/i.test(text);

  // Contextual reply: "reply saying I'm on my way" / "reply that I will be late"
  const mReply = text.match(/^(?:reply|jawab\s+do)(?:\s+(?:saying|that|ko))?\s+(.+)$/i);
  if (mReply) {
    const message = mReply[1].trim();
    const contact = (context as any)?.activeWhatsAppContact || 'Rahul';
    return {
      intent: 'WHATSAPP_MESSAGE',
      slots: { contact, message, draft: true },
      confidence: 0.95,
      spokenReply: `Drafted reply to ${contact}, sir. Review and tap send.`,
      source: 'local',
    };
  }

  // Explicit draft: "draft a message to Rahul saying I am on my way"
  const mDraft = text.match(/^(?:draft\s+(?:a\s+)?(?:whatsapp|message)?(?:\s+to)?|draft\s+to)\s+([a-zA-Z0-9\s+]+?)\s+(?:saying|that)?\s*(.+)$/i);
  if (mDraft) {
    const contact = mDraft[1].trim();
    const message = mDraft[2].trim();
    return {
      intent: 'WHATSAPP_MESSAGE',
      slots: { contact, message, draft: true },
      confidence: 0.98,
      spokenReply: `Drafted message to ${contact}, sir. Review and tap send.`,
      source: 'local',
    };
  }

  // English:
  // "send a whatsapp message to rahul saying I am coming home"
  // "whatsapp papa I am coming home"
  // "message rahul where are you"
  // "send message to priya call me later"
  const m1 =
    text.match(/^(?:send\s+a\s+)?(?:whatsapp|message)(?:\s+message)?\s+(?:to\s+)?([a-zA-Z0-9\s+]+?)\s+(?:on\s+whatsapp\s+)?(?:saying|that|message)?\s+(.+)$/i) ||
    text.match(/^(?:whatsapp|message)\s+([a-zA-Z0-9\s+]+?)\s+(.+)$/i);

  if (m1) {
    const contact = m1[1].trim();
    const message = m1[2].trim();
    return {
      intent: 'WHATSAPP_MESSAGE',
      slots: { contact, message, draft: isDraft },
      confidence: 0.98,
      spokenReply: isDraft ? `Drafted message to ${contact}, sir. Review and tap send.` : `Sending WhatsApp message to ${contact}...`,
      source: 'local',
    };
  }

  // Hinglish:
  // "papa ko whatsapp karo main aa raha hu"
  // "rahul ko message bhejo kahan ho"
  const m2 = text.match(/^([a-zA-Z0-9\s+]+?)\s+(?:ko\s+)?(?:whatsapp|message)\s*(?:karo|bhejo|par\s*message\s*karo|draft\s*karo)\s*(.+)$/i);
  if (m2) {
    const contact = m2[1].trim();
    const message = m2[2].trim();
    return {
      intent: 'WHATSAPP_MESSAGE',
      slots: { contact, message, draft: isDraft },
      confidence: 0.98,
      spokenReply: isDraft ? `${contact} ke liye message draft kar diya hai, sir.` : `${contact} ko WhatsApp bhej raha hu...`,
      source: 'local',
    };
  }

  return null;
};

const matchCallContact: PatternMatcher = (text) => {
  // English: "call mom", "call rahul", "phone priya", "dial 123"
  const m1 = text.match(/^(?:call|phone|make\s+a\s+call\s+to|dial)\s+([a-zA-Z0-9\s+]+)$/i);
  if (m1) {
    const contact = m1[1].trim();
    if (contact && !/^(?:it|song|music|the\s+song|next|back)$/i.test(contact)) {
      return {
        intent: 'CALL',
        slots: { contact },
        confidence: 0.98,
        spokenReply: `Calling ${contact}...`,
        source: 'local',
      };
    }
  }

  // Hinglish: "rahul ko call karo", "mom ko phone lagao"
  const m2 = text.match(/^([a-zA-Z0-9\s+]+?)\s+(?:ko\s+)?(?:call\s*(?:karo|lagao|milao)|phone\s*(?:karo|lagao))$/i);
  if (m2) {
    const contact = m2[1].trim();
    return {
      intent: 'CALL',
      slots: { contact },
      confidence: 0.98,
      spokenReply: `${contact} ko call mila raha hu...`,
      source: 'local',
    };
  }

  return null;
};

const matchStarkEasterEggs: PatternMatcher = (text) => {
  // 1. "Are you there?"
  if (/^(?:are\s+you\s+there|you\s+there|there\s+jarvis|kya\s+tum\s+wahan\s+ho)$/i.test(text)) {
    return {
      intent: 'CHAT',
      slots: {},
      confidence: 0.99,
      spokenReply: pickVariant(REPLIES.ARE_YOU_THERE),
      source: 'local',
    };
  }

  // 2. "Thank you"
  if (/^(?:thank\s+you|thanks|thank\s+you\s+so\s+much|shukriya|dhanyawad)$/i.test(text)) {
    return {
      intent: 'CHAT',
      slots: {},
      confidence: 0.99,
      spokenReply: pickVariant(REPLIES.THANK_YOU),
      source: 'local',
    };
  }

  // 3. "Who is the boss?"
  if (/^(?:who\s+is\s+the\s+boss|who's\s+the\s+boss|who\s+is\s+your\s+boss|boss\s+kaun\s+hai)$/i.test(text)) {
    return {
      intent: 'CHAT',
      slots: {},
      confidence: 0.99,
      spokenReply: pickVariant(REPLIES.WHO_IS_BOSS),
      source: 'local',
    };
  }

  // 4. "Self destruct"
  if (/^(?:self\s+destruct|self\s+destruction|destroy\s+yourself)$/i.test(text)) {
    return {
      intent: 'CHAT',
      slots: {},
      confidence: 0.99,
      spokenReply: pickVariant(REPLIES.SELF_DESTRUCT),
      source: 'local',
    };
  }

  // 5. "Who made you?"
  if (/^(?:who\s+made\s+you|who\s+created\s+you|who\s+built\s+you|tumhe\s+kisne\s+banaya)$/i.test(text)) {
    return {
      intent: 'CHAT',
      slots: {},
      confidence: 0.99,
      spokenReply: pickVariant(REPLIES.WHO_MADE_YOU),
      source: 'local',
    };
  }

  return null;
};

const matchStarkProtocols: PatternMatcher = (text) => {
  if (/^(?:protocol\s+night|night\s+protocol|sleep\s+mode|night\s+mode|good\s*night|so\s*jao)$/i.test(text)) {
    return {
      intent: 'PROTOCOL_NIGHT',
      slots: {},
      confidence: 0.98,
      spokenReply: pickVariant(REPLIES.PROTOCOL_NIGHT),
      source: 'local',
    };
  }

  if (/^(?:house\s+party\s+protocol|party\s+protocol|party\s+mode|party\s*shuru\s*karo)$/i.test(text)) {
    return {
      intent: 'PROTOCOL_PARTY',
      slots: {},
      confidence: 0.98,
      spokenReply: pickVariant(REPLIES.PROTOCOL_PARTY),
      source: 'local',
    };
  }

  if (/^(?:stealth\s+mode|stealth\s+protocol|silent\s+mode|silent\s+protocol|chup\s*raho)$/i.test(text)) {
    return {
      intent: 'PROTOCOL_STEALTH',
      slots: {},
      confidence: 0.98,
      spokenReply: pickVariant(REPLIES.PROTOCOL_STEALTH),
      source: 'local',
    };
  }

  if (/^(?:protocol\s+morning|morning\s+protocol|wake\s+up\s+mode|start\s+my\s+day)$/i.test(text)) {
    return {
      intent: 'PROTOCOL_MORNING',
      slots: {},
      confidence: 0.98,
      spokenReply: pickVariant(REPLIES.PROTOCOL_MORNING),
      source: 'local',
    };
  }

  if (/^(?:protocol\s+drive|drive\s+protocol|driving\s+mode|car\s+mode|gaadi\s+mode)$/i.test(text)) {
    return {
      intent: 'PROTOCOL_DRIVE',
      slots: {},
      confidence: 0.98,
      spokenReply: pickVariant(REPLIES.PROTOCOL_DRIVE),
      source: 'local',
    };
  }

  if (/^(?:protocol\s+focus|focus\s+protocol|deep\s+work\s+mode|focus\s+mode|study\s+mode)$/i.test(text)) {
    return {
      intent: 'PROTOCOL_FOCUS',
      slots: {},
      confidence: 0.98,
      spokenReply: pickVariant(REPLIES.PROTOCOL_FOCUS),
      source: 'local',
    };
  }

  return null;
};

// ==========================================
// Level 2 & 3: Mood, Taste & Memory Matchers
// ==========================================

const matchMoodMusic: PatternMatcher = (text) => {
  const moodMatch = text.match(
    /^(?:play\s+something|play\s+some|play|chalao|bajao)\s+(chill|relaxing|upbeat|party|workout|gym|sad|happy|romantic|study|focus|ambient|driving|acoustic|lofi)(?:\s+(?:music|songs|vibes|tracks|gaane))?$/i
  );
  if (moodMatch) {
    const mood = moodMatch[1].toLowerCase();
    const replyFn = pickVariant(REPLIES.PLAY_MOOD);
    return {
      intent: 'PLAY_MOOD',
      slots: { mood, query: `${mood} music` },
      confidence: 0.95,
      spokenReply: replyFn(mood),
      source: 'local',
    };
  }
  return null;
};

const matchPersonalizedUsual: PatternMatcher = (text) => {
  if (
    /^(?:play\s+my\s+usual|play\s+my\s+favorites?|play\s+my\s+music|mera\s+favourite\s+gaana\s+chalao|mera\s+usual\s+chalao|regular\s+chalao)$/i.test(
      text
    )
  ) {
    return {
      intent: 'PLAY_MY_USUAL',
      slots: {},
      confidence: 0.96,
      spokenReply: pickVariant(REPLIES.PLAY_MY_USUAL),
      source: 'local',
    };
  }
  return null;
};

const matchMemory: PatternMatcher = (text) => {
  // 1. Remember: "remember that my car is at level 3" / "remember my wifi password is 1234"
  const rememberMatch = text.match(
    /^(?:remember\s+(?:that\s+)?|note\s+down\s+(?:that\s+)?|yaad\s+rakhna\s+(?:ki\s+)?)(.+?)\s+(?:is|hai|=|was)\s+(.+)$/i
  );
  if (rememberMatch) {
    const key = rememberMatch[1].trim();
    const value = rememberMatch[2].trim();
    const replyFn = pickVariant(REPLIES.REMEMBER);
    return {
      intent: 'REMEMBER',
      slots: { key, value },
      confidence: 0.96,
      spokenReply: replyFn(key),
      source: 'local',
    };
  }

  // 2. Recall: "what is my wifi password" / "where did i park my car" / "recall parking"
  const recallMatch = text.match(
    /^(?:what\s+is\s+my|where\s+is\s+my|where\s+did\s+i\s+put\s+my|where\s+did\s+i\s+park\s+my|recall|check\s+memory\s+for|mera\s+(.+)\s+kya\s+hai|meri\s+(.+)\s+kahan\s+hai)\s*(.*)$/i
  );
  if (recallMatch) {
    const query = (recallMatch[1] || recallMatch[2] || recallMatch[3] || '').trim();
    if (query && !query.includes('song') && !query.includes('playing')) {
      return {
        intent: 'RECALL',
        slots: { query },
        confidence: 0.93,
        spokenReply: `Checking my records for ${query}, sir.`,
        source: 'local',
      };
    }
  }

  // 3. Reminders: "remind me to call Mom at 5pm" / "remind me to take medicine"
  const reminderMatch = text.match(/^(?:remind\s+me\s+to|mujhe\s+remind\s+karna\s+ki)\s+(.+)$/i);
  if (reminderMatch) {
    const task = reminderMatch[1].trim();
    const replyFn = pickVariant(REPLIES.SET_REMINDER);
    return {
      intent: 'SET_REMINDER',
      slots: { task },
      confidence: 0.94,
      spokenReply: replyFn(task),
      source: 'local',
    };
  }

  return null;
};

// ==========================================
// Level 4: Tools Matchers (Offline / Local)
// ==========================================

const matchTools: PatternMatcher = (text) => {
  // Weather
  const weatherMatch = text.match(/^(?:what\s+is\s+the\s+weather|weather\s+report|how\s+is\s+the\s+weather|weather\s+kaisa\s+hai|mausam\s+kaisa\s+hai)(?:\s+(?:in|for|at)\s+(.+))?$/i);
  if (weatherMatch) {
    const location = (weatherMatch[1] || '').trim();
    return {
      intent: 'GET_WEATHER',
      slots: { location: location || undefined },
      confidence: 0.95,
      spokenReply: location ? `Fetching weather for ${location}, sir.` : 'Checking the weather report, sir.',
      source: 'local',
    };
  }

  // Time
  if (/^(?:what\s+time\s+is\s+it|what's\s+the\s+time|current\s+time|time\s+kya\s+hua\s+hai|kitne\s+baje\s+hain)$/i.test(text)) {
    return {
      intent: 'GET_TIME',
      slots: {},
      confidence: 0.98,
      spokenReply: 'Checking current time, sir.',
      source: 'local',
    };
  }

  // Date
  if (/^(?:what\s+is\s+today's\s+date|what's\s+the\s+date|current\s+date|today's\s+date|aaj\s+kya\s+taarikh\s+hai|aaj\s+ki\s+date)$/i.test(text)) {
    return {
      intent: 'GET_DATE',
      slots: {},
      confidence: 0.98,
      spokenReply: "Checking today's date, sir.",
      source: 'local',
    };
  }

  // Math: "multiply 15 * 20", "multiply 15 20", "multiply 5 by 6", "15 into 20", "15 * 20"
  const multiplyMatch = text.match(/^(?:multiply|multiply\s+karo)\s+(\d+(?:\.\d+)?)\s*(?:by|and|into|with|times|\*|x|\s)\s*(\d+(?:\.\d+)?)$/i);
  if (multiplyMatch) {
    return {
      intent: 'CALCULATE',
      slots: { expression: `${multiplyMatch[1]} * ${multiplyMatch[2]}` },
      confidence: 0.99,
      spokenReply: 'Calculating that now, sir.',
      source: 'local',
    };
  }

  const directCalcMatch = text.match(/^(\d+(?:\.\d+)?)\s*(?:plus|minus|times|into|x|\*|divided\s+by|divided|over|guna|jama|bata)\s*(\d+(?:\.\d+)?)$/i);
  if (directCalcMatch) {
    return {
      intent: 'CALCULATE',
      slots: { expression: text },
      confidence: 0.98,
      spokenReply: 'Calculating that now, sir.',
      source: 'local',
    };
  }

  const mathMatch = text.match(/^(?:calculate|what\s+is|solve|compute|hisab\s+karo)\s+(\d+.*)$/i);
  if (mathMatch && /[\d+\-*/%]|percent|plus|minus|times|into|divided|guna|jama|bata/i.test(mathMatch[1])) {
    return {
      intent: 'CALCULATE',
      slots: { expression: mathMatch[1].trim() },
      confidence: 0.95,
      spokenReply: 'Calculating that now, sir.',
      source: 'local',
    };
  }

  // Search
  const searchMatch = text.match(/^(?:search\s+for|web\s+search|look\s+up|google\s+for)\s+(.+)$/i);
  if (searchMatch) {
    return {
      intent: 'WEB_SEARCH',
      slots: { query: searchMatch[1].trim() },
      confidence: 0.92,
      spokenReply: `Searching for ${searchMatch[1].trim()}, sir.`,
      source: 'local',
    };
  }

  return null;
};

// ==========================================
// Level 5: Ambient & Morning Briefing
// ==========================================

const matchMorningBriefing: PatternMatcher = (text) => {
  if (
    /^(?:morning\s+briefing|daily\s+briefing|give\s+me\s+a\s+morning\s+briefing|aaj\s+ka\s+briefing|briefing\s+do)$/i.test(
      text
    )
  ) {
    return {
      intent: 'MORNING_BRIEFING',
      slots: {},
      confidence: 0.97,
      spokenReply: 'Preparing your morning briefing, sir.',
      source: 'local',
    };
  }
  return null;
};

const matchStatusReport: PatternMatcher = (text) => {
  if (/^(?:status\s+report|diagnostics|all\s+systems\s+check|systems\s+check|jarvis\s+situation|situation\s+report|kya\s+haal\s+hai|system\s+status)$/i.test(text)) {
    return {
      intent: 'STATUS_REPORT',
      slots: {},
      confidence: 0.98,
      spokenReply: 'All systems nominal, sir. Power and thermals optimal. Systems operational.',
      source: 'local',
    };
  }
  return null;
};

// ==========================================
// Greetings & Attention Acknowledgments
// ("Hey", "Hey Jarvis", "Hello Jarvis", "Are you there", etc.)
// ==========================================
const matchGreetings: PatternMatcher = (text) => {
  const clean = text.trim().toLowerCase().replace(/[?.!,;]+$/, '');
  if (
    /^(?:hey|hay|he|hello|hlo|hi|yo|namaste|pranam|suno|sun)(?:\s+(?:jarvis|bro|bhai|buddy|there))?$/i.test(clean) ||
    /^(?:hey|hay|he|hello|hlo|hi|yo|jarvis|suno|sun)$/i.test(clean) ||
    /^(?:are\s+you\s+there|you\s+there|you\s+listening)$/i.test(clean) ||
    /^(?:sun\s*rahe\s*ho|sun\s*bhai|kya\s*haal\s*hai|kuch\s*kaam\s*hai)$/i.test(clean) ||
    /^(?:aur\s*batao|kya\s*chal\s*raha\s*hai|kaise\s*ho)$/i.test(clean)
  ) {
    const replies = [
      'At your service, sir. How can I help you?',
      'Online and listening, boss.',
      'Yes sir, what can I do for you?',
      'Haanji boliye, kya kaam hai?',
      'Always here, sir. How may I assist?',
    ];
    return {
      intent: 'GREETING',
      slots: {},
      confidence: 1.0,
      spokenReply: replies[Math.floor(Math.random() * replies.length)],
      source: 'local',
    };
  }
  return null;
};

// ==========================================
// User Identity, Persistent Memory & Jarvis Self-Knowledge
// ==========================================
const matchIdentityAndMemory: PatternMatcher = (text) => {
  const clean = text.trim().toLowerCase().replace(/[?.!,;]+$/, '');

  // 1. User Name Query: "do you know my name", "what is my name", "who am I", "tell me my name", "mera naam kya hai"
  if (
    /^(?:do\s+you\s+(?:know|remember)\s+)?(?:what(?:'s|\s+is)\s+)?(?:my\s+name|who\s+am\s+i|who\s+i\s+am)$/i.test(clean) ||
    /^(?:do\s+you\s+know\s+who\s+i\s+am|tell\s+me\s+my\s+name)$/i.test(clean) ||
    /^(?:mera\s+naam\s+(?:kya\s+hai|batao|jante\s+ho)|kya\s+tum\s+mera\s+naam\s+jante\s+ho|main\s+kaun\s+hu)$/i.test(clean) ||
    /^(?:mujhe\s+jaante\s+ho|mera\s+naam\s+yaad\s+hai)$/i.test(clean)
  ) {
    return {
      intent: 'RECALL',
      slots: { query: 'name', type: 'user_name' },
      confidence: 0.99,
      spokenReply: 'Checking identity records, sir.',
      source: 'local',
    };
  }

  // 2. User Name Set: "my name is X", "call me X", "mera naam X hai"
  const mName =
    clean.match(/^(?:my\s+name\s+is|call\s+me|i\s+am)\s+([a-zA-Z0-9\s]+)$/i) ||
    clean.match(/^(?:mera\s+naam|mujhe)\s+([a-zA-Z0-9\s]+?)\s+(?:hai|bulao|bolo)$/i);
  if (mName) {
    const rawName = mName[1].trim();
    const name = rawName.split(/\s+/)[0];
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    return {
      intent: 'REMEMBER',
      slots: { key: 'name', value: capitalized },
      confidence: 0.99,
      spokenReply: `Understood, sir. I'll remember that your name is ${capitalized}.`,
      source: 'local',
    };
  }

  // 3. Jarvis Identity: "who are you", "what is your name", "tum kaun ho"
  if (
    /^(?:who\s+are\s+you|what\s+is\s+your\s+name|what(?:'s)?\s+your\s+name|tum\s+kaun\s+ho|tumhara\s+naam\s+kya\s+hai|apna\s+naam\s+batao)$/i.test(clean) ||
    /^(?:introduce\s+yourself|apna\s+intro\s+do|who\s+am\s+i\s+talking\s+to)$/i.test(clean)
  ) {
    return {
      intent: 'CHAT',
      slots: { type: 'identity' },
      confidence: 0.99,
      spokenReply: 'I am JARVIS, your Just A Rather Very Intelligent System. Operating directly on your device, sir.',
      source: 'local',
    };
  }

  // 4. Jarvis Creator: "who made you", "who created you", "tumhe kisne banaya"
  if (
    /^(?:who\s+(?:created|made|built|programmed|developed)\s+you|who\s+is\s+your\s+(?:creator|developer|maker))$/i.test(clean) ||
    /^(?:tumhe\s+kisne\s+banaya|tumhe\s+kisne\s+develop\s+kiya|tumhara\s+creator\s+kaun\s+hai)$/i.test(clean)
  ) {
    return {
      intent: 'CHAT',
      slots: { type: 'creator' },
      confidence: 0.99,
      spokenReply: 'I was engineered by Ritvik as an advanced on-device AI system.',
      source: 'local',
    };
  }

  // 5. Jarvis Brain / Smart query
  if (
    /^(?:do\s+you\s+have\s+a\s+brain|how\s+smart\s+are\s+you|are\s+you\s+intelligent|tum\s+kitne\s+smart\s+ho|kya\s+tumhare\s+paas\s+brain\s+hai)$/i.test(clean) ||
    /^(?:how\s+do\s+you\s+work|tum\s+kaise\s+kaam\s+karte\s+ho)$/i.test(clean)
  ) {
    return {
      intent: 'CHAT',
      slots: { type: 'brain' },
      confidence: 0.99,
      spokenReply: 'I run on an on-device neural brain with sub-second response times, capable of system controls, knowledge retrieval, and persistent memory.',
      source: 'local',
    };
  }

  // 6. Generic "Remember that <fact>"
  const mRem = clean.match(/^(?:remember\s+(?:that\s+)?|yaad\s+rakhna\s+(?:ki\s+)?)(.+)$/i);
  if (mRem) {
    const fact = mRem[1].trim();
    return {
      intent: 'REMEMBER',
      slots: { key: fact.slice(0, 20), value: fact },
      confidence: 0.95,
      spokenReply: `Noted in permanent memory: ${fact}.`,
      source: 'local',
    };
  }

  // 7. Generic "Recall <topic>"
  const mRec = clean.match(/^(?:what\s+did\s+i\s+say\s+about|what\s+do\s+you\s+remember\s+about|recall)\s+(.+)$/i);
  if (mRec) {
    const topic = mRec[1].trim();
    return {
      intent: 'RECALL',
      slots: { query: topic },
      confidence: 0.95,
      spokenReply: `Checking memory for ${topic}, sir.`,
      source: 'local',
    };
  }

  return null;
};

// ==========================================
// Extensibility: User-Defined Routines & Phrase Aliases
// ==========================================
const matchRoutinesAndAliases: PatternMatcher = (text) => {
  const clean = text.trim();

  // 1. Create Routine: "Remember this as 'leaving home': wifi off, bluetooth on, play my usual"
  const mRoutine = clean.match(/^(?:remember\s+(?:this\s+)?as|create\s+routine|new\s+routine)\s+['"]?(.+?)['"]?:\s+(.+)$/i);
  if (mRoutine) {
    const routineName = mRoutine[1].trim().toLowerCase();
    const actionsRaw = mRoutine[2].trim();
    const actions = actionsRaw
      .split(/(?:,\s*|\s+(?:and|then|aur|phir)\s+)/i)
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    if (routineName && actions.length > 0) {
      return {
        intent: 'CREATE_ROUTINE',
        slots: { routineName, actions },
        confidence: 0.99,
        spokenReply: `Created routine "${routineName}" with ${actions.length} actions, sir.`,
        source: 'local',
      };
    }
  }

  // 2. Create Phrase Alias: "When I say 'go dark' trigger night protocol" / "Alias 'sleep time' to 'night protocol'"
  const mAlias =
    clean.match(/^(?:when\s+i\s+say|whenever\s+i\s+say)\s+['"]?(.+?)['"]?\s+(?:(?:then\s+)?(?:do|trigger|execute|run|karo)|means)\s+['"]?(.+?)['"]?$/i) ||
    clean.match(/^alias\s+['"]?(.+?)['"]?\s+(?:to|means|as)\s+['"]?(.+?)['"]?$/i);

  if (mAlias) {
    const phrase = mAlias[1].trim().toLowerCase();
    const targetPhrase = mAlias[2].trim();
    if (phrase && targetPhrase) {
      return {
        intent: 'CREATE_ALIAS',
        slots: { phrase, targetPhrase },
        confidence: 0.99,
        spokenReply: `Understood, sir. When you say "${phrase}", I will execute "${targetPhrase}".`,
        source: 'local',
      };
    }
  }

  return null;
};

// ==========================================
// Safety & Trust: SOS / Emergency Command
// ==========================================
const matchEmergency: PatternMatcher = (text) => {
  const clean = text.trim().toLowerCase().replace(/[?.!,;]+$/, '');
  if (
    /^(?:jarvis\s+)?(?:emergency|sos|help\s+me|madad\s+karo|emergency\s+protocol|bachao|bachao\s+mujhe)$/i.test(clean) ||
    /^(?:send\s+help|i\s+need\s+help\s+now)$/i.test(clean)
  ) {
    return {
      intent: 'EMERGENCY',
      slots: {},
      confidence: 1.0,
      spokenReply: 'Emergency protocol activated. Transmitting distress beacon and location, sir.',
      source: 'local',
    };
  }
  return null;
};

// ==========================================
// Level 6: General App UI Automation Matcher
// ==========================================

const matchAutomation: PatternMatcher = (text) => {
  // 1. Stop automation / scrolling
  if (
    /^(?:jarvis\s+)?(?:stop\s+automation|stop\s+scrolling|scroll\s+band\s*karo|stop\s+scroll|stop|rok\s*do|ruko|band\s*karo|stop\s+it|ruko\s+bhai|ruk\s*jao|pause\s+scroll)$/i.test(
      text
    )
  ) {
    return {
      intent: 'STOP_AUTOMATION',
      slots: {},
      confidence: 0.99,
      spokenReply: 'Automation stopped, sir.',
      source: 'local',
    };
  }

  // 2. Open App and auto-scroll (e.g., "open instagram and scroll reels every 15 seconds")
  const openAndScrollMatch = text.match(
    /^(?:open|launch)\s+([a-zA-Z0-9\s]+?)\s+(?:and|fir|aur|then)\s+(?:start\s+)?auto\s*scroll(?:\s+(?:reels|shorts|feed|tiktok))?(?:\s+(?:every|har)\s+(\d+)\s*(?:seconds|second|sec|s)?)?$/i
  );
  if (openAndScrollMatch) {
    const app = openAndScrollMatch[1].trim();
    const interval = openAndScrollMatch[2] ? parseInt(openAndScrollMatch[2], 10) : 10;
    return {
      intent: 'APP_AUTOMATION',
      slots: {
        appName: app,
        action: 'scroll',
        direction: 'up',
        intervalSeconds: interval,
      },
      confidence: 0.98,
      spokenReply: `Opening ${app} and auto-scrolling every ${interval} seconds, sir. Say 'stop' anytime.`,
      source: 'local',
    };
  }

  // 3. Auto-scroll current screen / app
  const scrollMatch =
    text.match(
      /^(?:start\s+)?auto\s*scroll(?:\s+(?:reels|shorts|feed|tiktok))?(?:\s+(?:every|har)\s+(\d+)\s*(?:seconds|second|sec|s)?)?$/i
    ) ||
    text.match(/^(?:scroll|swiping)\s+(?:shuru\s*karo|chalu\s*karo)(?:\s+(\d+)\s*(?:second|sec)\s*me)?$/i);

  if (scrollMatch) {
    const interval = scrollMatch[1] ? parseInt(scrollMatch[1], 10) : 10;
    return {
      intent: 'START_AUTO_SCROLL',
      slots: {
        direction: 'up',
        intervalSeconds: interval,
      },
      confidence: 0.96,
      spokenReply: `Auto-scrolling every ${interval} seconds, sir. Say 'stop' to halt.`,
      source: 'local',
    };
  }

  // 4. Tap element
  const tapMatch = text.match(/^(?:tap|click|press|select)\s+(?:on\s+)?(.+)$/i);
  if (tapMatch) {
    const target = tapMatch[1].trim();
    return {
      intent: 'TAP_ELEMENT',
      slots: { query: target },
      confidence: 0.92,
      spokenReply: `Tapping ${target}, sir.`,
      source: 'local',
    };
  }

  // 5. Type text
  const typeMatch = text.match(/^(?:type|enter|input|write)\s+(.+?)(?:\s+(?:in|into|on)\s+(.+))?$/i);
  if (typeMatch) {
    const textToType = typeMatch[1].trim();
    const field = (typeMatch[2] || '').trim();
    return {
      intent: 'TYPE_TEXT',
      slots: { text: textToType, query: field },
      confidence: 0.92,
      spokenReply: field ? `Typing "${textToType}" into ${field}, sir.` : `Typing "${textToType}", sir.`,
      source: 'local',
    };
  }

  return null;
};

// Ordered list of matcher functions (first match wins)
const MATCHERS: PatternMatcher[] = [
  matchEmergency,
  matchGreetings,
  matchRoutinesAndAliases,
  matchAutomation,
  matchStarkEasterEggs,
  matchStarkProtocols,
  matchMorningBriefing,
  matchStatusReport,
  matchWhatsAppMessage,
  matchCallContact,
  matchMemory,
  matchTools,
  matchPause,
  matchResume,
  matchNext,
  matchPrevious,
  matchVolumeSet,
  matchVolumeUp,
  matchVolumeDown,
  matchSeek,
  matchLike,
  matchUnlike,
  matchShuffle,
  matchRepeat,
  matchSleepTimer,
  matchTrackInfo,
  matchMoodMusic,
  matchPersonalizedUsual,
  matchDiscovery,
  matchQueue,
  matchLeaveRoom,
  matchOpenScreen,
  matchPlaySongOrArtist,
  matchIdentityAndMemory,
  matchQuestionsOrChat,
];



/**
 * Evaluates a normalized transcript against local regex and pattern rules.
 * Runs in under 5 ms with zero network calls.
 */
export function parseLocalIntent(
  rawTranscript: string,
  context?: BrainContext
): IntentResult {
  // 1. Direct check: Greetings ("Hey", "Hey Jarvis", "Hello Jarvis", etc.)
  const greetingCheck = matchGreetings(rawTranscript, context);
  if (greetingCheck) {
    return greetingCheck;
  }

  const text = normalizeTranscript(rawTranscript);

  if (!text) {
    if (/^(?:hey|hay|he|hello|hlo|hi|yo|jarvis|suno|sun)/i.test(rawTranscript.trim())) {
      return {
        intent: 'GREETING',
        slots: {},
        confidence: 1.0,
        spokenReply: 'At your service, sir. What can I do for you?',
        source: 'local',
      };
    }
    return {
      intent: 'UNKNOWN',
      slots: {},
      confidence: 0,
      spokenReply: "I didn't hear anything.",
      source: 'local',
    };
  }

  for (const matcher of MATCHERS) {
    const result = matcher(text, context);
    if (result) {
      return result;
    }
  }

  // If no local rule matches with confidence
  return {
    intent: 'UNKNOWN',
    slots: { raw: text },
    confidence: 0.1,
    spokenReply: "I'm not sure what you want me to do.",
    source: 'local',
  };
}
