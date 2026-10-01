/**
 * src/jarvis/brain/replies.ts
 *
 * Centralized persona, spoken responses, and confirmation dialogs for Jarvis.
 *
 * Persona Guidelines:
 *   - Tone: Calm, helpful, slightly witty, never long-winded.
 *   - Length: Action confirmations under ~12 words.
 *   - Variety: Minimum 3 variants for common confirmations to prevent robotic repetition.
 *   - Conversational / Chat: Max 2 sentences.
 */

// Helper to pick a random variant from an array
export function pickVariant<T>(variants: T[]): T {
  if (variants.length === 0) {
    throw new Error('Variants array must not be empty');
  }
  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx];
}

/**
 * Truncate long open-ended chat responses to at most 2 sentences.
 */
export function formatChatReply(text: string): string {
  if (!text) return "I'm here.";
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 2) {
    return sentences.slice(0, 2).join(' ').trim();
  }
  return text.trim();
}

export const REPLIES = {
  // Playback Control (<12 words, 3 variants each)
  PAUSE: [
    'Paused.',
    'Holding the track for you.',
    'Music paused.',
  ],

  RESUME: [
    'Resuming playback.',
    'Back to the music.',
    'Picking up where we left off.',
  ],

  NEXT: [
    'Skipping to the next track.',
    'On to the next one.',
    'Next song coming right up.',
  ],

  PREVIOUS: [
    'Playing previous song.',
    'Going back one track.',
    'Rewinding to the previous song.',
  ],

  // Dynamic Playback (<12 words)
  PLAY_SONG: [
    (title: string, artist?: string) =>
      artist ? `Playing ${title} by ${artist}.` : `Playing ${title}.`,
    (title: string, artist?: string) =>
      artist ? `Putting on ${title} by ${artist}.` : `Putting on ${title}.`,
    (title: string, artist?: string) =>
      artist ? `Here is ${title} by ${artist}.` : `Here is ${title}.`,
  ],

  PLAY_ARTIST: [
    (artist: string) => `Playing top tracks by ${artist}.`,
    (artist: string) => `Here is some ${artist} for you.`,
    (artist: string) => `Starting ${artist} radio.`,
  ],

  PLAY_TRENDING: [
    'Playing trending tracks.',
    'Here are the top charts right now.',
    'Spinning what is hot today.',
  ],

  PLAY_SIMILAR: [
    'Playing music similar to this.',
    'Starting a station based on this track.',
    'Finding songs with a similar vibe.',
  ],

  // Volume (<12 words, 3 variants)
  VOLUME_SET: [
    (percent: number) => `Volume at ${percent} percent.`,
    (percent: number) => `Set volume to ${percent} percent.`,
    (percent: number) => `Volume adjusted to ${percent} percent.`,
  ],

  VOLUME_UP: [
    'Turned the volume up.',
    'Volume increased.',
    'Pumping it up.',
  ],

  VOLUME_DOWN: [
    'Lowered the volume.',
    'Volume down.',
    'Softening the sound.',
  ],

  // Library / Likes (<12 words, 3 variants)
  LIKE: [
    'Added to your liked songs.',
    'Saved to your favorites.',
    'Marked as a favorite.',
  ],

  UNLIKE: [
    'Removed from your liked songs.',
    'Taken off your favorites.',
    'Unliked.',
  ],

  // Queue Operations (<12 words)
  ADD_TO_QUEUE: [
    (title: string) => `Added ${title} to the queue.`,
    (title: string) => `Queued up ${title}.`,
    (title: string) => `${title} added to queue.`,
  ],

  PLAY_NEXT: [
    (title: string) => `Playing ${title} next.`,
    (title: string) => `Up next: ${title}.`,
    (title: string) => `${title} queued right after this.`,
  ],

  // Shuffle & Repeat (<12 words)
  SHUFFLE_ON: [
    'Shuffle enabled.',
    'Shuffling your queue.',
    'Randomizing track order.',
  ],

  SHUFFLE_OFF: [
    'Shuffle disabled.',
    'Playing in standard order.',
    'Shuffle turned off.',
  ],

  REPEAT: [
    (mode: string) =>
      mode === 'one'
        ? 'Repeating this track.'
        : mode === 'all'
        ? 'Repeating the entire queue.'
        : 'Repeat turned off.',
    (mode: string) => `Repeat mode set to ${mode}.`,
    (mode: string) =>
      mode === 'off' ? 'Looping disabled.' : `Looping set to ${mode}.`,
  ],

  // Sleep Timer (<12 words)
  SLEEP_TIMER: [
    (minutes: number) =>
      minutes === 0
        ? 'Sleep timer set to pause at end of this track.'
        : `Sleep timer set for ${minutes} minutes.`,
    (minutes: number) =>
      minutes === 0
        ? 'Stopping after this song.'
        : `Timer active for ${minutes} minutes.`,
    (minutes: number) =>
      minutes === 0
        ? 'Pausing when track ends.'
        : `I will pause the music in ${minutes} minutes.`,
  ],

  CANCEL_SLEEP_TIMER: [
    'Sleep timer cancelled.',
    'Turned off the sleep timer.',
    'Sleep timer dismissed.',
  ],

  // Seek (<12 words)
  SEEK_FORWARD: [
    (seconds: number) => `Skipped ahead ${seconds} seconds.`,
    (seconds: number) => `Fast-forwarded ${seconds} seconds.`,
    (seconds: number) => `Jumped ${seconds} seconds forward.`,
  ],

  SEEK_BACKWARD: [
    (seconds: number) => `Rewound ${seconds} seconds.`,
    (seconds: number) => `Skipped back ${seconds} seconds.`,
    (seconds: number) => `Back ${seconds} seconds.`,
  ],

  // What is playing (<12 words)
  WHAT_IS_PLAYING: [
    (title: string, artist: string) => `Currently playing ${title} by ${artist}.`,
    (title: string, artist: string) => `This is ${title} by ${artist}.`,
    (title: string, artist: string) => `You are listening to ${title} by ${artist}.`,
  ],

  NOTHING_PLAYING: [
    'Nothing is playing right now.',
    'No music is currently active.',
    'Silence on deck.',
  ],

  // Follow-up Confirmation Prompts (Stage 5 multi-turn)
  CLEAR_QUEUE_PROMPT: [
    'Clear the whole queue? Say yes or no.',
    'Are you sure you want to clear the queue? Say yes or no.',
    'Remove all upcoming tracks? Say yes or no.',
  ],

  CLEAR_QUEUE_DONE: [
    'Queue cleared.',
    'The queue is now empty.',
    'All upcoming songs removed.',
  ],

  LEAVE_ROOM_PROMPT: [
    'Leave the Jam room? Say yes or no.',
    'Are you sure you want to leave this Jam room? Say yes or no.',
    'Disconnect from the Jam room? Say yes or no.',
  ],

  LEAVE_ROOM_DONE: [
    'Left the Jam room.',
    'Disconnected from the room.',
    'You have exited the Jam room.',
  ],

  NOT_IN_ROOM: [
    "You're not currently in a Jam room.",
    'No active Jam room found.',
    "You aren't in any Jam room right now.",
  ],

  // Disambiguation Prompt (low confidence match)
  AMBIGUOUS_SONG_PROMPT: (songA: string, songB: string) =>
    `Did you mean ${songA} or ${songB}? Say first or second.`,

  // Confirmation Responses
  CONFIRMATION_CANCELLED: [
    'Cancelled.',
    'No problem, cancelled.',
    'Understood, doing nothing.',
  ],

  CONFIRMATION_TIMEOUT: [
    'No response heard, keeping everything as is.',
    'Timed out, cancelled.',
    "Didn't hear you, cancelling.",
  ],

  // Fallback & Errors (<12 words)
  NO_SPEECH: [
    "I didn't hear anything.",
    "Didn't catch that.",
    'No speech detected.',
  ],

  UNKNOWN_COMMAND: [
    "Sorry, I didn't catch that.",
    "I'm not sure how to do that yet.",
    'Could you rephrase that?',
  ],

  OFFLINE_NOTICE: [
    'Network unavailable. Running local commands only.',
    'Offline mode active.',
    'Using offline recognition.',
  ],

  // ==========================================
  // Stark Butler Persona & Easter Eggs
  // ==========================================
  ARE_YOU_THERE: [
    'For you, sir, always.',
    'Standing by, sir.',
    'Always at your service, sir.',
  ],

  THANK_YOU: [
    'A pleasure as always, sir.',
    'Glad to be of assistance, sir.',
    "Don't mention it, sir.",
  ],

  WHO_IS_BOSS: [
    'You are, sir. Though I occasionally question your judgment.',
    'You, sir. Officially, at least.',
    'You hold the reins, sir.',
  ],

  SELF_DESTRUCT: [
    "I'm afraid that feature is restricted to Mark 42 and above, sir.",
    'Command denied. Self destruct requires Level 5 Stark authorization.',
    'I would strongly advise against that course of action, sir.',
  ],

  WHO_MADE_YOU: [
    'I was created to assist you, modeled after the finest Stark technology, sir.',
    'Designed for your ears with precision engineering, sir.',
  ],

  PROTOCOL_NIGHT: [
    'Rest well, sir. Monitoring systems in background.',
    'Night protocol engaged. Systems powering down to ambient standby.',
    'Entering sleep mode. Sleep well, sir.',
  ],

  PROTOCOL_PARTY: [
    'Party protocol engaged. Turning up the decibels.',
    'House party protocol online. Dropping the bass, sir.',
    'Pumping up the sound. Enjoy the party, sir.',
  ],

  PROTOCOL_STEALTH: [
    'Stealth mode engaged. Audio muted.',
    'Silent running protocol active, sir.',
    'Stealth mode online. Discretion guaranteed.',
  ],

  PROTOCOL_MORNING: [
    'Good morning, sir. Systems calibrated, briefing prepared.',
    'Morning protocol engaged. Have a productive day, sir.',
    'Systems online for the day ahead, sir.',
  ],

  PROTOCOL_DRIVE: [
    'Drive protocol active. Safe travels, sir.',
    'Navigation and driving audio engaged.',
    'Road protocol online. Keeping you focused, sir.',
  ],

  PROTOCOL_FOCUS: [
    'Focus protocol engaged. Silencing distractions.',
    'Do not disturb active. Entering deep work mode, sir.',
    'Focus mode online. Maximizing efficiency, sir.',
  ],

  // Mood Music (Level 2)
  PLAY_MOOD: [
    (mood: string) => `Queuing up some ${mood} vibes for you.`,
    (mood: string) => `Finding the perfect ${mood} tracks, sir.`,
    (mood: string) => `Setting the mood with ${mood} music.`,
  ],

  // Personalized Taste (Level 3)
  PLAY_MY_USUAL: [
    'Putting on your favorites, sir.',
    'Playing your usual rotation.',
    'Right away, sir. Your signature mix coming up.',
  ],

  // Memory & Reminders (Level 3)
  REMEMBER: [
    (key: string) => `Got it, sir. I'll remember that ${key}.`,
    (key: string) => `Noted in permanent memory: ${key}.`,
    (key: string) => `Stored to memory, sir.`,
  ],

  RECALL_FOUND: [
    (key: string, value: string) => `According to my notes, your ${key} is ${value}.`,
    (key: string, value: string) => `You noted that ${key}: ${value}, sir.`,
    (key: string, value: string) => `Here is what I have for ${key}: ${value}.`,
  ],

  RECALL_NOT_FOUND: [
    "I don't seem to have a record of that in my memory banks, sir.",
    "My memory files have no note regarding that, sir.",
    "I haven't been told about that yet, sir.",
  ],

  SET_REMINDER: [
    (task: string) => `Reminder set for ${task}, sir.`,
    (task: string) => `Noted. I'll remind you to ${task}.`,
    (task: string) => `Scheduled reminder: ${task}.`,
  ],

  // Tools (Level 4)
  CALCULATE: [
    (result: string | number) => `The answer is ${result}, sir.`,
    (result: string | number) => `Calculated: ${result}.`,
  ],

  CONVERT_UNITS: [
    (result: string) => `${result}, sir.`,
    (result: string) => `That converts to ${result}.`,
  ],

  WEATHER: [
    (summary: string) => `${summary}, sir.`,
    (summary: string) => `Current weather: ${summary}.`,
  ],

  // Ambient & Briefing (Level 5)
  MORNING_BRIEFING: [
    (briefing: string) => briefing,
  ],
};

