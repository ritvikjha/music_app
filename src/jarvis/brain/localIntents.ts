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
    /^(volume up|louder|turn it up|increase volume|raise volume|boost volume|more volume|up the volume)$/i.test(text) ||
    /^(awaaz badhao|awaaz tez karo|thoda tez karo|volume badha do|awaaz unchi karo|awaaz badha)$/i.test(text);

  if (isUp) {
    return {
      intent: 'VOLUME_UP',
      slots: {},
      confidence: 0.96,
      spokenReply: 'Increasing volume.',
      source: 'local',
    };
  }
  return null;
};

const matchVolumeDown: PatternMatcher = (text) => {
  const isDown =
    /^(volume down|softer|turn it down|decrease volume|lower volume|quieter|less volume|down the volume)$/i.test(text) ||
    /^(awaaz kam karo|awaaz dheere karo|thoda dheere karo|volume ghatao|awaaz kam kardo|awaaz dheemi karo)$/i.test(text);

  if (isDown) {
    return {
      intent: 'VOLUME_DOWN',
      slots: {},
      confidence: 0.96,
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
  const isQuestion =
    /^(who|what|why|when|where|how|tell me|explain|can you tell)\b/i.test(text) ||
    /^(kaun|kya|kyun|kab|kahan|kaise|batao)\b/i.test(text) ||
    /^(hello|hi|good morning|good evening|how are you|who are you|what can you do)\b/i.test(text);

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

const matchWhatsAppMessage: PatternMatcher = (text) => {
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
      slots: { contact, message },
      confidence: 0.98,
      spokenReply: `Sending WhatsApp message to ${contact}...`,
      source: 'local',
    };
  }

  // Hinglish:
  // "papa ko whatsapp karo main aa raha hu"
  // "rahul ko message bhejo kahan ho"
  const m2 = text.match(/^([a-zA-Z0-9\s+]+?)\s+(?:ko\s+)?(?:whatsapp|message)\s*(?:karo|bhejo|par\s*message\s*karo)\s*(.+)$/i);
  if (m2) {
    const contact = m2[1].trim();
    const message = m2[2].trim();
    return {
      intent: 'WHATSAPP_MESSAGE',
      slots: { contact, message },
      confidence: 0.98,
      spokenReply: `${contact} ko WhatsApp bhej raha hu...`,
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

// Ordered list of matcher functions (first match wins)
const MATCHERS: PatternMatcher[] = [
  matchStarkEasterEggs,
  matchStarkProtocols,
  matchStatusReport,
  matchWhatsAppMessage,
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
  matchDiscovery,
  matchQueue,
  matchLeaveRoom,
  matchOpenScreen,
  matchPlaySongOrArtist,
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
  const text = normalizeTranscript(rawTranscript);

  if (!text) {
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
