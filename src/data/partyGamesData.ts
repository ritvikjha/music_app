import type {
  TruthOrDareItem,
  WouldYouRatherItem,
  NeverHaveIEverItem,
  MostLikelyToItem,
  TruthOrDareDeck,
} from '../types';

export const DECKS: Array<{
  id: TruthOrDareDeck;
  name: string;
  icon: string;
  color: string;
  description: string;
}> = [
  {
    id: 'easy',
    name: 'Easy',
    icon: 'happy-outline',
    color: '#10B981',
    description: 'Light, safe & fun for anyone',
  },
  {
    id: 'normal',
    name: 'Normal',
    icon: 'sparkles-outline',
    color: '#6366F1',
    description: 'Social, fun & embarrassing',
  },
  {
    id: 'cheesy',
    name: 'Cheesy',
    icon: 'flame-outline',
    color: '#FF007F',
    description: 'Flirty, cringe & bold dares',
  },
];

export const TRUTH_OR_DARE_ITEMS: TruthOrDareItem[] = [
  // ════════════════════════════════════════════════════════════════════════════
  // EASY TIER — TRUTHS (45 ITEMS)
  // Light, safe-for-anyone, no romantic/personal topics
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'et1', type: 'truth', deck: 'easy', text: 'What song do you blast when you are home completely alone?' },
  { id: 'et2', type: 'truth', deck: 'easy', text: 'If you could only eat one cuisine for the rest of your life, what is it?' },
  { id: 'et3', type: 'truth', deck: 'easy', text: 'What is the most useless superpower you would secretly love to have?' },
  { id: 'et4', type: 'truth', deck: 'easy', text: 'Which cartoon character did you think was the coolest growing up?' },
  { id: 'et5', type: 'truth', deck: 'easy', text: 'If you had a warning label attached to you, what would it say?' },
  { id: 'et6', type: 'truth', deck: 'easy', text: 'What is your absolute favorite comfort movie of all time?' },
  { id: 'et7', type: 'truth', deck: 'easy', text: 'What is the strangest food combination you secretly enjoy?' },
  { id: 'et8', type: 'truth', deck: 'easy', text: 'If you could wake up tomorrow fluent in any language, which would you pick?' },
  { id: 'et9', type: 'truth', deck: 'easy', text: 'What is the worst haircut or hairstyle you ever had in school?' },
  { id: 'et10', type: 'truth', deck: 'easy', text: 'What is a fashion trend you secretly participated in that you now regret?' },
  { id: 'et11', type: 'truth', deck: 'easy', text: 'If you were an animal, which animal best matches your daily energy?' },
  { id: 'et12', type: 'truth', deck: 'easy', text: 'What is your all-time favorite midnight snack?' },
  { id: 'et13', type: 'truth', deck: 'easy', text: 'Have you ever laughed so hard that a drink came out of your nose?' },
  { id: 'et14', type: 'truth', deck: 'easy', text: 'If you were forced to enter a talent show in 10 minutes, what would you perform?' },
  { id: 'et15', type: 'truth', deck: 'easy', text: 'What is the most ridiculous thing you believed as a small child?' },
  { id: 'et16', type: 'truth', deck: 'easy', text: 'What is one video game or mobile game you sank way too many hours into?' },
  { id: 'et17', type: 'truth', deck: 'easy', text: 'If you could instantly master any musical instrument, which one would it be?' },
  { id: 'et18', type: 'truth', deck: 'easy', text: 'What is the weirdest topping you have ever put on a pizza?' },
  { id: 'et19', type: 'truth', deck: 'easy', text: 'If your life had a personal theme song whenever you entered a room, what song is it?' },
  { id: 'et20', type: 'truth', deck: 'easy', text: 'What is something you thought was super fancy when you were a kid?' },
  { id: 'et21', type: 'truth', deck: 'easy', text: 'If you had to change your first name tomorrow, what name would you pick?' },
  { id: 'et22', type: 'truth', deck: 'easy', text: 'What is the funniest Wi-Fi network name you have ever spotted?' },
  { id: 'et23', type: 'truth', deck: 'easy', text: 'What is the longest time you have ever stayed awake, and why?' },
  { id: 'et24', type: 'truth', deck: 'easy', text: 'If you could travel to any fictional world from a book or movie, where are you going?' },
  { id: 'et25', type: 'truth', deck: 'easy', text: 'What is a harmless superstition or habit you always follow?' },
  { id: 'et26', type: 'truth', deck: 'easy', text: 'What is the most unusual exotic pet you would ever consider having?' },
  { id: 'et27', type: 'truth', deck: 'easy', text: 'What is the best harmless prank you ever witnessed or pulled on someone?' },
  { id: 'et28', type: 'truth', deck: 'easy', text: 'If you could only listen to one music artist for a whole month, who is it?' },
  { id: 'et29', type: 'truth', deck: 'easy', text: 'What is the most random trivia fact that lives rent-free in your head?' },
  { id: 'et30', type: 'truth', deck: 'easy', text: 'What is something popular that everyone seems to love, but you just can not stand?' },
  { id: 'et31', type: 'truth', deck: 'easy', text: 'What is the highest score or proudest achievement you got in a video game?' },
  { id: 'et32', type: 'truth', deck: 'easy', text: 'If you were a dessert, what dessert would best represent your personality?' },
  { id: 'et33', type: 'truth', deck: 'easy', text: 'What is the weirdest sound or voice impression you can do?' },
  { id: 'et34', type: 'truth', deck: 'easy', text: 'What is your go-to karaoke track if someone hands you a microphone?' },
  { id: 'et35', type: 'truth', deck: 'easy', text: 'What is the worst advice a friend has ever given you that you actually followed?' },
  { id: 'et36', type: 'truth', deck: 'easy', text: 'Have you ever fallen asleep in an unusual public place? Where?' },
  { id: 'et37', type: 'truth', deck: 'easy', text: 'If you had a robot assistant, what is the #1 chore you would make it do?' },
  { id: 'et38', type: 'truth', deck: 'easy', text: 'What is the silliest argument you have ever had over something totally meaningless?' },
  { id: 'et39', type: 'truth', deck: 'easy', text: 'What is one item you own that you refuse to throw away even though you never use it?' },
  { id: 'et40', type: 'truth', deck: 'easy', text: 'What is your absolute dream vacation destination that you have not visited yet?' },
  { id: 'et41', type: 'truth', deck: 'easy', text: 'What is the most chaotic thing that has happened to you on a road trip?' },
  { id: 'et42', type: 'truth', deck: 'easy', text: 'What is your favorite cheesy dad joke or pun?' },
  { id: 'et43', type: 'truth', deck: 'easy', text: 'If you had to dress in one color head-to-toe every day for a year, what color?' },
  { id: 'et44', type: 'truth', deck: 'easy', text: 'What was your favorite childhood toy or prized possession?' },
  { id: 'et45', type: 'truth', deck: 'easy', text: 'What is the luckiest thing that has ever happened to you by pure accident?' },

  // ════════════════════════════════════════════════════════════════════════════
  // EASY TIER — DARES (45 ITEMS)
  // Light, safe, active physical or vocal dares
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'ed1', type: 'dare', deck: 'easy', text: 'Sing the chorus of your favorite pop song in an operatic dramatic voice!' },
  { id: 'ed2', type: 'dare', deck: 'easy', text: 'Talk in an exaggerated British or robot accent for the next two rounds.' },
  { id: 'ed3', type: 'dare', deck: 'easy', text: 'Do your best impression of a cat trying to catch a laser pointer for 15 seconds.' },
  { id: 'ed4', type: 'dare', deck: 'easy', text: 'Beatbox a beat while another player tries to rap or sing over it for 20 seconds.' },
  { id: 'ed5', type: 'dare', deck: 'easy', text: 'Do 10 dramatic slow-motion jumping jacks like you are in an action movie.' },
  { id: 'ed6', type: 'dare', deck: 'easy', text: 'Balance a spoon, pencil, or harmless object on your nose for 15 seconds.' },
  { id: 'ed7', type: 'dare', deck: 'easy', text: 'Invent a secret squad handshake right now with the person to your left.' },
  { id: 'ed8', type: 'dare', deck: 'easy', text: 'Moonwalk or do the robot across the room like a 1980s pop star.' },
  { id: 'ed9', type: 'dare', deck: 'easy', text: 'Narrate whatever everyone in the room is doing right now like a nature documentary.' },
  { id: 'ed10', type: 'dare', deck: 'easy', text: 'Pretend your shoe is a mobile phone and have a serious 20-second business call with the CEO of Jam.' },
  { id: 'ed11', type: 'dare', deck: 'easy', text: 'Do an energetic air guitar solo to the current song for 20 seconds.' },
  { id: 'ed12', type: 'dare', deck: 'easy', text: 'Try not to blink for 30 seconds while looking directly at the group.' },
  { id: 'ed13', type: 'dare', deck: 'easy', text: 'Recite the alphabet backwards starting from Z down to P without making a mistake!' },
  { id: 'ed14', type: 'dare', deck: 'easy', text: 'Make three different farm animal noises in rapid succession with maximum effort.' },
  { id: 'ed15', type: 'dare', deck: 'easy', text: 'Speak in whispers only for your next three turns.' },
  { id: 'ed16', type: 'dare', deck: 'easy', text: 'Act out a scene from a superhero movie where you save the world in 15 seconds.' },
  { id: 'ed17', type: 'dare', deck: 'easy', text: 'Do a dramatic victory lap around the room with your hands in the air.' },
  { id: 'ed18', type: 'dare', deck: 'easy', text: 'Freeze in an absurd mannequin pose until someone counts to 20.' },
  { id: 'ed19', type: 'dare', deck: 'easy', text: 'Try to touch your tongue to your nose or lick your elbow for 10 seconds.' },
  { id: 'ed20', type: 'dare', deck: 'easy', text: 'Give a dramatic Oscar acceptance speech thanking your refrigerator, pillow, and playlist.' },
  { id: 'ed21', type: 'dare', deck: 'easy', text: 'Do your best impression of your favorite cartoon or movie villain laughing evil-style.' },
  { id: 'ed22', type: 'dare', deck: 'easy', text: 'Pretend you are an airplane pilot making an emergency turbulence announcement to passengers.' },
  { id: 'ed23', type: 'dare', deck: 'easy', text: 'Put your hands on your hips and give everyone in the room a goofy superhero nickname.' },
  { id: 'ed24', type: 'dare', deck: 'easy', text: 'Dance without moving your feet at all — only shoulders and facial expressions for 20 seconds.' },
  { id: 'ed25', type: 'dare', deck: 'easy', text: 'Say three nice, genuine compliments to the player sitting across from you.' },
  { id: 'ed26', type: 'dare', deck: 'easy', text: 'Say five tongue twisters as fast as you can without laughing!' },
  { id: 'ed27', type: 'dare', deck: 'easy', text: 'Pretend you are drinking the most sour lemon juice on Earth and react accordingly.' },
  { id: 'ed28', type: 'dare', deck: 'easy', text: 'Do a high-knees march in place while humming the Mission Impossible theme.' },
  { id: 'ed29', type: 'dare', deck: 'easy', text: 'Stand up and bow graciously to every corner of the room like a classical concert maestro.' },
  { id: 'ed30', type: 'dare', deck: 'easy', text: 'Hold a harmless yoga tree pose for 20 seconds without wobbling.' },
  { id: 'ed31', type: 'dare', deck: 'easy', text: 'Describe your favorite food using only hand gestures and sound effects until someone guesses it.' },
  { id: 'ed32', type: 'dare', deck: 'easy', text: 'Pretend the floor is hot lava for 30 seconds and you can only stand on designated spots.' },
  { id: 'ed33', type: 'dare', deck: 'easy', text: 'Say "Beep boop!" at the end of every sentence you speak for the next round.' },
  { id: 'ed34', type: 'dare', deck: 'easy', text: 'Tell a joke with a completely straight face — if you smile or laugh, do 5 squats.' },
  { id: 'ed35', type: 'dare', deck: 'easy', text: 'Pretend to be a slow-motion sports replay of someone dropping an ice cream cone.' },
  { id: 'ed36', type: 'dare', deck: 'easy', text: 'Give a high five to every single person in the room with maximum enthusiasm.' },
  { id: 'ed37', type: 'dare', deck: 'easy', text: 'Do the chicken dance for 15 seconds without laughing.' },
  { id: 'ed38', type: 'dare', deck: 'easy', text: 'Walk backwards around your chair three times while humming a nursery rhyme.' },
  { id: 'ed39', type: 'dare', deck: 'easy', text: 'Pretend you are giving a 30-second live weather report during a category 5 hurricane.' },
  { id: 'ed40', type: 'dare', deck: 'easy', text: 'Show off your most impressive flex or stretch with dramatic sound effects.' },
  { id: 'ed41', type: 'dare', deck: 'easy', text: 'Pretend you are in a silent movie and act out getting startled by a ghost.' },
  { id: 'ed42', type: 'dare', deck: 'easy', text: 'Sing "Happy Birthday" in the voice of a grumpy medieval king.' },
  { id: 'ed43', type: 'dare', deck: 'easy', text: 'Pretend your water bottle is a priceless museum artifact and explain its history to the squad.' },
  { id: 'ed44', type: 'dare', deck: 'easy', text: 'Do 15 imaginary jumping ropes with flashy double-unders.' },
  { id: 'ed45', type: 'dare', deck: 'easy', text: 'Make a funny face and hold it completely frozen while the squad takes a mental snapshot!' },

  // ════════════════════════════════════════════════════════════════════════════
  // NORMAL TIER — TRUTHS (45 ITEMS)
  // Social, fun & embarrassing questions, mishaps, cringe memories, white lies
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'nt1', type: 'truth', deck: 'normal', text: 'What is the most embarrassing song currently in your music library?' },
  { id: 'nt2', type: 'truth', deck: 'normal', text: 'What is the dumbest lie you ever told that everyone actually believed?' },
  { id: 'nt3', type: 'truth', deck: 'normal', text: 'What is something you pretend to like just to fit in or look cool?' },
  { id: 'nt4', type: 'truth', deck: 'normal', text: 'What is the most awkward text message you sent to the wrong person or group?' },
  { id: 'nt5', type: 'truth', deck: 'normal', text: 'Have you ever pretended to be sick to avoid hanging out with someone?' },
  { id: 'nt6', type: 'truth', deck: 'normal', text: 'What is the most ridiculous purchase you made online late at night?' },
  { id: 'nt7', type: 'truth', deck: 'normal', text: 'What is a bizarre habit you have when you are completely alone?' },
  { id: 'nt8', type: 'truth', deck: 'normal', text: 'Have you ever blamed a weird smell or noise on a pet or someone else?' },
  { id: 'nt9', type: 'truth', deck: 'normal', text: 'What is the cringiest username or email address you ever created?' },
  { id: 'nt10', type: 'truth', deck: 'normal', text: 'Have you ever stalked your own social media profile from a fake or burner account?' },
  { id: 'nt11', type: 'truth', deck: 'normal', text: 'If you had to delete all social media apps except one, which one survives?' },
  { id: 'nt12', type: 'truth', deck: 'normal', text: 'What is the most embarrassing thing your parents caught you doing?' },
  { id: 'nt13', type: 'truth', deck: 'normal', text: 'Have you ever practiced an argument in the shower and thought of the comeback 3 days too late?' },
  { id: 'nt14', type: 'truth', deck: 'normal', text: 'What is the weirdest thing you have searched on Google this past month?' },
  { id: 'nt15', type: 'truth', deck: 'normal', text: 'Who in this squad would be the first person you would call if you were stranded at 2:00 AM?' },
  { id: 'nt16', type: 'truth', deck: 'normal', text: 'What is the worst gift you have ever received that you had to pretend to love?' },
  { id: 'nt17', type: 'truth', deck: 'normal', text: 'Have you ever accidentally sent a screenshot of a chat back to the person in the screenshot?' },
  { id: 'nt18', type: 'truth', deck: 'normal', text: 'What is a movie that made you cry embarrassingly hard in public?' },
  { id: 'nt19', type: 'truth', deck: 'normal', text: 'Have you ever re-gifted something you got for your birthday or holidays?' },
  { id: 'nt20', type: 'truth', deck: 'normal', text: 'What is the most childish thing you still do on a regular basis?' },
  { id: 'nt21', type: 'truth', deck: 'normal', text: 'Have you ever gotten completely lost in a shopping mall, supermarket, or airport?' },
  { id: 'nt22', type: 'truth', deck: 'normal', text: 'What was your most awkward handshake, high-five, or hug fail?' },
  { id: 'nt23', type: 'truth', deck: 'normal', text: 'What is a small exaggeration on your resume or profile that you hope nobody verifies?' },
  { id: 'nt24', type: 'truth', deck: 'normal', text: 'Have you ever laughed at a serious moment when it was completely inappropriate?' },
  { id: 'nt25', type: 'truth', deck: 'normal', text: 'What is the longest you have ever gone without washing your bedsheets or hoodie?' },
  { id: 'nt26', type: 'truth', deck: 'normal', text: 'If you were arrested right now with zero explanation, what would your friends assume you did?' },
  { id: 'nt27', type: 'truth', deck: 'normal', text: 'What is the most petty reason you ever refused to talk to someone?' },
  { id: 'nt28', type: 'truth', deck: 'normal', text: 'Have you ever liked an old Instagram post from 3 years ago while deep creeping?' },
  { id: 'nt29', type: 'truth', deck: 'normal', text: 'What is a song you will immediately skip if someone else is around, but blast alone?' },
  { id: 'nt30', type: 'truth', deck: 'normal', text: 'Have you ever walked into a glass door or tripped in front of a big crowd?' },
  { id: 'nt31', type: 'truth', deck: 'normal', text: 'What is something mischievous you did that you got a sibling or friend blamed for?' },
  { id: 'nt32', type: 'truth', deck: 'normal', text: 'What is your biggest guilty pleasure reality TV show or YouTube rabbit hole?' },
  { id: 'nt33', type: 'truth', deck: 'normal', text: 'Have you ever stayed up until dawn reading internet drama about people you do not know?' },
  { id: 'nt34', type: 'truth', deck: 'normal', text: 'What is the most awkward elevator silence you have ever experienced?' },
  { id: 'nt35', type: 'truth', deck: 'normal', text: 'Have you ever waved back at someone who was actually waving at someone behind you?' },
  { id: 'nt36', type: 'truth', deck: 'normal', text: 'What is the most questionable shortcut you have ever taken when running late?' },
  { id: 'nt37', type: 'truth', deck: 'normal', text: 'If you could read the mind of one person in this room for 1 minute, who would it be?' },
  { id: 'nt38', type: 'truth', deck: 'normal', text: 'What is the worst kitchen disaster you ever cooked and tried to eat anyway?' },
  { id: 'nt39', type: 'truth', deck: 'normal', text: 'Have you ever left a party without telling anyone because your social battery died?' },
  { id: 'nt40', type: 'truth', deck: 'normal', text: 'What is the dumbest thing you have ever argued with a stranger online about?' },
  { id: 'nt41', type: 'truth', deck: 'normal', text: 'What was your most embarrassing moment during a presentation or meeting?' },
  { id: 'nt42', type: 'truth', deck: 'normal', text: 'Have you ever accidentally worn clothes inside-out in public for hours?' },
  { id: 'nt43', type: 'truth', deck: 'normal', text: 'What is something you are surprisingly terrible at despite trying many times?' },
  { id: 'nt44', type: 'truth', deck: 'normal', text: 'If your unlocked phone was handed to the person on your right for 60 seconds, what would panic you most?' },
  { id: 'nt45', type: 'truth', deck: 'normal', text: 'What is the most awkward excuse you used to escape a boring phone call?' },

  // ════════════════════════════════════════════════════════════════════════════
  // NORMAL TIER — DARES (45 ITEMS)
  // Social dares, funny voice notes, impressions, roasts, fun challenges
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'nd1', type: 'dare', deck: 'normal', text: 'Send a voice note to your group chat speaking in an alien or pirate accent for 15 seconds.' },
  { id: 'nd2', type: 'dare', deck: 'normal', text: 'Let the squad pick any funny song and you have to dance like a robot for 20 seconds.' },
  { id: 'nd3', type: 'dare', deck: 'normal', text: 'Do your best impression of another friend in the room until someone guesses who it is.' },
  { id: 'nd4', type: 'dare', deck: 'normal', text: 'Talk without closing your mouth for your next two turns!' },
  { id: 'nd5', type: 'dare', deck: 'normal', text: 'Do 15 quick jumping jacks while beatboxing or humming an intense video game theme.' },
  { id: 'nd6', type: 'dare', deck: 'normal', text: 'Voice-note a close friend and tell them you are moving to Alaska to become an ice sculptor.' },
  { id: 'nd7', type: 'dare', deck: 'normal', text: 'Let someone in the squad pose you like a statue and hold that position for 30 seconds.' },
  { id: 'nd8', type: 'dare', deck: 'normal', text: 'Speak in rhymes for your next three sentences or take a penalty dare!' },
  { id: 'nd9', type: 'dare', deck: 'normal', text: 'Read aloud the last three notes or reminders in your Notes app with full theatrical expression.' },
  { id: 'nd10', type: 'dare', deck: 'normal', text: 'Swap one visible clothing accessory (jacket, cap, watch, sunglasses) with the player to your right.' },
  { id: 'nd11', type: 'dare', deck: 'normal', text: 'Speak only in questions for your next three rounds!' },
  { id: 'nd12', type: 'dare', deck: 'normal', text: 'Send a silly selfie with an absurd double-chin to your squad group chat right now.' },
  { id: 'nd13', type: 'dare', deck: 'normal', text: 'Do an over-the-top infomercial pitch trying to sell an ordinary pen to the group for $1,000.' },
  { id: 'nd14', type: 'dare', deck: 'normal', text: 'Let another player type any harmless funny emoji (like 🥔 or 🦹) into your search history.' },
  { id: 'nd15', type: 'dare', deck: 'normal', text: 'Eat a cracker, chip, or snack without using your hands!' },
  { id: 'nd16', type: 'dare', deck: 'normal', text: 'Show the squad your daily screen time report on your phone with zero excuses.' },
  { id: 'nd17', type: 'dare', deck: 'normal', text: 'Sing everything you want to say instead of speaking for the next 2 minutes.' },
  { id: 'nd18', type: 'dare', deck: 'normal', text: 'Pretend you are a runway model walking down fashion week while carrying an imaginary heavy cat.' },
  { id: 'nd19', type: 'dare', deck: 'normal', text: 'Do a dramatic reading of the nutrition facts on the back of any snack bag or drink.' },
  { id: 'nd20', type: 'dare', deck: 'normal', text: 'Send a message saying "I know what you did... 👁️" to a friend not in the room and do not reply for 2 minutes.' },
  { id: 'nd21', type: 'dare', deck: 'normal', text: 'Do your best impression of a tired barista dealing with an impossibly complex order.' },
  { id: 'nd22', type: 'dare', deck: 'normal', text: 'Speak in third person ("Alex thinks that...", "Jordan would like to say...") for the next round.' },
  { id: 'nd23', type: 'dare', deck: 'normal', text: 'Act out your morning routine in 20 seconds using high-speed fast-forward movements.' },
  { id: 'nd24', type: 'dare', deck: 'normal', text: 'Let the player to your left draw a tiny star or mustache on your hand with a pen.' },
  { id: 'nd25', type: 'dare', deck: 'normal', text: 'Put your socks on your hands and wear them as mittens for the next two rounds.' },
  { id: 'nd26', type: 'dare', deck: 'normal', text: 'Act like an undercover spy suspecting everyone in the room of espionage for 1 minute.' },
  { id: 'nd27', type: 'dare', deck: 'normal', text: 'Sing the chorus of a dramatic ballad while pretending to cry theatrically.' },
  { id: 'nd28', type: 'dare', deck: 'normal', text: 'Recite all the lyrics you can remember from an old childhood cartoon theme song.' },
  { id: 'nd29', type: 'dare', deck: 'normal', text: 'Balance a cup on your head and walk across the room without letting it fall.' },
  { id: 'nd30', type: 'dare', deck: 'normal', text: 'Pretend to be a game show host introducing the next player as the champion of cringe.' },
  { id: 'nd31', type: 'dare', deck: 'normal', text: 'Let another player whisper a weird secret word that you must naturally slip into your next sentence.' },
  { id: 'nd32', type: 'dare', deck: 'normal', text: 'Attempt to juggle three small objects (balls, crumpled paper, keys) for 15 seconds.' },
  { id: 'nd33', type: 'dare', deck: 'normal', text: 'Do your best impression of a dramatic soap opera character discovering a shocking plot twist.' },
  { id: 'nd34', type: 'dare', deck: 'normal', text: 'Speak in slow-motion robot voice for the next 30 seconds.' },
  { id: 'nd35', type: 'dare', deck: 'normal', text: 'Try to make someone in the room laugh in under 20 seconds using only facial expressions.' },
  { id: 'nd36', type: 'dare', deck: 'normal', text: 'Pretend you are receiving a top secret phone call from the president and excuse yourself dramatically.' },
  { id: 'nd37', type: 'dare', deck: 'normal', text: 'Do 10 squats while shouting inspirational workout affirmations like a drill sergeant.' },
  { id: 'nd38', type: 'dare', deck: 'normal', text: 'Apologize sincerely and emotionally to a chair or table for bumping into furniture.' },
  { id: 'nd39', type: 'dare', deck: 'normal', text: 'Let the squad select a song and you have to lip-sync with intense emotional theatricality.' },
  { id: 'nd40', type: 'dare', deck: 'normal', text: 'Hold a harmless staring contest with the person opposite you — first to laugh or blink loses!' },
  { id: 'nd41', type: 'dare', deck: 'normal', text: 'Pretend you are an auctioneer and rapidly sell off the shoes of the person sitting next to you.' },
  { id: 'nd42', type: 'dare', deck: 'normal', text: 'Give a 20-second motivational speech explaining why pineapples belong (or do not belong) on pizza.' },
  { id: 'nd43', type: 'dare', deck: 'normal', text: 'Walk across the room like you are wearing invisible 10-inch stilettos.' },
  { id: 'nd44', type: 'dare', deck: 'normal', text: 'Act like you are stuck in an imaginary elevator that just broke down with the squad.' },
  { id: 'nd45', type: 'dare', deck: 'normal', text: 'Do your best impression of a frantic YouTuber begging people to smash that like button!' },

  // ════════════════════════════════════════════════════════════════════════════
  // CHEESY TIER — TRUTHS (45 ITEMS)
  // Flirty, cringe, romantic tropes, bold dares, PG-13, no explicit content
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'ct1', type: 'truth', deck: 'cheesy', text: 'Who was your very first celebrity crush that you were genuinely obsessed with?' },
  { id: 'ct2', type: 'truth', deck: 'cheesy', text: 'What is the corniest pickup line someone has ever used on you (or that you used)?' },
  { id: 'ct3', type: 'truth', deck: 'cheesy', text: 'Have you ever had a crush on someone that you knew was completely off-limits?' },
  { id: 'ct4', type: 'truth', deck: 'cheesy', text: 'What is a cheesy romantic movie trope that you secretly wish would happen to you?' },
  { id: 'ct5', type: 'truth', deck: 'cheesy', text: 'Have you ever written a cheesy love poem, letter, or unsent text draft to someone?' },
  { id: 'ct6', type: 'truth', deck: 'cheesy', text: 'What is your biggest dating "ick" that is totally petty but an immediate dealbreaker?' },
  { id: 'ct7', type: 'truth', deck: 'cheesy', text: 'Have you ever checked a crush\'s music playlist to see what emotional mood they were in?' },
  { id: 'ct8', type: 'truth', deck: 'cheesy', text: 'Who in this squad do you think would be the most dramatic partner in a relationship?' },
  { id: 'ct9', type: 'truth', deck: 'cheesy', text: 'What is the most romantic or over-the-top gesture you have ever done for someone you liked?' },
  { id: 'ct10', type: 'truth', deck: 'cheesy', text: 'Have you ever accidentally liked a months-old photo of your crush at 2:00 AM?' },
  { id: 'ct11', type: 'truth', deck: 'cheesy', text: 'What is the cringiest thing you ever said while trying to flirt with someone?' },
  { id: 'ct12', type: 'truth', deck: 'cheesy', text: 'If you had to be stranded on a desert island with one person in this room, who is your pick?' },
  { id: 'ct13', type: 'truth', deck: 'cheesy', text: 'Have you ever ghosted someone and then felt terrible about it later?' },
  { id: 'ct14', type: 'truth', deck: 'cheesy', text: 'What cheesy love song do you secretly know all the lyrics to and sing along to with emotion?' },
  { id: 'ct15', type: 'truth', deck: 'cheesy', text: 'What is a green flag in someone that immediately makes your heart melt?' },
  { id: 'ct16', type: 'truth', deck: 'cheesy', text: 'Have you ever pretended to like an artist or genre of music just to impress someone you liked?' },
  { id: 'ct17', type: 'truth', deck: 'cheesy', text: 'If your love life was the title of a movie or song right now, what would it be called?' },
  { id: 'ct18', type: 'truth', deck: 'cheesy', text: 'What is the most awkward first date experience you have ever endured?' },
  { id: 'ct19', type: 'truth', deck: 'cheesy', text: 'Have you ever rehearsed a conversation with a crush in front of a mirror?' },
  { id: 'ct20', type: 'truth', deck: 'cheesy', text: 'What is your honest opinion on matching outfits or matching profile pictures with a partner?' },
  { id: 'ct21', type: 'truth', deck: 'cheesy', text: 'Who was your most embarrassing childhood or cartoon crush?' },
  { id: 'ct22', type: 'truth', deck: 'cheesy', text: 'Have you ever had butterflies in your stomach so intense that you could not eat your food?' },
  { id: 'ct23', type: 'truth', deck: 'cheesy', text: 'What is the most ridiculous excuse you ever gave to decline a date or romantic invitation?' },
  { id: 'ct24', type: 'truth', deck: 'cheesy', text: 'If you had to set up two people in this squad on a blind date, who would you match up?' },
  { id: 'ct25', type: 'truth', deck: 'cheesy', text: 'Have you ever stayed up until 3:00 AM on the phone talking about absolutely nothing?' },
  { id: 'ct26', type: 'truth', deck: 'cheesy', text: 'What romantic cliché (flowers, serenading, eye contact) actually works on you?' },
  { id: 'ct27', type: 'truth', deck: 'cheesy', text: 'Have you ever sent a text to a crush, panicked, and thrown your phone across the room?' },
  { id: 'ct28', type: 'truth', deck: 'cheesy', text: 'What is the fastest you have ever developed feelings for someone after meeting them?' },
  { id: 'ct29', type: 'truth', deck: 'cheesy', text: 'If someone serenaded you with a guitar outside your window, would you love it or cringe?' },
  { id: 'ct30', type: 'truth', deck: 'cheesy', text: 'Have you ever kept an old ticket, photo, or souvenir from someone you had feelings for?' },
  { id: 'ct31', type: 'truth', deck: 'cheesy', text: 'What is a song that instantly reminds you of your very first crush?' },
  { id: 'ct32', type: 'truth', deck: 'cheesy', text: 'Have you ever dressed up extra nice solely because you hoped you might run into someone specific?' },
  { id: 'ct33', type: 'truth', deck: 'cheesy', text: 'What is the cheesiest romantic compliment someone could pay you that would secretly flatter you?' },
  { id: 'ct34', type: 'truth', deck: 'cheesy', text: 'If someone gave you a mixtape or playlist today, what song on it would make you blush?' },
  { id: 'ct35', type: 'truth', deck: 'cheesy', text: 'What is the most dramatic romantic argument you have ever had over something silly?' },
  { id: 'ct36', type: 'truth', deck: 'cheesy', text: 'Have you ever asked a friend to text your crush on your behalf because you were too nervous?' },
  { id: 'ct37', type: 'truth', deck: 'cheesy', text: 'What is your all-time favorite romantic slow-dance track?' },
  { id: 'ct38', type: 'truth', deck: 'cheesy', text: 'Have you ever pretended not to see someone you liked in public because you felt awkward?' },
  { id: 'ct39', type: 'truth', deck: 'cheesy', text: 'What is a cute little habit someone does that instantly wins you over?' },
  { id: 'ct40', type: 'truth', deck: 'cheesy', text: 'If you had to write a cheesy romantic comedy, which two players in this room are the leads?' },
  { id: 'ct41', type: 'truth', deck: 'cheesy', text: 'Have you ever gotten jealous over something that was totally irrational?' },
  { id: 'ct42', type: 'truth', deck: 'cheesy', text: 'What is your all-time favorite romantic movie quote or song lyric?' },
  { id: 'ct43', type: 'truth', deck: 'cheesy', text: 'Have you ever had a crush on a friend\'s sibling or a sibling\'s friend?' },
  { id: 'ct44', type: 'truth', deck: 'cheesy', text: 'What is the sweetest thing someone has ever said to you that you still remember?' },
  { id: 'ct45', type: 'truth', deck: 'cheesy', text: 'If you had to propose using only items currently in this room, what item would you present?' },

  // ════════════════════════════════════════════════════════════════════════════
  // CHEESY TIER — DARES (45 ITEMS)
  // Flirty, cringe, bold dares, PG-13, no explicit content
  // ════════════════════════════════════════════════════════════════════════════
  { id: 'cd1', type: 'dare', deck: 'cheesy', text: 'Deliver your cheesiest, most dramatic pickup line to the wall or another player with intense eye contact.' },
  { id: 'cd2', type: 'dare', deck: 'cheesy', text: 'Serenade an object in the room (like a water bottle or sneaker) like a dramatic 90s R&B singer.' },
  { id: 'cd3', type: 'dare', deck: 'cheesy', text: 'Recite an over-the-top Shakespearean love declaration to the person sitting across from you.' },
  { id: 'cd4', type: 'dare', deck: 'cheesy', text: 'Give finger guns and wink every time someone says your name for the next two rounds!' },
  { id: 'cd5', type: 'dare', deck: 'cheesy', text: 'Text your best friend outside this game: "I think you might be my soulmate ❤️" with zero context.' },
  { id: 'cd6', type: 'dare', deck: 'cheesy', text: 'Pose like a high-fashion romance novel cover model with another player for 10 seconds.' },
  { id: 'cd7', type: 'dare', deck: 'cheesy', text: 'Sing the chorus of a dramatic love song (like Celine Dion or Taylor Swift) with maximum passion.' },
  { id: 'cd8', type: 'dare', deck: 'cheesy', text: 'Give a 30-second romantic movie trailer monologue about your imaginary destination wedding in Paris.' },
  { id: 'cd9', type: 'dare', deck: 'cheesy', text: 'Whisper a ridiculously cheesy compliment into the ear of the person to your left.' },
  { id: 'cd10', type: 'dare', deck: 'cheesy', text: 'Slow-dance with a pillow or jacket for 20 seconds while humming a slow-dance ballad.' },
  { id: 'cd11', type: 'dare', deck: 'cheesy', text: 'Call someone and say: "I just called to say... you have fantastic music taste" and hang up.' },
  { id: 'cd12', type: 'dare', deck: 'cheesy', text: 'Stare deeply into the eyes of the player to your right for 15 seconds without laughing!' },
  { id: 'cd13', type: 'dare', deck: 'cheesy', text: 'Send a heart emoji to the third person on your recent contacts or DMs list.' },
  { id: 'cd14', type: 'dare', deck: 'cheesy', text: 'Read aloud the most dramatic love poem you can improvise on the spot in 20 seconds.' },
  { id: 'cd15', type: 'dare', deck: 'cheesy', text: 'Pretend to propose to the player on your left with an imaginary ring and give a 20-second speech.' },
  { id: 'cd16', type: 'dare', deck: 'cheesy', text: 'Act out a slow-motion dramatic Hollywood airport reunion with the player to your right!' },
  { id: 'cd17', type: 'dare', deck: 'cheesy', text: 'Speak in a smooth, velvety radio DJ "late-night slow jams" voice for the next 2 minutes.' },
  { id: 'cd18', type: 'dare', deck: 'cheesy', text: 'Show the squad your most flattering or suave selfie from your camera roll.' },
  { id: 'cd19', type: 'dare', deck: 'cheesy', text: 'Blow a dramatic movie-star kiss to everyone in the room in a full 360 circle.' },
  { id: 'cd20', type: 'dare', deck: 'cheesy', text: 'Pretend you are in a luxury fragrance commercial: look smoldering and whisper a made-up French brand name.' },
  { id: 'cd21', type: 'dare', deck: 'cheesy', text: 'Tell the group what each player\'s ideal romantic soundtrack genre would be.' },
  { id: 'cd22', type: 'dare', deck: 'cheesy', text: 'Compliment every player in the room using only cheesy food metaphors ("You are as sweet as honey...").' },
  { id: 'cd23', type: 'dare', deck: 'cheesy', text: 'Do a dramatic slow-motion hair flip (or imaginary hair flip) with an intense smize for the squad.' },
  { id: 'cd24', type: 'dare', deck: 'cheesy', text: 'Let the squad choose a cheesy love song that you must dramatically lip-sync to on one knee.' },
  { id: 'cd25', type: 'dare', deck: 'cheesy', text: 'Text a close friend an emoji combo like "🍦✨🍕" with no words and see how they react.' },
  { id: 'cd26', type: 'dare', deck: 'cheesy', text: 'Act out being struck by Cupid\'s arrow right in the chest with dramatic theatrical groans.' },
  { id: 'cd27', type: 'dare', deck: 'cheesy', text: 'Deliver an acceptance speech for winning "Most Charming Flirt of the Year" with tears of joy.' },
  { id: 'cd28', type: 'dare', deck: 'cheesy', text: 'Offer your hand to another player and gallantly kiss the back of their hand like royalty.' },
  { id: 'cd29', type: 'dare', deck: 'cheesy', text: 'Give your best smoldering model gaze directly into someone\'s phone camera for 5 seconds.' },
  { id: 'cd30', type: 'dare', deck: 'cheesy', text: 'Invent a cheesy couple celebrity mashup name for two people in the room.' },
  { id: 'cd31', type: 'dare', deck: 'cheesy', text: 'Pretend you are a florist selling someone a bouquet and explain the deep emotional meaning of each petal.' },
  { id: 'cd32', type: 'dare', deck: 'cheesy', text: 'Whisper a harmless "secret admirer" rumor about yourself to the person on your left.' },
  { id: 'cd33', type: 'dare', deck: 'cheesy', text: 'Sing a duet chorus of a cheesy pop ballad with the person sitting next to you.' },
  { id: 'cd34', type: 'dare', deck: 'cheesy', text: 'Compliment the outfit of the person on your right with excessive poetic grandeur for 30 seconds.' },
  { id: 'cd35', type: 'dare', deck: 'cheesy', text: 'Pretend you are caught in the rain in a romantic movie and shout your feelings to the sky!' },
  { id: 'cd36', type: 'dare', deck: 'cheesy', text: 'Write a 1-sentence cheesy love note on a scrap of paper and pass it secretly to another player.' },
  { id: 'cd37', type: 'dare', deck: 'cheesy', text: 'Do your best impression of a cheesy French waiter recommending the dish of romance.' },
  { id: 'cd38', type: 'dare', deck: 'cheesy', text: 'Put your hands over your heart and sigh dreamily whenever anyone speaks for the next round.' },
  { id: 'cd39', type: 'dare', deck: 'cheesy', text: 'Describe your dream date in ridiculous, lavish detail (helicopters, violins, chocolate fountains).' },
  { id: 'cd40', type: 'dare', deck: 'cheesy', text: 'Pretend you are shooting a cheesy romantic montage: pretend to share an ice cream and laugh joyfully.' },
  { id: 'cd41', type: 'dare', deck: 'cheesy', text: 'Say "Mwah!" after every sentence you speak for your next two turns.' },
  { id: 'cd42', type: 'dare', deck: 'cheesy', text: 'Recite three things you find undeniably charming about the person sitting to your left.' },
  { id: 'cd43', type: 'dare', deck: 'cheesy', text: 'Do a dramatic swoon onto the couch like an overwhelmed 19th-century Victorian poet.' },
  { id: 'cd44', type: 'dare', deck: 'cheesy', text: 'Hold hands with the player next to you and give a solemn toast to eternal squad friendship!' },
  { id: 'cd45', type: 'dare', deck: 'cheesy', text: 'Flash your sweetest, most angelic smile and hold it without breaking character for 20 seconds.' },
];

// ══════════════════════════════════════════════════════════════════════════════
// WOULD YOU RATHER (32 PAIRS)
// ══════════════════════════════════════════════════════════════════════════════
export const WOULD_YOU_RATHER_ITEMS: WouldYouRatherItem[] = [
  { id: 'wyr1', optionA: 'Never listen to music again', optionB: 'Never watch movies/series again', percentA: 18, percentB: 82 },
  { id: 'wyr2', optionA: 'Know the exact date of your death', optionB: 'Know the exact cause of your death', percentA: 34, percentB: 66 },
  { id: 'wyr3', optionA: 'Be able to read everyone\'s minds', optionB: 'Be able to teleport anywhere instantly', percentA: 41, percentB: 59 },
  { id: 'wyr4', optionA: 'Have all your texts leaked publicly', optionB: 'Have all your search history leaked publicly', percentA: 45, percentB: 55 },
  { id: 'wyr5', optionA: 'Live 100 years in the past with current knowledge', optionB: 'Live 100 years in the future with zero preparation', percentA: 38, percentB: 62 },
  { id: 'wyr6', optionA: 'Always speak your exact unfiltered thoughts aloud', optionB: 'Never be able to speak again, only communicate in emojis', percentA: 28, percentB: 72 },
  { id: 'wyr7', optionA: 'Have free Spotify/Apple Music for life', optionB: 'Have free unlimited flight tickets for life', percentA: 22, percentB: 78 },
  { id: 'wyr8', optionA: 'Fight 1 horse-sized duck', optionB: 'Fight 100 duck-sized horses', percentA: 31, percentB: 69 },
  { id: 'wyr9', optionA: 'Be a famous music rockstar with zero privacy', optionB: 'Be an anonymous billionaire living quietly in the mountains', percentA: 24, percentB: 76 },
  { id: 'wyr10', optionA: 'Only be able to listen to 1 single song for the rest of your life', optionB: 'Hear your least favorite song on loop for 2 hours every single morning', percentA: 39, percentB: 61 },
  { id: 'wyr11', optionA: 'Front row VIP tickets to every concert forever', optionB: 'Backstage VIP passes to meet your favorite artist once', percentA: 58, percentB: 42 },
  { id: 'wyr12', optionA: 'Have the ability to fly but only at 5 miles per hour', optionB: 'Be invisible but only when nobody is looking at you', percentA: 71, percentB: 29 },
  { id: 'wyr13', optionA: 'Give up coffee and energy drinks forever', optionB: 'Give up all sugary desserts and chocolate forever', percentA: 49, percentB: 51 },
  { id: 'wyr14', optionA: 'Always have a tiny pebble in your shoe', optionB: 'Have your favorite song play at 10% volume in your head constantly', percentA: 19, percentB: 81 },
  { id: 'wyr15', optionA: 'Never have to sleep again with zero fatigue', optionB: 'Never have to work or study again with unlimited money', percentA: 26, percentB: 74 },
  { id: 'wyr16', optionA: 'Be able to talk to all animals', optionB: 'Speak all human languages fluently', percentA: 44, percentB: 56 },
  { id: 'wyr17', optionA: 'Be trapped in a horror movie where you survive', optionB: 'Be trapped in a cringe reality TV show where everyone watches you', percentA: 37, percentB: 63 },
  { id: 'wyr18', optionA: 'Have your morning alarm sound be your voice singing horribly', optionB: 'Have your alarm sound be an angry foghorn that scares you awake', percentA: 52, percentB: 48 },
  { id: 'wyr19', optionA: 'Have permanent flawless hair but terrible fashion', optionB: 'Have incredible designer style but a bad haircut forever', percentA: 47, percentB: 53 },
  { id: 'wyr20', optionA: 'Only be able to whisper for the rest of your life', optionB: 'Only be able to shout everything you say', percentA: 64, percentB: 36 },
  { id: 'wyr21', optionA: 'Accidentally send a risky text to your boss/teacher', optionB: 'Accidentally send a risky text to your family group chat', percentA: 33, percentB: 67 },
  { id: 'wyr22', optionA: 'Live in a cozy cabin deep in snowy woods', optionB: 'Live in a luxury penthouse overlooking a neon metropolis', percentA: 46, percentB: 54 },
  { id: 'wyr23', optionA: 'Win a Grammy Award for a song you didn\'t write', optionB: 'Write a masterpiece song that someone else gets famous for', percentA: 35, percentB: 65 },
  { id: 'wyr24', optionA: 'Have your life narrated by Morgan Freeman', optionB: 'Have your life scored by Hans Zimmer in real-time', percentA: 53, percentB: 47 },
  { id: 'wyr25', optionA: 'Lose all memories from the last 5 years', optionB: 'Be unable to make any new memories for the next 5 years', percentA: 68, percentB: 32 },
  { id: 'wyr26', optionA: 'Always arrive 30 minutes early to everything', optionB: 'Always arrive 15 minutes late to everything', percentA: 61, percentB: 39 },
  { id: 'wyr27', optionA: 'Be able to pause time whenever you want', optionB: 'Be able to rewind time by 10 minutes once per day', percentA: 57, percentB: 43 },
  { id: 'wyr28', optionA: 'Have unlimited battery on all your devices forever', optionB: 'Have lightning-fast gigabit Wi-Fi everywhere in the world', percentA: 48, percentB: 52 },
  { id: 'wyr29', optionA: 'Never get stuck in road traffic ever again', optionB: 'Never get a flight or train delay ever again', percentA: 66, percentB: 34 },
  { id: 'wyr30', optionA: 'Have everyone laugh at all your jokes even when unfunny', optionB: 'Have everyone take your serious ideas with 100% respect', percentA: 40, percentB: 60 },
  { id: 'wyr31', optionA: 'Eat your favorite meal every single night for dinner', optionB: 'Never eat your favorite meal again but try unlimited new foods', percentA: 32, percentB: 68 },
  { id: 'wyr32', optionA: 'Live without heating in a freezing cold winter', optionB: 'Live without air conditioning in sweltering summer heat', percentA: 42, percentB: 58 },
];

// ══════════════════════════════════════════════════════════════════════════════
// NEVER HAVE I EVER (32 STATEMENTS)
// ══════════════════════════════════════════════════════════════════════════════
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
  { id: 'nhie13', statement: 'Never have I ever practiced an award acceptance speech in the bathroom mirror.' },
  { id: 'nhie14', statement: 'Never have I ever lied about my age to get into an event or venue.' },
  { id: 'nhie15', statement: 'Never have I ever eaten food that fell on the floor after the 5-second rule expired.' },
  { id: 'nhie16', statement: 'Never have I ever pretended to know a VIP or celebrity to impress people.' },
  { id: 'nhie17', statement: 'Never have I ever worn the same pair of jeans for more than two weeks straight without washing.' },
  { id: 'nhie18', statement: 'Never have I ever sent a text complaining about someone to the exact person I was complaining about.' },
  { id: 'nhie19', statement: 'Never have I ever bought concert or festival tickets mostly for the photos.' },
  { id: 'nhie20', statement: 'Never have I ever snooped through someone\'s medicine cabinet or room during a party.' },
  { id: 'nhie21', statement: 'Never have I ever left a party without saying goodbye because my social battery was at 0%.' },
  { id: 'nhie22', statement: 'Never have I ever walked into a glass sliding door or clear window.' },
  { id: 'nhie23', statement: 'Never have I ever faked being sick to get out of work, school, or a boring event.' },
  { id: 'nhie24', statement: 'Never have I ever deleted a post because it didn\'t get enough likes in the first 15 minutes.' },
  { id: 'nhie25', statement: 'Never have I ever accidentally called someone while stalking their profile.' },
  { id: 'nhie26', statement: 'Never have I ever blamed a pet or sibling for something embarrassing I broke or spilled.' },
  { id: 'nhie27', statement: 'Never have I ever tried cutting my own hair or bangs and instantly regretted it.' },
  { id: 'nhie28', statement: 'Never have I ever forgotten someone\'s name 5 seconds after they introduced themselves.' },
  { id: 'nhie29', statement: 'Never have I ever sung so loudly in the car with windows down that other drivers stared.' },
  { id: 'nhie30', statement: 'Never have I ever spent an entire Sunday in bed binge-watching a show without getting up.' },
  { id: 'nhie31', statement: 'Never have I ever pretended to understand a joke that flew completely over my head.' },
  { id: 'nhie32', statement: 'Never have I ever made a playlist specifically for one person hoping they would notice the subliminal message.' },
];

// ══════════════════════════════════════════════════════════════════════════════
// MOST LIKELY TO (32 PROMPTS)
// ══════════════════════════════════════════════════════════════════════════════
export const MOST_LIKELY_TO_ITEMS: MostLikelyToItem[] = [
  { id: 'mlt1', prompt: 'Most likely to become a viral meme on the internet' },
  { id: 'mlt2', prompt: 'Most likely to text their ex at 3:00 AM on a Saturday' },
  { id: 'mlt3', prompt: 'Most likely to accidentally join a strange cult while traveling' },
  { id: 'mlt4', prompt: 'Most likely to become a billionaire before turning 30' },
  { id: 'mlt5', prompt: 'Most likely to survive a zombie apocalypse' },
  { id: 'mlt6', prompt: 'Most likely to spend their entire paycheck on concert tickets and food' },
  { id: 'mlt7', prompt: 'Most likely to forget their own birthday or anniversary' },
  { id: 'mlt8', prompt: 'Most likely to start laughing uncontrollably at a serious moment' },
  { id: 'mlt9', prompt: 'Most likely to get arrested for something hilariously dumb' },
  { id: 'mlt10', prompt: 'Most likely to accidentally lose their phone while it is in their own hand' },
  { id: 'mlt11', prompt: 'Most likely to win a Grammy or release a hit album' },
  { id: 'mlt12', prompt: 'Most likely to sleep through 10 consecutive morning alarms' },
  { id: 'mlt13', prompt: 'Most likely to get lost in their own hometown' },
  { id: 'mlt14', prompt: 'Most likely to adopt 5 stray pets on a whim' },
  { id: 'mlt15', prompt: 'Most likely to survive in the wilderness with just good vibes and snacks' },
  { id: 'mlt16', prompt: 'Most likely to trip on a flat, even floor with nothing in the way' },
  { id: 'mlt17', prompt: 'Most likely to become a famous YouTuber or Twitch streamer' },
  { id: 'mlt18', prompt: 'Most likely to accidentally order $150 worth of late-night food delivery' },
  { id: 'mlt19', prompt: 'Most likely to write a bestselling tell-all autobiography' },
  { id: 'mlt20', prompt: 'Most likely to cry at a wholesome pet food commercial' },
  { id: 'mlt21', prompt: 'Most likely to start an intense feud over a Monopoly or Uno game' },
  { id: 'mlt22', prompt: 'Most likely to get their head stuck between railing bars' },
  { id: 'mlt23', prompt: 'Most likely to disappear at a festival and be found hanging out with the headliner DJ' },
  { id: 'mlt24', prompt: 'Most likely to spend 45 minutes choosing a restaurant and still get pizza' },
  { id: 'mlt25', prompt: 'Most likely to become an eccentric art collector who lives in a lighthouse' },
  { id: 'mlt26', prompt: 'Most likely to reply to a text 3 weeks later saying "Sorry just seeing this!"' },
  { id: 'mlt27', prompt: 'Most likely to invent a ridiculous viral dance move on TikTok' },
  { id: 'mlt28', prompt: 'Most likely to get locked out of their own house in their pajamas' },
  { id: 'mlt29', prompt: 'Most likely to bring an acoustic guitar to a campfire and sing Wonderwall' },
  { id: 'mlt30', prompt: 'Most likely to win a game of poker on pure chaotic luck without knowing the rules' },
  { id: 'mlt31', prompt: 'Most likely to have 5,000 unread emails and 80 unread text messages' },
  { id: 'mlt32', prompt: 'Most likely to scream the loudest on a rollercoaster ride' },
];

// ══════════════════════════════════════════════════════════════════════════════
// "NO REPEAT UNTIL POOL EXHAUSTED" SESSION ENGINE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Shuffles an array in place using Fisher-Yates algorithm.
 */
function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Picks the next Truth or Dare item for a deck & type without repeating until the pool runs out.
 */
export function getNextTruthOrDareItem(
  deck: TruthOrDareDeck,
  type: 'truth' | 'dare',
  usedIds: string[]
): { item: TruthOrDareItem; nextUsedIds: string[] } {
  const pool = TRUTH_OR_DARE_ITEMS.filter((item) => item.deck === deck && item.type === type);
  if (pool.length === 0) {
    // Fallback to any item of that type
    const fallback = TRUTH_OR_DARE_ITEMS.filter((i) => i.type === type)[0];
    return { item: fallback, nextUsedIds: usedIds };
  }

  // Filter out already used items in this pool
  let available = pool.filter((item) => !usedIds.includes(item.id));

  // If pool exhausted, reset and draw from full pool
  let nextUsed = [...usedIds];
  if (available.length === 0) {
    // Remove all IDs belonging to this specific deck & type pool
    const poolIds = new Set(pool.map((p) => p.id));
    nextUsed = nextUsed.filter((id) => !poolIds.has(id));
    available = pool;
  }

  // Pick random from remaining
  const selected = available[Math.floor(Math.random() * available.length)];
  nextUsed.push(selected.id);

  return {
    item: selected,
    nextUsedIds: nextUsed,
  };
}

/**
 * Gets the next index for sequential games (WYR, NHIE, MLT) with no repeats until pool exhausted.
 */
export function getNextNonRepeatingIndex(
  currentIndex: number,
  totalItems: number,
  seenIndices: number[]
): { nextIndex: number; nextSeenIndices: number[] } {
  if (totalItems <= 1) {
    return { nextIndex: 0, nextSeenIndices: [0] };
  }

  let nextSeen = [...seenIndices];
  if (!nextSeen.includes(currentIndex)) {
    nextSeen.push(currentIndex);
  }

  // If all items have been seen, reset the seen list (keeping only the next picked one)
  if (nextSeen.length >= totalItems) {
    nextSeen = [];
  }

  // Generate unvisited candidates
  const candidates: number[] = [];
  for (let i = 0; i < totalItems; i++) {
    if (i !== currentIndex && !nextSeen.includes(i)) {
      candidates.push(i);
    }
  }

  // If no candidates, pick any other index
  const nextIdx =
    candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : (currentIndex + 1) % totalItems;

  nextSeen.push(nextIdx);

  return {
    nextIndex: nextIdx,
    nextSeenIndices: nextSeen,
  };
}
