import type {
  TruthOrDareItem,
  WouldYouRatherItem,
  NeverHaveIEverItem,
  MostLikelyToItem,
  TruthOrDareDeck,
} from '../types';

export const DECKS: Array<{ id: TruthOrDareDeck; name: string; icon: string; color: string }> = [
  { id: 'casual', name: 'Casual & Fun', icon: 'ice-cream-outline', color: '#00F2FE' },
  { id: 'spicy', name: 'Spicy & Bold', icon: 'flame-outline', color: '#FF007F' },
  { id: 'late_night', name: 'Late Night Deep', icon: 'moon-outline', color: '#A855F7' },
  { id: 'chaotic', name: 'Wild & Chaotic', icon: 'flash-outline', color: '#F59E0B' },
];

export const TRUTH_OR_DARE_ITEMS: TruthOrDareItem[] = [
  // Casual Truths
  { id: 'ct1', type: 'truth', deck: 'casual', text: 'What is the most embarrassing song currently in your music library?' },
  { id: 'ct2', type: 'truth', deck: 'casual', text: 'What is the weirdest habit you have when you are alone?' },
  { id: 'ct3', type: 'truth', deck: 'casual', text: 'If you had to swap lives with one friend in this squad for 24h, who would it be and why?' },
  { id: 'ct4', type: 'truth', deck: 'casual', text: 'What is the dumbest lie you ever told that everyone actually believed?' },
  { id: 'ct5', type: 'truth', deck: 'casual', text: 'Who was your very first celebrity crush?' },
  { id: 'ct6', type: 'truth', deck: 'casual', text: 'What is something you pretend to like just to fit in or look cool?' },
  { id: 'ct7', type: 'truth', deck: 'casual', text: 'What is your biggest irrational fear?' },
  { id: 'ct8', type: 'truth', deck: 'casual', text: 'What is the most useless talent you possess?' },

  // Casual Dares
  { id: 'cd1', type: 'dare', deck: 'casual', text: 'Sing the chorus of your favorite song in an operatic dramatic voice!' },
  { id: 'cd2', type: 'dare', deck: 'casual', text: 'Send a voice note to your group chat speaking in a British or alien accent for 15 seconds.' },
  { id: 'cd3', type: 'dare', deck: 'casual', text: 'Do your best impression of another friend in the room until someone guesses who it is.' },
  { id: 'cd4', type: 'dare', deck: 'casual', text: 'Let the squad pick any funny song and you have to dance like a robot for 20 seconds.' },
  { id: 'cd5', type: 'dare', deck: 'casual', text: 'Talk without closing your mouth for the next two rounds.' },
  { id: 'cd6', type: 'dare', deck: 'casual', text: 'Do 15 quick jumping jacks while beatboxing.' },

  // Spicy Truths
  { id: 'st1', type: 'truth', deck: 'spicy', text: 'Have you ever had feelings for someone that you knew was completely off-limits?' },
  { id: 'st2', type: 'truth', deck: 'spicy', text: 'What is the most awkward text message you have ever sent to the wrong person?' },
  { id: 'st3', type: 'truth', deck: 'spicy', text: 'Have you ever ghosted someone because you were simply too lazy or scared to respond?' },
  { id: 'st4', type: 'truth', deck: 'spicy', text: 'What is the biggest red flag you knowingly ignored in someone because you liked them?' },
  { id: 'st5', type: 'truth', deck: 'spicy', text: 'Have you ever stalked an ex or crush using a burner/fake social media account?' },
  { id: 'st6', type: 'truth', deck: 'spicy', text: 'Who in this room/squad would you call first if you were arrested at 2 AM?' },
  { id: 'st7', type: 'truth', deck: 'spicy', text: 'What is a secret about your dating life that your parents would be shocked to discover?' },

  // Spicy Dares
  { id: 'sd1', type: 'dare', deck: 'spicy', text: 'Show the squad the last 3 photos in your phone camera roll with zero context!' },
  { id: 'sd2', type: 'dare', deck: 'spicy', text: 'Send a text to your crush or ex saying: "I had a dream about you last night" and show proof.' },
  { id: 'sd3', type: 'dare', deck: 'spicy', text: 'Let a friend in the squad send any emoji to your 3rd most recent Instagram DM.' },
  { id: 'sd4', type: 'dare', deck: 'spicy', text: 'Read aloud the most recent embarrassing note or draft in your Notes app.' },
  { id: 'sd5', type: 'dare', deck: 'spicy', text: 'Call your best friend and tell them you are moving to Antarctica tomorrow.' },

  // Late Night Deep Truths
  { id: 'lt1', type: 'truth', deck: 'late_night', text: 'What is something you wish you could forgive yourself for?' },
  { id: 'lt2', type: 'truth', deck: 'late_night', text: 'What is a piece of advice you often give others, but struggle to follow yourself?' },
  { id: 'lt3', type: 'truth', deck: 'late_night', text: 'What memory from the last 3 years makes you feel the most nostalgic?' },
  { id: 'lt4', type: 'truth', deck: 'late_night', text: 'Do you believe you have met your soulmate or right person yet?' },
  { id: 'lt5', type: 'truth', deck: 'late_night', text: 'What is a personal insecurity that you rarely ever talk about?' },
  { id: 'lt6', type: 'truth', deck: 'late_night', text: 'What song holds the most emotional meaning to you and why?' },

  // Late Night Dares
  { id: 'ld1', type: 'dare', deck: 'late_night', text: 'Text someone you haven\'t spoken to in months and tell them you appreciate them.' },
  { id: 'ld2', type: 'dare', deck: 'late_night', text: 'Share your all-time favorite midnight comfort song and play it for the squad.' },
  { id: 'ld3', type: 'dare', deck: 'late_night', text: 'Give a genuine 30-second compliment to every single person in the room.' },

  // Wild & Chaotic Truths
  { id: 'wt1', type: 'truth', deck: 'chaotic', text: 'What is the most ridiculous conspiracy theory that you secretly think might be true?' },
  { id: 'wt2', type: 'truth', deck: 'chaotic', text: 'If you had to commit a crime with one person in this squad, what crime and who?' },
  { id: 'wt3', type: 'truth', deck: 'chaotic', text: 'What is the grossest food combination you actually enjoy eating?' },
  { id: 'wt4', type: 'truth', deck: 'chaotic', text: 'What is the pettiest reason you ever refused to talk to someone?' },

  // Wild & Chaotic Dares
  { id: 'wd1', type: 'dare', deck: 'chaotic', text: 'Speak like a dramatic movie trailer narrator for the next 2 minutes.' },
  { id: 'wd2', type: 'dare', deck: 'chaotic', text: 'Put on sunglasses and act like a bodyguard protecting one person in the room for 1 minute.' },
  { id: 'wd3', type: 'dare', deck: 'chaotic', text: 'Eat a spoonful of hot sauce or ketchup right now without drinking water!' },
  { id: 'wd4', type: 'dare', deck: 'chaotic', text: 'Take a silly selfie and make it your profile picture for the rest of today.' },
];

export const WOULD_YOU_RATHER_ITEMS: WouldYouRatherItem[] = [
  {
    id: 'wyr1',
    optionA: 'Never listen to music again',
    optionB: 'Never watch movies/series again',
    percentA: 18,
    percentB: 82,
  },
  {
    id: 'wyr2',
    optionA: 'Know the exact date of your death',
    optionB: 'Know the exact cause of your death',
    percentA: 34,
    percentB: 66,
  },
  {
    id: 'wyr3',
    optionA: 'Be able to read everyone\'s minds',
    optionB: 'Be able to teleport anywhere instantly',
    percentA: 41,
    percentB: 59,
  },
  {
    id: 'wyr4',
    optionA: 'Have all your texts leaked publicly',
    optionB: 'Have all your search history leaked publicly',
    percentA: 45,
    percentB: 55,
  },
  {
    id: 'wyr5',
    optionA: 'Live 100 years in the past with current knowledge',
    optionB: 'Live 100 years in the future with zero preparation',
    percentA: 38,
    percentB: 62,
  },
  {
    id: 'wyr6',
    optionA: 'Always speak your exact unfiltered thoughts aloud',
    optionB: 'Never be able to speak again, only communicate in emojis',
    percentA: 28,
    percentB: 72,
  },
  {
    id: 'wyr7',
    optionA: 'Have free Spotify/Apple Music for life',
    optionB: 'Have free unlimited flight tickets for life',
    percentA: 22,
    percentB: 78,
  },
  {
    id: 'wyr8',
    optionA: 'Fight 1 horse-sized duck',
    optionB: 'Fight 100 duck-sized horses',
    percentA: 31,
    percentB: 69,
  },
  {
    id: 'wyr9',
    optionA: 'Be a famous music rockstar with zero privacy',
    optionB: 'Be an anonymous billionaire living quietly in the mountains',
    percentA: 24,
    percentB: 76,
  },
  {
    id: 'wyr10',
    optionA: 'Only be able to listen to 1 single song for the rest of your life',
    optionB: 'Hear your least favorite song on loop for 2 hours every single morning',
    percentA: 39,
    percentB: 61,
  },
];

export const NEVER_HAVE_I_EVER_ITEMS: NeverHaveIEverItem[] = [
  { id: 'nhie1', statement: 'Never have I ever pretended to be on a phone call just to avoid talking to someone.' },
  { id: 'nhie2', statement: 'Never have I ever stalked someone on Instagram and accidentally liked a photo from 3 years ago.' },
  { id: 'nhie3', statement: 'Never have I ever lied about having seen a classic movie or heard an album just to fit in.' },
  { id: 'nhie4', statement: 'Never have I ever fallen asleep during a movie at the cinema.' },
  { id: 'nhie5', statement: 'Never have I ever sent a risky text message and immediately turned off my phone.' },
  { id: 'nhie6', statement: 'Never have I ever blamed a bad haircut or outfit on a bet or dare.' },
  { id: 'nhie7', statement: 'Never have I ever cried while listening to a sad breakup song in the shower.' },
  { id: 'nhie8', statement: 'Never have I ever re-gifted a present that someone gave to me.' },
  { id: 'nhie9', statement: 'Never have I ever ghosted someone and then run into them in person.' },
  { id: 'nhie10', statement: 'Never have I ever stayed up until 6:00 AM binge-watching TikTok or Reels.' },
  { id: 'nhie11', statement: 'Never have I ever googled my own name to see what comes up.' },
  { id: 'nhie12', statement: 'Never have I ever sung a song passionately with 100% wrong lyrics.' },
];

export const MOST_LIKELY_TO_ITEMS: MostLikelyToItem[] = [
  { id: 'mlt1', prompt: 'Most likely to become a viral meme on the internet' },
  { id: 'mlt2', prompt: 'Most likely to text their ex at 3:00 AM on a Saturday' },
  { id: 'mlt3', prompt: 'Most likely to accidentally join a cult while traveling' },
  { id: 'mlt4', prompt: 'Most likely to become a billionaire before turning 30' },
  { id: 'mlt5', prompt: 'Most likely to survive a zombie apocalypse' },
  { id: 'mlt6', prompt: 'Most likely to spend all their money on concert tickets and food' },
  { id: 'mlt7', prompt: 'Most likely to forget their own birthday or anniversary' },
  { id: 'mlt8', prompt: 'Most likely to start laughing uncontrollably at a serious moment' },
  { id: 'mlt9', prompt: 'Most likely to get arrested for something hilariously dumb' },
  { id: 'mlt10', prompt: 'Most likely to accidentally lose their phone in their own bed' },
  { id: 'mlt11', prompt: 'Most likely to win a Grammy or release a hit album' },
  { id: 'mlt12', prompt: 'Most likely to sleep through 10 morning alarms' },
];
