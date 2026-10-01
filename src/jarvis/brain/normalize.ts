/**
 * src/jarvis/brain/normalize.ts
 *
 * Text normalization pipeline for spoken transcripts.
 * - Lowercases and trims input
 * - Cleans punctuation and whitespace
 * - Strips conversational filler and wake-word artifacts ("please", "can you", "jarvis", "hey", "bhai", etc.)
 * - Corrects common Automatic Speech Recognition (ASR) phonetic slips for music terminology
 * - Normalizes spoken English and Hinglish numbers into standard digits
 */

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,

  // Hinglish number words (excluding 'do' which is primarily the Hindi verb 'give/do')
  ek: 1,
  teen: 3,
  chaar: 4,
  paanch: 5,
  chhe: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  gyaarah: 11,
  baarah: 12,
  pandrah: 15,
  bees: 20,
  pachees: 25,
  tees: 30,
  paitis: 35,
  chaalis: 40,
  pachaas: 50,
  saath: 60,
  sau: 100,
};

// Common ASR phonetics / typos in speech-to-text
const ASR_CORRECTIONS: [RegExp, string][] = [
  [/\b(paly|ply|pla)\b/g, 'play'],
  [/\b(pose|paws|paus)\b/g, 'pause'],
  [/\b(nect|nex)\b/g, 'next'],
  [/\b(pervious|prevous|previus)\b/g, 'previous'],
  [/\b(walume|valume|volum)\b/g, 'volume'],
  [/\b(aawaz|awaaz|avaz|awaz)\b/g, 'awaaz'],
  [/\b(shuffel|shufle)\b/g, 'shuffle'],
  [/\b(favorit|favourite|fav)\b/g, 'favorite'],
  [/\b(kesaria)\b/g, 'kesariya'],
  [/\b(arijeet|arjit)\b/g, 'arijit'],
  [/\b(cue|que)\b/g, 'queue'],
];

// Conversational filler phrases to strip from beginnings/ends of commands
const FILLERS = [
  /^(hey|hello|hi|yo)\s+jarvis\b/i,
  /^(jarvis|hey|hello|hi)\b/i,
  /\bjarvis\b/i,
  /^(please|can you|could you|would you|will you|kindly|just)\b/i,
  /^(kripya|zara|bhai|yaar|are)\b/i,
  /\b(please|kripya|bhai|yaar|na)$/i,
];

/**
 * Converts spelled-out numbers like "thirty", "twenty five", "aadha ghanta" into digits.
 */
function normalizeNumbers(text: string): string {
  let str = text;

  // Idiomatic time conversions
  str = str.replace(/\b(aadha|aadh|aadhe)\s+(?:ghanta|ghante|ghanto)\b/gi, '30 minutes');
  str = str.replace(/\b(ek)\s+(?:ghanta|ghante)\b/gi, '60 minutes');
  str = str.replace(/\b(dedh)\s+(?:ghanta|ghante)\b/gi, '90 minutes');
  str = str.replace(/\b(do)\s+(?:ghanta|ghante)\b/gi, '120 minutes');
  str = str.replace(/\b(half)\s+an?\s+hour\b/gi, '30 minutes');
  str = str.replace(/\b(one)\s+hour\b/gi, '60 minutes');

  // Idiomatic volume conversions
  str = str.replace(/\b(aadhi|aadha|half)\s+(volume|awaaz)\b/gi, 'volume 50 percent');
  str = str.replace(/\b(full|max|poori)\s+(volume|awaaz)\b/gi, 'volume 100 percent');
  str = str.replace(/\b(zero|shunya|mute)\s+(volume|awaaz)\b/gi, 'volume 0 percent');

  // Contextual 'do' conversion (only when followed by quantity/time units, not verb 'hata do' / 'rok do')
  str = str.replace(/\bdo\s+(minute|minutes|min|ghanta|ghante|second|seconds|percent|sau|hazaar)\b/gi, '2 $1');

  // Compound English numbers: "twenty five" -> 25, "sixty seconds" -> 60
  const words = str.split(/\s+/);
  const result: string[] = [];
  let i = 0;

  while (i < words.length) {
    const current = words[i].toLowerCase();
    const next = words[i + 1]?.toLowerCase();

    // Check two-word compound numbers: e.g. "twenty five"
    if (NUMBER_WORDS[current] !== undefined && next && NUMBER_WORDS[next] !== undefined) {
      const val1 = NUMBER_WORDS[current];
      const val2 = NUMBER_WORDS[next];
      if (val1 >= 20 && val1 <= 90 && val2 >= 1 && val2 <= 9) {
        result.push((val1 + val2).toString());
        i += 2;
        continue;
      }
    }

    // Single-word numbers
    if (NUMBER_WORDS[current] !== undefined) {
      result.push(NUMBER_WORDS[current].toString());
      i++;
      continue;
    }

    result.push(words[i]);
    i++;
  }

  return result.join(' ');
}

/**
 * Main normalization function.
 */
export function normalizeTranscript(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let text = raw.toLowerCase().trim();

  // Strip punctuation except quotes and hyphens
  text = text.replace(/[.,/#!$%^&*;:{}=_`~?()]/g, ' ');

  // Collapse multiple spaces
  text = text.replace(/\s+/g, ' ').trim();

  // Strip common conversational filler prefixes/suffixes
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of FILLERS) {
      if (pattern.test(text)) {
        text = text.replace(pattern, '').trim();
        changed = true;
      }
    }
  }

  // Apply ASR phonetic slip corrections
  for (const [pattern, replacement] of ASR_CORRECTIONS) {
    text = text.replace(pattern, replacement);
  }

  // Convert spoken number words to digits
  text = normalizeNumbers(text);

  return text.trim();
}
