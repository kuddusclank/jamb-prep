import type {
  StressGameItem,
  EmphaticGameItem,
  SoundMatchGameItem,
  SilentLetterGameItem,
  SynAntonymGameItem,
} from './types';

/**
 * Fisher-Yates array shuffler to ensure truly uniform random order
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sample N random items from a collection, shuffled every time
 */
export function getRandomGameItems<T>(items: T[], count: number = 10): T[] {
  if (!items || items.length === 0) return [];
  const shuffled = shuffleArray(items);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

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
  {
    id: 'sg-8',
    word: 'photography',
    syllables: ['pho', 'tog', 'ra', 'phy'],
    stressedIndex: 1, // phoTOGraphy
    partOfSpeech: 'noun',
    sentenceExample: 'Her passion for wildlife photography took her to the Serengeti.',
    explanation: 'Words ending in "-graphy" place primary stress on the antepenultimate syllable: pho-TOG-ra-phy (contrast with PHO-to-graph).',
  },
  {
    id: 'sg-9',
    word: 'catastrophic',
    syllables: ['cat', 'a', 'stroph', 'ic'],
    stressedIndex: 2, // cataSTROPHic
    partOfSpeech: 'adjective',
    sentenceExample: 'The cyclone caused catastrophic damage to the coastline.',
    explanation: 'Adjectives ending in suffix "-ic" take primary stress on the syllable preceding "-ic": cat-a-STROPH-ic.',
  },
  {
    id: 'sg-10',
    word: 'electronic',
    syllables: ['e', 'lec', 'tron', 'ic'],
    stressedIndex: 2, // elecTRONic
    partOfSpeech: 'adjective',
    sentenceExample: 'Electronic voting machines expedite election results.',
    explanation: 'Suffix "-ic" attracts primary stress to the penultimate syllable: e-lec-TRON-ic.',
  },
  {
    id: 'sg-11',
    word: 'politician',
    syllables: ['pol', 'i', 'ti', 'cian'],
    stressedIndex: 2, // poliTIcian
    partOfSpeech: 'noun',
    sentenceExample: 'The veteran politician addressed the packed auditorium.',
    explanation: 'Nouns ending in "-cian" take stress on the penultimate syllable: pol-i-TI-cian.',
  },
  {
    id: 'sg-12',
    word: 'geography',
    syllables: ['ge', 'og', 'ra', 'phy'],
    stressedIndex: 1, // geOGraphy
    partOfSpeech: 'noun',
    sentenceExample: 'Physical geography studies landforms and weather systems.',
    explanation: 'Words ending in "-graphy" are stressed on the antepenultimate syllable: ge-OG-ra-phy.',
  },
  {
    id: 'sg-13',
    word: 'horizontal',
    syllables: ['hor', 'i', 'zon', 'tal'],
    stressedIndex: 2, // horiZONtal
    partOfSpeech: 'adjective',
    sentenceExample: 'Draw a horizontal line across the center of the sheet.',
    explanation: 'Words ending in "-tal" derived from nouns take primary stress on the penultimate syllable: hor-i-ZON-tal.',
  },
  {
    id: 'sg-14',
    word: 'characteristic',
    syllables: ['char', 'ac', 'ter', 'is', 'tic'],
    stressedIndex: 3, // characterIStic
    partOfSpeech: 'noun',
    sentenceExample: 'Honesty is a core characteristic of great leaders.',
    explanation: 'Words ending in "-istic" receive main stress on "-is-": char-ac-ter-IS-tic.',
  },
  {
    id: 'sg-15',
    word: 'alternative',
    syllables: ['al', 'ter', 'na', 'tive'],
    stressedIndex: 1, // alTERnative
    partOfSpeech: 'noun',
    sentenceExample: 'Solar energy provides a sustainable alternative to fossil fuel.',
    explanation: 'Four-syllable words ending in "-ative" carry stress on the second syllable: al-TER-na-tive.',
  },
  {
    id: 'sg-16',
    word: 'inevitable',
    syllables: ['in', 'ev', 'i', 'ta', 'ble'],
    stressedIndex: 1, // inEVitable
    partOfSpeech: 'adjective',
    sentenceExample: 'Change is an inevitable part of technological progress.',
    explanation: 'Five-syllable adjectives with suffix "-able" take primary stress on the second syllable: in-EV-i-ta-ble.',
  },
  {
    id: 'sg-17',
    word: 'facilitate',
    syllables: ['fa', 'cil', 'i', 'tate'],
    stressedIndex: 1, // faCILitate
    partOfSpeech: 'verb',
    sentenceExample: 'New digital tools facilitate interactive classroom learning.',
    explanation: 'Verbs ending in "-ate" of four syllables place stress on the antepenultimate syllable: fa-CIL-i-tate.',
  },
  {
    id: 'sg-18',
    word: 'unanimous',
    syllables: ['u', 'nan', 'i', 'mous'],
    stressedIndex: 1, // uNANimous
    partOfSpeech: 'adjective',
    sentenceExample: 'The committee arrived at a unanimous decision on the budget.',
    explanation: 'Words ending in "-ous" of four syllables carry primary stress on the second syllable: u-NAN-i-mous.',
  },
  {
    id: 'sg-19',
    word: 'superficial',
    syllables: ['su', 'per', 'fi', 'cial'],
    stressedIndex: 2, // superFIcial
    partOfSpeech: 'adjective',
    sentenceExample: 'The driver suffered only superficial cuts in the minor collision.',
    explanation: 'Words ending in "-cial" take primary stress on the penultimate syllable: su-per-FI-cial.',
  },
  {
    id: 'sg-20',
    word: 'investigation',
    syllables: ['in', 'ves', 'ti', 'ga', 'tion'],
    stressedIndex: 3, // investiGAtion
    partOfSpeech: 'noun',
    sentenceExample: 'The police launched an investigation into the bank robbery.',
    explanation: 'Nouns ending in "-tion" take main stress on the penultimate syllable: in-ves-ti-GA-tion.',
  },
  {
    id: 'sg-21',
    word: 'advantageous',
    syllables: ['ad', 'van', 'ta', 'geous'],
    stressedIndex: 2, // advanTAgeous
    partOfSpeech: 'adjective',
    sentenceExample: 'The new tariff proved advantageous for domestic manufacturers.',
    explanation: 'Words ending in "-geous" place stress on the penultimate syllable: ad-van-TA-geous.',
  },
  {
    id: 'sg-22',
    word: 'ceremony',
    syllables: ['cer', 'e', 'mo', 'ny'],
    stressedIndex: 0, // CERemony
    partOfSpeech: 'noun',
    sentenceExample: 'The matriculation ceremony starts promptly at nine o’clock.',
    explanation: 'In Standard British English, nouns ending in "-mony" place stress on the first syllable: CER-e-mo-ny.',
  },
  {
    id: 'sg-23',
    word: 'necessary',
    syllables: ['nec', 'es', 'sar', 'y'],
    stressedIndex: 0, // NECessary
    partOfSpeech: 'adjective',
    sentenceExample: 'Regular practice is necessary to ace the UTME exam.',
    explanation: 'In Standard British English, adjectives ending in "-ary" place stress on the first syllable: NEC-es-sar-y.',
  },
  {
    id: 'sg-24',
    word: 'category',
    syllables: ['cat', 'e', 'go', 'ry'],
    stressedIndex: 0, // CATegory
    partOfSpeech: 'noun',
    sentenceExample: 'Choose the correct grammatical category for the underlined word.',
    explanation: 'In British English, "category" places primary stress on the first syllable: CAT-e-go-ry.',
  },
  {
    id: 'sg-25',
    word: 'intimacy',
    syllables: ['in', 'ti', 'ma', 'cy'],
    stressedIndex: 0, // INtimacy
    partOfSpeech: 'noun',
    sentenceExample: 'Long conversations fostered emotional intimacy between friends.',
    explanation: 'Abstract nouns ending in "-acy" of four syllables place stress on the first syllable: IN-ti-ma-cy.',
  },
  {
    id: 'sg-26',
    word: 'commentary',
    syllables: ['com', 'men', 'ta', 'ry'],
    stressedIndex: 0, // COMmentary
    partOfSpeech: 'noun',
    sentenceExample: 'The sports commentary added excitement to the live match.',
    explanation: 'In Standard British English, "commentary" is stressed on the first syllable: COM-men-ta-ry.',
  },
  {
    id: 'sg-27',
    word: 'television',
    syllables: ['tel', 'e', 'vi', 'sion'],
    stressedIndex: 0, // TELelevision
    partOfSpeech: 'noun',
    sentenceExample: 'The live presidential debate was broadcast across television.',
    explanation: 'In Standard British English, "television" takes primary stress on the first syllable: TEL-e-vi-sion.',
  },
  {
    id: 'sg-28',
    word: 'maintenance',
    syllables: ['main', 'te', 'nance'],
    stressedIndex: 0, // MAINtenance
    partOfSpeech: 'noun',
    sentenceExample: 'Routine maintenance keeps the generators running smoothly.',
    explanation: 'Nouns ending in "-tenance" retain primary stress on the first syllable: MAIN-te-nance (not main-TAIN-ance).',
  },
  {
    id: 'sg-29',
    word: 'circumference',
    syllables: ['cir', 'cum', 'fer', 'ence'],
    stressedIndex: 1, // cirCUMference
    partOfSpeech: 'noun',
    sentenceExample: 'Calculate the circumference of the circle using 2πr.',
    explanation: 'Polysyllabic mathematical terms ending in "-ence" take stress on the second syllable: cir-CUM-fer-ence.',
  },
  {
    id: 'sg-30',
    word: 'electricity',
    syllables: ['e', 'lec', 'tric', 'i', 'ty'],
    stressedIndex: 2, // elecTRICity
    partOfSpeech: 'noun',
    sentenceExample: 'Hydroelectric dams generate clean electricity for millions.',
    explanation: 'Nouns ending in suffix "-ity" always take primary stress on the antepenultimate syllable: e-lec-TRIC-i-ty.',
  },
  {
    id: 'sg-31',
    word: 'responsibility',
    syllables: ['re', 'spon', 'si', 'bil', 'i', 'ty'],
    stressedIndex: 4, // responsiBILity
    partOfSpeech: 'noun',
    sentenceExample: 'Civic responsibility involves voting in national elections.',
    explanation: 'Words ending in "-bility" place primary stress on "-bil-": re-spon-si-BIL-i-ty.',
  },
  {
    id: 'sg-32',
    word: 'enthusiasm',
    syllables: ['en', 'thu', 'si', 'asm'],
    stressedIndex: 1, // enTHUsiasm
    partOfSpeech: 'noun',
    sentenceExample: 'The students greeted the science quiz with genuine enthusiasm.',
    explanation: 'Polysyllabic Greek-origin nouns in "-asm" carry stress on the second syllable: en-THU-si-asm.',
  },
  {
    id: 'sg-33',
    word: 'anonymous',
    syllables: ['a', 'non', 'y', 'mous'],
    stressedIndex: 1, // aNONymous
    partOfSpeech: 'adjective',
    sentenceExample: 'The whistleblower sent an anonymous letter to the ombudsman.',
    explanation: 'Adjectives ending in "-ymous" carry stress on the second syllable: a-NON-y-mous.',
  },
  {
    id: 'sg-34',
    word: 'perimeter',
    syllables: ['pe', 'rim', 'e', 'ter'],
    stressedIndex: 1, // peRIMeter
    partOfSpeech: 'noun',
    sentenceExample: 'Armed guards patrolled the perimeter of the military facility.',
    explanation: 'Words ending in "-meter" measuring physical dimensions take stress on the second syllable: pe-RIM-e-ter.',
  },
  {
    id: 'sg-35',
    word: 'agriculture',
    syllables: ['ag', 'ri', 'cul', 'ture'],
    stressedIndex: 0, // AGriculture
    partOfSpeech: 'noun',
    sentenceExample: 'Mechanized agriculture transformed rural crop yields.',
    explanation: 'Compound nouns with root "-culture" take primary stress on the first syllable: AG-ri-cul-ture.',
  },
  {
    id: 'sg-36',
    word: 'melancholy',
    syllables: ['mel', 'an', 'chol', 'y'],
    stressedIndex: 0, // MELancholy
    partOfSpeech: 'noun',
    sentenceExample: 'A mood of gentle melancholy hung over the empty concert hall.',
    explanation: 'In Standard British English, "melancholy" takes primary stress on the first syllable: MEL-an-chol-y.',
  },
  {
    id: 'sg-37',
    word: 'dormitory',
    syllables: ['dor', 'mi', 'to', 'ry'],
    stressedIndex: 0, // DORmitory
    partOfSpeech: 'noun',
    sentenceExample: 'Boarding students returned to the dormitory after evening prep.',
    explanation: 'In British English, words ending in "-tory" place stress on the first syllable: DOR-mi-to-ry.',
  },
  {
    id: 'sg-38',
    word: 'dictionary',
    syllables: ['dic', 'tion', 'a', 'ry'],
    stressedIndex: 0, // DICtionary
    partOfSpeech: 'noun',
    sentenceExample: 'Consult your dictionary for unfamiliar UTME idioms and phrasal verbs.',
    explanation: 'In Standard British English, "dictionary" is stressed on the first syllable: DIC-tion-a-ry.',
  },
  {
    id: 'sg-39',
    word: 'deliberate',
    syllables: ['de', 'lib', 'er', 'ate'],
    stressedIndex: 1, // deLIBerate
    partOfSpeech: 'adjective',
    sentenceExample: 'She made a deliberate attempt to master syllabic stress rules.',
    explanation: 'The adjective "deliberate" takes stress on the second syllable: de-LIB-er-ate.',
  },
  {
    id: 'sg-40',
    word: 'aristocratic',
    syllables: ['a', 'ris', 'to', 'crat', 'ic'],
    stressedIndex: 3, // aristoCRATic
    partOfSpeech: 'adjective',
    sentenceExample: 'The historic estate reflected decades of aristocratic heritage.',
    explanation: 'Adjectives ending in suffix "-ic" place primary stress on the penultimate syllable: a-ris-to-CRAT-ic.',
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
  {
    id: 'eg-4',
    sentence: 'The PRESIDENT signed the historic education bill.',
    stressedWord: 'PRESIDENT',
    options: [
      { text: 'Did the GOVERNOR sign the historic education bill?', isCorrect: true },
      { text: 'Did the President veto the historic education bill?', isCorrect: false },
      { text: 'Did the President sign the finance bill?', isCorrect: false },
      { text: 'Did the President sign the historic treaty?', isCorrect: false },
    ],
    explanation: 'Emphasis is on the PRESIDENT (the office holder). The question must test who signed the bill, contrasting with the Governor.',
  },
  {
    id: 'eg-5',
    sentence: 'Fatima baked TWENTY meat pies for the party.',
    stressedWord: 'TWENTY',
    options: [
      { text: 'Did Fatima buy twenty meat pies for the party?', isCorrect: false },
      { text: 'Did Aisha bake twenty meat pies for the party?', isCorrect: false },
      { text: 'Did Fatima bake FIFTY meat pies for the party?', isCorrect: true },
      { text: 'Did Fatima bake twenty cakes for the party?', isCorrect: false },
    ],
    explanation: 'Emphasis is on TWENTY (the numerical quantity). The correct question contrasts this quantity with another number like fifty.',
  },
  {
    id: 'eg-6',
    sentence: 'The old farmer planted MAIZE on his fertile land.',
    stressedWord: 'MAIZE',
    options: [
      { text: 'Did the old farmer plant CASSAVA on his fertile land?', isCorrect: true },
      { text: 'Did the young farmer plant maize on his fertile land?', isCorrect: false },
      { text: 'Did the old farmer harvest maize on his fertile land?', isCorrect: false },
      { text: 'Did the old farmer plant maize on the barren land?', isCorrect: false },
    ],
    explanation: 'Emphasis is on MAIZE (the crop). The question must contradict the crop by proposing cassava.',
  },
  {
    id: 'eg-7',
    sentence: 'Ade arrived at the examination hall at MIDNIGHT.',
    stressedWord: 'MIDNIGHT',
    options: [
      { text: 'Did Bola arrive at the examination hall at midnight?', isCorrect: false },
      { text: 'Did Ade arrive at the examination hall at NOON?', isCorrect: true },
      { text: 'Did Ade leave the examination hall at midnight?', isCorrect: false },
      { text: 'Did Ade arrive at the cinema hall at midnight?', isCorrect: false },
    ],
    explanation: 'Emphasis is on MIDNIGHT (the specific time). The question contrasts the time by asking if he arrived at noon.',
  },
  {
    id: 'eg-8',
    sentence: 'She gave her brother a GOLD wristwatch on his graduation.',
    stressedWord: 'GOLD',
    options: [
      { text: 'Did she give her sister a gold wristwatch on her graduation?', isCorrect: false },
      { text: 'Did she give her brother a SILVER wristwatch on his graduation?', isCorrect: true },
      { text: 'Did she sell her brother a gold wristwatch on his graduation?', isCorrect: false },
      { text: 'Did she give her brother a gold necklace on his graduation?', isCorrect: false },
    ],
    explanation: 'Emphasis is on GOLD (the material). The question contrasts this material by proposing silver.',
  },
  {
    id: 'eg-9',
    sentence: 'The surgeon performed a DELICATE operation on the patient.',
    stressedWord: 'DELICATE',
    options: [
      { text: 'Did the surgeon perform a ROUTINE operation on the patient?', isCorrect: true },
      { text: 'Did the physician perform a delicate operation on the patient?', isCorrect: false },
      { text: 'Did the surgeon cancel a delicate operation on the patient?', isCorrect: false },
      { text: 'Did the surgeon perform a delicate operation on the athlete?', isCorrect: false },
    ],
    explanation: 'Emphasis is on DELICATE (the complexity/nature of the surgery). The question contrasts delicate with routine.',
  },
  {
    id: 'eg-10',
    sentence: 'The police caught the NOTORIOUS robber in broad daylight.',
    stressedWord: 'NOTORIOUS',
    options: [
      { text: 'Did the soldiers catch the notorious robber in broad daylight?', isCorrect: false },
      { text: 'Did the police release the notorious robber in broad daylight?', isCorrect: false },
      { text: 'Did the police catch the PETTY robber in broad daylight?', isCorrect: true },
      { text: 'Did the police catch the notorious robber at night?', isCorrect: false },
    ],
    explanation: 'Emphasis is on NOTORIOUS (the reputation of the robber). The question contrasts this with a petty robber.',
  },
  {
    id: 'eg-11',
    sentence: 'Bisi borrowed TWO novels from the university library.',
    stressedWord: 'TWO',
    options: [
      { text: 'Did Bisi borrow FIVE novels from the university library?', isCorrect: true },
      { text: 'Did Kemi borrow two novels from the university library?', isCorrect: false },
      { text: 'Did Bisi buy two novels from the university library?', isCorrect: false },
      { text: 'Did Bisi borrow two textbooks from the university library?', isCorrect: false },
    ],
    explanation: 'Emphasis is on the numeral TWO. The question must propose an alternative number like five.',
  },
  {
    id: 'eg-12',
    sentence: 'The heavy flood destroyed several BRIDGES in the coastal city.',
    stressedWord: 'BRIDGES',
    options: [
      { text: 'Did the light shower destroy several bridges in the coastal city?', isCorrect: false },
      { text: 'Did the heavy flood repair several bridges in the coastal city?', isCorrect: false },
      { text: 'Did the heavy flood destroy several HOUSES in the coastal city?', isCorrect: true },
      { text: 'Did the heavy flood destroy several bridges in the northern village?', isCorrect: false },
    ],
    explanation: 'Emphasis is on BRIDGES (the structure affected). The question contrasts bridges with houses.',
  },
  {
    id: 'eg-13',
    sentence: 'Ngozi bought a NEW laptop for her university project.',
    stressedWord: 'NEW',
    options: [
      { text: 'Did Ngozi buy a USED laptop for her university project?', isCorrect: true },
      { text: 'Did Emeka buy a new laptop for his university project?', isCorrect: false },
      { text: 'Did Ngozi rent a new laptop for her university project?', isCorrect: false },
      { text: 'Did Ngozi buy a new smartphone for her university project?', isCorrect: false },
    ],
    explanation: 'Emphasis is on NEW (the condition of the laptop). The question contrasts new with used or second-hand.',
  },
  {
    id: 'eg-14',
    sentence: 'The mechanic repaired the lorry SLOWLY.',
    stressedWord: 'SLOWLY',
    options: [
      { text: 'Did the driver repair the lorry slowly?', isCorrect: false },
      { text: 'Did the mechanic dismantle the lorry slowly?', isCorrect: false },
      { text: 'Did the mechanic repair the lorry QUICKLY?', isCorrect: true },
      { text: 'Did the mechanic repair the salon car slowly?', isCorrect: false },
    ],
    explanation: 'Emphasis is on SLOWLY (the adverb of manner). The contrasting question asks whether he repaired it quickly.',
  },
  {
    id: 'eg-15',
    sentence: 'They celebrated their anniversary in ACCRA last month.',
    stressedWord: 'ACCRA',
    options: [
      { text: 'Did they celebrate their wedding in Accra last month?', isCorrect: false },
      { text: 'Did they celebrate their anniversary in LAGOS last month?', isCorrect: true },
      { text: 'Did they celebrate their anniversary in Accra last year?', isCorrect: false },
      { text: 'Did we celebrate our anniversary in Accra last month?', isCorrect: false },
    ],
    explanation: 'Emphasis is on ACCRA (the city). The question contrasts the venue by proposing Lagos.',
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
  {
    id: 'sm-7',
    targetSound: '/uː/',
    soundType: 'vowel',
    prompt: 'Which word contains the LONG close back rounded vowel /uː/ (as in "moon" or "food")?',
    options: [
      { word: 'tomb', isMatch: true, transcription: '/tuːm/', explanation: 'Tomb and womb contain the long /uː/ sound.' },
      { word: 'bomb', isMatch: false, transcription: '/bɒm/', explanation: 'Bomb contains the short /ɒ/ vowel.' },
      { word: 'comb', isMatch: false, transcription: '/kəʊm/', explanation: 'Comb contains the diphthong /əʊ/.' },
      { word: 'book', isMatch: false, transcription: '/bʊk/', explanation: 'Book contains the short /ʊ/ vowel.' },
    ],
  },
  {
    id: 'sm-8',
    targetSound: '/ɔː/',
    soundType: 'vowel',
    prompt: 'Which word contains the LONG open-mid back rounded vowel /ɔː/ (as in "law" or "port")?',
    options: [
      { word: 'broad', isMatch: true, transcription: '/brɔːd/', explanation: 'Broad contains the long /ɔː/ vowel, rhyming with lord.' },
      { word: 'road', isMatch: false, transcription: '/rəʊd/', explanation: 'Road contains the diphthong /əʊ/.' },
      { word: 'toad', isMatch: false, transcription: '/təʊd/', explanation: 'Toad contains the diphthong /əʊ/.' },
      { word: 'boat', isMatch: false, transcription: '/bəʊt/', explanation: 'Boat contains the diphthong /əʊ/.' },
    ],
  },
  {
    id: 'sm-9',
    targetSound: '/dʒ/',
    soundType: 'consonant',
    prompt: 'Which word contains the voiced postalveolar affricate /dʒ/ (as in "judge" or "gem")?',
    options: [
      { word: 'soldier', isMatch: true, transcription: '/ˈsəʊl.dʒər/', explanation: 'The "-dier" in soldier is pronounced with the affricate /dʒ/.' },
      { word: 'gear', isMatch: false, transcription: '/ɡɪər/', explanation: 'Gear has the hard plosive /ɡ/ sound.' },
      { word: 'get', isMatch: false, transcription: '/ɡet/', explanation: 'Get has the hard /ɡ/ sound.' },
      { word: 'give', isMatch: false, transcription: '/ɡɪv/', explanation: 'Give has the hard /ɡ/ sound.' },
    ],
  },
  {
    id: 'sm-10',
    targetSound: '/z/',
    soundType: 'consonant',
    prompt: 'Which word contains the VOICED alveolar fricative /z/ (as in "zoo" or "buzz")?',
    options: [
      { word: 'resume', isMatch: true, transcription: '/rɪˈzjuːm/', explanation: 'The "s" in the verb resume is pronounced as a voiced /z/.' },
      { word: 'cease', isMatch: false, transcription: '/siːs/', explanation: 'Both "c" and "se" in cease are voiceless /s/.' },
      { word: 'loose', isMatch: false, transcription: '/luːs/', explanation: 'Loose ends with voiceless /s/ (contrast with lose /luːz/).' },
      { word: 'house (noun)', isMatch: false, transcription: '/haʊs/', explanation: 'The noun house ends in voiceless /s/.' },
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
    silentIndices: [5], // 'p'
    ipa: '/rɪˈsiːt/',
    explanation: 'The letter "p" in receipt is silent. It rhymes with "deceit".',
  },
  {
    id: 'sl-2',
    word: 'doubt',
    silentIndices: [3], // 'b'
    ipa: '/daʊt/',
    explanation: 'The letter "b" is silent when followed by "t" in words like doubt, debt, and subtle.',
  },
  {
    id: 'sl-3',
    word: 'indict',
    silentIndices: [4], // 'c'
    ipa: '/ɪnˈdaɪt/',
    explanation: 'The letter "c" in indict is completely silent. It rhymes with "polite".',
  },
  {
    id: 'sl-4',
    word: 'subtle',
    silentIndices: [2], // 'b'
    ipa: '/ˈsʌt.əl/',
    explanation: 'The letter "b" in subtle is silent. Pronounced as /ˈsʌt.əl/.',
  },
  {
    id: 'sl-5',
    word: 'mortgage',
    silentIndices: [3], // 't'
    ipa: '/ˈmɔː.ɡɪdʒ/',
    explanation: 'The letter "t" in mortgage is silent. Pronounced as /ˈmɔː.ɡɪdʒ/.',
  },
  {
    id: 'sl-6',
    word: 'plumber',
    silentIndices: [4], // 'b'
    ipa: '/ˈplʌm.ər/',
    explanation: 'The "b" following "m" in plumber, climb, and crumb is silent.',
  },
  {
    id: 'sl-7',
    word: 'sword',
    silentIndices: [1], // 'w'
    ipa: '/sɔːd/',
    explanation: 'The letter "w" in sword is silent. It rhymes with "ford" and "board".',
  },
  {
    id: 'sl-8',
    word: 'colonel',
    silentIndices: [2, 3], // 'l', 'o'
    ipa: '/ˈkɜː.nəl/',
    explanation: 'Colonel is pronounced exactly like "kernel" (/ˈkɜː.nəl/).',
  },
  {
    id: 'sl-9',
    word: 'debris',
    silentIndices: [5], // 's'
    ipa: '/ˈdeb.riː/',
    explanation: 'The final letter "s" in the French loanword debris is silent: /ˈdeb.riː/.',
  },
  {
    id: 'sl-10',
    word: 'hymn',
    silentIndices: [3], // 'n'
    ipa: '/hɪm/',
    explanation: 'The letter "n" following "m" at the end of hymn, solemn, and autumn is silent.',
  },
  {
    id: 'sl-11',
    word: 'paradigm',
    silentIndices: [7], // 'g'
    ipa: '/ˈpær.ə.daɪm/',
    explanation: 'The letter "g" in paradigm is silent. Pronounced /ˈpær.ə.daɪm/.',
  },
  {
    id: 'sl-12',
    word: 'pneumonia',
    silentIndices: [0], // 'p'
    ipa: '/njuːˈməʊ.ni.ə/',
    explanation: 'The initial "p" in Greek-derived words like pneumonia, psalm, and pseudonym is silent.',
  },
  {
    id: 'sl-13',
    word: 'rendezvous',
    silentIndices: [9], // 's'
    ipa: '/ˈrɒn.deɪ.vuː/',
    explanation: 'The final letter "s" in rendezvous is silent: /ˈrɒn.deɪ.vuː/.',
  },
  {
    id: 'sl-14',
    word: 'aisle',
    silentIndices: [1], // 's'
    ipa: '/aɪl/',
    explanation: 'The letter "s" in aisle and island is silent. It sounds identical to "I’ll" and "isle".',
  },
  {
    id: 'sl-15',
    word: 'corps',
    silentIndices: [3, 4], // 'p', 's'
    ipa: '/kɔː/',
    explanation: 'In the military term "corps" (e.g. Army Corps), both "p" and "s" are silent. It is pronounced /kɔː/.',
  },
  {
    id: 'sl-16',
    word: 'salmon',
    silentIndices: [2], // 'l'
    ipa: '/ˈsæm.ən/',
    explanation: 'The letter "l" in salmon, calf, half, and yolk is silent: /ˈsæm.ən/.',
  },
  {
    id: 'sl-17',
    word: 'whistle',
    silentIndices: [4], // 't'
    ipa: '/ˈwɪs.əl/',
    explanation: 'The letter "t" before "-le" in whistle, castle, and wrestle is silent.',
  },
  {
    id: 'sl-18',
    word: 'wreath',
    silentIndices: [0], // 'w'
    ipa: '/riːθ/',
    explanation: 'The letter "w" before "r" in wreath, wrist, wrap, and write is silent.',
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
  {
    id: 'sa-6',
    sentence: 'The judge warned that witness intimidation is a HEINOUS crime.',
    targetWord: 'HEINOUS',
    mode: 'synonym',
    options: ['atrocious', 'commendable', 'trivial', 'innocuous'],
    correctOption: 'atrocious',
    distractorExplanations: {
      commendable: 'Commendable is an antonym (praiseworthy).',
      trivial: 'Trivial means unimportant.',
      innocuous: 'Innocuous means harmless.',
    },
    explanation: 'Heinous means utterly odious or wicked; atrocious is its nearest synonym.',
  },
  {
    id: 'sa-7',
    sentence: 'His PRODIGAL lifestyle drained his family fortune within three years.',
    targetWord: 'PRODIGAL',
    mode: 'antonym',
    options: ['frugal', 'extravagant', 'wasteful', 'lavish'],
    correctOption: 'frugal',
    distractorExplanations: {
      extravagant: 'Extravagant is a synonym (spending recklessly).',
      wasteful: 'Wasteful is a synonym.',
      lavish: 'Lavish means rich and elaborate.',
    },
    explanation: 'Prodigal means spending money wastefully; frugal (thrifty/careful) is its direct antonym.',
  },
  {
    id: 'sa-8',
    sentence: 'The peace accord brought a TRANQUIL atmosphere to the border towns.',
    targetWord: 'TRANQUIL',
    mode: 'synonym',
    options: ['serene', 'turbulent', 'chaotic', 'boisterous'],
    correctOption: 'serene',
    distractorExplanations: {
      turbulent: 'Turbulent is an antonym (chaotic/stormy).',
      chaotic: 'Chaotic means in complete disorder.',
      boisterous: 'Boisterous means noisy and energetic.',
    },
    explanation: 'Tranquil means calm and peaceful; serene is its closest synonym.',
  },
  {
    id: 'sa-9',
    sentence: 'Her ACERBIC comments offended several panel members.',
    targetWord: 'ACERBIC',
    mode: 'antonym',
    options: ['suave', 'caustic', 'cutting', 'biting'],
    correctOption: 'suave',
    distractorExplanations: {
      caustic: 'Caustic is a synonym (sharp and sarcastic).',
      cutting: 'Cutting is a synonym.',
      biting: 'Biting is a synonym.',
    },
    explanation: 'Acerbic means sharp, sarcastic, and sour in tone. Its opposite is suave or courteous/gentle.',
  },
  {
    id: 'sa-10',
    sentence: 'The candidate’s victory was METEORIC following the grassroots rally.',
    targetWord: 'METEORIC',
    mode: 'synonym',
    options: ['rapid', 'gradual', 'sluggish', 'plodding'],
    correctOption: 'rapid',
    distractorExplanations: {
      gradual: 'Gradual is an antonym (slow step by step).',
      sluggish: 'Sluggish means slow and inactive.',
      plodding: 'Plodding means slow and laborious.',
    },
    explanation: 'Meteoric means very rapid and spectacular; rapid is its direct synonym.',
  },
];
