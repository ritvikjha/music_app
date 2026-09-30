// Additional Ultra question bank for Trivia Duel across all 11 categories & difficulties.
const rows = [
  // ==========================================
  // ANIME · EASY
  // ==========================================
  ['Anime', 'easy', 'Which anime features alchemists Edward and Alphonse Elric?', 'Fullmetal Alchemist|Bleach|Soul Eater|D.Gray-man', 0],
  ['Anime', 'easy', 'What is the name of Ash Ketchum’s hometown in Pokémon?', 'Pallet Town|Cerulean City|Viridian City|Lavender Town', 0],
  ['Anime', 'easy', 'What kind of animal companion is Chopper in One Piece?', 'Reindeer|Tanuki|Dog|Bear', 0],
  ['Anime', 'easy', 'In Sailor Moon, what planet does Sailor Mercury represent?', 'Mercury|Venus|Mars|Jupiter', 0],
  ['Anime', 'easy', 'Which character carries a wooden sword in Gintama?', 'Gintoki Sakata|Shinpachi|Kagura|Hijikata', 0],
  ['Anime', 'easy', 'What is the signature hair color of Goku in his standard Super Saiyan form?', 'Golden Yellow|Electric Blue|Crimson Red|Silver White', 0],
  ['Anime', 'easy', 'In Naruto, what weapon does Tenten specialize in using?', 'Ninja Tools and Weapons|Healing Ninjutsu|Genjutsu|Puppetry', 0],
  ['Anime', 'easy', 'What is the name of the cat bus in My Neighbor Totoro?', 'Catbus|Nekobus|Forest Rover|Meow Bus', 0],
  ['Anime', 'easy', 'In Haikyu!!, what position does Tobio Kageyama play?', 'Setter|Wing Spiker|Middle Blocker|Libero', 0],
  ['Anime', 'easy', 'Which anime takes place in a world where humanity is turned to stone?', 'Dr. Stone|Fire Force|Tokyo Revengers|Vinland Saga', 0],

  // ==========================================
  // ANIME · MEDIUM
  // ==========================================
  ['Anime', 'medium', 'What is the name of Tanjiro’s signature dark red family breathing style in Demon Slayer?', 'Sun Breathing (Hinokami Kagura)|Moon Breathing|Flame Breathing|Blood Breathing', 0],
  ['Anime', 'medium', 'In Jujutsu Kaisen, what item does Yuji Itadori swallow to gain cursed power?', 'Sukuna’s Finger|A Cursed Core|A Black Orb|A Demon Bone', 0],
  ['Anime', 'medium', 'Who is the female sharpshooter in Gurren Lagann who wields a long-range sniper rifle?', 'Yoko Littner|Nia Teppelin|Kiyal|Darry', 0],
  ['Anime', 'medium', 'In One Piece, what is the bounty currency called?', 'Berries (Beli)|Zeni|Doubloons|Gold Coins', 0],
  ['Anime', 'medium', 'In Mob Psycho 100, what happens when Mob reaches 100% emotional capacity?', 'He explodes with overwhelming psychic power|He passes out|He turns invisible|He loses his memories', 0],
  ['Anime', 'medium', 'What is the name of the high school in Blue Lock where strikers compete?', 'Blue Lock Project|All-Japan Academy|Teiko School|Seirin High', 0],
  ['Anime', 'medium', 'In Tokyo Ghoul, what is the coffee shop called where ghouls gather peacefully?', 'Anteiku|Helter Skelter|CCG Cafe|Kagune Diner', 0],
  ['Anime', 'medium', 'Which eye technique is unique to the Uchiha clan in Naruto?', 'Sharingan|Byakugan|Rinnegan|Tenseigan', 0],
  ['Anime', 'medium', 'In Re:Zero, what is Subaru Natsuki’s unique time-loop ability called?', 'Return by Death|Time Rewind|Chrono Step|Save Point', 0],
  ['Anime', 'medium', 'What color is the Survey Corps cloak in Attack on Titan?', 'Forest Green|Deep Navy|Black|Maroon', 0],

  // ==========================================
  // ANIME · DIFFICULT
  // ==========================================
  ['Anime', 'difficult', 'In Hunter x Hunter, which Nen type allows the user to change the properties of their aura?', 'Transmutation|Conjuration|Manipulation|Emission', 0],
  ['Anime', 'difficult', 'In Neon Genesis Evangelion, which angel was the first to attack Tokyo-3 in episode 1?', 'Sachiel|Shamshel|Ramiel|Gaghiel', 0],
  ['Anime', 'difficult', 'In Code Geass, what was the real name of C.C. before she became immortal?', 'Her real name is never revealed|Celeste Cross|Claudia Campbell|Chiyo', 0],
  ['Anime', 'difficult', 'In Vinland Saga, which historic legendary Viking warrior was Thorfinn’s father?', 'Thors the Troll|Askeladd|Thorkell|Bjorn', 0],
  ['Anime', 'difficult', 'In Fullmetal Alchemist, what is the military rank of Roy Mustang when first introduced?', 'State Alchemist / Lieutenant Colonel|Brigadier General|Major|Captain', 0],
  ['Anime', 'difficult', 'In Steins;Gate, what is the divergence meter number needed to reach the Steins Gate world line?', '1.048596|0.571024|1.130205|0.000000', 0],
  ['Anime', 'difficult', 'In JoJo’s Bizarre Adventure Part 5, what is Giorno Giovanna’s Stand ability?', 'Golden Experience (creating life)|Crazy Diamond|Sticky Fingers|Aerosmith', 0],
  ['Anime', 'difficult', 'In Death Note, what was the alias used by the investigator Near?', 'Nate River|Mihael Keehl|Mail Jeevas|Raye Penber', 0],
  ['Anime', 'difficult', 'In Fate/Zero, which heroic spirit is summoned under the Berserker class by Kariya Matou?', 'Lancelot of the Lake|Hercules|Spartacus|Vlad the Impaler', 0],
  ['Anime', 'difficult', 'In Cowboy Bebop, what is the cybernetic canine Ein categorized as?', 'Data Dog (Pembroke Welsh Corgi)|Bio Hound|Quantum Retriever|Neural Terrier', 0],

  // ==========================================
  // MOVIES · EASY
  // ==========================================
  ['Movies', 'easy', 'What kind of animal is Simba in The Lion King?', 'Lion|Tiger|Cheetah|Leopard', 0],
  ['Movies', 'easy', 'Which superhero climbs walls and shoots webs in New York City?', 'Spider-Man|Iron Man|Superman|Daredevil', 0],
  ['Movies', 'easy', 'In Shrek, who is Shrek’s talkative best friend?', 'Donkey|Puss in Boots|Lord Farquaad|Pinocchio', 0],
  ['Movies', 'easy', 'What is the name of the pirate ship commanded by Captain Jack Sparrow?', 'The Black Pearl|The Flying Dutchman|Queen Anne’s Revenge|The Jolly Roger', 0],
  ['Movies', 'easy', 'Which movie series features the archaeology professor Indiana Jones?', 'Indiana Jones|Tomb Raider|The Mummy|National Treasure', 0],
  ['Movies', 'easy', 'In Despicable Me, what are the yellow capsule-shaped henchmen called?', 'Minions|Gremlins|Oompa Loompas|Smurfs', 0],
  ['Movies', 'easy', 'Who lives in a pineapple under the sea in his movie and TV franchise?', 'SpongeBob SquarePants|Patrick Star|Squidward|Mr. Krabs', 0],
  ['Movies', 'easy', 'Which DC hero lives in Gotham City and drives the Batmobile?', 'Batman|The Flash|Aquaman|Green Lantern', 0],
  ['Movies', 'easy', 'What is the name of the enchanted kingdom in Disney’s Frozen?', 'Arendelle|Corona|Atlantica|DunBroch', 0],
  ['Movies', 'easy', 'In Star Wars, what color is Luke Skywalker’s first lightsaber?', 'Blue|Green|Red|Purple', 0],

  // ==========================================
  // MOVIES · MEDIUM
  // ==========================================
  ['Movies', 'medium', 'Which 1994 film won 6 Oscars including Best Picture starring Tom Hanks as a runner across America?', 'Forrest Gump|The Shawshank Redemption|Pulp Fiction|Apollo 13', 0],
  ['Movies', 'medium', 'What is the name of the dystopian arena combat film starring Jennifer Lawrence as Katniss Everdeen?', 'The Hunger Games|Divergent|The Maze Runner|Ender’s Game', 0],
  ['Movies', 'medium', 'Who directed the horror masterpieces Get Out, Us, and Nope?', 'Jordan Peele|Ari Aster|James Wan|Guillermo del Toro', 0],
  ['Movies', 'medium', 'In The Matrix, what is the human rebellion’s last remaining underground city called?', 'Zion|Genesis|Babylon|Olympus', 0],
  ['Movies', 'medium', 'Which actor voiced the terrifying dragon Smaug in The Hobbit film trilogy?', 'Benedict Cumberbatch|Ian McKellen|Martin Freeman|Andy Serkis', 0],
  ['Movies', 'medium', 'What is the name of the fictional desert planet central to Frank Herbert’s Dune?', 'Arrakis|Caladan|Giedi Prime|Salusa Secundus', 0],
  ['Movies', 'medium', 'Who directed the epic biographical drama Oppenheimer (2023)?', 'Christopher Nolan|Martin Scorsese|Ridley Scott|Denis Villeneuve', 0],
  ['Movies', 'medium', 'Which 1985 classic film involves time traveling in a modified DeLorean car?', 'Back to the Future|Bill & Ted|The Terminator|Timecop', 0],
  ['Movies', 'medium', 'In Harry Potter, which Hogwarts house values ambition, cunning, and resourcefulness?', 'Slytherin|Gryffindor|Ravenclaw|Hufflepuff', 0],
  ['Movies', 'medium', 'Who directed the landmark fantasy trilogy The Lord of the Rings?', 'Peter Jackson|George Lucas|Steven Spielberg|James Cameron', 0],

  // ==========================================
  // MOVIES · DIFFICULT
  // ==========================================
  ['Movies', 'difficult', 'Which movie holds the record for the most Oscar nominations in history (tied at 14)?', 'All About Eve, Titanic, & La La Land|Ben-Hur|The Godfather Part II|Gone with the Wind', 0],
  ['Movies', 'difficult', 'In Stanley Kubrick’s The Shining, what phrase does Jack Torrance obsessively type on his typewriter?', '"All work and no play makes Jack a dull boy"|"Redrum is coming"|"Here’s Johnny"|"The Overlook awaits"', 0],
  ['Movies', 'difficult', 'Which iconic composer created the heart-thumping two-note shark motif for Jaws?', 'John Williams|Bernard Herrmann|Jerry Goldsmith|Danny Elfman', 0],
  ['Movies', 'difficult', 'In Alfred Hitchcock’s Psycho (1960), what was famously used as blood in the iconic shower scene?', 'Bosco Chocolate Syrup|Red food dye|Ketchup|Cherry juice', 0],
  ['Movies', 'difficult', 'Who was the first woman to win the Academy Award for Best Director (for The Hurt Locker)?', 'Kathryn Bigelow|Chloé Zhao|Jane Campion|Greta Gerwig', 0],
  ['Movies', 'difficult', 'In Ridley Scott’s Alien (1979), what was the name of the commercial towing spaceship?', 'USCSS Nostromo|Sulaco|Prometheus|Covenant', 0],
  ['Movies', 'difficult', 'What 1927 silent sci-fi film directed by Fritz Lang depicted a futuristic divided society?', 'Metropolis|The Cabinet of Dr. Caligari|Nosferatu|M', 0],
  ['Movies', 'difficult', 'Which camera technique was popularized in Vertigo by combining a forward dolly with a backward zoom?', 'Dolly Zoom (Vertigo effect)|Dutch angle|Whip pan|Tracking shot', 0],
  ['Movies', 'difficult', 'In Apocalypse Now, what Wagner opera piece plays during the helicopter beach assault?', 'Ride of the Valkyries|Tannhäuser|Tristan und Isolde|Lohengrin', 0],
  ['Movies', 'difficult', 'Which foreign film by Guillermo del Toro features the Pale Man and the Faun in 1944 Spain?', 'Pan’s Labyrinth|The Devil’s Backbone|Cronos|The Shape of Water', 0],

  // ==========================================
  // SONGS · EASY
  // ==========================================
  ['Songs', 'easy', 'Which pop star released hits like "Bad Guy" and "Ocean Eyes"?', 'Billie Eilish|Olivia Rodrigo|Lorde|Sabrina Carpenter', 0],
  ['Songs', 'easy', 'How many strings does a standard acoustic guitar have?', '6|4|8|12', 0],
  ['Songs', 'easy', 'Which Canadian pop star was discovered on YouTube and sang "Baby"?', 'Justin Bieber|Shawn Mendes|Drake|The Weeknd', 0],
  ['Songs', 'easy', 'Who sang the iconic disco party anthem "Stayin\' Alive"?', 'Bee Gees|ABBA|Earth, Wind & Fire|Kool & The Gang', 0],
  ['Songs', 'easy', 'Which city in England are The Beatles famously from?', 'Liverpool|London|Manchester|Birmingham', 0],
  ['Songs', 'easy', 'What percussion instrument consists of a hollow cylinder covered with a stretched membrane?', 'Drum|Tambourine|Triangle|Maraca', 0],
  ['Songs', 'easy', 'Who sang the 2013 empowerment hit "Roar" and "Firework"?', 'Katy Perry|Lady Gaga|Pink|Miley Cyrus', 0],
  ['Songs', 'easy', 'Which musical note comes right after Do in Solfège (Do, Re, Mi...)?', 'Re|Mi|Fa|Sol', 0],
  ['Songs', 'easy', 'Who released the viral break-up pop anthem "Drivers License"?', 'Olivia Rodrigo|Billie Eilish|Camila Cabello|Tate McRae', 0],
  ['Songs', 'easy', 'Which reggae icon recorded the world-famous songs "Three Little Birds" and "No Woman, No Cry"?', 'Bob Marley|Peter Tosh|Jimmy Cliff|Ziggy Marley', 0],

  // ==========================================
  // SONGS · MEDIUM
  // ==========================================
  ['Songs', 'medium', 'Which American singer-songwriter created the monumental concept album The Wall with Pink Floyd?', 'Roger Waters|David Gilmour|Syd Barrett|Richard Wright', 0],
  ['Songs', 'medium', 'What is the name of Taylor Swift’s debut self-titled studio album release year?', '2006|2004|2008|2010', 0],
  ['Songs', 'medium', 'Which Canadian hip-hop superstar released the album "Scorpion" containing "God\'s Plan"?', 'Drake|Kanye West|Travis Scott|J. Cole', 0],
  ['Songs', 'medium', 'What musical family was Michael Jackson originally part of before his solo career?', 'The Jackson 5|The Commodores|The Temptations|The Miracles', 0],
  ['Songs', 'medium', 'Which female vocalist sang the emotional James Bond theme "Skyfall"?', 'Adele|Billie Eilish|Shirley Bassey|Tina Turner', 0],
  ['Songs', 'medium', 'Which pop diva’s fanbase is passionately referred to as the "Little Monsters"?', 'Lady Gaga|Britney Spears|Christina Aguilera|Madonna', 0],
  ['Songs', 'medium', 'What is the highest female singing voice range in choral music?', 'Soprano|Mezzo-soprano|Contralto|Tenor', 0],
  ['Songs', 'medium', 'Which punk-rock band sang the energetic 2004 rock opera album American Idiot?', 'Green Day|Blink-182|The Offspring|Sum 41', 0],
  ['Songs', 'medium', 'Who released the blockbuster funk collaboration "Uptown Funk" alongside Mark Ronson?', 'Bruno Mars|Pharrell Williams|Justin Timberlake|The Weeknd', 0],
  ['Songs', 'medium', 'Which Swedish pop supergroup topped charts worldwide with "Dancing Queen" and "Mamma Mia"?', 'ABBA|Roxette|Ace of Base|The Cardigans', 0],

  // ==========================================
  // SONGS · DIFFICULT
  // ==========================================
  ['Songs', 'difficult', 'Which composer wrote the famous choral movement "Ode to Joy" into his Ninth Symphony while completely deaf?', 'Ludwig van Beethoven|Wolfgang Amadeus Mozart|Franz Schubert|Johannes Brahms', 0],
  ['Songs', 'difficult', 'In what year was the first Woodstock Music & Art Fair held in Bethel, New York?', '1969|1967|1971|1965', 0],
  ['Songs', 'difficult', 'What time signature is commonly used in traditional Viennese waltz music?', '3/4 time|4/4 time|6/8 time|2/4 time', 0],
  ['Songs', 'difficult', 'Which jazz trumpet virtuoso famously puffed his cheeks outward and played a tilted trumpet horn?', 'Dizzy Gillespie|Louis Armstrong|Chet Baker|Miles Davis', 0],
  ['Songs', 'difficult', 'What musical term indicates gradually increasing the volume of a passage?', 'Crescendo|Decrescendo|Staccato|Legato', 0],
  ['Songs', 'difficult', 'Which electronic music pioneer released the influential 1974 synth album Autobahn?', 'Kraftwerk|Tangerine Dream|Jean-Michel Jarre|Neu!', 0],
  ['Songs', 'difficult', 'Who was the primary songwriter and bassist for the legendary British rock band The Who?', 'John Entwistle|Pete Townshend|Roger Daltrey|Keith Moon', 0],
  ['Songs', 'difficult', 'What scale mode is formed by playing only the white keys on a piano starting and ending on D?', 'Dorian mode|Ionian mode|Phrygian mode|Mixolydian mode', 0],
  ['Songs', 'difficult', 'Which iconic Motown singer wrote and performed "Superstition" and "Sir Duke"?', 'Stevie Wonder|Marvin Gaye|Smokey Robinson|Al Green', 0],
  ['Songs', 'difficult', 'What opera by Georges Bizet features the fiery Spanish gypsy heroine and the aria "Habanera"?', 'Carmen|La Traviata|The Magic Flute|Tosca', 0],

  // ==========================================
  // GENERAL KNOWLEDGE · EASY
  // ==========================================
  ['General Knowledge', 'easy', 'How many colors are there in a traditional rainbow?', '7|6|8|5', 0],
  ['General Knowledge', 'easy', 'What is the opposite of cold?', 'Hot|Warm|Cool|Dry', 0],
  ['General Knowledge', 'easy', 'What liquid do cows produce that humans drink?', 'Milk|Juice|Water|Tea', 0],
  ['General Knowledge', 'easy', 'What is the color of ripe bananas?', 'Yellow|Green|Red|Purple', 0],
  ['General Knowledge', 'easy', 'In which direction does the Sun appear to rise each morning?', 'East|West|North|South', 0],
  ['General Knowledge', 'easy', 'How many wheels does a standard passenger car have?', '4|2|3|6', 0],
  ['General Knowledge', 'easy', 'What is the official currency of the United States?', 'US Dollar|Euro|Pound|Yen', 0],
  ['General Knowledge', 'easy', 'Which day of the week comes directly after Friday?', 'Saturday|Sunday|Thursday|Monday', 0],
  ['General Knowledge', 'easy', 'How many hours are there in one complete day?', '24|12|48|36', 0],
  ['General Knowledge', 'easy', 'Which season comes directly after winter?', 'Spring|Summer|Autumn|Fall', 0],

  // ==========================================
  // GENERAL KNOWLEDGE · MEDIUM
  // ==========================================
  ['General Knowledge', 'medium', 'What is the tallest building in the world as of 2024?', 'Burj Khalifa (Dubai)|Shanghai Tower|Merdeka 118|Abraj Al-Bait', 0],
  ['General Knowledge', 'medium', 'Which bird is universally recognized as an international symbol of peace?', 'Dove (White Pigeon)|Eagle|Swan|Seagull', 0],
  ['General Knowledge', 'medium', 'What is the national flower of Japan, celebrated during spring Hanami?', 'Cherry Blossom (Sakura)|Chrysanthemum|Lotus|Peony', 0],
  ['General Knowledge', 'medium', 'What is the largest bell inside the Elizabeth Tower in London commonly known as?', 'Big Ben|Great Tom|St. Paul\'s Bell|Victoria Bell', 0],
  ['General Knowledge', 'medium', 'Which hand tool is traditionally used to drive nails into wood?', 'Hammer|Screwdriver|Pliers|Wrench', 0],
  ['General Knowledge', 'medium', 'In bowling, what is the term for knocking down all 10 pins on the first roll?', 'Strike|Spare|Split|Turkey', 0],
  ['General Knowledge', 'medium', 'What is the official currency of Japan?', 'Japanese Yen|Won|Yuan|Ringgit', 0],
  ['General Knowledge', 'medium', 'Which chess piece can move diagonally across any number of unoccupied squares?', 'Bishop|Rook|Knight|Pawn', 0],
  ['General Knowledge', 'medium', 'How many dots are there in total on a standard six-sided die?', '21 (1+2+3+4+5+6)|20|22|24', 0],
  ['General Knowledge', 'medium', 'Which country produces the most coffee beans globally?', 'Brazil|Colombia|Vietnam|Ethiopia', 0],

  // ==========================================
  // GENERAL KNOWLEDGE · DIFFICULT
  // ==========================================
  ['General Knowledge', 'difficult', 'What is the term for a word that contains every letter of the alphabet at least once (e.g. "The quick brown fox jumps over the lazy dog")?', 'Pangram|Lipogram|Tautogram|Anagram', 0],
  ['General Knowledge', 'difficult', 'Which ancient wonder was located in Alexandria and guided sailors into harbor?', 'Lighthouse of Alexandria (Pharos)|Colossus of Rhodes|Temple of Artemis|Mausoleum at Halicarnassus', 0],
  ['General Knowledge', 'difficult', 'What is the national animal of Scotland?', 'The Unicorn|The Red Lion|The Highland Stag|The Golden Eagle', 0],
  ['General Knowledge', 'difficult', 'What does the Latin legal phrase "Habeas Corpus" literally translate to?', '"That you have the body"|"In the name of the law"|"Guilty until proven"|"For the public good"', 0],
  ['General Knowledge', 'difficult', 'Which country is home to the world\'s oldest operating university (University of al-Qarawiyyin, founded 859 AD)?', 'Morocco|Egypt|Italy|United Kingdom', 0],
  ['General Knowledge', 'difficult', 'In poker, which hand beats a Full House?', 'Four of a Kind|Flush|Straight|Three of a Kind', 0],
  ['General Knowledge', 'difficult', 'What is the standard width (gauge) of standard railway tracks worldwide?', '1,435 mm (4 ft 8.5 in)|1,520 mm|1,000 mm|1,676 mm', 0],
  ['General Knowledge', 'difficult', 'What is the name of the international police organization headquartered in Lyon, France?', 'Interpol|Europol|MI6|UN Police', 0],
  ['General Knowledge', 'difficult', 'Which constellation contains the North Star (Polaris)?', 'Ursa Minor (Little Dipper)|Ursa Major (Big Dipper)|Cassiopeia|Orion', 0],
  ['General Knowledge', 'difficult', 'In typography, what are the small decorative strokes at the end of a letter\'s main stroke called?', 'Serifs|Descenders|Ascenders|Kerning', 0],

  // ==========================================
  // SCIENCE · EASY
  // ==========================================
  ['Science', 'easy', 'What falls from clouds when it rains?', 'Water droplets|Ice cream|Sand|Leaves', 0],
  ['Science', 'easy', 'What is frozen solid water called?', 'Ice|Steam|Slush|Gel', 0],
  ['Science', 'easy', 'Which star is the center of our Solar System?', 'The Sun|Polaris|Betelgeuse|Alpha Centauri', 0],
  ['Science', 'easy', 'What body part do humans use to see?', 'Eyes|Ears|Nose|Tongue', 0],
  ['Science', 'easy', 'What gas do humans exhale when breathing out?', 'Carbon dioxide|Helium|Oxygen|Nitrogen', 0],
  ['Science', 'easy', 'What tool uses lenses to make distant celestial bodies like stars look closer?', 'Telescope|Microscope|Periscope|Binoculars', 0],
  ['Science', 'easy', 'Which animal lays the largest eggs in the world today?', 'Ostrich|Eagle|Emperor Penguin|Crocodile', 0],
  ['Science', 'easy', 'What is the boiling temperature of water in Celsius?', '100°C|0°C|50°C|200°C', 0],
  ['Science', 'easy', 'Which season has the warmest temperatures in temperate regions?', 'Summer|Winter|Autumn|Spring', 0],
  ['Science', 'easy', 'What body part pumps oxygenated blood through the circulatory system?', 'Heart|Lungs|Stomach|Kidneys', 0],

  // ==========================================
  // SCIENCE · MEDIUM
  // ==========================================
  ['Science', 'medium', 'What is the name of the protective atmospheric gas layer that absorbs ultraviolet rays from the Sun?', 'Ozone layer (O3)|Ionosphere|Carbon blanket|Troposphere', 0],
  ['Science', 'medium', 'Which blood vessels carry oxygen-rich blood away from the heart to the body tissues?', 'Arteries|Veins|Capillaries|Lymph ducts', 0],
  ['Science', 'medium', 'What subatomic particles have no electrical charge in the atomic nucleus?', 'Neutrons|Protons|Electrons|Photons', 0],
  ['Science', 'medium', 'What is the process where a solid turns directly into a gas without melting first (like dry ice)?', 'Sublimation|Condensation|Evaporation|Deposition', 0],
  ['Science', 'medium', 'What is the term for the molten rock underneath the Earth\'s surface before it erupts as lava?', 'Magma|Basalt|Obsidian|Granite', 0],
  ['Science', 'medium', 'What is the medical term for high blood pressure?', 'Hypertension|Hypotension|Arrhythmia|Tachycardia', 0],
  ['Science', 'medium', 'Which planet in our solar system has the shortest orbital period around the Sun?', 'Mercury|Venus|Mars|Earth', 0],
  ['Science', 'medium', 'What is the primary function of white blood cells (leukocytes)?', 'Fighting infections and diseases|Carrying oxygen|Clotting blood|Digestive enzyme transport', 0],
  ['Science', 'medium', 'What instrument is used to measure atmospheric air pressure?', 'Barometer|Anemometer|Hygrometer|Thermometer', 0],
  ['Science', 'medium', 'In optics, what phenomenon causes a straw in a glass of water to look bent or broken?', 'Refraction|Reflection|Diffraction|Polarization', 0],

  // ==========================================
  // SCIENCE · DIFFICULT
  // ==========================================
  ['Science', 'difficult', 'What is the only element on the periodic table that possesses no neutrons in its most common isotope?', 'Hydrogen (Protium)|Helium|Lithium|Beryllium', 0],
  ['Science', 'difficult', 'What is the second law of thermodynamics primarily concerned with?', 'Entropy always increases in an isolated system|Conservation of energy|Absolute zero temperature|Action and reaction', 0],
  ['Science', 'difficult', 'What is the name of the theoretical particle hypothesized to give mass to other fundamental particles?', 'Higgs Boson|Top Quark|Tau Neutrino|Z Boson', 0],
  ['Science', 'difficult', 'What is the term for animals that obtain body heat primarily from their external environment?', 'Ectothermic|Endothermic|Homeothermic|Thermogenic', 0],
  ['Science', 'difficult', 'Which amino acid is encoded by the universal "Start" codon (AUG) in protein translation?', 'Methionine|Leucine|Glycine|Alanine', 0],
  ['Science', 'difficult', 'What is the speed of light in vacuum in meters per second (approx)?', '299,792,458 m/s|300,000,000 km/s|150,000,000 m/s|1,080,000 m/s', 0],
  ['Science', 'difficult', 'In geology, what is the boundary separating Earth\'s crust from the underlying mantle called?', 'Mohorovičić discontinuity (Moho)|Gutenberg discontinuity|Lehmann discontinuity|Conrad line', 0],
  ['Science', 'difficult', 'What is the most electronegative element on the periodic table according to the Pauling scale?', 'Fluorine|Oxygen|Chlorine|Nitrogen', 0],
  ['Science', 'difficult', 'What type of chemical bond involves the sharing of electron pairs between atoms?', 'Covalent bond|Ionic bond|Hydrogen bond|Metallic bond', 0],
  ['Science', 'difficult', 'Which part of the inner ear contains hair cells responsible for auditory sound transduction?', 'Cochlea (Organ of Corti)|Semicircular canals|Vestibule|Tympanic membrane', 0],

  // ==========================================
  // GEOGRAPHY · EASY
  // ==========================================
  ['Geography', 'easy', 'What is the capital city of Italy?', 'Rome|Milan|Venice|Florence', 0],
  ['Geography', 'easy', 'Which country is shaped like a long, narrow strip along the western coast of South America?', 'Chile|Peru|Argentina|Colombia', 0],
  ['Geography', 'easy', 'Which desert is the largest hot desert in Africa and the world?', 'Sahara|Gobi|Kalahari|Mojave', 0],
  ['Geography', 'easy', 'What is the capital city of Spain?', 'Madrid|Barcelona|Seville|Valencia', 0],
  ['Geography', 'easy', 'In which continent is Egypt located?', 'Africa|Asia|Europe|South America', 0],
  ['Geography', 'easy', 'What is the capital of Canada?', 'Ottawa|Toronto|Vancouver|Montreal', 0],
  ['Geography', 'easy', 'Which is the largest ocean on Earth by surface area?', 'Pacific Ocean|Atlantic Ocean|Indian Ocean|Arctic Ocean', 0],
  ['Geography', 'easy', 'What is the capital city of the United Kingdom?', 'London|Edinburgh|Cardiff|Belfast', 0],
  ['Geography', 'easy', 'Which country is home to the landmark Eiffel Tower?', 'France|Germany|Belgium|Switzerland', 0],
  ['Geography', 'easy', 'What is the capital city of Australia?', 'Canberra|Sydney|Melbourne|Brisbane', 0],

  // ==========================================
  // GEOGRAPHY · MEDIUM
  // ==========================================
  ['Geography', 'medium', 'What is the capital city of Canada’s province of Quebec?', 'Quebec City|Montreal|Laval|Gatineau', 0],
  ['Geography', 'medium', 'Which sea lies between Greece and Turkey?', 'Aegean Sea|Ionian Sea|Adriatic Sea|Tyrrhenian Sea', 0],
  ['Geography', 'medium', 'What is the capital city of Ireland?', 'Dublin|Belfast|Cork|Galway', 0],
  ['Geography', 'medium', 'Which massive mountain range separates Europe from Asia in Russia?', 'Ural Mountains|Caucasus Mountains|Alps|Carpathians', 0],
  ['Geography', 'medium', 'What is the capital city of Sweden?', 'Stockholm|Gothenburg|Malmö|Uppsala', 0],
  ['Geography', 'medium', 'Which African country was formerly known as Abyssinia?', 'Ethiopia|Sudan|Eritrea|Somalia', 0],
  ['Geography', 'medium', 'What is the capital city of Thailand?', 'Bangkok|Chiang Mai|Phuket|Pattaya', 0],
  ['Geography', 'medium', 'Which Great Lake lies entirely within the borders of the United States?', 'Lake Michigan|Lake Superior|Lake Huron|Lake Erie', 0],
  ['Geography', 'medium', 'What is the capital city of Greece?', 'Athens|Thessaloniki|Patras|Heraklion', 0],
  ['Geography', 'medium', 'Which river flows through Paris, France?', 'Seine|Rhone|Loire|Danube', 0],

  // ==========================================
  // GEOGRAPHY · DIFFICULT
  // ==========================================
  ['Geography', 'difficult', 'What is the world’s deepest freshwater lake, containing over 20% of Earth\'s unfrozen surface freshwater?', 'Lake Baikal (Russia)|Lake Superior|Lake Tanganyika|Lake Victoria', 0],
  ['Geography', 'difficult', 'What is the capital city of Kazakhstan (formerly named Nur-Sultan and Akmola)?', 'Astana|Almaty|Shymkent|Aktobe', 0],
  ['Geography', 'difficult', 'Which African country is completely enclosed as an enclave inside South Africa?', 'Lesotho|Eswatini|Botswana|Namibia', 0],
  ['Geography', 'difficult', 'What is the capital of the South Pacific island nation of Fiji?', 'Suva|Nadi|Lautoka|Apia', 0],
  ['Geography', 'difficult', 'Which strait separates the Spanish enclave of Ceuta in Africa from mainland Europe?', 'Strait of Gibraltar|Strait of Messina|Strait of Bonifacio|Dardanelles', 0],
  ['Geography', 'difficult', 'What is the capital city of Suriname in northern South America?', 'Paramaribo|Georgetown|Cayenne|Caracas', 0],
  ['Geography', 'difficult', 'Which sea in Central Asia has famously shrunk by over 90% due to river diversion projects?', 'Aral Sea|Caspian Sea|Lake Balkhash|Dead Sea', 0],
  ['Geography', 'difficult', 'What is the highest capital city in the world above sea level?', 'La Paz, Bolivia|Quito, Ecuador|Bogota, Colombia|Thimphu, Bhutan', 0],
  ['Geography', 'difficult', 'Which European country contains the historic geographic regions of Bohemia and Moravia?', 'Czech Republic (Czechia)|Slovakia|Poland|Hungary', 0],
  ['Geography', 'difficult', 'What is the capital city of the West African nation of Senegal?', 'Dakar|Abidjan|Accra|Bamako', 0],

  // ==========================================
  // HISTORY · EASY
  // ==========================================
  ['History', 'easy', 'Who was the famous 16th US President who issued the Emancipation Proclamation?', 'Abraham Lincoln|George Washington|Thomas Jefferson|Theodore Roosevelt', 0],
  ['History', 'easy', 'Which ancient civilization built the Colosseum in Rome?', 'The Romans|The Greeks|The Egyptians|The Persians', 0],
  ['History', 'easy', 'What historic luxury passenger ship sank in the North Atlantic in April 1912?', 'RMS Titanic|Lusitania|Britannic|Olympic', 0],
  ['History', 'easy', 'Who was the first female Prime Minister of the United Kingdom?', 'Margaret Thatcher|Theresa May|Queen Victoria|Mary Tudor', 0],
  ['History', 'easy', 'In which country was the sport of modern Olympic Games first held in ancient times?', 'Greece|Italy|Egypt|China', 0],
  ['History', 'easy', 'Who was the famous astronomer who used a telescope to discover four moons of Jupiter in 1610?', 'Galileo Galilei|Johannes Kepler|Copernicus|Isaac Newton', 0],
  ['History', 'easy', 'Which legendary queen ruled ancient Egypt and was the last active ruler of the Ptolemaic Kingdom?', 'Cleopatra VII|Nefertiti|Hatshepsut|Sobekneferu', 0],
  ['History', 'easy', 'Which wall fell in November 1989, symbolizing the end of the Cold War in Europe?', 'The Berlin Wall|Hadrian’s Wall|The Great Wall|The Antonine Wall', 0],
  ['History', 'easy', 'Who discovered gravity after observing an apple falling from a tree according to legend?', 'Sir Isaac Newton|Albert Einstein|Galileo Galilei|René Descartes', 0],
  ['History', 'easy', 'Which year marked the signing of the US Declaration of Independence?', '1776|1789|1812|1765', 0],

  // ==========================================
  // HISTORY · MEDIUM
  // ==========================================
  ['History', 'medium', 'Which English monarch broke away from the Roman Catholic Church and had six wives?', 'Henry VIII|Henry VII|Richard III|Charles I', 0],
  ['History', 'medium', 'What was the ancient trading route network connecting China with the Mediterranean called?', 'The Silk Road|The Amber Road|The Spice Route|The Incense Trail', 0],
  ['History', 'medium', 'Who was the primary author of the American Declaration of Independence in 1776?', 'Thomas Jefferson|Benjamin Franklin|John Adams|Alexander Hamilton', 0],
  ['History', 'medium', 'Which 1944 Allied military operation invaded the beaches of Normandy, France on D-Day?', 'Operation Overlord|Operation Barbarossa|Operation Torch|Operation Market Garden', 0],
  ['History', 'medium', 'Who was the leader of the Indian independence movement renowned for nonviolent resistance?', 'Mahatma Gandhi|Jawaharlal Nehru|Sardar Patel|Bhagat Singh', 0],
  ['History', 'medium', 'In which war did the United States fight between the Northern Union and Southern Confederacy?', 'The American Civil War|The Revolutionary War|The War of 1812|The Spanish-American War', 0],
  ['History', 'medium', 'Who was the first female aviator to fly solo across the Atlantic Ocean?', 'Amelia Earhart|Bessie Coleman|Harriet Quimby|Jacqueline Cochran', 0],
  ['History', 'medium', 'Which ancient Greek city-state was famous for its fierce military lifestyle and the 300 warriors at Thermopylae?', 'Sparta|Athens|Corinth|Thebes', 0],
  ['History', 'medium', 'Which Renaissance inventor and artist drew the Vitruvian Man and painted The Last Supper?', 'Leonardo da Vinci|Michelangelo|Raphael|Donatello', 0],
  ['History', 'medium', 'Which empire was ruled by Suleiman the Magnificent in the 16th century?', 'The Ottoman Empire|The Mughal Empire|The Safavid Empire|The Byzantine Empire', 0],

  // ==========================================
  // HISTORY · DIFFICULT
  // ==========================================
  ['History', 'difficult', 'Which treaty signed in 1648 ended the Eighty Years’ War and the Thirty Years’ War in Europe?', 'Peace of Westphalia|Treaty of Utrecht|Treaty of Tordesillas|Treaty of Vienna', 0],
  ['History', 'difficult', 'Who was the ancient Carthaginian general who led war elephants across the Alps to invade Rome?', 'Hannibal Barca|Hamilcar Barca|Hasdrubal|Scipio Africanus', 0],
  ['History', 'difficult', 'What 1215 royal charter in England established the principle that everyone, even the king, is subject to the law?', 'Magna Carta (Great Charter)|Petition of Right|Bill of Rights 1689|Habeas Corpus Act', 0],
  ['History', 'difficult', 'Which pre-Columbian Mesoamerican civilization created elaborate stone calendar systems and glyph writing in the Yucatan Peninsula?', 'The Maya|The Aztec|The Inca|The Toltec', 0],
  ['History', 'difficult', 'Which Russian Tsar westernized Russia, founded St. Petersburg, and was named "The Great"?', 'Peter the Great|Ivan the Terrible|Alexander I|Nicholas I', 0],
  ['History', 'difficult', 'What was the code name of the top-secret US project that developed the atomic bomb during World War II?', 'The Manhattan Project|Project Apollo|Operation Paperclip|Project Mercury', 0],
  ['History', 'difficult', 'Which battle in 1805 is considered Napoleon’s greatest tactical victory, defeating the combined Russian and Austrian armies?', 'Battle of Austerlitz (Battle of the Three Emperors)|Battle of Waterloo|Battle of Borodino|Battle of Jena', 0],
  ['History', 'difficult', 'Who was the last ruling queen of the Kingdom of Hawaii before its overthrow in 1893?', 'Queen Liliʻuokalani|Queen Kaʻahumanu|Queen Emma|Queen Kapiʻolani', 0],
  ['History', 'difficult', 'Which Chinese maritime admiral led seven epic treasure voyages across the Indian Ocean in the early 15th century?', 'Zheng He|Sun Tzu|Cao Cao|Zhang Qian', 0],
  ['History', 'difficult', 'What was the name of the series of peace treaties signed between the Allies and Central Powers that dismantled the Austro-Hungarian Empire in 1919?', 'Treaty of Saint-Germain-en-Laye & Trianon|Treaty of Versailles|Treaty of Neuilly|Treaty of Brest-Litovsk', 0],

  // ==========================================
  // NATURE · EASY
  // ==========================================
  ['Nature', 'easy', 'What kind of animal is a grizzly?', 'Bear|Wolf|Fox|Deer', 0],
  ['Nature', 'easy', 'What is the color of most plant leaves due to chlorophyll?', 'Green|Blue|Red|Purple', 0],
  ['Nature', 'easy', 'Which marine animal has a blowhole on the top of its head to breathe air?', 'Whale|Fish|Octopus|Crab', 0],
  ['Nature', 'easy', 'What do beavers build across streams using logs and mud?', 'Dams|Nests|Bridges|Towers', 0],
  ['Nature', 'easy', 'Which animal is known as man’s best friend?', 'Dog|Cat|Hamster|Parrot', 0],
  ['Nature', 'easy', 'What season do deciduous trees typically shed their leaves?', 'Autumn (Fall)|Spring|Summer|Winter', 0],
  ['Nature', 'easy', 'What do birds have covering their skin that no other living animals have?', 'Feathers|Scales|Fur|Shells', 0],
  ['Nature', 'easy', 'Which large wild cat has a magnificent mane around the male’s head?', 'Lion|Tiger|Cheetah|Leopard', 0],
  ['Nature', 'easy', 'What natural optical phenomenon creates an arc of colors in the sky after rain?', 'Rainbow|Aurora|Mirage|Eclipse', 0],
  ['Nature', 'easy', 'What is the name of a baby dog?', 'Puppy|Kitten|Calf|Cub', 0],

  // ==========================================
  // NATURE · MEDIUM
  // ==========================================
  ['Nature', 'medium', 'What is the only species of deer where both males and females grow antlers?', 'Reindeer (Caribou)|Moose|Red Deer|White-tailed Deer', 0],
  ['Nature', 'medium', 'Which bird can fly backwards and hover in mid-air by beating its wings up to 80 times per second?', 'Hummingbird|Kingfisher|Swallow|Woodpecker', 0],
  ['Nature', 'medium', 'What is the name of the symbiotic green organism made of fungus and algae living together?', 'Lichen|Moss|Fern|Mold', 0],
  ['Nature', 'medium', 'What color is the skin of a polar bear under its thick white fur?', 'Black (to absorb heat)|Pink|White|Brown', 0],
  ['Nature', 'medium', 'What is the largest living primate in the world by body weight?', 'Eastern Gorilla|Chimpanzee|Orangutan|Mandrill', 0],
  ['Nature', 'medium', 'Which insect builds intricate honeycomb wax structures inside hives?', 'Honeybee|Wasp|Hornet|Termite', 0],
  ['Nature', 'medium', 'What organ allows fish to extract dissolved oxygen directly from water?', 'Gills|Lungs|Spiracles|Tracheae', 0],
  ['Nature', 'medium', 'What is a group of lions called?', 'A pride|A pack|A herd|A troop', 0],
  ['Nature', 'medium', 'Which mammal has a prehensile tail and sleeps hanging upside down in trees?', 'Sloth|Possum|Koala|Bat', 0],
  ['Nature', 'medium', 'What is the name of the desert plant known for storing water in thick stems and having sharp spines?', 'Cactus|Fern|Bamboo|Ivy', 0],

  // ==========================================
  // NATURE · DIFFICULT
  // ==========================================
  ['Nature', 'difficult', 'What is the only known bird species capable of digesting beeswax?', 'Greater Honeyguide|Waxwing|Hornbill|Toucan', 0],
  ['Nature', 'difficult', 'Which species of tree produces the largest and heaviest seed in the plant kingdom (the coco de mer)?', 'Lodoicea maldivica (Sea Coconut)|Baobab|Giant Sequoia|Coconut Palm', 0],
  ['Nature', 'difficult', 'What specialized sensory organ do pit vipers and boas use to detect infrared heat radiation from prey?', 'Pit organ (loreal pit)|Jacobson\'s organ|Lateral line|Ampullae of Lorenzini', 0],
  ['Nature', 'difficult', 'What is the blue blood pigment in crustaceans and octopuses that uses copper instead of iron to carry oxygen?', 'Hemocyanin|Hemoglobin|Myoglobin|Chlorocruorin', 0],
  ['Nature', 'difficult', 'What is the name of the deepest living fish ever filmed in the ocean trench?', 'Mariana snailfish (Pseudoliparis swirei)|Anglerfish|Gulper eel|Viperfish', 0],
  ['Nature', 'difficult', 'Which Australian monotreme mammal has spurs on the hind legs of males that deliver venom?', 'Platypus|Echidna|Numbat|Quoll', 0],
  ['Nature', 'difficult', 'What is the name of the ancient living fossil fish once thought extinct for 66 million years until rediscovered in 1938?', 'Coelacanth|Sturgeon|Bowfin|Lungfish', 0],
  ['Nature', 'difficult', 'What type of carnivorous plant catches insects using snap traps with sensitive trigger hairs?', 'Venus Flytrap|Pitcher plant|Sundew|Bladderwort', 0],
  ['Nature', 'difficult', 'Which marine creature possesses 24 eyes, four brains, and lethal nematocysts containing cardiac venom?', 'Box Jellyfish (Chironex fleckeri)|Portuguese Man o\' War|Lion\'s mane jellyfish|Blue-ringed octopus', 0],
  ['Nature', 'difficult', 'What biological mechanism allows arctic wood frogs to survive having their bodies frozen solid during winter?', 'Natural glucose and urea cryoprotectants|Anti-freeze feathers|Subcutaneous blubber|Hibernation cocoons', 0],

  // ==========================================
  // FOOD · EASY
  // ==========================================
  ['Food', 'easy', 'What liquid beverage is made by infusing dried tea leaves in boiling water?', 'Tea|Coffee|Lemonade|Smoothie', 0],
  ['Food', 'easy', 'What is the main staple food grain eaten by over half of the world\'s population?', 'Rice|Barley|Oats|Rye', 0],
  ['Food', 'easy', 'What breakfast food is laid by chickens?', 'Eggs|Pancakes|Waffles|Toast', 0],
  ['Food', 'easy', 'What dairy product is made by churning fresh cream?', 'Butter|Cheese|Yogurt|Cream cheese', 0],
  ['Food', 'easy', 'What Italian frozen dessert is denser and creamier than regular American ice cream?', 'Gelato|Sorbet|Granita|Parfait', 0],
  ['Food', 'easy', 'What vegetable is famously associated with rabbits in cartoons?', 'Carrot|Broccoli|Cabbage|Celery', 0],
  ['Food', 'easy', 'Which country is the birthplace of tacos and burritos?', 'Mexico|Brazil|Spain|Argentina', 0],
  ['Food', 'easy', 'What is the sweet liquid produced by maple trees in Canada?', 'Maple syrup|Agave nectar|Honey|Cane molasses', 0],
  ['Food', 'easy', 'What red fruit is used to make ketchup?', 'Tomato|Strawberry|Red pepper|Apple', 0],
  ['Food', 'easy', 'What popular breakfast pastry with a hole in the center is fried dough coated in glaze or sugar?', 'Donut (Doughnut)|Croissant|Bagel|Muffin', 0],

  // ==========================================
  // FOOD · MEDIUM
  // ==========================================
  ['Food', 'medium', 'What is the famous Japanese soup made with fermented soybean paste and dashi broth?', 'Miso soup|Ramen broth|Tom Yum|Udon broth', 0],
  ['Food', 'medium', 'What is the key ingredient in hummus alongside tahini, garlic, and lemon?', 'Chickpeas (Garbanzo beans)|Lentils|Black beans|Kidney beans', 0],
  ['Food', 'medium', 'Which European country is renowned for its Belgian waffles, chocolate, and fries?', 'Belgium|Switzerland|Netherlands|Austria', 0],
  ['Food', 'medium', 'What spice comes from the inner bark of specific trees and is used in sweet rolls and chai?', 'Cinnamon|Nutmeg|Clove|Allspice', 0],
  ['Food', 'medium', 'What is the classic Indian bread baked in a high-heat clay oven called a tandoor?', 'Naan|Tortilla|Focaccia|Pita', 0],
  ['Food', 'medium', 'What is the primary leavening agent that makes bread dough rise by converting sugars into CO2?', 'Yeast|Baking soda|Cornstarch|Gelatin', 0],
  ['Food', 'medium', 'Which aromatic herb with round green leaves is the base of traditional pesto alla Genovese?', 'Basil|Cilantro|Oregano|Parsley', 0],
  ['Food', 'medium', 'What Mexican sauce or stew is famously made with chocolate, chili peppers, and spices?', 'Mole|Salsa verde|Chimichurri|Enchilada sauce', 0],
  ['Food', 'medium', 'What is the term for a vegetarian diet that includes dairy products and eggs?', 'Lacto-ovo vegetarian|Pescatarian|Vegan|Flexitarian', 0],
  ['Food', 'medium', 'Which Italian cured pork meat is thinly sliced and served wrapped around melon or breadsticks?', 'Prosciutto|Pancetta|Salami|Mortadella', 0],

  // ==========================================
  // FOOD · DIFFICULT
  // ==========================================
  ['Food', 'difficult', 'What is the chemical reaction between amino acids and reducing sugars that gives browned food its distinctive flavor?', 'Maillard reaction|Caramelization|Fermentation|Oxidation', 0],
  ['Food', 'difficult', 'What is the traditional Japanese culinary art of grilling skewered chicken pieces over charcoal?', 'Yakitori|Kushikatsu|Robatayaki|Teppanyaki', 0],
  ['Food', 'difficult', 'Which Spanish cured ham from black Iberian pigs fed on acorns is considered one of the finest in the world?', 'Jamón Ibérico de Bellota|Prosciutto di Parma|Jamón Serrano|Speck', 0],
  ['Food', 'difficult', 'What is the classic French thick seafood soup originating from Marseille made with multiple fish species and saffron?', 'Bouillabaisse|Bisque|Chowder|Consommé', 0],
  ['Food', 'difficult', 'What mold fungus (koji-kin) is essential to fermenting soy sauce, miso, and sake?', 'Aspergillus oryzae|Penicillium chrysogenum|Saccharomyces boulardii|Rhizopus oligosporus', 0],
  ['Food', 'difficult', 'What is the Scoville heat unit measurement named after Wilbur Scoville used to quantify?', 'The pungency (spiciness) of chili peppers|The sweetness of fruit sugar|The acidity of vinegar|The bitterness of coffee', 0],
  ['Food', 'difficult', 'Which part of the cow does the traditional French cut "filet mignon" come from?', 'Tenderloin|Ribeye|Brisket|Sirloin', 0],
  ['Food', 'difficult', 'What is the unique subterranean fungus hunted using trained dogs or pigs in Italy and France?', 'Truffle|Morel|Chanterelle|Porcini', 0],
  ['Food', 'difficult', 'What is the Japanese term for the fifth basic taste sensation, described as savory or meaty richness?', 'Umami|Kokumi|Amami|Nigami', 0],
  ['Food', 'difficult', 'What traditional Mexican distilled beverage made from roasted agave hearts has a distinct smoky aroma?', 'Mezcal|Tequila|Sotol|Bacanora', 0],

  // ==========================================
  // CULTURE · EASY
  // ==========================================
  ['Culture', 'easy', 'What is the traditional greeting gesture in Hawaii accompanied by the word "Aloha"?', 'Shaka sign|Namaste bow|Handshake|High five', 0],
  ['Culture', 'easy', 'What kind of performance art combines classical music, singing, stage drama, and costumes without spoken dialogue?', 'Opera|Ballet|Stand-up comedy|Mime', 0],
  ['Culture', 'easy', 'Which holiday celebrated in December involves decorating pine trees and exchanging presents?', 'Christmas|Thanksgiving|Easter|Halloween', 0],
  ['Culture', 'easy', 'What traditional Indian wrap garment consists of a long unstitched piece of draped fabric?', 'Sari|Kimono|Hanbok|Dirndl', 0],
  ['Culture', 'easy', 'In which country is Flamenco dance a famous passionate cultural tradition?', 'Spain|Portugal|Italy|Greece', 0],
  ['Culture', 'easy', 'What is the term for a festive parade with street dancing and colorful costumes before Lent in New Orleans?', 'Mardi Gras|Cinco de Mayo|Oktoberfest|St. Patrick\'s Day', 0],
  ['Culture', 'easy', 'What color is traditionally worn on Saint Patrick’s Day to celebrate Irish heritage?', 'Green|Orange|Blue|Red', 0],
  ['Culture', 'easy', 'Which Chinese martial art is practiced with slow, graceful meditative movements for health?', 'Tai Chi (Taijiquan)|Karate|Taekwondo|Muay Thai', 0],
  ['Culture', 'easy', 'What is the name of the traditional German folk festival celebrated with pretzels and brass music in Munich?', 'Oktoberfest|Karneval|Walpurgisnacht|Fasching', 0],
  ['Culture', 'easy', 'Which traditional Japanese tea preparation ritual is known for Zen hospitality and mindfulness?', 'Japanese Tea Ceremony (Chanoyu)|Kung Fu Tea|Afternoon High Tea|Samovar ceremony', 0],

  // ==========================================
  // CULTURE · MEDIUM
  // ==========================================
  ['Culture', 'medium', 'What is the Swedish cultural custom of taking a coffee break with pastries and socializing called?', 'Fika|Hygge|Lagom|Sisu', 0],
  ['Culture', 'medium', 'In which country is the famous water-splashing New Year festival known as Songkran celebrated?', 'Thailand|Vietnam|Indonesia|Japan', 0],
  ['Culture', 'medium', 'What is the traditional Irish instrument that looks like a small handheld frame drum played with a wooden beater?', 'Bodhrán|Bouzouki|Tin Whistle|Uilleann Pipes', 0],
  ['Culture', 'medium', 'What is the Jewish seven-day period of mourning following the death of a close family member called?', 'Shiva|Kaddish|Yahrzeit|Mitzvah', 0],
  ['Culture', 'medium', 'What traditional Finnish practice involves sitting in a wood-lined steam room followed by cold water?', 'Sauna|Onsen|Hammam|Banya', 0],
  ['Culture', 'medium', 'In traditional Japanese architecture, what are the woven straw mats used for flooring called?', 'Tatami mats|Shoji screens|Fusuma doors|Tokonoma', 0],
  ['Culture', 'medium', 'What is the sacred river in India where millions of pilgrims take ritual baths to cleanse their sins?', 'Ganges River|Indus River|Yamuna River|Brahmaputra River', 0],
  ['Culture', 'medium', 'Which Mexican holiday on May 5th commemorates the victory over French forces at the Battle of Puebla?', 'Cinco de Mayo|Mexican Independence Day|Día de la Revolución|Día de los Muertos', 0],
  ['Culture', 'medium', 'What is the ancient Sanskrit philosophy of non-violence towards all living beings called?', 'Ahimsa|Karma|Dharma|Moksha', 0],
  ['Culture', 'medium', 'In Italian dining culture, what is the light alcoholic drink and snack enjoyed before dinner to stimulate appetite called?', 'Aperitivo|Digestivo|Antipasto|Primi', 0],

  // ==========================================
  // CULTURE · DIFFICULT
  // ==========================================
  ['Culture', 'difficult', 'What is the traditional Japanese theatrical art characterized by all-male actors, elaborate makeup, and dramatic poses (mie)?', 'Kabuki|Noh|Bunraku|Kyogen', 0],
  ['Culture', 'difficult', 'In traditional Balinese Hindu culture, what is the silent Day of Silence and meditation called?', 'Nyepi|Galungan|Kuningan|Saraswati', 0],
  ['Culture', 'difficult', 'What is the ancient Japanese indigenous spirituality centered on reverence for spirits known as Kami?', 'Shinto (Shintoism)|Buddhism|Taoism|Confucianism', 0],
  ['Culture', 'difficult', 'What is the Persian New Year festival celebrated on the vernal equinox with the Haft-Sin table called?', 'Nowruz|Yalda Night|Mehregan|Chaharshanbe Suri', 0],
  ['Culture', 'difficult', 'What is the traditional Turkish bath and wellness cleansing ritual originating from the Roman thermal tradition called?', 'Hammam|Banya|Onsen|Temazcal', 0],
  ['Culture', 'difficult', 'In Maori culture, what is the traditional sacred facial and body tattoo art form called?', 'Tā moko|Pe\'a|Malofie|Irezumi', 0],
  ['Culture', 'difficult', 'What is the classic Indian stringed instrument with a long hollow neck and movable frets popularized by Ravi Shankar?', 'Sitar|Sarod|Veena|Tanpura', 0],
  ['Culture', 'difficult', 'What is the traditional Ethiopian and Eritrean communal bread made from fermented teff grain used to scoop stews?', 'Injera|Roti|Lavash|Chapatis', 0],
  ['Culture', 'difficult', 'What is the UNESCO-listed ancient polyphonic singing tradition of the Republic of Georgia featuring complex microtonal harmonies?', 'Georgian polyphony|Yodeling|Throat singing|Cante alentejano', 0],
  ['Culture', 'difficult', 'In Korean culture, what is the traditional ritual celebration of a baby’s first birthday called?', 'Doljanchi (Dol)|Baek-il|Hwangap|Chuseok', 0],

  // ==========================================
  // QUICK FACTS · EASY
  // ==========================================
  ['Quick Facts', 'easy', 'How many cents make up one US dollar?', '100|50|20|10', 0],
  ['Quick Facts', 'easy', 'How many corners does a standard square have?', '4|3|5|6', 0],
  ['Quick Facts', 'easy', 'What is the opposite of up?', 'Down|Left|Right|Over', 0],
  ['Quick Facts', 'easy', 'How many eyes does a typical human have?', '2|1|3|4', 0],
  ['Quick Facts', 'easy', 'Which month has the fewest days in the calendar year?', 'February|April|June|November', 0],
  ['Quick Facts', 'easy', 'How many fingers are on one human hand including the thumb?', '5|4|6|10', 0],
  ['Quick Facts', 'easy', 'What color results from mixing red and yellow paint?', 'Orange|Purple|Green|Brown', 0],
  ['Quick Facts', 'easy', 'What is the symbol for addition in mathematics?', '+|-|x|÷', 0],
  ['Quick Facts', 'easy', 'What is the coldest season of the year?', 'Winter|Summer|Spring|Fall', 0],
  ['Quick Facts', 'easy', 'How many letters are in the word "JAM"?', '3|2|4|5', 0],

  // ==========================================
  // QUICK FACTS · MEDIUM
  // ==========================================
  ['Quick Facts', 'medium', 'What is the mathematical square of 9 (9 x 9)?', '81|72|90|64', 0],
  ['Quick Facts', 'medium', 'How many cards are in a standard deck of playing cards excluding jokers?', '52|54|48|50', 0],
  ['Quick Facts', 'medium', 'What is the Roman numeral for 50?', 'L|C|D|M', 0],
  ['Quick Facts', 'medium', 'How many degrees are in a complete full circle rotation?', '360°|180°|90°|270°', 0],
  ['Quick Facts', 'medium', 'What is the capital city of Australia?', 'Canberra|Sydney|Melbourne|Perth', 0],
  ['Quick Facts', 'medium', 'How many miles are in a 5K running race (approximately)?', '3.1 miles|5.0 miles|2.5 miles|4.2 miles', 0],
  ['Quick Facts', 'medium', 'What number is represented by the Roman numeral "XIX"?', '19|21|16|24', 0],
  ['Quick Facts', 'medium', 'How many pounds are in one US short ton?', '2,000 lbs|1,000 lbs|2,240 lbs|1,500 lbs', 0],
  ['Quick Facts', 'medium', 'What is the freezing temperature of water in Celsius?', '0°C|32°C|-10°C|100°C', 0],
  ['Quick Facts', 'medium', 'How many milliliters are in one standard liter?', '1,000 mL|100 mL|500 mL|10,000 mL', 0],

  // ==========================================
  // QUICK FACTS · DIFFICULT
  // ==========================================
  ['Quick Facts', 'difficult', 'What is the only number that has the same number of letters as its numerical value in English?', 'FOUR (4 letters)|ONE|THREE|FIVE', 0],
  ['Quick Facts', 'difficult', 'How many ridges are on the rim of a standard US quarter coin?', '119|100|150|80', 0],
  ['Quick Facts', 'difficult', 'What is the only temperature where the Fahrenheit and Celsius scales read the exact same numerical value?', '-40° (-40°F = -40°C)|0°|32°|-20°', 0],
  ['Quick Facts', 'difficult', 'How many grooves are on the surface of a standard vinyl LP per side?', '1 continuous spiral groove|Around 20|Around 50|One per track', 0],
  ['Quick Facts', 'difficult', 'What is the value of Euler’s mathematical constant "e" rounded to three decimal places?', '2.718|3.141|1.618|1.414', 0],
  ['Quick Facts', 'difficult', 'How many keys are on a standard computer keyboard in the US layout?', '104 keys|101 keys|108 keys|98 keys', 0],
  ['Quick Facts', 'difficult', 'What is the official SI base unit for measuring luminous intensity?', 'Candela (cd)|Lumen|Lux|Foot-candle', 0],
  ['Quick Facts', 'difficult', 'How many syllables are in a traditional three-line Japanese Haiku poem (5-7-5)?', '17 syllables|15 syllables|19 syllables|12 syllables', 0],
  ['Quick Facts', 'difficult', 'What is the golden ratio rounded to three decimal places?', '1.618|1.414|2.718|3.141', 0],
  ['Quick Facts', 'difficult', 'How many seconds are in a 24-hour day?', '86,400 seconds|3,600 seconds|43,200 seconds|100,000 seconds', 0]
];

module.exports = rows.map(([category, difficulty, prompt, choices, answerIndex], index) => ({
  id: `ultra-${index + 1}`,
  category,
  difficulty,
  prompt,
  options: choices.split('|'),
  answerIndex,
}));
