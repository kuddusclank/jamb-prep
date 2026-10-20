import type {
  StressGameItem,
  EmphaticGameItem,
  SoundMatchGameItem,
  SilentLetterGameItem,
  SynAntonymGameItem,
} from './types';

// ==========================================
// 1. SYLLABLE & EMPHATIC STRESS GAME DATA
// ==========================================
export const STRESS_GAME_ITEMS: StressGameItem[] = [
  {
    id: 'sg-1',
    word: 'photographic',
    syllables: ['pho', 'to', 'graph', 'ic'],
    stressedIndex: 2, // photoGRAPHic
    partOfSpeech: 'adjective',
    sentenceExample: 'She had a photographic memory for historical dates.',
    explanation: 'Words ending in suffix "-ic" carry primary stress on the penultimate (second to last) syllable: pho-to-GRAPH-ic.',
  },
  {
    id: 'sg-2',
    word: 'democracy',
    syllables: ['de', 'moc', 'ra', 'cy'],
    stressedIndex: 1, // deMOCracy
    partOfSpeech: 'noun',
    sentenceExample: 'True democracy guarantees fundamental human rights.',
    explanation: 'Nouns ending in "-cracy" carry primary stress on the antepenultimate (third from end) syllable: de-MOC-ra-cy.',
  },
  {
    id: 'sg-3',
    word: 'controversy',
    syllables: ['con', 'tro', 'ver', 'sy'],
    stressedIndex: 0, // CONtroversy
    partOfSpeech: 'noun',
    sentenceExample: 'The referee’s decision caused widespread controversy.',
    explanation: 'In Standard British English (examined by JAMB), "controversy" has primary stress on the first syllable: CON-tro-ver-sy.',
  },
  {
    id: 'sg-4',
    word: 'refusal',
    syllables: ['re', 'fu', 'sal'],
    stressedIndex: 1, // reFUsal
    partOfSpeech: 'noun',
    sentenceExample: 'His outright refusal to cooperate stalled the investigation.',
    explanation: 'Verbal nouns with suffix "-al" keep stress on the root verb: re-FUSE -> re-FU-sal.',
  },
  {
    id: 'sg-5',
    word: 'certificate',
    syllables: ['cer', 'tif', 'i', 'cate'],
    stressedIndex: 1, // cerTIFicate
    partOfSpeech: 'noun',
    sentenceExample: 'Candidates must present their original birth certificate.',
    explanation: 'Words of four or more syllables ending in "-ate" take stress on the antepenultimate syllable: cer-TIF-i-cate.',
  },
  {
    id: 'sg-6',
    word: 'examination',
    syllables: ['ex', 'am', 'i', 'na', 'tion'],
    stressedIndex: 3, // examiNAtion
    partOfSpeech: 'noun',
    sentenceExample: 'The UTME examination requires punctuality and calm.',
    explanation: 'Words ending in "-tion" or "-sion" always place primary stress on the syllable immediately before the suffix: ex-am-i-NA-tion.',
  },
  {
    id: 'sg-7',
    word: 'economist',
    syllables: ['e', 'con', 'o', 'mist'],
    stressedIndex: 1, // eCONomist
    partOfSpeech: 'noun',
    sentenceExample: 'The chief economist forecasted a decline in inflation.',
    explanation: 'Words ending in "-ist" derived from Greek roots take stress on the third syllable from the end: e-CON-o-mist.',
  },
];

export const EMPHATIC_STRESS_ITEMS: EmphaticGameItem[] = [
  {
    id: 'eg-1',
    sentence: 'Musa bought the RED motorcycle yesterday.',
    stressedWord: 'RED',
    options: [
      { text: 'Did Audu buy the red motorcycle yesterday?', isCorrect: false },
      { text: 'Did Musa sell the red motorcycle yesterday?', isCorrect: false },
      { text: 'Did Musa buy the BLUE motorcycle yesterday?', isCorrect: true },
      { text: 'Did Musa buy the red car yesterday?', isCorrect: false },
    ],
    explanation: 'The capitalized word RED receives emphatic stress to contrast the color. The corresponding question must contradict the color (e.g. asking if he bought the BLUE motorcycle).',
  },
  {
    id: 'eg-2',
    sentence: 'The teacher praised CHIDI for his honesty.',
    stressedWord: 'CHIDI',
    options: [
      { text: 'Did the principal praise Chidi for his honesty?', isCorrect: false },
      { text: 'Did the teacher punish Chidi for his honesty?', isCorrect: false },
      { text: 'Did the teacher praise BOLA for his honesty?', isCorrect: true },
      { text: 'Did the teacher praise Chidi for his diligence?', isCorrect: false },
    ],
    explanation: 'Emphasis is on CHIDI (the person). The correct question targets who was praised, contrasting Chidi with someone else (Bola).',
  },
  {
    id: 'eg-3',
    sentence: 'We shall travel to Abuja by TRAIN next week.',
    stressedWord: 'TRAIN',
    options: [
      { text: 'Shall we travel to Lagos by train next week?', isCorrect: false },
      { text: 'Shall we travel to Abuja by AIR next week?', isCorrect: true },
      { text: 'Did we travel to Abuja by train last week?', isCorrect: false },
      { text: 'Will they travel to Abuja by train next week?', isCorrect: false },
    ],
    explanation: 'Emphasis is on TRAIN (the means of transport). The question must test the mode of travel, e.g. "by AIR".',
  },
];

// ==========================================
// 2. SOUND MATCH & ORAL ENGLISH GAME DATA
// ==========================================
export const SOUND_MATCH_ITEMS: SoundMatchGameItem[] = [
  {
    id: 'sm-1',
    targetSound: '/ʃ/',
    soundType: 'consonant',
    prompt: 'Which word contains the consonant sound /ʃ/ (as in "shoe" or "nation")?',
    options: [
      { word: 'chef', isMatch: true, transcription: '/ʃef/', explanation: 'The "ch" in French loan words like chef and machine is pronounced /ʃ/.' },
      { word: 'chair', isMatch: false, transcription: '/tʃeər/', explanation: 'The "ch" in chair is pronounced /tʃ/.' },
      { word: 'character', isMatch: false, transcription: '/ˈkær.ək.tər/', explanation: 'The "ch" in character is pronounced /k/.' },
      { word: 'church', isMatch: false, transcription: '/tʃɜːtʃ/', explanation: 'The "ch" in church is /tʃ/.' },
    ],
  },
  {
    id: 'sm-2',
    targetSound: '/θ/',
    soundType: 'consonant',
    prompt: 'Which word contains the VOICELESS dental fricative /θ/ (as in "think" or "bath")?',
    options: [
      { word: 'theme', isMatch: true, transcription: '/θiːm/', explanation: 'The "th" in theme is voiceless /θ/.' },
      { word: 'this', isMatch: false, transcription: '/ðɪs/', explanation: 'The "th" in this is voiced /ð/.' },
      { word: 'breathe', isMatch: false, transcription: '/briːð/', explanation: 'The "th" in breathe is voiced /ð/.' },
      { word: 'father', isMatch: false, transcription: '/ˈfɑː.ðər/', explanation: 'The "th" in father is voiced /ð/.' },
    ],
  },
  {
    id: 'sm-3',
    targetSound: '/iː/',
    soundType: 'vowel',
    prompt: 'Which word contains the LONG vowel sound /iː/ (as in "seat" or "meet")?',
    options: [
      { word: 'suite', isMatch: true, transcription: '/swiːt/', explanation: 'Suite is pronounced /swiːt/, sharing the long vowel /iː/ with sweet.' },
      { word: 'sit', isMatch: false, transcription: '/sɪt/', explanation: 'Sit contains the short vowel /ɪ/.' },
      { word: 'suit', isMatch: false, transcription: '/suːt/', explanation: 'Suit contains the long /uː/ sound.' },
      { word: 'sweat', isMatch: false, transcription: '/swet/', explanation: 'Sweat contains the short /e/ sound.' },
    ],
  },
  {
    id: 'sm-4',
    targetSound: '/ʌ/',
    soundType: 'vowel',
    prompt: 'Which word contains the short open-mid back vowel /ʌ/ (as in "cup" or "bus")?',
    options: [
      { word: 'flood', isMatch: true, transcription: '/flʌd/', explanation: 'Flood and blood uniquely contain the short /ʌ/ vowel sound.' },
      { word: 'food', isMatch: false, transcription: '/fuːd/', explanation: 'Food contains the long /uː/ sound.' },
      { word: 'fool', isMatch: false, transcription: '/fuːl/', explanation: 'Fool contains the long /uː/ sound.' },
      { word: 'foot', isMatch: false, transcription: '/fʊt/', explanation: 'Foot contains the short /ʊ/ sound.' },
    ],
  },
  {
    id: 'sm-5',
    targetSound: '/tʃ/',
    soundType: 'consonant',
    prompt: 'Which word contains the voiceless postalveolar affricate /tʃ/ (as in "chair" or "batch")?',
    options: [
      { word: 'nature', isMatch: true, transcription: '/ˈneɪ.tʃər/', explanation: 'The "-ture" suffix in English is pronounced with the /tʃ/ sound (/ˈneɪ.tʃər/).' },
      { word: 'nation', isMatch: false, transcription: '/ˈneɪ.ʃən/', explanation: 'The "-tion" in nation is pronounced with /ʃ/.' },
      { word: 'chasm', isMatch: false, transcription: '/ˈkæz.əm/', explanation: 'The "ch" in chasm is pronounced /k/.' },
      { word: 'machine', isMatch: false, transcription: '/məˈʃiːn/', explanation: 'The "ch" in machine is pronounced /ʃ/.' },
    ],
  },
  {
    id: 'sm-6',
    targetSound: '/eɪ/',
    soundType: 'vowel',
    prompt: 'Which word contains the diphthong /eɪ/ (as in "face" or "day")?',
    options: [
      { word: 'gauge', isMatch: true, transcription: '/ɡeɪdʒ/', explanation: 'Gauge is pronounced /ɡeɪdʒ/, containing the diphthong /eɪ/.' },
      { word: 'gouge', isMatch: false, transcription: '/ɡaʊdʒ/', explanation: 'Gouge contains the diphthong /aʊ/.' },
      { word: 'guard', isMatch: false, transcription: '/ɡɑːd/', explanation: 'Guard contains the long vowel /ɑː/.' },
      { word: 'guest', isMatch: false, transcription: '/ɡest/', explanation: 'Guest contains the short vowel /e/.' },
    ],
  },
];

// ==========================================
// 3. SILENT HUNTER GAME DATA
// ==========================================
export const SILENT_LETTER_ITEMS: SilentLetterGameItem[] = [
  {
    id: 'sl-1',
    word: 'receipt',
    silentIndices: [5], // index 5 is 'p'
    ipa: '/rɪˈsiːt/',
    explanation: 'The letter "p" in receipt is silent. It rhymes with "deceit".',
  },
  {
    id: 'sl-2',
    word: 'doubt',
    silentIndices: [3], // index 3 is 'b'
    ipa: '/daʊt/',
    explanation: 'The letter "b" is silent when followed by "t" in words like doubt, debt, and subtle.',
  },
  {
    id: 'sl-3',
    word: 'indict',
    silentIndices: [4], // index 4 is 'c'
    ipa: '/ɪnˈdaɪt/',
    explanation: 'The letter "c" in indict is completely silent. It rhymes with "polite".',
  },
  {
    id: 'sl-4',
    word: 'subtle',
    silentIndices: [2], // index 2 is 'b'
    ipa: '/ˈsʌt.əl/',
    explanation: 'The letter "b" in subtle is silent. Pronounced as /ˈsʌt.əl/.',
  },
  {
    id: 'sl-5',
    word: 'mortgage',
    silentIndices: [3], // index 3 is 't'
    ipa: '/ˈmɔː.ɡɪdʒ/',
    explanation: 'The letter "t" in mortgage is silent. Pronounced as /ˈmɔː.ɡɪdʒ/.',
  },
  {
    id: 'sl-6',
    word: 'plumber',
    silentIndices: [4], // index 4 is 'b'
    ipa: '/ˈplʌm.ər/',
    explanation: 'The "b" following "m" in plumber, climb, and crumb is silent.',
  },
  {
    id: 'sl-7',
    word: 'sword',
    silentIndices: [1], // index 1 is 'w'
    ipa: '/sɔːd/',
    explanation: 'The letter "w" in sword is silent. It rhymes with "ford" and "board".',
  },
  {
    id: 'sl-8',
    word: 'colonel',
    silentIndices: [2, 3], // letters 'l', 'o'
    ipa: '/ˈkɜː.nəl/',
    explanation: 'Colonel is pronounced exactly like "kernel" (/ˈkɜː.nəl/).',
  },
];

// ==========================================
// 4. SYNONYM / ANTONYM BLITZ GAME DATA
// ==========================================
export const SYN_ANTONYM_ITEMS: SynAntonymGameItem[] = [
  {
    id: 'sa-1',
    sentence: 'The president’s speech was CONCISE and went straight to the point.',
    targetWord: 'CONCISE',
    mode: 'synonym',
    options: ['succinct', 'verbose', 'redundant', 'lengthy'],
    correctOption: 'succinct',
    distractorExplanations: {
      verbose: 'Verbose means using too many words (an antonym).',
      redundant: 'Redundant means unnecessary or superfluous.',
      lengthy: 'Lengthy is the direct opposite of concise.',
    },
    explanation: 'Concise means expressing much in few words; succinct is its closest synonym.',
  },
  {
    id: 'sa-2',
    sentence: 'The teacher reprimanded the RECALCITRANT boy for disobeying rules.',
    targetWord: 'RECALCITRANT',
    mode: 'antonym',
    options: ['compliant', 'defiant', 'obstinate', 'belligerent'],
    correctOption: 'compliant',
    distractorExplanations: {
      defiant: 'Defiant is a synonym (unwilling to obey).',
      obstinate: 'Obstinate is a synonym (stubborn).',
      belligerent: 'Belligerent means aggressive or hostile.',
    },
    explanation: 'Recalcitrant means stubborn and disobedient; its direct opposite is compliant (willing to obey).',
  },
  {
    id: 'sa-3',
    sentence: 'Online fame can be surprisingly EPHEMERAL in the modern era.',
    targetWord: 'EPHEMERAL',
    mode: 'synonym',
    options: ['transient', 'permanent', 'perpetual', 'unending'],
    correctOption: 'transient',
    distractorExplanations: {
      permanent: 'Permanent is an antonym (lasting indefinitely).',
      perpetual: 'Perpetual means never ending (an antonym).',
      unending: 'Unending means perpetual (an antonym).',
    },
    explanation: 'Ephemeral means lasting for a very short time; transient is its direct synonym.',
  },
  {
    id: 'sa-4',
    sentence: 'The accountant demonstrated extraordinary CANDOUR during the inquiry.',
    targetWord: 'CANDOUR',
    mode: 'antonym',
    options: ['duplicity', 'frankness', 'honesty', 'sincerity'],
    correctOption: 'duplicity',
    distractorExplanations: {
      frankness: 'Frankness is a synonym of candour.',
      honesty: 'Honesty is a synonym of candour.',
      sincerity: 'Sincerity is a synonym of candour.',
    },
    explanation: 'Candour means openness and honesty. Its direct opposite is duplicity (deceitfulness or double-dealing).',
  },
  {
    id: 'sa-5',
    sentence: 'Digital payment points have become UBIQUITOUS across commercial centres.',
    targetWord: 'UBIQUITOUS',
    mode: 'synonym',
    options: ['omnipresent', 'scarce', 'isolated', 'rare'],
    correctOption: 'omnipresent',
    distractorExplanations: {
      scarce: 'Scarce is an antonym (hard to find).',
      isolated: 'Isolated means far away or infrequent.',
      rare: 'Rare is an antonym (uncommon).',
    },
    explanation: 'Ubiquitous means found or existing everywhere; omnipresent is its exact synonym.',
  },
];
