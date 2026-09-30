// Massive expanded question bank for Trivia Duel covering all categories and difficulties.
const rows = [
  // ==========================================
  // ANIME · EASY
  // ==========================================
  ['Anime', 'easy', 'Which anime features a notebook that can kill people when their name is written in it?', 'Death Note|Code Geass|Monster|Tokyo Ghoul', 0],
  ['Anime', 'easy', 'What is the color of Naruto\'s signature jumpsuit?', 'Orange|Blue|Green|Red', 0],
  ['Anime', 'easy', 'In Dragon Ball Z, what are the mystical orbs called that grant wishes?', 'Dragon Spheres|Dragon Balls|Spirit Gems|Crystal Orbs', 1],
  ['Anime', 'easy', 'What creature is Pikachu categorized as in Pokémon?', 'Electric Mouse|Thunder Fox|Spark Squirrel|Lightning Hamster', 0],
  ['Anime', 'easy', 'In Attack on Titan, what is the name of the main protagonist?', 'Eren Yeager|Levi Ackerman|Armin Arlert|Jean Kirstein', 0],
  ['Anime', 'easy', 'What is the name of Sailor Moon\'s talking black cat?', 'Luna|Artemis|Diana|Salem', 0],
  ['Anime', 'easy', 'Which anime is about cooking high-stakes gourmet dishes?', 'Food Wars!|Toriko|Yakitate!! Japan|Cooking Papa', 0],
  ['Anime', 'easy', 'What type of magic does Natsu Dragneel use in Fairy Tail?', 'Fire Dragon Slayer|Ice Maker|Lightning Dragon|Shadow Magic', 0],
  ['Anime', 'easy', 'In My Hero Academia, what is Izuku Midoriya\'s hero nickname?', 'Deku|Kacchan|Dynamight|All Might', 0],
  ['Anime', 'easy', 'What is the name of the Spirit Detective in YuYu Hakusho?', 'Yusuke Urameshi|Hiei|Kurama|Kuwabara', 0],

  // ==========================================
  // ANIME · MEDIUM
  // ==========================================
  ['Anime', 'medium', 'What is the name of the demon sealed inside Naruto?', 'Kurama (Nine-Tails)|Shukaku|Gyuki|Matatabi', 0],
  ['Anime', 'medium', 'In Jujutsu Kaisen, who is known as the strongest modern jujutsu sorcerer?', 'Satoru Gojo|Suguru Geto|Kento Nanami|Megumi Fushiguro', 0],
  ['Anime', 'medium', 'What is the real identity of Kira in Death Note?', 'Light Yagami|L Lawliet|Near|Mello', 0],
  ['Anime', 'medium', 'In Hunter x Hunter, what is Gon\'s signature Nen attack technique based on?', 'Rock-Paper-Scissors (Jajanken)|Yo-yo|Fishing Hook|Bungee Gum', 0],
  ['Anime', 'medium', 'What is the military branch called that fights Titans outside the walls?', 'The Survey Corps|The Military Police|The Garrison|The Wall Cult', 0],
  ['Anime', 'medium', 'In Bleach, what is Ichigo Kurosaki\'s Zanpakuto sword called?', 'Zangetsu|Senbonzakura|Hyorinmaru|Wabisuke', 0],
  ['Anime', 'medium', 'In Steins;Gate, what household appliance is modified to send D-mails to the past?', 'Microwave oven|Toaster|Refrigerator|Washing machine', 0],
  ['Anime', 'medium', 'Who is the captain of the 10th Division in the Soul Society in Bleach?', 'Toshiro Hitsugaya|Byakuya Kuchiki|Kenpachi Zaraki|Shunsui Kyoraku', 0],
  ['Anime', 'medium', 'What is the name of the virtual MMORPG death-game in Sword Art Online?', 'Sword Art Online (Aincrad)|Gun Gale Online|ALfheim Online|Underworld', 0],
  ['Anime', 'medium', 'In Chainsaw Man, what is the name of the dog-like Chainsaw Devil?', 'Pochita|Kon|Makima|Power', 0],

  // ==========================================
  // ANIME · DIFFICULT
  // ==========================================
  ['Anime', 'difficult', 'In Neon Genesis Evangelion, what are the giant bio-mechanical mechas powered by?', 'S² Engines / Umbilical Cables|Minovsky Particles|Spiral Energy|Solar Cores', 0],
  ['Anime', 'difficult', 'In Code Geass, what is Lelouch\'s alter ego and symbol of rebellion called?', 'Zero|V|Kira|L', 0],
  ['Anime', 'difficult', 'In Fullmetal Alchemist: Brotherhood, who is the creator of the Homunculi?', 'Father (The Dwarf in the Flask)|Van Hohenheim|King Bradley|Envy', 0],
  ['Anime', 'difficult', 'In One Piece, which Ancient Weapon is actually the Mermaid Princess Shirahoshi?', 'Poseidon|Pluton|Uranus|Jupiter', 0],
  ['Anime', 'difficult', 'In Berserk, what is the ominous artifact that summons the God Hand called?', 'Behelit (Crimson Beherit)|Dragon Slayer|Brand of Sacrifice|Astral Relic', 0],
  ['Anime', 'difficult', 'In Vinland Saga, which historic king of Denmark and England does Thorfinn interact with?', 'Canute the Great|Ragnar Lothbrok|Harald Bluetooth|Sweyn Forkbeard', 0],
  ['Anime', 'difficult', 'In Fate/stay night, what is the true identity of Saber in the Fifth Holy Grail War?', 'Artoria Pendragon (King Arthur)|Joan of Arc|Mordred|Nero Claudius', 0],
  ['Anime', 'difficult', 'In JoJo\'s Bizarre Adventure Part 3, what is Dio Brando\'s Stand called?', 'The World|Star Platinum|Crazy Diamond|King Crimson', 0],
  ['Anime', 'difficult', 'In Monster, what is the name of the chilling serial manipulator saved by Dr. Tenma?', 'Johan Liebert|Roberto|Franz Bonaparta|Wolfgang Grimmer', 0],
  ['Anime', 'difficult', 'In Puella Magi Madoka Magica, what do Soul Gems turn into if tainted by despair?', 'Grief Seeds|Dark Orbs|Witch Cores|Black Diamonds', 0],

  // ==========================================
  // MOVIES · EASY
  // ==========================================
  ['Movies', 'easy', 'Which animated movie features the song "Let It Go"?', 'Frozen|Tangled|Brave|Moana', 0],
  ['Movies', 'easy', 'What kind of animal is Po in Kung Fu Panda?', 'Giant Panda|Red Panda|Grizzly Bear|Koala', 0],
  ['Movies', 'easy', 'Who is Harry Potter\'s loyal pet owl?', 'Hedwig|Errol|Fawkes|Scabbers', 0],
  ['Movies', 'easy', 'Which Marvel superhero carries an indestructible vibranium shield?', 'Captain America|Iron Man|Thor|Hawkeye', 0],
  ['Movies', 'easy', 'In Aladdin, what color is the Genie voiced by Robin Williams?', 'Blue|Red|Green|Purple', 0],
  ['Movies', 'easy', 'What is the name of the green ogre who lives in a swamp?', 'Shrek|Fiona|Donkey|Lord Farquaad', 0],
  ['Movies', 'easy', 'Which film features the iconic line "May the Force be with you"?', 'Star Wars|Star Trek|Dune|Interstellar', 0],
  ['Movies', 'easy', 'Who plays the eccentric chocolate maker Willy Wonka in the 2005 film?', 'Johnny Depp|Gene Wilder|Jim Carrey|Timothée Chalamet', 0],
  ['Movies', 'easy', 'In Monsters, Inc., what do the monsters collect to power their city?', 'Children\'s screams & laughter|Lightning energy|Coal|Solar power', 0],
  ['Movies', 'easy', 'Which classic film features Dorothy, Toto, and a Tin Man?', 'The Wizard of Oz|Mary Poppins|Chitty Chitty Bang Bang|Alice in Wonderland', 0],

  // ==========================================
  // MOVIES · MEDIUM
  // ==========================================
  ['Movies', 'medium', 'Who directed the sci-fi thriller Inception (2010)?', 'Christopher Nolan|Denis Villeneuve|David Fincher|Quentin Tarantino', 0],
  ['Movies', 'medium', 'What is the name of the fictional town where Stranger Things is set?', 'Hawkins|Riverdale|Sunnydale|Twin Peaks', 0],
  ['Movies', 'medium', 'Which movie won the Best Picture Academy Award in 2020 as the first foreign language winner?', 'Parasite|Roma|Drive My Car|Another Round', 0],
  ['Movies', 'medium', 'Who played the Joker in The Dark Knight (2008)?', 'Heath Ledger|Joaquin Phoenix|Jack Nicholson|Jared Leto', 0],
  ['Movies', 'medium', 'In Pulp Fiction, what is inside Marcellus Wallace\'s glowing briefcase?', 'It is never revealed|A gold statue|Diamonds|Nuclear codes', 0],
  ['Movies', 'medium', 'What is the real name of the Black Widow in the Marvel Cinematic Universe?', 'Natasha Romanoff|Wanda Maximoff|Carol Danvers|Maria Hill', 0],
  ['Movies', 'medium', 'Which film directed by Bong Joon-ho features an underground train in a frozen world?', 'Snowpiercer|The Host|Okja|Memories of Murder', 0],
  ['Movies', 'medium', 'In The Lord of the Rings, where must the One Ring be destroyed?', 'Mount Doom|Isengard|Moria|Rivendell', 0],
  ['Movies', 'medium', 'Which Quentin Tarantino movie features the vengeful assassin "The Bride"?', 'Kill Bill|Inglourious Basterds|Django Unchained|Jackie Brown', 0],
  ['Movies', 'medium', 'In Interstellar, what is the name of the supermassive black hole?', 'Gargantua|Cygnus X-1|Sagittarius A|Prometheus', 0],

  // ==========================================
  // MOVIES · DIFFICULT
  // ==========================================
  ['Movies', 'difficult', 'Which 1941 Orson Welles masterpiece centers around the dying word "Rosebud"?', 'Citizen Kane|The Third Man|Touch of Evil|Casablanca', 0],
  ['Movies', 'difficult', 'In Blade Runner (1982), what test is used to detect replicants?', 'Voight-Kampff test|Turing test|Rorschach test|Nexus assessment', 0],
  ['Movies', 'difficult', 'Who composed the iconic musical score for The Good, the Bad and the Ugly?', 'Ennio Morricone|John Williams|Nino Rota|Hans Zimmer', 0],
  ['Movies', 'difficult', 'Which film won the first-ever Academy Award for Best Animated Feature in 2001?', 'Shrek|Monsters, Inc.|Jimmy Neutron|Ice Age', 0],
  ['Movies', 'difficult', 'In Stanley Kubrick\'s 2001: A Space Odyssey, what is the name of the sentient supercomputer?', 'HAL 9000|Skynet|Deep Thought|Mother', 0],
  ['Movies', 'difficult', 'Which actor played Vito Corleone in The Godfather: Part II winning an Oscar for it?', 'Robert De Niro|Al Pacino|Marlon Brando|James Caan', 0],
  ['Movies', 'difficult', 'In Mad Max: Fury Road, who plays the fierce warrior Imperator Furiosa?', 'Charlize Theron|Anya Taylor-Joy|Emily Blunt|Sigourney Weaver', 0],
  ['Movies', 'difficult', 'What is the name of the cursed videotape ghost in the Japanese horror original Ringu?', 'Sadako Yamamura|Kayako Saeki|Toshio|Samara', 0],
  ['Movies', 'difficult', 'Which French director directed the revolutionary New Wave film The 400 Blows?', 'François Truffaut|Jean-Luc Godard|Jacques Demy|Claude Chabrol', 0],
  ['Movies', 'difficult', 'In Wes Anderson\'s The Grand Budapest Hotel, what famous painting is stolen?', 'Boy with Apple|The Starry Night|Girl with a Pearl Earring|The Kiss', 0],

  // ==========================================
  // SONGS · EASY
  // ==========================================
  ['Songs', 'easy', 'Who is crowned the "King of Pop"?', 'Michael Jackson|Prince|Elvis Presley|Stevie Wonder', 0],
  ['Songs', 'easy', 'Which pop star released the massive hit album "1989"?', 'Taylor Swift|Katy Perry|Ariana Grande|Selena Gomez', 0],
  ['Songs', 'easy', 'Who sang the 2017 global smash hit "Shape of You"?', 'Ed Sheeran|Shawn Mendes|Harry Styles|Justin Bieber', 0],
  ['Songs', 'easy', 'Which band sang the anthem "Bohemian Rhapsody"?', 'Queen|The Beatles|Led Zeppelin|Pink Floyd', 0],
  ['Songs', 'easy', 'What musical instrument has 88 black and white keys?', 'Piano|Accordion|Harpsichord|Organ', 0],
  ['Songs', 'easy', 'Who released the record-breaking hit "Blinding Lights"?', 'The Weeknd|Drake|Bruno Mars|Post Malone', 0],
  ['Songs', 'easy', 'Which British singer-songwriter sang "Someone Like You" and "Rolling in the Deep"?', 'Adele|Dua Lipa|Ellie Goulding|Jessie J', 0],
  ['Songs', 'easy', 'What genre of music is Eminem famous for?', 'Hip Hop / Rap|Country|Reggae|Jazz', 0],
  ['Songs', 'easy', 'Which girl group was Beyoncé originally a member of?', 'Destiny\'s Child|TLC|Spice Girls|Fifth Harmony', 0],
  ['Songs', 'easy', 'Which hit song by Luis Fonsi and Daddy Yankee took over the world in 2017?', 'Despacito|Mi Gente|Bailando|Danza Kuduro', 0],

  // ==========================================
  // SONGS · MEDIUM
  // ==========================================
  ['Songs', 'medium', 'Which iconic Beatles album features the four band members walking across a zebra crossing?', 'Abbey Road|Sgt. Pepper\'s|Revolver|Rubber Soul', 0],
  ['Songs', 'medium', 'What is the real name of the artist known as Eminem?', 'Marshall Mathers|Curtis Jackson|Calvin Broadus|Shawn Carter', 0],
  ['Songs', 'medium', 'Which artist released the groundbreaking visual album "Lemonade" in 2016?', 'Beyoncé|Rihanna|Solange|Janelle Monáe', 0],
  ['Songs', 'medium', 'Which song by Nirvana opened their breakthrough 1991 album Nevermind?', 'Smells Like Teen Spirit|Come as You Are|Lithium|In Bloom', 0],
  ['Songs', 'medium', 'Which country does superstar singer Rihanna hail from?', 'Barbados|Jamaica|Trinidad and Tobago|Bahamas', 0],
  ['Songs', 'medium', 'Who composed the four violin concertos collectively known as "The Four Seasons"?', 'Antonio Vivaldi|Johann Sebastian Bach|Wolfgang Amadeus Mozart|Ludwig van Beethoven', 0],
  ['Songs', 'medium', 'Which duo produced electronic hits like "Get Lucky" wearing signature robot helmets?', 'Daft Punk|The Chemical Brothers|Justice|Deadmau5', 0],
  ['Songs', 'medium', 'What is the best-selling studio album of all time worldwide?', 'Thriller (Michael Jackson)|Back in Black (AC/DC)|The Dark Side of the Moon (Pink Floyd)|Hotel California (Eagles)', 0],
  ['Songs', 'medium', 'Which female rapper released the viral single "Super Bass" and the album Pink Friday?', 'Nicki Minaj|Cardi B|Megan Thee Stallion|Doja Cat', 0],
  ['Songs', 'medium', 'What year did MTV first launch with the music video "Video Killed the Radio Star"?', '1981|1979|1985|1989', 0],

  // ==========================================
  // SONGS · DIFFICULT
  // ==========================================
  ['Songs', 'difficult', 'Which legendary guitarist famously played the Star-Spangled Banner at Woodstock in 1969?', 'Jimi Hendrix|Eric Clapton|Jimmy Page|Carlos Santana', 0],
  ['Songs', 'difficult', 'How many symphonies did Ludwig van Beethoven complete during his lifetime?', '9|7|10|12', 0],
  ['Songs', 'difficult', 'Which rock band recorded the acclaimed 1997 art-rock album OK Computer?', 'Radiohead|Muse|Coldplay|Blur', 0],
  ['Songs', 'difficult', 'What is the tempo marking in classical music indicating a very slow, solemn pace?', 'Largo|Allegro|Presto|Vivace', 0],
  ['Songs', 'difficult', 'Which jazz legend was nicknamed "Bird" and pioneered bebop on the alto saxophone?', 'Charlie Parker|Miles Davis|John Coltrane|Dizzy Gillespie', 0],
  ['Songs', 'difficult', 'In music theory, what is an interval spanning eight full diatonic scale steps called?', 'An Octave|A Fifth|A Fourth|A Triad', 0],
  ['Songs', 'difficult', 'Which musician recorded the iconic 1959 modal jazz masterpiece "Kind of Blue"?', 'Miles Davis|Thelonious Monk|Bill Evans|Herbie Hancock', 0],
  ['Songs', 'difficult', 'Which Russian composer wrote the ballet scores for The Nutcracker and Swan Lake?', 'Pyotr Ilyich Tchaikovsky|Igor Stravinsky|Sergei Rachmaninoff|Dmitri Shostakovich', 0],
  ['Songs', 'difficult', 'Which British punk band released the seminal 1977 album "Never Mind the Bollocks"?', 'Sex Pistols|The Clash|The Damned|Buzzcocks', 0],
  ['Songs', 'difficult', 'What note frequency in Hertz (Hz) is standard concert pitch A above middle C?', '440 Hz|432 Hz|415 Hz|460 Hz', 0],

  // ==========================================
  // GENERAL KNOWLEDGE · EASY
  // ==========================================
  ['General Knowledge', 'easy', 'How many days are in a standard non-leap calendar year?', '365|366|360|364', 0],
  ['General Knowledge', 'easy', 'What primary color mixed with blue produces green?', 'Yellow|Red|Purple|Orange', 0],
  ['General Knowledge', 'easy', 'How many continents are there on planet Earth?', '7|5|6|8', 0],
  ['General Knowledge', 'easy', 'What is the national currency of the United Kingdom?', 'Pound Sterling|Euro|Dollar|Franc', 0],
  ['General Knowledge', 'easy', 'Which country is home to the Taj Mahal?', 'India|Pakistan|Bangladesh|Nepal', 0],
  ['General Knowledge', 'easy', 'What is the main language spoken in Brazil?', 'Portuguese|Spanish|English|French', 0],
  ['General Knowledge', 'easy', 'How many sides does a hexagon have?', '6|5|7|8', 0],
  ['General Knowledge', 'easy', 'Which animal is known as the "Ship of the Desert"?', 'Camel|Horse|Donkey|Elephant', 0],
  ['General Knowledge', 'easy', 'Which hand do most humans use as their dominant hand?', 'Right hand|Left hand|Both equally|Neither', 0],
  ['General Knowledge', 'easy', 'Which famous tower leans in Italy?', 'Leaning Tower of Pisa|Eiffel Tower|Big Ben|Colosseum', 0],

  // ==========================================
  // GENERAL KNOWLEDGE · MEDIUM
  // ==========================================
  ['General Knowledge', 'medium', 'What is the largest landlocked country in the world by land area?', 'Kazakhstan|Mongolia|Chad|Bolivia', 0],
  ['General Knowledge', 'medium', 'In which city is the headquarters of the United Nations located?', 'New York City|Geneva|Paris|Vienna', 0],
  ['General Knowledge', 'medium', 'Which international prize is awarded annually in Oslo, Norway rather than Stockholm?', 'Nobel Peace Prize|Nobel Literature Prize|Nobel Physics Prize|Nobel Chemistry Prize', 0],
  ['General Knowledge', 'medium', 'What does the Roman numeral "M" represent?', '1000|500|100|50', 0],
  ['General Knowledge', 'medium', 'What is the currency of South Africa?', 'Rand|Dinar|Rupee|Shilling', 0],
  ['General Knowledge', 'medium', 'Which country produces the most olive oil in the world?', 'Spain|Italy|Greece|Portugal', 0],
  ['General Knowledge', 'medium', 'In which sea did the ancient city of Atlantis supposedly sink according to legend?', 'Atlantic Ocean|Mediterranean Sea|Aegean Sea|Black Sea', 0],
  ['General Knowledge', 'medium', 'What is the term for a word that reads the same backward as forward (like "radar")?', 'Palindrome|Anagram|Acronym|Homophone', 0],
  ['General Knowledge', 'medium', 'Which is the largest island in the world that is not a continent?', 'Greenland|Madagascar|New Guinea|Borneo', 0],
  ['General Knowledge', 'medium', 'How many pieces does each player start with in a standard game of chess?', '16|14|18|20', 0],

  // ==========================================
  // GENERAL KNOWLEDGE · DIFFICULT
  // ==========================================
  ['General Knowledge', 'difficult', 'What is the rarest blood type in the ABO/Rh blood system worldwide?', 'AB Negative|O Negative|B Negative|A Negative', 0],
  ['General Knowledge', 'difficult', 'Which country has three official capital cities: Pretoria, Cape Town, and Bloemfontein?', 'South Africa|Bolivia|Malaysia|Chile', 0],
  ['General Knowledge', 'difficult', 'What year did the Chernobyl nuclear disaster occur?', '1986|1979|1989|1991', 0],
  ['General Knowledge', 'difficult', 'What is the official currency of Switzerland?', 'Swiss Franc|Euro|Krona|Mark', 0],
  ['General Knowledge', 'difficult', 'In heraldry, what color does the term "Azure" refer to?', 'Blue|Red|Green|Purple', 0],
  ['General Knowledge', 'difficult', 'Which country was the first to grant women the right to vote in 1893?', 'New Zealand|Finland|United Kingdom|United States', 0],
  ['General Knowledge', 'difficult', 'What is the only sea without any land coastline?', 'Sargasso Sea|Red Sea|Baltic Sea|Coral Sea', 0],
  ['General Knowledge', 'difficult', 'Which African nation was never formally colonized by European powers?', 'Ethiopia|Nigeria|Kenya|Ghana', 0],
  ['General Knowledge', 'difficult', 'What is the name of the standard international radio phonetic word for the letter "M"?', 'Mike|Metro|Mars|Mercury', 0],
  ['General Knowledge', 'difficult', 'What does the abbreviation "HTTP" stand for in web addresses?', 'HyperText Transfer Protocol|High Text Transmission Process|Hyper Tech Tag Protocol|Host Transfer Text Program', 0],

  // ==========================================
  // SCIENCE · EASY
  // ==========================================
  ['Science', 'easy', 'What planet do we live on?', 'Earth|Mars|Venus|Jupiter', 0],
  ['Science', 'easy', 'What is the human body\'s largest organ?', 'Skin|Liver|Lungs|Brain', 0],
  ['Science', 'easy', 'What state of matter is steam?', 'Gas|Liquid|Solid|Plasma', 0],
  ['Science', 'easy', 'Which natural satellite orbits the Earth?', 'The Moon|Titan|Europa|Phobos', 0],
  ['Science', 'easy', 'What green pigment in plants absorbs sunlight for photosynthesis?', 'Chlorophyll|Carotene|Melanin|Anthocyanin', 0],
  ['Science', 'easy', 'What is the chemical formula for ordinary table salt?', 'NaCl|H2O|CO2|KCl', 0],
  ['Science', 'easy', 'What kind of animal is a frog?', 'Amphibian|Reptile|Mammal|Fish', 0],
  ['Science', 'easy', 'Which sense uses olfactory nerves?', 'Smell|Taste|Touch|Hearing', 0],
  ['Science', 'easy', 'What gas do humans need to breathe in to survive?', 'Oxygen|Carbon dioxide|Helium|Methane', 0],
  ['Science', 'easy', 'What force causes a ball thrown up into the air to come back down?', 'Gravity|Friction|Centrifugal force|Buoyancy', 0],

  // ==========================================
  // SCIENCE · MEDIUM
  // ==========================================
  ['Science', 'medium', 'What is the powerhouse organelle of the eukaryotic cell?', 'Mitochondrion|Ribosome|Golgi apparatus|Nucleus', 0],
  ['Science', 'medium', 'What is the atomic number of Carbon on the periodic table?', '6|8|12|14', 0],
  ['Science', 'medium', 'Which scientist developed the Three Laws of Motion?', 'Sir Isaac Newton|Albert Einstein|Galileo Galilei|Johannes Kepler', 0],
  ['Science', 'medium', 'What type of eclipse occurs when the Moon passes directly between the Sun and Earth?', 'Solar eclipse|Lunar eclipse|Stellar eclipse|Planetary eclipse', 0],
  ['Science', 'medium', 'What is the pH level of pure distilled water at 25°C?', '7 (Neutral)|0 (Acidic)|14 (Basic)|5 (Mildly acidic)', 0],
  ['Science', 'medium', 'What type of rock is formed from cooled magma or lava?', 'Igneous rock|Sedimentary rock|Metamorphic rock|Limestone', 0],
  ['Science', 'medium', 'Which part of the brain coordinates muscle balance and motor movement?', 'Cerebellum|Cerebrum|Brainstem|Hypothalamus', 0],
  ['Science', 'medium', 'What is the SI unit of electrical resistance?', 'Ohm|Volt|Ampere|Watt', 0],
  ['Science', 'medium', 'What is the half-life element commonly used to date ancient organic artifacts?', 'Carbon-14|Uranium-235|Potassium-40|Lead-206', 0],
  ['Science', 'medium', 'Which layer of the atmosphere contains the ozone layer that blocks UV rays?', 'Stratosphere|Troposphere|Mesosphere|Thermosphere', 0],

  // ==========================================
  // SCIENCE · DIFFICULT
  // ==========================================
  ['Science', 'difficult', 'What fundamental particle carries the strong nuclear force binding quarks together?', 'Gluon|Photon|W Boson|Graviton', 0],
  ['Science', 'difficult', 'What is the only metal element that forms an amalgam with mercury?', 'Almost all metals except iron, platinum, and tungsten|Lead|Copper|Gold', 0],
  ['Science', 'difficult', 'What is the chemical name for vitamin C?', 'Ascorbic acid|Retinol|Thiamine|Tocopherol', 0],
  ['Science', 'difficult', 'What is the most abundant element in the known universe by mass?', 'Hydrogen|Helium|Oxygen|Carbon', 0],
  ['Science', 'difficult', 'In genetics, which nitrogenous base pairs with Adenine in RNA molecules?', 'Uracil|Thymine|Cytosine|Guanine', 0],
  ['Science', 'difficult', 'What is the point on a phase diagram where solid, liquid, and gas coexist in thermodynamic equilibrium?', 'Triple point|Critical point|Boiling point|Sublimation limit', 0],
  ['Science', 'difficult', 'What constant, represented by h, relates photon energy to frequency (E = hf)?', 'Planck\'s constant|Boltzmann\'s constant|Avogadro\'s number|Hubble constant', 0],
  ['Science', 'difficult', 'Which organ in the human body contains the islets of Langerhans producing insulin?', 'Pancreas|Liver|Spleen|Gallbladder', 0],
  ['Science', 'difficult', 'What is the SI unit of magnetic flux density?', 'Tesla|Weber|Henry|Gauss', 0],
  ['Science', 'difficult', 'Which astrophysical effect causes spectral lines from receding galaxies to shift toward longer wavelengths?', 'Redshift (Doppler effect)|Blueshift|Refraction|Rayleigh scattering', 0],

  // ==========================================
  // GEOGRAPHY · EASY
  // ==========================================
  ['Geography', 'easy', 'What is the capital city of France?', 'Paris|Lyon|Marseille|Nice', 0],
  ['Geography', 'easy', 'Which river is famously considered the longest river in the world?', 'Nile|Amazon|Yangtze|Mississippi', 0],
  ['Geography', 'easy', 'Which country is home to the Great Barrier Reef?', 'Australia|New Zealand|Fiji|Philippines', 0],
  ['Geography', 'easy', 'In which continent is the Amazon Rainforest located?', 'South America|Africa|Asia|North America', 0],
  ['Geography', 'easy', 'What is the capital of the United States?', 'Washington, D.C.|New York City|Los Angeles|Chicago', 0],
  ['Geography', 'easy', 'Which ocean lies between North America and Europe?', 'Atlantic Ocean|Pacific Ocean|Indian Ocean|Arctic Ocean', 0],
  ['Geography', 'easy', 'What is the capital city of Germany?', 'Berlin|Munich|Frankfurt|Hamburg', 0],
  ['Geography', 'easy', 'Which country has a red circle in the center of its national flag?', 'Japan|China|South Korea|Vietnam', 0],
  ['Geography', 'easy', 'What is the tallest mountain above sea level on Earth?', 'Mount Everest|K2|Kangchenjunga|Kilimanjaro', 0],
  ['Geography', 'easy', 'Which country is directly north of the United States?', 'Canada|Mexico|Cuba|Greenland', 0],

  // ==========================================
  // GEOGRAPHY · MEDIUM
  // ==========================================
  ['Geography', 'medium', 'What is the capital city of Portugal?', 'Lisbon|Porto|Coimbra|Braga', 0],
  ['Geography', 'medium', 'Which strait connects the Atlantic Ocean to the Mediterranean Sea?', 'Strait of Gibraltar|Bosphorus Strait|Strait of Hormuz|Strait of Malacca', 0],
  ['Geography', 'medium', 'What is the capital city of Argentina?', 'Buenos Aires|Cordoba|Rosario|Mendoza', 0],
  ['Geography', 'medium', 'Which European country is known for its dramatic fjords?', 'Norway|Sweden|Finland|Denmark', 0],
  ['Geography', 'medium', 'What is the longest mountain range on land in the world?', 'The Andes|The Himalayas|The Rocky Mountains|The Alps', 0],
  ['Geography', 'medium', 'Which island nation in the Indian Ocean has Antananarivo as its capital?', 'Madagascar|Mauritius|Seychelles|Comoros', 0],
  ['Geography', 'medium', 'In which country is the historic city of Istanbul located?', 'Turkey|Greece|Bulgaria|Cyprus', 0],
  ['Geography', 'medium', 'Which African river crosses the equator twice?', 'Congo River|Nile River|Niger River|Zambezi River', 0],
  ['Geography', 'medium', 'What is the capital city of Vietnam?', 'Hanoi|Ho Chi Minh City|Da Nang|Hai Phong', 0],
  ['Geography', 'medium', 'Which large island is divided between Indonesia, Malaysia, and Brunei?', 'Borneo|Sumatra|Java|Sulawesi', 0],

  // ==========================================
  // GEOGRAPHY · DIFFICULT
  // ==========================================
  ['Geography', 'difficult', 'What is the capital city of Mongolia?', 'Ulaanbaatar|Astana|Bishkek|Tashkent', 0],
  ['Geography', 'difficult', 'Which African nation has the lowest elevation point on the African continent (Lake Assal)?', 'Djibouti|Ethiopia|Eritrea|Somalia', 0],
  ['Geography', 'difficult', 'What is the deepest oceanic trench on Earth?', 'Mariana Trench|Tonga Trench|Puerto Rico Trench|Java Trench', 0],
  ['Geography', 'difficult', 'Which small European principality is located between Spain and France in the Pyrenees?', 'Andorra|Monaco|Liechtenstein|San Marino', 0],
  ['Geography', 'difficult', 'What is the capital city of Malta?', 'Valletta|Sliema|Mdina|Victoria', 0],
  ['Geography', 'difficult', 'Which country possesses the remote volcanic archipelago of Tristan da Cunha?', 'United Kingdom|France|Portugal|Norway', 0],
  ['Geography', 'difficult', 'What is the name of the narrow sea channel that separates Great Britain from France?', 'English Channel|North Sea|Irish Sea|St. George\'s Channel', 0],
  ['Geography', 'difficult', 'Which city is the northernmost national capital of a sovereign country in the world?', 'Reykjavik (Iceland)|Oslo (Norway)|Helsinki (Finland)|Stockholm (Sweden)', 0],
  ['Geography', 'difficult', 'Which landlocked South American country has its judicial capital at Sucre?', 'Bolivia|Paraguay|Ecuador|Uruguay', 0],
  ['Geography', 'difficult', 'What is the highest mountain peak in North America (formerly Mount McKinley)?', 'Denali|Mount Logan|Mount Rainier|Mount Whitney', 0],

  // ==========================================
  // HISTORY · EASY
  // ==========================================
  ['History', 'easy', 'Which country was ruled by Julius Caesar?', 'Ancient Rome|Ancient Greece|Ancient Egypt|Persia', 0],
  ['History', 'easy', 'Who was the famous civil rights leader who gave the "I Have a Dream" speech?', 'Martin Luther King Jr.|Malcolm X|Nelson Mandela|Rosa Parks', 0],
  ['History', 'easy', 'In which country was the Great Wall built to protect against invasions?', 'China|Japan|India|Mongolia', 0],
  ['History', 'easy', 'Who painted the Mona Lisa during the Italian Renaissance?', 'Leonardo da Vinci|Michelangelo|Raphael|Donatello', 0],
  ['History', 'easy', 'Which year marked the end of World War II?', '1945|1939|1941|1950', 0],
  ['History', 'easy', 'What ancient Egyptian structures served as royal tombs?', 'Pyramids|Ziggurats|Castles|Colosseums', 0],
  ['History', 'easy', 'Who was the queen of England during the Elizabethan Era of the 16th century?', 'Queen Elizabeth I|Queen Victoria|Mary, Queen of Scots|Queen Anne', 0],
  ['History', 'easy', 'What historic event is celebrated on the 4th of July in the United States?', 'Independence Day|Thanksgiving|Labor Day|Constitution Day', 0],
  ['History', 'easy', 'Who led the nonviolent Salt March for Indian independence in 1930?', 'Mahatma Gandhi|Jawaharlal Nehru|Subhas Chandra Bose|Bhagat Singh', 0],
  ['History', 'easy', 'Which European country sent Christopher Columbus across the Atlantic in 1492?', 'Spain|Portugal|Italy|England', 0],

  // ==========================================
  // HISTORY · MEDIUM
  // ==========================================
  ['History', 'medium', 'Which French military leader rose during the Revolution and crowned himself Emperor?', 'Napoleon Bonaparte|Louis XIV|Charles de Gaulle|Robespierre', 0],
  ['History', 'medium', 'In which city was Archduke Franz Ferdinand assassinated in 1914, sparking World War I?', 'Sarajevo|Vienna|Belgrade|Budapest', 0],
  ['History', 'medium', 'Who was the female pharaoh who allied with Julius Caesar and Mark Antony?', 'Cleopatra VII|Nefertiti|Hatshepsut|Twosret', 0],
  ['History', 'medium', 'Which revolution broke out in 1789 with the storming of the Bastille?', 'French Revolution|Russian Revolution|American Revolution|Industrial Revolution', 0],
  ['History', 'medium', 'Who was the leader of the Soviet Union during World War II?', 'Joseph Stalin|Vladimir Lenin|Nikita Khrushchev|Leon Trotsky', 0],
  ['History', 'medium', 'Which ancient Greek philosopher was the teacher of Alexander the Great?', 'Aristotle|Plato|Socrates|Pythagoras', 0],
  ['History', 'medium', 'What wall was built by the Romans across northern Britain to fend off northern tribes?', 'Hadrian\'s Wall|Antonine Wall|Offa\'s Dyke|Aurelian Wall', 0],
  ['History', 'medium', 'Which dynasty ruled China for over two centuries and built the Porcelain Tower of Nanjing?', 'Ming Dynasty|Qing Dynasty|Han Dynasty|Tang Dynasty', 0],
  ['History', 'medium', 'Who founded the Mongol Empire in the early 13th century?', 'Genghis Khan|Kublai Khan|Tamerlane|Batu Khan', 0],
  ['History', 'medium', 'What document did Martin Luther nail to a church door in 1517 starting the Protestant Reformation?', 'The Ninety-five Theses|The Augsburg Confession|The Edict of Worms|The Geneva Catechism', 0],

  // ==========================================
  // HISTORY · DIFFICULT
  // ==========================================
  ['History', 'difficult', 'Which decisive 1815 battle saw the final defeat of Napoleon Bonaparte?', 'Battle of Waterloo|Battle of Austerlitz|Battle of Leipzig|Battle of Trafalgar', 0],
  ['History', 'difficult', 'Who was the last ruling emperor of the Russian Romanov dynasty before the 1917 revolution?', 'Tsar Nicholas II|Tsar Alexander III|Tsar Peter the Great|Tsar Nicholas I', 0],
  ['History', 'difficult', 'What 1347-1351 pandemic killed an estimated 30-60% of Europe\'s population?', 'The Black Death (Bubonic Plague)|The Justinian Plague|The Spanish Flu|The Antonine Plague', 0],
  ['History', 'difficult', 'Which peace conference ended the First World War in 1919 and drafted the Treaty of Versailles?', 'Paris Peace Conference|Congress of Vienna|Yalta Conference|Potsdam Conference', 0],
  ['History', 'difficult', 'What ancient Persian king was defeated by the Greeks at the naval Battle of Salamis in 480 BC?', 'Xerxes I|Cyrus the Great|Darius I|Artaxerxes', 0],
  ['History', 'difficult', 'In 1453, which Ottoman Sultan conquered Constantinople, ending the Byzantine Empire?', 'Mehmed II (The Conqueror)|Suleiman the Magnificent|Selim I|Bayezid II', 0],
  ['History', 'difficult', 'Which war between the houses of Lancaster and York took place in 15th-century England?', 'Wars of the Roses|Hundred Years\' War|English Civil War|Nine Years\' War', 0],
  ['History', 'difficult', 'What was the ancient name for the city of Tokyo prior to 1868?', 'Edo|Kyoto|Nara|Kamakura', 0],
  ['History', 'difficult', 'Which Mauryan Emperor renounced violence and embraced Buddhism after the Kalinga War?', 'Ashoka the Great|Chandragupta Maurya|Samudragupta|Harsha', 0],
  ['History', 'difficult', 'What secret agreement in 1916 partitioned the Ottoman Arab provinces between Britain and France?', 'Sykes-Picot Agreement|Balfour Declaration|Treaty of Sèvres|MacMahon-Hussein Correspondence', 0],

  // ==========================================
  // NATURE · EASY
  // ==========================================
  ['Nature', 'easy', 'What do caterpillars transform into?', 'Butterflies|Beetles|Dragonflies|Moths only', 0],
  ['Nature', 'easy', 'Which flightless bird is native to Antarctica?', 'Penguin|Ostrich|Emu|Kiwi', 0],
  ['Nature', 'easy', 'What tree produces acorns?', 'Oak tree|Pine tree|Maple tree|Willow tree', 0],
  ['Nature', 'easy', 'Which is the fastest land animal in a short sprint?', 'Cheetah|Lion|Pronghorn|Gazelle', 0],
  ['Nature', 'easy', 'What do giant pandas primarily eat in the wild?', 'Bamboo|Eucalyptus|Grass|Fruits', 0],
  ['Nature', 'easy', 'What kind of animal is a clownfish?', 'Fish|Mammal|Reptile|Crustacean', 0],
  ['Nature', 'easy', 'What do koalas feed on almost exclusively?', 'Eucalyptus leaves|Bamboo shoots|Acorns|Pine needles', 0],
  ['Nature', 'easy', 'Which animal is known for having a black and white striped coat?', 'Zebra|Tiger|Skunk|Panda', 0],
  ['Nature', 'easy', 'What natural structure do birds build to lay their eggs?', 'Nest|Burrow|Hive|Cocoon', 0],
  ['Nature', 'easy', 'What is the tallest living mammal on Earth?', 'Giraffe|Elephant|Moose|Camel', 0],

  // ==========================================
  // NATURE · MEDIUM
  // ==========================================
  ['Nature', 'medium', 'What is a baby kangaroo called?', 'Joey|Calf|Cub|Fawn', 0],
  ['Nature', 'medium', 'Which mammal has thick waterproof fur and lays eggs?', 'Platypus|Otter|Beaver|Armadillo', 0],
  ['Nature', 'medium', 'What is the collective noun for a group of flamingos?', 'Flamboyance|Pride|Gaggle|Troop', 0],
  ['Nature', 'medium', 'Which ocean bird has the longest wingspan of any living bird?', 'Wandering Albatross|Pelican|Frigatebird|Sea Eagle', 0],
  ['Nature', 'medium', 'How many hearts does an octopus have?', '3|1|2|4', 0],
  ['Nature', 'medium', 'What tree is the tallest living tree species on Earth?', 'Coast Redwood (Sequoia)|Douglas Fir|Giant Sequoia|Eucalyptus', 0],
  ['Nature', 'medium', 'Which animal has fingerprints virtually indistinguishable from human fingerprints?', 'Koala|Chimpanzee|Gorilla|Raccoon', 0],
  ['Nature', 'medium', 'What do sharks lack in their skeletons that other fish have?', 'Bones (their skeleton is cartilage)|Muscles|Teeth|Gills', 0],
  ['Nature', 'medium', 'What is the fastest animal in the world when performing a hunting dive?', 'Peregrine Falcon|Golden Eagle|Cheetah|Swordfish', 0],
  ['Nature', 'medium', 'Which insect is known for glowing in the dark through bioluminescence?', 'Firefly (Lightning Bug)|Dragonfly|Cicada|Glow Ant', 0],

  // ==========================================
  // NATURE · DIFFICULT
  // ==========================================
  ['Nature', 'difficult', 'Which marine animal possesses immortal biological capabilities by reverting its cells?', 'Turritopsis dohrnii (Immortal Jellyfish)|Hydra|Sea Anemone|Axolotl', 0],
  ['Nature', 'difficult', 'What is the collective term for the fungal underground network connecting trees in a forest?', 'Mycelium (Mycorrhizal network)|Hyphae bed|Lichen matrix|Spore chain', 0],
  ['Nature', 'difficult', 'What type of camouflage mimics other poisonous species to deter predators?', 'Batesian mimicry|Müllerian mimicry|Crypsis|Aposematism', 0],
  ['Nature', 'difficult', 'What is the primary food source of the Baleen whales?', 'Krill and small zooplankton|Large squid|Coral polyps|Seaweed', 0],
  ['Nature', 'difficult', 'Which mammal produces milk with the highest recorded fat content (over 50%)?', 'Hooded seal|Blue whale|Polar bear|Sea otter', 0],
  ['Nature', 'difficult', 'What is the only known venomous primate species in the world?', 'Slow Loris|Aye-aye|Tarsier|Tamarin', 0],
  ['Nature', 'difficult', 'What gas makes up the bubbles trapped in Arctic permafrost lakes?', 'Methane|Carbon monoxide|Hydrogen sulfide|Argon', 0],
  ['Nature', 'difficult', 'Which plant holds the record for producing the largest single flower in the world?', 'Rafflesia arnoldii|Titan arum|Victoria amazonica|Nepenthes rajah', 0],
  ['Nature', 'difficult', 'What is the term for animals that maintain a constant body temperature through metabolism?', 'Endothermic (Homeothermic)|Ectothermic|Poikilothermic|Heterothermic', 0],
  ['Nature', 'difficult', 'What microscopic creature can survive the vacuum of space, extreme radiation, and boiling water?', 'Tardigrade (Water bear)|Nematode|Rotifer|Planarian', 0],

  // ==========================================
  // FOOD · EASY
  // ==========================================
  ['Food', 'easy', 'Which country is world-famous for pizza and pasta?', 'Italy|France|Spain|Greece', 0],
  ['Food', 'easy', 'What is the main ingredient in traditional guacamole?', 'Avocado|Tomato|Cucumber|Lime', 0],
  ['Food', 'easy', 'Which fruit is known to keep the doctor away if eaten daily according to the proverb?', 'Apple|Banana|Orange|Pear', 0],
  ['Food', 'easy', 'What sweet substance do honeybees produce?', 'Honey|Molasses|Maple syrup|Nectar', 0],
  ['Food', 'easy', 'What kind of food is Cheddar, Gouda, and Brie?', 'Cheese|Bread|Pastry|Meat', 0],
  ['Food', 'easy', 'Which vegetable is orange and known for growing underground?', 'Carrot|Potato|Turnip|Radish', 0],
  ['Food', 'easy', 'What is the primary ingredient in chocolate?', 'Cocoa beans|Coffee beans|Vanilla beans|Soybeans', 0],
  ['Food', 'easy', 'What Japanese dish consists of vinegared rice combined with seafood or vegetables?', 'Sushi|Ramen|Tempura|Yakitori', 0],
  ['Food', 'easy', 'What is bread called before it is baked?', 'Dough|Batter|Crust|Yeast', 0],
  ['Food', 'easy', 'Which citrus fruit is yellow and famously sour?', 'Lemon|Orange|Grapefruit|Lime', 0],

  // ==========================================
  // FOOD · MEDIUM
  // ==========================================
  ['Food', 'medium', 'What is the primary spice that gives curry powder and yellow mustard their bright color?', 'Turmeric|Saffron|Paprika|Cumin', 0],
  ['Food', 'medium', 'Which Italian dessert made with coffee, ladyfingers, and mascarpone translates to "pick me up"?', 'Tiramisu|Panna Cotta|Cannoli|Affogato', 0],
  ['Food', 'medium', 'What fermented Korean side dish is made of salted vegetables like napa cabbage and radishes?', 'Kimchi|Bibimbap|Bulgogi|Tteokbokki', 0],
  ['Food', 'medium', 'Which country is the birthplace of the pastry known as the Croissant?', 'Austria (Kipferl)|France|Belgium|Switzerland', 0],
  ['Food', 'medium', 'What is the green paste with a spicy kick commonly served with sushi?', 'Wasabi|Horseradish|Matcha|Pesto', 0],
  ['Food', 'medium', 'Which grain is the main ingredient in traditional Italian risotto?', 'Arborio rice|Basmati rice|Jasmine rice|Wild rice', 0],
  ['Food', 'medium', 'What type of pastry is used to make Greek baklava and spanakopita?', 'Phyllo (Filo) dough|Puff pastry|Shortcrust|Choux pastry', 0],
  ['Food', 'medium', 'What is the most expensive spice in the world by weight, harvested from crocus flowers?', 'Saffron|Vanilla|Cardamom|Cinnamon', 0],
  ['Food', 'medium', 'Which fruit has varieties named Cavendish, Plantain, and Red Dacca?', 'Banana|Mango|Papaya|Apple', 0],
  ['Food', 'medium', 'What is the French culinary term for preparing and measuring all ingredients before cooking?', 'Mise en place|Sous-vide|Flambé|Julienne', 0],

  // ==========================================
  // FOOD · DIFFICULT
  // ==========================================
  ['Food', 'difficult', 'What is the highly prized Japanese beef called that comes from a specific lineage of cattle in Hyogo Prefecture?', 'Kobe beef (Wagyu)|Matsusaka beef|Angus beef|Yonezawa beef', 0],
  ['Food', 'difficult', 'What mold strain is used in the aging of authentic blue cheeses like Roquefort?', 'Penicillium roqueforti|Penicillium camemberti|Aspergillus oryzae|Saccharomyces cerevisiae', 0],
  ['Food', 'difficult', 'What toxic substance must Japanese fugu chefs carefully remove from the pufferfish?', 'Tetrodotoxin|Saxitoxin|Ciguatoxin|Botulinum toxin', 0],
  ['Food', 'difficult', 'What is the process of cooking food in a vacuum-sealed plastic pouch in a precise water bath called?', 'Sous-vide|Confit|Braising|Poaching', 0],
  ['Food', 'difficult', 'Which chemical compound is responsible for the heat and spiciness in chili peppers?', 'Capsaicin|Piperine|Gingerol|Allicin', 0],
  ['Food', 'difficult', 'What is the main enzyme in rennet used to coagulate milk in cheesemaking?', 'Chymosin|Pepsin|Lactase|Amylase', 0],
  ['Food', 'difficult', 'What classic French mother sauce is made with egg yolks, melted butter, and lemon juice?', 'Hollandaise|Béchamel|Velouté|Espagnole', 0],
  ['Food', 'difficult', 'Which Southeast Asian fruit is famous for its spiky exterior and notoriously pungent odor?', 'Durian|Jackfruit|Rambutan|Mangosteen', 0],
  ['Food', 'difficult', 'What is the traditional alcohol distilled in Mexico exclusively from the blue agave plant?', 'Tequila|Mezcal|Sotol|Raicilla', 0],
  ['Food', 'difficult', 'What bean is traditionally fermented with Bacillus subtilis var. natto to produce the sticky Japanese dish Natto?', 'Soybean|Fava bean|Mung bean|Adzuki bean', 0],

  // ==========================================
  // CULTURE · EASY
  // ==========================================
  ['Culture', 'easy', 'What traditional garment is iconic to Japanese culture and worn during festivals?', 'Kimono|Sari|Hanbok|Kilt', 0],
  ['Culture', 'easy', 'In which country did the celebration of Halloween originate from Celtic traditions?', 'Ireland|United States|Germany|Canada', 0],
  ['Culture', 'easy', 'What colorful Hindu festival is celebrated by throwing colored powders in the air?', 'Holi|Diwali|Eid|Navratri', 0],
  ['Culture', 'easy', 'Which string instrument is traditionally associated with Scottish highland culture?', 'Bagpipes|Fiddle|Harp|Lute', 0],
  ['Culture', 'easy', 'What is the famous festival of lights celebrated in India with clay lamps and sweets?', 'Diwali|Holi|Pongal|Onam', 0],
  ['Culture', 'easy', 'What traditional Scottish skirt pattern is made of woven woolen cloth?', 'Tartan (Kilt)|Tweed|Paisley|Plaid corduroy', 0],
  ['Culture', 'easy', 'Which Chinese celebration features dragon and lion dances and red envelopes?', 'Chinese New Year (Spring Festival)|Mid-Autumn Festival|Dragon Boat Festival|Qingming Festival', 0],
  ['Culture', 'easy', 'What Mexican holiday honors deceased ancestors with sugar skulls and marigolds?', 'Día de los Muertos (Day of the Dead)|Cinco de Mayo|Las Posadas|Grito de Dolores', 0],
  ['Culture', 'easy', 'What traditional greeting in India involves pressing hands together and bowing slightly?', 'Namaste|Konnichiwa|Sawubona|Aloha', 0],
  ['Culture', 'easy', 'Which martial art originated in Japan and translates literally to "empty hand"?', 'Karate|Judo|Taekwondo|Kung Fu', 0],

  // ==========================================
  // CULTURE · MEDIUM
  // ==========================================
  ['Culture', 'medium', 'What is the traditional Japanese art of paper folding called?', 'Origami|Ikebana|Bonsai|Calligraphy', 0],
  ['Culture', 'medium', 'Which epic ancient Indian Sanskrit poem tells the story of Prince Rama rescuing Sita?', 'Ramayana|Mahabharata|Upanishads|Bhagavad Gita', 0],
  ['Culture', 'medium', 'What is the Spanish midday rest or afternoon nap traditionally called?', 'Siesta|Fiesta|Paseo|Sobremesa', 0],
  ['Culture', 'medium', 'In Polynesian culture, what is the traditional ritual Maori war dance called?', 'Haka|Hula|Siva|Kapa Haka', 0],
  ['Culture', 'medium', 'What is the title of the supreme spiritual leader of Tibetan Buddhism?', 'Dalai Lama|Panchen Lama|Karmapa|Guru Rinpoche', 0],
  ['Culture', 'medium', 'Which Scandinavian lifestyle concept refers to cozy contentment and comfortable conviviality?', 'Hygge|Lagom|Fika|Sisu', 0],
  ['Culture', 'medium', 'What is the traditional Japanese art of flower arrangement called?', 'Ikebana|Kintsugi|Origami|Ukiyo-e', 0],
  ['Culture', 'medium', 'In Jewish tradition, what is the celebration of a boy\'s coming of age at 13 called?', 'Bar Mitzvah|Bat Mitzvah|Hanukkah|Yom Kippur', 0],
  ['Culture', 'medium', 'Which famous carnival featuring samba parade floats and feathered costumes takes place in Brazil?', 'Rio Carnival|Mardi Gras|Venice Carnival|Notting Hill Carnival', 0],
  ['Culture', 'medium', 'What is the Japanese philosophy of finding beauty in imperfection and impermanence called?', 'Wabi-sabi|Ikigai|Kaizen|Komorebi', 0],

  // ==========================================
  // CULTURE · DIFFICULT
  // ==========================================
  ['Culture', 'difficult', 'What is the traditional Japanese craft of repairing broken pottery with gold or silver lacquer called?', 'Kintsugi|Maki-e|Shibori|Urushi', 0],
  ['Culture', 'difficult', 'Which Native American spiritual gathering involves singing, dancing, and celebrating cultural heritage?', 'Powwow|Potlatch|Sun Dance|Kachina ceremony', 0],
  ['Culture', 'difficult', 'What is the traditional shadow puppet theater found in Indonesia and Malaysia called?', 'Wayang Kulit|Noh theater|Bunraku|Kabuki', 0],
  ['Culture', 'difficult', 'In Islamic architecture, what is the niche in a mosque wall indicating the direction of Mecca called?', 'Mihrab|Minbar|Muqarnas|Qibla dome', 0],
  ['Culture', 'difficult', 'Which African philosophy translates as "I am because we are", emphasizing human interconnectedness?', 'Ubuntu|Sankofa|Harambee|Ujamaa', 0],
  ['Culture', 'difficult', 'What is the sacred ceremonial drink prepared from pepper plant roots in South Pacific cultures?', 'Kava|Kombucha|Mate|Chicha', 0],
  ['Culture', 'difficult', 'In classical Indian dance, how many recognized classical dance forms exist according to the Sangeet Natak Akademi?', '8 (Bharatanatyam, Kathak, Kathakali, Kuchipudi, Odissi, Manipuri, Mohiniyattam, Sattriya)|6|10|12', 0],
  ['Culture', 'difficult', 'What ancient Scandinavian runic alphabet is named after its first six letters?', 'Elder Futhark|Ogham|Cyrillic|Gothic', 0],
  ['Culture', 'difficult', 'What is the ceremonial gift-giving feast practiced by indigenous peoples of the Pacific Northwest called?', 'Potlatch|Wampum exchange|Kula ring|Moka exchange', 0],
  ['Culture', 'difficult', 'In traditional Celtic mythology, what is the supernatural realm of eternal youth called?', 'Tír na nÓg|Avalon|Valhalla|Annwn', 0],

  // ==========================================
  // QUICK FACTS · EASY
  // ==========================================
  ['Quick Facts', 'easy', 'How many minutes are in two hours?', '120|60|180|240', 0],
  ['Quick Facts', 'easy', 'How many letters are in the standard English alphabet?', '26|24|28|30', 0],
  ['Quick Facts', 'easy', 'What is the Roman numeral for the number 10?', 'X|V|L|C', 0],
  ['Quick Facts', 'easy', 'How many sides does a triangle have?', '3|4|5|6', 0],
  ['Quick Facts', 'easy', 'What is the color of an emerald gemstone?', 'Green|Red|Blue|Yellow', 0],
  ['Quick Facts', 'easy', 'How many months in a year have 31 days?', '7|6|8|5', 0],
  ['Quick Facts', 'easy', 'What is the freezing point of water on the Fahrenheit scale?', '32°F|0°F|100°F|212°F', 0],
  ['Quick Facts', 'easy', 'How many days are in a typical week?', '7|5|6|8', 0],
  ['Quick Facts', 'easy', 'What shape is a standard soccer ball made of predominantly?', 'Hexagons and pentagons|Squares|Triangles|Octagons only', 0],
  ['Quick Facts', 'easy', 'How many items are in a standard "baker\'s dozen"?', '13|12|14|15', 0],

  // ==========================================
  // QUICK FACTS · MEDIUM
  // ==========================================
  ['Quick Facts', 'medium', 'What is the total sum of degrees in the interior angles of any triangle?', '180°|360°|90°|270°', 0],
  ['Quick Facts', 'medium', 'How many keys does a standard full-size modern piano have?', '88|76|92|84', 0],
  ['Quick Facts', 'medium', 'What is the numerical value of Roman numeral "L"?', '50|100|500|5', 0],
  ['Quick Facts', 'medium', 'How many teeth does an adult human typically have including wisdom teeth?', '32|28|30|34', 0],
  ['Quick Facts', 'medium', 'What is the square of 12?', '144|124|164|132', 0],
  ['Quick Facts', 'medium', 'How many red stripes are on the national flag of the United States?', '7|6|8|5', 0],
  ['Quick Facts', 'medium', 'What is the only mammal that cannot jump?', 'Elephant|Sloth|Hippo|Rhino', 0],
  ['Quick Facts', 'medium', 'What is the name for a group of wolves?', 'A pack|A pride|A herd|A flock', 0],
  ['Quick Facts', 'medium', 'How many kilometers are in a standard full marathon race?', '42.195 km|40 km|45.5 km|38.2 km', 0],
  ['Quick Facts', 'medium', 'What is the boiling point of water in Fahrenheit at sea level?', '212°F|100°F|180°F|250°F', 0],

  // ==========================================
  // QUICK FACTS · DIFFICULT
  // ==========================================
  ['Quick Facts', 'difficult', 'How many squares are there on a standard international chessboard?', '64|48|72|81', 0],
  ['Quick Facts', 'difficult', 'What is the only number whose letters in English are in reverse alphabetical order?', 'ONE|TWO|SIX|TEN', 0],
  ['Quick Facts', 'difficult', 'What is the speed of sound at sea level in air at 20°C in meters per second?', 'Approximately 343 m/s|Approximately 500 m/s|Approximately 250 m/s|Approximately 760 m/s', 0],
  ['Quick Facts', 'difficult', 'How many players are on the field for one team in a standard cricket match?', '11|9|10|12', 0],
  ['Quick Facts', 'difficult', 'What is the smallest positive integer that is evenly divisible by all numbers from 1 to 10?', '2520|1260|5040|720', 0],
  ['Quick Facts', 'difficult', 'How many time zones does the Russian Federation span?', '11|9|13|7', 0],
  ['Quick Facts', 'difficult', 'What is the technical term for the dot placed over the lowercase letters "i" and "j"?', 'Tittle|Jot|Macron|Breve', 0],
  ['Quick Facts', 'difficult', 'How many total dimples does an average regulation golf ball have?', 'Around 336 (typically 300 to 500)|Around 100|Around 800|Around 50', 0],
  ['Quick Facts', 'difficult', 'What is the only letter in the English alphabet that does not appear in any US state name?', 'Q|Z|X|J', 0],
  ['Quick Facts', 'difficult', 'How many grooves are on the surface of a standard vinyl LP record per side?', 'Only 1 continuous groove|Around 50|Around 100|One groove per track', 0]
];

module.exports = rows.map(([category, difficulty, prompt, choices, answerIndex], index) => ({
  id: `mega-${index + 1}`,
  category,
  difficulty,
  prompt,
  options: choices.split('|'),
  answerIndex,
}));
