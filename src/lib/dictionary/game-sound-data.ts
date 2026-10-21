import type { SoundMatchGameItem } from './types';

export const SOUND_MATCH_ITEMS: SoundMatchGameItem[] = [
  {
    "id": "sm-1",
    "targetSound": "/\u03b8/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless dental fricative /\u03b8/?",
    "options": [
      {
        "word": "then",
        "isMatch": false,
        "transcription": "/\u00f0en/",
        "explanation": "In 'then', 'th' produces the voiced dental fricative /\u00f0/."
      },
      {
        "word": "tin",
        "isMatch": false,
        "transcription": "/t\u026an/",
        "explanation": "In 'tin', 't' is an alveolar plosive /t/."
      },
      {
        "word": "sin",
        "isMatch": false,
        "transcription": "/s\u026an/",
        "explanation": "In 'sin', 's' is an alveolar fricative /s/."
      },
      {
        "word": "thin",
        "isMatch": true,
        "transcription": "/\u03b8\u026an/",
        "explanation": "In 'thin', 'th' produces the voiceless dental fricative /\u03b8/."
      }
    ]
  },
  {
    "id": "sm-2",
    "targetSound": "/\u00f0/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced dental fricative /\u00f0/?",
    "options": [
      {
        "word": "breeze",
        "isMatch": false,
        "transcription": "/bri\u02d0z/",
        "explanation": "In 'breeze', 'z' is an alveolar fricative /z/."
      },
      {
        "word": "breed",
        "isMatch": false,
        "transcription": "/bri\u02d0d/",
        "explanation": "In 'breed', 'd' is an alveolar plosive /d/."
      },
      {
        "word": "breathe",
        "isMatch": true,
        "transcription": "/bri\u02d0\u00f0/",
        "explanation": "In 'breathe', 'th' produces the voiced sound /\u00f0/."
      },
      {
        "word": "breath",
        "isMatch": false,
        "transcription": "/bre\u03b8/",
        "explanation": "In 'breath', 'th' produces the voiceless sound /\u03b8/."
      }
    ]
  },
  {
    "id": "sm-3",
    "targetSound": "/\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar fricative /\u0283/?",
    "options": [
      {
        "word": "chair",
        "isMatch": false,
        "transcription": "/t\u0283e\u0259r/",
        "explanation": "'chair' uses the affricate /t\u0283/."
      },
      {
        "word": "chef",
        "isMatch": true,
        "transcription": "/\u0283ef/",
        "explanation": "French loanword 'chef' uses 'ch' to produce /\u0283/."
      },
      {
        "word": "chief",
        "isMatch": false,
        "transcription": "/t\u0283i\u02d0f/",
        "explanation": "'chief' uses the affricate /t\u0283/."
      },
      {
        "word": "chemist",
        "isMatch": false,
        "transcription": "/\u02c8kem.\u026ast/",
        "explanation": "'chemist' uses the velar plosive /k/."
      }
    ]
  },
  {
    "id": "sm-4",
    "targetSound": "/t\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar affricate /t\u0283/?",
    "options": [
      {
        "word": "nature",
        "isMatch": true,
        "transcription": "/\u02c8ne\u026a.t\u0283\u0259r/",
        "explanation": "'t' before '-ure' produces /t\u0283/ in 'nature'."
      },
      {
        "word": "nation",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'nation'."
      },
      {
        "word": "native",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.t\u026av/",
        "explanation": "'t' produces /t/ in 'native'."
      },
      {
        "word": "station",
        "isMatch": false,
        "transcription": "/\u02c8ste\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'station'."
      }
    ]
  },
  {
    "id": "sm-5",
    "targetSound": "/\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar fricative /\u0292/?",
    "options": [
      {
        "word": "pressure",
        "isMatch": false,
        "transcription": "/\u02c8pre\u0283.\u0259r/",
        "explanation": "'ss' produces voiceless /\u0283/ in 'pressure'."
      },
      {
        "word": "ensure",
        "isMatch": false,
        "transcription": "/\u026an\u02c8\u0283\u0254\u02d0r/",
        "explanation": "'s' produces /\u0283/ in 'ensure'."
      },
      {
        "word": "major",
        "isMatch": false,
        "transcription": "/\u02c8me\u026a.d\u0292\u0259r/",
        "explanation": "'j' produces affricate /d\u0292/ in 'major'."
      },
      {
        "word": "measure",
        "isMatch": true,
        "transcription": "/\u02c8me\u0292.\u0259r/",
        "explanation": "'s' before '-ure' produces /\u0292/ in 'measure'."
      }
    ]
  },
  {
    "id": "sm-6",
    "targetSound": "/d\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar affricate /d\u0292/?",
    "options": [
      {
        "word": "shoulder",
        "isMatch": false,
        "transcription": "/\u02c8\u0283\u0259\u028al.d\u0259r/",
        "explanation": "'d' produces plosive /d/."
      },
      {
        "word": "solemn",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u0259m/",
        "explanation": "'n' is silent, no affricate."
      },
      {
        "word": "soldier",
        "isMatch": true,
        "transcription": "/\u02c8s\u0259\u028al.d\u0292\u0259r/",
        "explanation": "'di' produces the affricate /d\u0292/ in 'soldier'."
      },
      {
        "word": "solid",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u026ad/",
        "explanation": "'d' produces simple plosive /d/."
      }
    ]
  },
  {
    "id": "sm-7",
    "targetSound": "/\u014b/",
    "soundType": "consonant",
    "prompt": "Which word contains the velar nasal /\u014b/?",
    "options": [
      {
        "word": "ran",
        "isMatch": false,
        "transcription": "/r\u00e6n/",
        "explanation": "'n' is alveolar nasal /n/."
      },
      {
        "word": "rank",
        "isMatch": true,
        "transcription": "/r\u00e6\u014bk/",
        "explanation": "'n' before 'k' assimilates to velar nasal /\u014b/."
      },
      {
        "word": "rain",
        "isMatch": false,
        "transcription": "/re\u026an/",
        "explanation": "'n' is alveolar nasal /n/ in 'rain'."
      },
      {
        "word": "range",
        "isMatch": false,
        "transcription": "/re\u026and\u0292/",
        "explanation": "'n' is followed by affricate /d\u0292/."
      }
    ]
  },
  {
    "id": "sm-8",
    "targetSound": "/f/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless labiodental fricative /f/?",
    "options": [
      {
        "word": "laugh",
        "isMatch": true,
        "transcription": "/l\u0251\u02d0f/",
        "explanation": "'gh' produces /f/ in 'laugh'."
      },
      {
        "word": "though",
        "isMatch": false,
        "transcription": "/\u00f0\u0259\u028a/",
        "explanation": "'gh' is silent in 'though'."
      },
      {
        "word": "through",
        "isMatch": false,
        "transcription": "/\u03b8ru\u02d0/",
        "explanation": "'gh' is silent in 'through'."
      },
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'gh' is silent in 'dough'."
      }
    ]
  },
  {
    "id": "sm-9",
    "targetSound": "/v/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced labiodental fricative /v/?",
    "options": [
      {
        "word": "off",
        "isMatch": false,
        "transcription": "/\u0252f/",
        "explanation": "'ff' produces voiceless /f/ in 'off'."
      },
      {
        "word": "often",
        "isMatch": false,
        "transcription": "/\u02c8\u0252f.n/",
        "explanation": "'f' produces voiceless /f/."
      },
      {
        "word": "orphan",
        "isMatch": false,
        "transcription": "/\u02c8\u0254\u02d0.f\u0259n/",
        "explanation": "'ph' produces voiceless /f/."
      },
      {
        "word": "of",
        "isMatch": true,
        "transcription": "/\u0259v/",
        "explanation": "'f' is pronounced /v/ in the preposition 'of'."
      }
    ]
  },
  {
    "id": "sm-10",
    "targetSound": "/k/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless velar plosive /k/?",
    "options": [
      {
        "word": "stomping",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252m.p\u026a\u014b/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "storage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0254\u02d0.r\u026ad\u0292/",
        "explanation": "Contains rhotic /r/."
      },
      {
        "word": "stomach",
        "isMatch": true,
        "transcription": "/\u02c8st\u028cm.\u0259k/",
        "explanation": "'ch' is pronounced /k/ in Greek loanword 'stomach'."
      },
      {
        "word": "stoppage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252p.\u026ad\u0292/",
        "explanation": "Contains plosive /p/."
      }
    ]
  },
  {
    "id": "sm-11",
    "targetSound": "/s/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless alveolar fricative /s/?",
    "options": [
      {
        "word": "pneumonia",
        "isMatch": false,
        "transcription": "/nju\u02d0\u02c8m\u0259\u028a.ni.\u0259/",
        "explanation": "Initial sound is /n/."
      },
      {
        "word": "psychology",
        "isMatch": true,
        "transcription": "/sa\u026a\u02c8k\u0252l.\u0259.d\u0292i/",
        "explanation": "Initial 'p' is silent; word begins with /s/."
      },
      {
        "word": "philosophy",
        "isMatch": false,
        "transcription": "/f\u026a\u02c8l\u0252s.\u0259.fi/",
        "explanation": "Initial sound is /f/."
      },
      {
        "word": "physics",
        "isMatch": false,
        "transcription": "/\u02c8f\u026az.\u026aks/",
        "explanation": "Initial sound is /f/."
      }
    ]
  },
  {
    "id": "sm-12",
    "targetSound": "/z/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced alveolar fricative /z/?",
    "options": [
      {
        "word": "busy",
        "isMatch": true,
        "transcription": "/\u02c8b\u026az.i/",
        "explanation": "'s' between vowels produces /z/ in 'busy'."
      },
      {
        "word": "basic",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.s\u026ak/",
        "explanation": "'s' produces voiceless /s/ in 'basic'."
      },
      {
        "word": "bison",
        "isMatch": false,
        "transcription": "/\u02c8ba\u026a.s\u0259n/",
        "explanation": "'s' produces voiceless /s/."
      },
      {
        "word": "bask",
        "isMatch": false,
        "transcription": "/b\u0251\u02d0sk/",
        "explanation": "'s' produces voiceless /s/."
      }
    ]
  },
  {
    "id": "sm-13",
    "targetSound": "/j/",
    "soundType": "consonant",
    "prompt": "Which word contains the palatal approximant /j/?",
    "options": [
      {
        "word": "eye",
        "isMatch": false,
        "transcription": "/a\u026a/",
        "explanation": "'eye' begins with diphthong /a\u026a/."
      },
      {
        "word": "ear",
        "isMatch": false,
        "transcription": "/\u026a\u0259r/",
        "explanation": "'ear' begins with diphthong /\u026a\u0259/."
      },
      {
        "word": "ore",
        "isMatch": false,
        "transcription": "/\u0254\u02d0r/",
        "explanation": "'ore' begins with monophthong /\u0254\u02d0/."
      },
      {
        "word": "ewe",
        "isMatch": true,
        "transcription": "/ju\u02d0/",
        "explanation": "'ewe' is pronounced with palatal approximant /j/ as in 'you'."
      }
    ]
  },
  {
    "id": "sm-14",
    "targetSound": "/w/",
    "soundType": "consonant",
    "prompt": "Which word contains the labial-velar approximant /w/?",
    "options": [
      {
        "word": "own",
        "isMatch": false,
        "transcription": "/\u0259\u028an/",
        "explanation": "'own' begins with diphthong /\u0259\u028a/."
      },
      {
        "word": "in",
        "isMatch": false,
        "transcription": "/\u026an/",
        "explanation": "'in' begins with short vowel /\u026a/."
      },
      {
        "word": "one",
        "isMatch": true,
        "transcription": "/w\u028cn/",
        "explanation": "'one' begins with the approximant /w/."
      },
      {
        "word": "on",
        "isMatch": false,
        "transcription": "/\u0252n/",
        "explanation": "'on' begins with vowel /\u0252/."
      }
    ]
  },
  {
    "id": "sm-15",
    "targetSound": "/h/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless glottal fricative /h/?",
    "options": [
      {
        "word": "where",
        "isMatch": false,
        "transcription": "/we\u0259r/",
        "explanation": "'wh' represents /w/ in 'where'."
      },
      {
        "word": "who",
        "isMatch": true,
        "transcription": "/hu\u02d0/",
        "explanation": "'wh' represents glottal fricative /h/ in 'who'."
      },
      {
        "word": "what",
        "isMatch": false,
        "transcription": "/w\u0252t/",
        "explanation": "'wh' represents /w/ in 'what'."
      },
      {
        "word": "when",
        "isMatch": false,
        "transcription": "/wen/",
        "explanation": "'wh' represents /w/ in 'when'."
      }
    ]
  },
  {
    "id": "sm-16",
    "targetSound": "/i\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close front unrounded vowel /i\u02d0/?",
    "options": [
      {
        "word": "quay",
        "isMatch": true,
        "transcription": "/ki\u02d0/",
        "explanation": "'quay' is pronounced /ki\u02d0/ with long vowel /i\u02d0/."
      },
      {
        "word": "play",
        "isMatch": false,
        "transcription": "/ple\u026a/",
        "explanation": "'play' has diphthong /e\u026a/."
      },
      {
        "word": "stay",
        "isMatch": false,
        "transcription": "/ste\u026a/",
        "explanation": "'stay' has diphthong /e\u026a/."
      },
      {
        "word": "guy",
        "isMatch": false,
        "transcription": "/\u0261a\u026a/",
        "explanation": "'guy' has diphthong /a\u026a/."
      }
    ]
  },
  {
    "id": "sm-17",
    "targetSound": "/\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-front unrounded vowel /\u026a/?",
    "options": [
      {
        "word": "woman",
        "isMatch": false,
        "transcription": "/\u02c8w\u028am.\u0259n/",
        "explanation": "Singular 'woman' has short /\u028a/."
      },
      {
        "word": "wooden",
        "isMatch": false,
        "transcription": "/\u02c8w\u028ad.n/",
        "explanation": "'wooden' has short /\u028a/."
      },
      {
        "word": "womb",
        "isMatch": false,
        "transcription": "/wu\u02d0m/",
        "explanation": "'womb' has long /u\u02d0/."
      },
      {
        "word": "women",
        "isMatch": true,
        "transcription": "/\u02c8w\u026am.\u026an/",
        "explanation": "Plural 'women' has short /\u026a/ in both syllables."
      }
    ]
  },
  {
    "id": "sm-18",
    "targetSound": "/e/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open-mid front unrounded vowel /e/?",
    "options": [
      {
        "word": "jeopardy",
        "isMatch": false,
        "transcription": "/\u02c8d\u0292ep.\u0259.di/",
        "explanation": "Also has /e/ but leopard is target."
      },
      {
        "word": "leonine",
        "isMatch": false,
        "transcription": "/\u02c8li\u02d0.\u0259.na\u026an/",
        "explanation": "'eo' is /i\u02d0.\u0259/ in 'leonine'."
      },
      {
        "word": "leopard",
        "isMatch": true,
        "transcription": "/\u02c8lep.\u0259d/",
        "explanation": "'eo' in 'leopard' is pronounced as short /e/."
      },
      {
        "word": "people",
        "isMatch": false,
        "transcription": "/\u02c8pi\u02d0.pl/",
        "explanation": "'eo' in 'people' is long /i\u02d0/."
      }
    ]
  },
  {
    "id": "sm-19",
    "targetSound": "/\u00e6/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-open front unrounded vowel /\u00e6/?",
    "options": [
      {
        "word": "plague",
        "isMatch": false,
        "transcription": "/ple\u026a\u0261/",
        "explanation": "'a' is diphthong /e\u026a/ in 'plague'."
      },
      {
        "word": "plaid",
        "isMatch": true,
        "transcription": "/pl\u00e6d/",
        "explanation": "'ai' in 'plaid' is pronounced as short /\u00e6/."
      },
      {
        "word": "plain",
        "isMatch": false,
        "transcription": "/ple\u026an/",
        "explanation": "'ai' is diphthong /e\u026a/ in 'plain'."
      },
      {
        "word": "plait",
        "isMatch": false,
        "transcription": "/pl\u00e6t/",
        "explanation": "Alternative /pl\u00e6t/."
      }
    ]
  },
  {
    "id": "sm-20",
    "targetSound": "/\u0251\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open back unrounded vowel /\u0251\u02d0/?",
    "options": [
      {
        "word": "clerk",
        "isMatch": true,
        "transcription": "/kl\u0251\u02d0k/",
        "explanation": "In British English, 'er' in 'clerk' is /\u0251\u02d0/."
      },
      {
        "word": "dark",
        "isMatch": false,
        "transcription": "/d\u0251\u02d0k/",
        "explanation": "Also /\u0251\u02d0/, clerk is standard UTME test word."
      },
      {
        "word": "jerk",
        "isMatch": false,
        "transcription": "/d\u0292\u025c\u02d0k/",
        "explanation": "'er' is /\u025c\u02d0/ in 'jerk'."
      },
      {
        "word": "clergyman",
        "isMatch": false,
        "transcription": "/\u02c8kl\u025c\u02d0.d\u0292i.m\u0259n/",
        "explanation": "'er' is /\u025c\u02d0/ in 'clergyman'."
      }
    ]
  },
  {
    "id": "sm-21",
    "targetSound": "/\u0252/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open back rounded vowel /\u0252/?",
    "options": [
      {
        "word": "yawn",
        "isMatch": false,
        "transcription": "/j\u0254\u02d0n/",
        "explanation": "'aw' is long vowel /\u0254\u02d0/ in 'yawn'."
      },
      {
        "word": "yard",
        "isMatch": false,
        "transcription": "/j\u0251\u02d0d/",
        "explanation": "'ar' is long vowel /\u0251\u02d0/ in 'yard'."
      },
      {
        "word": "year",
        "isMatch": false,
        "transcription": "/j\u026a\u0259r/",
        "explanation": "'ear' is diphthong /\u026a\u0259/ in 'year'."
      },
      {
        "word": "yacht",
        "isMatch": true,
        "transcription": "/j\u0252t/",
        "explanation": "'ach' in 'yacht' produces the short vowel /\u0252/."
      }
    ]
  },
  {
    "id": "sm-22",
    "targetSound": "/\u0254\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid back rounded vowel /\u0254\u02d0/?",
    "options": [
      {
        "word": "boat",
        "isMatch": false,
        "transcription": "/b\u0259\u028at/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'boat'."
      },
      {
        "word": "road",
        "isMatch": false,
        "transcription": "/r\u0259\u028ad/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'road'."
      },
      {
        "word": "broad",
        "isMatch": true,
        "transcription": "/br\u0254\u02d0d/",
        "explanation": "'oa' in 'broad' is pronounced /\u0254\u02d0/."
      },
      {
        "word": "board",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0d/",
        "explanation": "Both contain /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-23",
    "targetSound": "/u\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close back rounded vowel /u\u02d0/?",
    "options": [
      {
        "word": "biscuit",
        "isMatch": false,
        "transcription": "/\u02c8b\u026as.k\u026at/",
        "explanation": "'ui' is /\u026a/ in 'biscuit'."
      },
      {
        "word": "suit",
        "isMatch": true,
        "transcription": "/su\u02d0t/",
        "explanation": "'ui' in 'suit' produces long vowel /u\u02d0/."
      },
      {
        "word": "suite",
        "isMatch": false,
        "transcription": "/swi\u02d0t/",
        "explanation": "'suite' is pronounced like 'sweet' /swi\u02d0t/."
      },
      {
        "word": "suit",
        "isMatch": false,
        "transcription": "/su\u02d0t/",
        "explanation": "Match."
      }
    ]
  },
  {
    "id": "sm-24",
    "targetSound": "/\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-back rounded vowel /\u028a/?",
    "options": [
      {
        "word": "could",
        "isMatch": true,
        "transcription": "/k\u028ad/",
        "explanation": "'oul' produces short rounded vowel /\u028a/ in 'could'."
      },
      {
        "word": "cold",
        "isMatch": false,
        "transcription": "/k\u0259\u028ald/",
        "explanation": "'old' has diphthong /\u0259\u028a/."
      },
      {
        "word": "cool",
        "isMatch": false,
        "transcription": "/ku\u02d0l/",
        "explanation": "'oo' has long /u\u02d0/."
      },
      {
        "word": "cloud",
        "isMatch": false,
        "transcription": "/kla\u028ad/",
        "explanation": "'ou' has diphthong /a\u028a/."
      }
    ]
  },
  {
    "id": "sm-25",
    "targetSound": "/\u025c\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid central unrounded vowel /\u025c\u02d0/?",
    "options": [
      {
        "word": "tour",
        "isMatch": false,
        "transcription": "/t\u028a\u0259r/",
        "explanation": "'our' produces diphthong /\u028a\u0259/ in 'tour'."
      },
      {
        "word": "sour",
        "isMatch": false,
        "transcription": "/sa\u028a\u0259r/",
        "explanation": "'our' produces triphthong /a\u028a\u0259/ in 'sour'."
      },
      {
        "word": "four",
        "isMatch": false,
        "transcription": "/f\u0254\u02d0r/",
        "explanation": "'our' produces long vowel /\u0254\u02d0/ in 'four'."
      },
      {
        "word": "journey",
        "isMatch": true,
        "transcription": "/\u02c8d\u0292\u025c\u02d0.ni/",
        "explanation": "'our' produces long central /\u025c\u02d0/ in 'journey'."
      }
    ]
  },
  {
    "id": "sm-26",
    "targetSound": "/\u0259/",
    "soundType": "vowel",
    "prompt": "Which word contains the weak mid-central unrounded vowel (schwa) /\u0259/?",
    "options": [
      {
        "word": "bacon",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.k\u0259n/",
        "explanation": "First syllable has /e\u026a/."
      },
      {
        "word": "barter",
        "isMatch": false,
        "transcription": "/\u02c8b\u0251\u02d0.t\u0259r/",
        "explanation": "First syllable has /\u0251\u02d0/."
      },
      {
        "word": "banana",
        "isMatch": true,
        "transcription": "/b\u0259\u02c8n\u0251\u02d0.n\u0259/",
        "explanation": "First and last syllables contain schwa /\u0259/."
      },
      {
        "word": "badger",
        "isMatch": false,
        "transcription": "/\u02c8b\u00e6d\u0292.\u0259r/",
        "explanation": "First syllable has /\u00e6/."
      }
    ]
  },
  {
    "id": "sm-27",
    "targetSound": "/e\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /e\u026a/?",
    "options": [
      {
        "word": "gaunt",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0nt/",
        "explanation": "'au' in 'gaunt' is long /\u0254\u02d0/."
      },
      {
        "word": "gauge",
        "isMatch": true,
        "transcription": "/\u0261e\u026ad\u0292/",
        "explanation": "'au' in 'gauge' is pronounced with diphthong /e\u026a/."
      },
      {
        "word": "gouge",
        "isMatch": false,
        "transcription": "/\u0261a\u028ad\u0292/",
        "explanation": "'ou' in 'gouge' is diphthong /a\u028a/."
      },
      {
        "word": "gauze",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0z/",
        "explanation": "'au' in 'gauze' is long /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-28",
    "targetSound": "/a\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u026a/?",
    "options": [
      {
        "word": "height",
        "isMatch": true,
        "transcription": "/ha\u026at/",
        "explanation": "'eigh' in 'height' is pronounced /a\u026a/."
      },
      {
        "word": "weight",
        "isMatch": false,
        "transcription": "/we\u026at/",
        "explanation": "'eigh' in 'weight' is pronounced /e\u026a/."
      },
      {
        "word": "freight",
        "isMatch": false,
        "transcription": "/fre\u026at/",
        "explanation": "'eigh' in 'freight' is pronounced /e\u026a/."
      },
      {
        "word": "eight",
        "isMatch": false,
        "transcription": "/e\u026at/",
        "explanation": "'eigh' in 'eight' is pronounced /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-29",
    "targetSound": "/a\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u028a/?",
    "options": [
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'ough' in 'dough' is /\u0259\u028a/."
      },
      {
        "word": "bought",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0t/",
        "explanation": "'ough' in 'bought' is /\u0254\u02d0/."
      },
      {
        "word": "rough",
        "isMatch": false,
        "transcription": "/r\u028cf/",
        "explanation": "'ough' in 'rough' is /\u028cf/."
      },
      {
        "word": "drought",
        "isMatch": true,
        "transcription": "/dra\u028at/",
        "explanation": "'ough' in 'drought' is pronounced /a\u028a/."
      }
    ]
  },
  {
    "id": "sm-30",
    "targetSound": "/\u0259\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /\u0259\u028a/?",
    "options": [
      {
        "word": "new",
        "isMatch": false,
        "transcription": "/nju\u02d0/",
        "explanation": "'ew' in 'new' is /nju\u02d0/."
      },
      {
        "word": "flew",
        "isMatch": false,
        "transcription": "/flu\u02d0/",
        "explanation": "'ew' in 'flew' is /u\u02d0/."
      },
      {
        "word": "sew",
        "isMatch": true,
        "transcription": "/s\u0259\u028a/",
        "explanation": "'ew' in 'sew' is pronounced with diphthong /\u0259\u028a/."
      },
      {
        "word": "few",
        "isMatch": false,
        "transcription": "/fju\u02d0/",
        "explanation": "'ew' in 'few' is /ju\u02d0/."
      }
    ]
  },
  {
    "id": "sm-31",
    "targetSound": "/\u03b8/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless dental fricative /\u03b8/?",
    "options": [
      {
        "word": "thin",
        "isMatch": true,
        "transcription": "/\u03b8\u026an/",
        "explanation": "In 'thin', 'th' produces the voiceless dental fricative /\u03b8/."
      },
      {
        "word": "then",
        "isMatch": false,
        "transcription": "/\u00f0en/",
        "explanation": "In 'then', 'th' produces the voiced dental fricative /\u00f0/."
      },
      {
        "word": "tin",
        "isMatch": false,
        "transcription": "/t\u026an/",
        "explanation": "In 'tin', 't' is an alveolar plosive /t/."
      },
      {
        "word": "sin",
        "isMatch": false,
        "transcription": "/s\u026an/",
        "explanation": "In 'sin', 's' is an alveolar fricative /s/."
      }
    ]
  },
  {
    "id": "sm-32",
    "targetSound": "/\u00f0/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced dental fricative /\u00f0/?",
    "options": [
      {
        "word": "breath",
        "isMatch": false,
        "transcription": "/bre\u03b8/",
        "explanation": "In 'breath', 'th' produces the voiceless sound /\u03b8/."
      },
      {
        "word": "breeze",
        "isMatch": false,
        "transcription": "/bri\u02d0z/",
        "explanation": "In 'breeze', 'z' is an alveolar fricative /z/."
      },
      {
        "word": "breed",
        "isMatch": false,
        "transcription": "/bri\u02d0d/",
        "explanation": "In 'breed', 'd' is an alveolar plosive /d/."
      },
      {
        "word": "breathe",
        "isMatch": true,
        "transcription": "/bri\u02d0\u00f0/",
        "explanation": "In 'breathe', 'th' produces the voiced sound /\u00f0/."
      }
    ]
  },
  {
    "id": "sm-33",
    "targetSound": "/\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar fricative /\u0283/?",
    "options": [
      {
        "word": "chemist",
        "isMatch": false,
        "transcription": "/\u02c8kem.\u026ast/",
        "explanation": "'chemist' uses the velar plosive /k/."
      },
      {
        "word": "chair",
        "isMatch": false,
        "transcription": "/t\u0283e\u0259r/",
        "explanation": "'chair' uses the affricate /t\u0283/."
      },
      {
        "word": "chef",
        "isMatch": true,
        "transcription": "/\u0283ef/",
        "explanation": "French loanword 'chef' uses 'ch' to produce /\u0283/."
      },
      {
        "word": "chief",
        "isMatch": false,
        "transcription": "/t\u0283i\u02d0f/",
        "explanation": "'chief' uses the affricate /t\u0283/."
      }
    ]
  },
  {
    "id": "sm-34",
    "targetSound": "/t\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar affricate /t\u0283/?",
    "options": [
      {
        "word": "station",
        "isMatch": false,
        "transcription": "/\u02c8ste\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'station'."
      },
      {
        "word": "nature",
        "isMatch": true,
        "transcription": "/\u02c8ne\u026a.t\u0283\u0259r/",
        "explanation": "'t' before '-ure' produces /t\u0283/ in 'nature'."
      },
      {
        "word": "nation",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'nation'."
      },
      {
        "word": "native",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.t\u026av/",
        "explanation": "'t' produces /t/ in 'native'."
      }
    ]
  },
  {
    "id": "sm-35",
    "targetSound": "/\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar fricative /\u0292/?",
    "options": [
      {
        "word": "measure",
        "isMatch": true,
        "transcription": "/\u02c8me\u0292.\u0259r/",
        "explanation": "'s' before '-ure' produces /\u0292/ in 'measure'."
      },
      {
        "word": "pressure",
        "isMatch": false,
        "transcription": "/\u02c8pre\u0283.\u0259r/",
        "explanation": "'ss' produces voiceless /\u0283/ in 'pressure'."
      },
      {
        "word": "ensure",
        "isMatch": false,
        "transcription": "/\u026an\u02c8\u0283\u0254\u02d0r/",
        "explanation": "'s' produces /\u0283/ in 'ensure'."
      },
      {
        "word": "major",
        "isMatch": false,
        "transcription": "/\u02c8me\u026a.d\u0292\u0259r/",
        "explanation": "'j' produces affricate /d\u0292/ in 'major'."
      }
    ]
  },
  {
    "id": "sm-36",
    "targetSound": "/d\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar affricate /d\u0292/?",
    "options": [
      {
        "word": "solid",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u026ad/",
        "explanation": "'d' produces simple plosive /d/."
      },
      {
        "word": "shoulder",
        "isMatch": false,
        "transcription": "/\u02c8\u0283\u0259\u028al.d\u0259r/",
        "explanation": "'d' produces plosive /d/."
      },
      {
        "word": "solemn",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u0259m/",
        "explanation": "'n' is silent, no affricate."
      },
      {
        "word": "soldier",
        "isMatch": true,
        "transcription": "/\u02c8s\u0259\u028al.d\u0292\u0259r/",
        "explanation": "'di' produces the affricate /d\u0292/ in 'soldier'."
      }
    ]
  },
  {
    "id": "sm-37",
    "targetSound": "/\u014b/",
    "soundType": "consonant",
    "prompt": "Which word contains the velar nasal /\u014b/?",
    "options": [
      {
        "word": "range",
        "isMatch": false,
        "transcription": "/re\u026and\u0292/",
        "explanation": "'n' is followed by affricate /d\u0292/."
      },
      {
        "word": "ran",
        "isMatch": false,
        "transcription": "/r\u00e6n/",
        "explanation": "'n' is alveolar nasal /n/."
      },
      {
        "word": "rank",
        "isMatch": true,
        "transcription": "/r\u00e6\u014bk/",
        "explanation": "'n' before 'k' assimilates to velar nasal /\u014b/."
      },
      {
        "word": "rain",
        "isMatch": false,
        "transcription": "/re\u026an/",
        "explanation": "'n' is alveolar nasal /n/ in 'rain'."
      }
    ]
  },
  {
    "id": "sm-38",
    "targetSound": "/f/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless labiodental fricative /f/?",
    "options": [
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'gh' is silent in 'dough'."
      },
      {
        "word": "laugh",
        "isMatch": true,
        "transcription": "/l\u0251\u02d0f/",
        "explanation": "'gh' produces /f/ in 'laugh'."
      },
      {
        "word": "though",
        "isMatch": false,
        "transcription": "/\u00f0\u0259\u028a/",
        "explanation": "'gh' is silent in 'though'."
      },
      {
        "word": "through",
        "isMatch": false,
        "transcription": "/\u03b8ru\u02d0/",
        "explanation": "'gh' is silent in 'through'."
      }
    ]
  },
  {
    "id": "sm-39",
    "targetSound": "/v/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced labiodental fricative /v/?",
    "options": [
      {
        "word": "of",
        "isMatch": true,
        "transcription": "/\u0259v/",
        "explanation": "'f' is pronounced /v/ in the preposition 'of'."
      },
      {
        "word": "off",
        "isMatch": false,
        "transcription": "/\u0252f/",
        "explanation": "'ff' produces voiceless /f/ in 'off'."
      },
      {
        "word": "often",
        "isMatch": false,
        "transcription": "/\u02c8\u0252f.n/",
        "explanation": "'f' produces voiceless /f/."
      },
      {
        "word": "orphan",
        "isMatch": false,
        "transcription": "/\u02c8\u0254\u02d0.f\u0259n/",
        "explanation": "'ph' produces voiceless /f/."
      }
    ]
  },
  {
    "id": "sm-40",
    "targetSound": "/k/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless velar plosive /k/?",
    "options": [
      {
        "word": "stoppage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252p.\u026ad\u0292/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "stomping",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252m.p\u026a\u014b/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "storage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0254\u02d0.r\u026ad\u0292/",
        "explanation": "Contains rhotic /r/."
      },
      {
        "word": "stomach",
        "isMatch": true,
        "transcription": "/\u02c8st\u028cm.\u0259k/",
        "explanation": "'ch' is pronounced /k/ in Greek loanword 'stomach'."
      }
    ]
  },
  {
    "id": "sm-41",
    "targetSound": "/s/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless alveolar fricative /s/?",
    "options": [
      {
        "word": "physics",
        "isMatch": false,
        "transcription": "/\u02c8f\u026az.\u026aks/",
        "explanation": "Initial sound is /f/."
      },
      {
        "word": "pneumonia",
        "isMatch": false,
        "transcription": "/nju\u02d0\u02c8m\u0259\u028a.ni.\u0259/",
        "explanation": "Initial sound is /n/."
      },
      {
        "word": "psychology",
        "isMatch": true,
        "transcription": "/sa\u026a\u02c8k\u0252l.\u0259.d\u0292i/",
        "explanation": "Initial 'p' is silent; word begins with /s/."
      },
      {
        "word": "philosophy",
        "isMatch": false,
        "transcription": "/f\u026a\u02c8l\u0252s.\u0259.fi/",
        "explanation": "Initial sound is /f/."
      }
    ]
  },
  {
    "id": "sm-42",
    "targetSound": "/z/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced alveolar fricative /z/?",
    "options": [
      {
        "word": "bask",
        "isMatch": false,
        "transcription": "/b\u0251\u02d0sk/",
        "explanation": "'s' produces voiceless /s/."
      },
      {
        "word": "busy",
        "isMatch": true,
        "transcription": "/\u02c8b\u026az.i/",
        "explanation": "'s' between vowels produces /z/ in 'busy'."
      },
      {
        "word": "basic",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.s\u026ak/",
        "explanation": "'s' produces voiceless /s/ in 'basic'."
      },
      {
        "word": "bison",
        "isMatch": false,
        "transcription": "/\u02c8ba\u026a.s\u0259n/",
        "explanation": "'s' produces voiceless /s/."
      }
    ]
  },
  {
    "id": "sm-43",
    "targetSound": "/j/",
    "soundType": "consonant",
    "prompt": "Which word contains the palatal approximant /j/?",
    "options": [
      {
        "word": "ewe",
        "isMatch": true,
        "transcription": "/ju\u02d0/",
        "explanation": "'ewe' is pronounced with palatal approximant /j/ as in 'you'."
      },
      {
        "word": "eye",
        "isMatch": false,
        "transcription": "/a\u026a/",
        "explanation": "'eye' begins with diphthong /a\u026a/."
      },
      {
        "word": "ear",
        "isMatch": false,
        "transcription": "/\u026a\u0259r/",
        "explanation": "'ear' begins with diphthong /\u026a\u0259/."
      },
      {
        "word": "ore",
        "isMatch": false,
        "transcription": "/\u0254\u02d0r/",
        "explanation": "'ore' begins with monophthong /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-44",
    "targetSound": "/w/",
    "soundType": "consonant",
    "prompt": "Which word contains the labial-velar approximant /w/?",
    "options": [
      {
        "word": "on",
        "isMatch": false,
        "transcription": "/\u0252n/",
        "explanation": "'on' begins with vowel /\u0252/."
      },
      {
        "word": "own",
        "isMatch": false,
        "transcription": "/\u0259\u028an/",
        "explanation": "'own' begins with diphthong /\u0259\u028a/."
      },
      {
        "word": "in",
        "isMatch": false,
        "transcription": "/\u026an/",
        "explanation": "'in' begins with short vowel /\u026a/."
      },
      {
        "word": "one",
        "isMatch": true,
        "transcription": "/w\u028cn/",
        "explanation": "'one' begins with the approximant /w/."
      }
    ]
  },
  {
    "id": "sm-45",
    "targetSound": "/h/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless glottal fricative /h/?",
    "options": [
      {
        "word": "when",
        "isMatch": false,
        "transcription": "/wen/",
        "explanation": "'wh' represents /w/ in 'when'."
      },
      {
        "word": "where",
        "isMatch": false,
        "transcription": "/we\u0259r/",
        "explanation": "'wh' represents /w/ in 'where'."
      },
      {
        "word": "who",
        "isMatch": true,
        "transcription": "/hu\u02d0/",
        "explanation": "'wh' represents glottal fricative /h/ in 'who'."
      },
      {
        "word": "what",
        "isMatch": false,
        "transcription": "/w\u0252t/",
        "explanation": "'wh' represents /w/ in 'what'."
      }
    ]
  },
  {
    "id": "sm-46",
    "targetSound": "/i\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close front unrounded vowel /i\u02d0/?",
    "options": [
      {
        "word": "guy",
        "isMatch": false,
        "transcription": "/\u0261a\u026a/",
        "explanation": "'guy' has diphthong /a\u026a/."
      },
      {
        "word": "quay",
        "isMatch": true,
        "transcription": "/ki\u02d0/",
        "explanation": "'quay' is pronounced /ki\u02d0/ with long vowel /i\u02d0/."
      },
      {
        "word": "play",
        "isMatch": false,
        "transcription": "/ple\u026a/",
        "explanation": "'play' has diphthong /e\u026a/."
      },
      {
        "word": "stay",
        "isMatch": false,
        "transcription": "/ste\u026a/",
        "explanation": "'stay' has diphthong /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-47",
    "targetSound": "/\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-front unrounded vowel /\u026a/?",
    "options": [
      {
        "word": "women",
        "isMatch": true,
        "transcription": "/\u02c8w\u026am.\u026an/",
        "explanation": "Plural 'women' has short /\u026a/ in both syllables."
      },
      {
        "word": "woman",
        "isMatch": false,
        "transcription": "/\u02c8w\u028am.\u0259n/",
        "explanation": "Singular 'woman' has short /\u028a/."
      },
      {
        "word": "wooden",
        "isMatch": false,
        "transcription": "/\u02c8w\u028ad.n/",
        "explanation": "'wooden' has short /\u028a/."
      },
      {
        "word": "womb",
        "isMatch": false,
        "transcription": "/wu\u02d0m/",
        "explanation": "'womb' has long /u\u02d0/."
      }
    ]
  },
  {
    "id": "sm-48",
    "targetSound": "/e/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open-mid front unrounded vowel /e/?",
    "options": [
      {
        "word": "people",
        "isMatch": false,
        "transcription": "/\u02c8pi\u02d0.pl/",
        "explanation": "'eo' in 'people' is long /i\u02d0/."
      },
      {
        "word": "jeopardy",
        "isMatch": false,
        "transcription": "/\u02c8d\u0292ep.\u0259.di/",
        "explanation": "Also has /e/ but leopard is target."
      },
      {
        "word": "leonine",
        "isMatch": false,
        "transcription": "/\u02c8li\u02d0.\u0259.na\u026an/",
        "explanation": "'eo' is /i\u02d0.\u0259/ in 'leonine'."
      },
      {
        "word": "leopard",
        "isMatch": true,
        "transcription": "/\u02c8lep.\u0259d/",
        "explanation": "'eo' in 'leopard' is pronounced as short /e/."
      }
    ]
  },
  {
    "id": "sm-49",
    "targetSound": "/\u00e6/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-open front unrounded vowel /\u00e6/?",
    "options": [
      {
        "word": "plait",
        "isMatch": false,
        "transcription": "/pl\u00e6t/",
        "explanation": "Alternative /pl\u00e6t/."
      },
      {
        "word": "plague",
        "isMatch": false,
        "transcription": "/ple\u026a\u0261/",
        "explanation": "'a' is diphthong /e\u026a/ in 'plague'."
      },
      {
        "word": "plaid",
        "isMatch": true,
        "transcription": "/pl\u00e6d/",
        "explanation": "'ai' in 'plaid' is pronounced as short /\u00e6/."
      },
      {
        "word": "plain",
        "isMatch": false,
        "transcription": "/ple\u026an/",
        "explanation": "'ai' is diphthong /e\u026a/ in 'plain'."
      }
    ]
  },
  {
    "id": "sm-50",
    "targetSound": "/\u0251\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open back unrounded vowel /\u0251\u02d0/?",
    "options": [
      {
        "word": "clergyman",
        "isMatch": false,
        "transcription": "/\u02c8kl\u025c\u02d0.d\u0292i.m\u0259n/",
        "explanation": "'er' is /\u025c\u02d0/ in 'clergyman'."
      },
      {
        "word": "clerk",
        "isMatch": true,
        "transcription": "/kl\u0251\u02d0k/",
        "explanation": "In British English, 'er' in 'clerk' is /\u0251\u02d0/."
      },
      {
        "word": "dark",
        "isMatch": false,
        "transcription": "/d\u0251\u02d0k/",
        "explanation": "Also /\u0251\u02d0/, clerk is standard UTME test word."
      },
      {
        "word": "jerk",
        "isMatch": false,
        "transcription": "/d\u0292\u025c\u02d0k/",
        "explanation": "'er' is /\u025c\u02d0/ in 'jerk'."
      }
    ]
  },
  {
    "id": "sm-51",
    "targetSound": "/\u0252/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open back rounded vowel /\u0252/?",
    "options": [
      {
        "word": "yacht",
        "isMatch": true,
        "transcription": "/j\u0252t/",
        "explanation": "'ach' in 'yacht' produces the short vowel /\u0252/."
      },
      {
        "word": "yawn",
        "isMatch": false,
        "transcription": "/j\u0254\u02d0n/",
        "explanation": "'aw' is long vowel /\u0254\u02d0/ in 'yawn'."
      },
      {
        "word": "yard",
        "isMatch": false,
        "transcription": "/j\u0251\u02d0d/",
        "explanation": "'ar' is long vowel /\u0251\u02d0/ in 'yard'."
      },
      {
        "word": "year",
        "isMatch": false,
        "transcription": "/j\u026a\u0259r/",
        "explanation": "'ear' is diphthong /\u026a\u0259/ in 'year'."
      }
    ]
  },
  {
    "id": "sm-52",
    "targetSound": "/\u0254\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid back rounded vowel /\u0254\u02d0/?",
    "options": [
      {
        "word": "board",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0d/",
        "explanation": "Both contain /\u0254\u02d0/."
      },
      {
        "word": "boat",
        "isMatch": false,
        "transcription": "/b\u0259\u028at/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'boat'."
      },
      {
        "word": "road",
        "isMatch": false,
        "transcription": "/r\u0259\u028ad/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'road'."
      },
      {
        "word": "broad",
        "isMatch": true,
        "transcription": "/br\u0254\u02d0d/",
        "explanation": "'oa' in 'broad' is pronounced /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-53",
    "targetSound": "/u\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close back rounded vowel /u\u02d0/?",
    "options": [
      {
        "word": "suit",
        "isMatch": false,
        "transcription": "/su\u02d0t/",
        "explanation": "Match."
      },
      {
        "word": "biscuit",
        "isMatch": false,
        "transcription": "/\u02c8b\u026as.k\u026at/",
        "explanation": "'ui' is /\u026a/ in 'biscuit'."
      },
      {
        "word": "suit",
        "isMatch": true,
        "transcription": "/su\u02d0t/",
        "explanation": "'ui' in 'suit' produces long vowel /u\u02d0/."
      },
      {
        "word": "suite",
        "isMatch": false,
        "transcription": "/swi\u02d0t/",
        "explanation": "'suite' is pronounced like 'sweet' /swi\u02d0t/."
      }
    ]
  },
  {
    "id": "sm-54",
    "targetSound": "/\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-back rounded vowel /\u028a/?",
    "options": [
      {
        "word": "cloud",
        "isMatch": false,
        "transcription": "/kla\u028ad/",
        "explanation": "'ou' has diphthong /a\u028a/."
      },
      {
        "word": "could",
        "isMatch": true,
        "transcription": "/k\u028ad/",
        "explanation": "'oul' produces short rounded vowel /\u028a/ in 'could'."
      },
      {
        "word": "cold",
        "isMatch": false,
        "transcription": "/k\u0259\u028ald/",
        "explanation": "'old' has diphthong /\u0259\u028a/."
      },
      {
        "word": "cool",
        "isMatch": false,
        "transcription": "/ku\u02d0l/",
        "explanation": "'oo' has long /u\u02d0/."
      }
    ]
  },
  {
    "id": "sm-55",
    "targetSound": "/\u025c\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid central unrounded vowel /\u025c\u02d0/?",
    "options": [
      {
        "word": "journey",
        "isMatch": true,
        "transcription": "/\u02c8d\u0292\u025c\u02d0.ni/",
        "explanation": "'our' produces long central /\u025c\u02d0/ in 'journey'."
      },
      {
        "word": "tour",
        "isMatch": false,
        "transcription": "/t\u028a\u0259r/",
        "explanation": "'our' produces diphthong /\u028a\u0259/ in 'tour'."
      },
      {
        "word": "sour",
        "isMatch": false,
        "transcription": "/sa\u028a\u0259r/",
        "explanation": "'our' produces triphthong /a\u028a\u0259/ in 'sour'."
      },
      {
        "word": "four",
        "isMatch": false,
        "transcription": "/f\u0254\u02d0r/",
        "explanation": "'our' produces long vowel /\u0254\u02d0/ in 'four'."
      }
    ]
  },
  {
    "id": "sm-56",
    "targetSound": "/\u0259/",
    "soundType": "vowel",
    "prompt": "Which word contains the weak mid-central unrounded vowel (schwa) /\u0259/?",
    "options": [
      {
        "word": "badger",
        "isMatch": false,
        "transcription": "/\u02c8b\u00e6d\u0292.\u0259r/",
        "explanation": "First syllable has /\u00e6/."
      },
      {
        "word": "bacon",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.k\u0259n/",
        "explanation": "First syllable has /e\u026a/."
      },
      {
        "word": "barter",
        "isMatch": false,
        "transcription": "/\u02c8b\u0251\u02d0.t\u0259r/",
        "explanation": "First syllable has /\u0251\u02d0/."
      },
      {
        "word": "banana",
        "isMatch": true,
        "transcription": "/b\u0259\u02c8n\u0251\u02d0.n\u0259/",
        "explanation": "First and last syllables contain schwa /\u0259/."
      }
    ]
  },
  {
    "id": "sm-57",
    "targetSound": "/e\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /e\u026a/?",
    "options": [
      {
        "word": "gauze",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0z/",
        "explanation": "'au' in 'gauze' is long /\u0254\u02d0/."
      },
      {
        "word": "gaunt",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0nt/",
        "explanation": "'au' in 'gaunt' is long /\u0254\u02d0/."
      },
      {
        "word": "gauge",
        "isMatch": true,
        "transcription": "/\u0261e\u026ad\u0292/",
        "explanation": "'au' in 'gauge' is pronounced with diphthong /e\u026a/."
      },
      {
        "word": "gouge",
        "isMatch": false,
        "transcription": "/\u0261a\u028ad\u0292/",
        "explanation": "'ou' in 'gouge' is diphthong /a\u028a/."
      }
    ]
  },
  {
    "id": "sm-58",
    "targetSound": "/a\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u026a/?",
    "options": [
      {
        "word": "eight",
        "isMatch": false,
        "transcription": "/e\u026at/",
        "explanation": "'eigh' in 'eight' is pronounced /e\u026a/."
      },
      {
        "word": "height",
        "isMatch": true,
        "transcription": "/ha\u026at/",
        "explanation": "'eigh' in 'height' is pronounced /a\u026a/."
      },
      {
        "word": "weight",
        "isMatch": false,
        "transcription": "/we\u026at/",
        "explanation": "'eigh' in 'weight' is pronounced /e\u026a/."
      },
      {
        "word": "freight",
        "isMatch": false,
        "transcription": "/fre\u026at/",
        "explanation": "'eigh' in 'freight' is pronounced /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-59",
    "targetSound": "/a\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u028a/?",
    "options": [
      {
        "word": "drought",
        "isMatch": true,
        "transcription": "/dra\u028at/",
        "explanation": "'ough' in 'drought' is pronounced /a\u028a/."
      },
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'ough' in 'dough' is /\u0259\u028a/."
      },
      {
        "word": "bought",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0t/",
        "explanation": "'ough' in 'bought' is /\u0254\u02d0/."
      },
      {
        "word": "rough",
        "isMatch": false,
        "transcription": "/r\u028cf/",
        "explanation": "'ough' in 'rough' is /\u028cf/."
      }
    ]
  },
  {
    "id": "sm-60",
    "targetSound": "/\u0259\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /\u0259\u028a/?",
    "options": [
      {
        "word": "few",
        "isMatch": false,
        "transcription": "/fju\u02d0/",
        "explanation": "'ew' in 'few' is /ju\u02d0/."
      },
      {
        "word": "new",
        "isMatch": false,
        "transcription": "/nju\u02d0/",
        "explanation": "'ew' in 'new' is /nju\u02d0/."
      },
      {
        "word": "flew",
        "isMatch": false,
        "transcription": "/flu\u02d0/",
        "explanation": "'ew' in 'flew' is /u\u02d0/."
      },
      {
        "word": "sew",
        "isMatch": true,
        "transcription": "/s\u0259\u028a/",
        "explanation": "'ew' in 'sew' is pronounced with diphthong /\u0259\u028a/."
      }
    ]
  },
  {
    "id": "sm-61",
    "targetSound": "/\u03b8/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless dental fricative /\u03b8/?",
    "options": [
      {
        "word": "sin",
        "isMatch": false,
        "transcription": "/s\u026an/",
        "explanation": "In 'sin', 's' is an alveolar fricative /s/."
      },
      {
        "word": "thin",
        "isMatch": true,
        "transcription": "/\u03b8\u026an/",
        "explanation": "In 'thin', 'th' produces the voiceless dental fricative /\u03b8/."
      },
      {
        "word": "then",
        "isMatch": false,
        "transcription": "/\u00f0en/",
        "explanation": "In 'then', 'th' produces the voiced dental fricative /\u00f0/."
      },
      {
        "word": "tin",
        "isMatch": false,
        "transcription": "/t\u026an/",
        "explanation": "In 'tin', 't' is an alveolar plosive /t/."
      }
    ]
  },
  {
    "id": "sm-62",
    "targetSound": "/\u00f0/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced dental fricative /\u00f0/?",
    "options": [
      {
        "word": "breathe",
        "isMatch": true,
        "transcription": "/bri\u02d0\u00f0/",
        "explanation": "In 'breathe', 'th' produces the voiced sound /\u00f0/."
      },
      {
        "word": "breath",
        "isMatch": false,
        "transcription": "/bre\u03b8/",
        "explanation": "In 'breath', 'th' produces the voiceless sound /\u03b8/."
      },
      {
        "word": "breeze",
        "isMatch": false,
        "transcription": "/bri\u02d0z/",
        "explanation": "In 'breeze', 'z' is an alveolar fricative /z/."
      },
      {
        "word": "breed",
        "isMatch": false,
        "transcription": "/bri\u02d0d/",
        "explanation": "In 'breed', 'd' is an alveolar plosive /d/."
      }
    ]
  },
  {
    "id": "sm-63",
    "targetSound": "/\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar fricative /\u0283/?",
    "options": [
      {
        "word": "chief",
        "isMatch": false,
        "transcription": "/t\u0283i\u02d0f/",
        "explanation": "'chief' uses the affricate /t\u0283/."
      },
      {
        "word": "chemist",
        "isMatch": false,
        "transcription": "/\u02c8kem.\u026ast/",
        "explanation": "'chemist' uses the velar plosive /k/."
      },
      {
        "word": "chair",
        "isMatch": false,
        "transcription": "/t\u0283e\u0259r/",
        "explanation": "'chair' uses the affricate /t\u0283/."
      },
      {
        "word": "chef",
        "isMatch": true,
        "transcription": "/\u0283ef/",
        "explanation": "French loanword 'chef' uses 'ch' to produce /\u0283/."
      }
    ]
  },
  {
    "id": "sm-64",
    "targetSound": "/t\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar affricate /t\u0283/?",
    "options": [
      {
        "word": "native",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.t\u026av/",
        "explanation": "'t' produces /t/ in 'native'."
      },
      {
        "word": "station",
        "isMatch": false,
        "transcription": "/\u02c8ste\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'station'."
      },
      {
        "word": "nature",
        "isMatch": true,
        "transcription": "/\u02c8ne\u026a.t\u0283\u0259r/",
        "explanation": "'t' before '-ure' produces /t\u0283/ in 'nature'."
      },
      {
        "word": "nation",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'nation'."
      }
    ]
  },
  {
    "id": "sm-65",
    "targetSound": "/\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar fricative /\u0292/?",
    "options": [
      {
        "word": "major",
        "isMatch": false,
        "transcription": "/\u02c8me\u026a.d\u0292\u0259r/",
        "explanation": "'j' produces affricate /d\u0292/ in 'major'."
      },
      {
        "word": "measure",
        "isMatch": true,
        "transcription": "/\u02c8me\u0292.\u0259r/",
        "explanation": "'s' before '-ure' produces /\u0292/ in 'measure'."
      },
      {
        "word": "pressure",
        "isMatch": false,
        "transcription": "/\u02c8pre\u0283.\u0259r/",
        "explanation": "'ss' produces voiceless /\u0283/ in 'pressure'."
      },
      {
        "word": "ensure",
        "isMatch": false,
        "transcription": "/\u026an\u02c8\u0283\u0254\u02d0r/",
        "explanation": "'s' produces /\u0283/ in 'ensure'."
      }
    ]
  },
  {
    "id": "sm-66",
    "targetSound": "/d\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar affricate /d\u0292/?",
    "options": [
      {
        "word": "soldier",
        "isMatch": true,
        "transcription": "/\u02c8s\u0259\u028al.d\u0292\u0259r/",
        "explanation": "'di' produces the affricate /d\u0292/ in 'soldier'."
      },
      {
        "word": "solid",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u026ad/",
        "explanation": "'d' produces simple plosive /d/."
      },
      {
        "word": "shoulder",
        "isMatch": false,
        "transcription": "/\u02c8\u0283\u0259\u028al.d\u0259r/",
        "explanation": "'d' produces plosive /d/."
      },
      {
        "word": "solemn",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u0259m/",
        "explanation": "'n' is silent, no affricate."
      }
    ]
  },
  {
    "id": "sm-67",
    "targetSound": "/\u014b/",
    "soundType": "consonant",
    "prompt": "Which word contains the velar nasal /\u014b/?",
    "options": [
      {
        "word": "rain",
        "isMatch": false,
        "transcription": "/re\u026an/",
        "explanation": "'n' is alveolar nasal /n/ in 'rain'."
      },
      {
        "word": "range",
        "isMatch": false,
        "transcription": "/re\u026and\u0292/",
        "explanation": "'n' is followed by affricate /d\u0292/."
      },
      {
        "word": "ran",
        "isMatch": false,
        "transcription": "/r\u00e6n/",
        "explanation": "'n' is alveolar nasal /n/."
      },
      {
        "word": "rank",
        "isMatch": true,
        "transcription": "/r\u00e6\u014bk/",
        "explanation": "'n' before 'k' assimilates to velar nasal /\u014b/."
      }
    ]
  },
  {
    "id": "sm-68",
    "targetSound": "/f/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless labiodental fricative /f/?",
    "options": [
      {
        "word": "through",
        "isMatch": false,
        "transcription": "/\u03b8ru\u02d0/",
        "explanation": "'gh' is silent in 'through'."
      },
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'gh' is silent in 'dough'."
      },
      {
        "word": "laugh",
        "isMatch": true,
        "transcription": "/l\u0251\u02d0f/",
        "explanation": "'gh' produces /f/ in 'laugh'."
      },
      {
        "word": "though",
        "isMatch": false,
        "transcription": "/\u00f0\u0259\u028a/",
        "explanation": "'gh' is silent in 'though'."
      }
    ]
  },
  {
    "id": "sm-69",
    "targetSound": "/v/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced labiodental fricative /v/?",
    "options": [
      {
        "word": "orphan",
        "isMatch": false,
        "transcription": "/\u02c8\u0254\u02d0.f\u0259n/",
        "explanation": "'ph' produces voiceless /f/."
      },
      {
        "word": "of",
        "isMatch": true,
        "transcription": "/\u0259v/",
        "explanation": "'f' is pronounced /v/ in the preposition 'of'."
      },
      {
        "word": "off",
        "isMatch": false,
        "transcription": "/\u0252f/",
        "explanation": "'ff' produces voiceless /f/ in 'off'."
      },
      {
        "word": "often",
        "isMatch": false,
        "transcription": "/\u02c8\u0252f.n/",
        "explanation": "'f' produces voiceless /f/."
      }
    ]
  },
  {
    "id": "sm-70",
    "targetSound": "/k/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless velar plosive /k/?",
    "options": [
      {
        "word": "stomach",
        "isMatch": true,
        "transcription": "/\u02c8st\u028cm.\u0259k/",
        "explanation": "'ch' is pronounced /k/ in Greek loanword 'stomach'."
      },
      {
        "word": "stoppage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252p.\u026ad\u0292/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "stomping",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252m.p\u026a\u014b/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "storage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0254\u02d0.r\u026ad\u0292/",
        "explanation": "Contains rhotic /r/."
      }
    ]
  },
  {
    "id": "sm-71",
    "targetSound": "/s/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless alveolar fricative /s/?",
    "options": [
      {
        "word": "philosophy",
        "isMatch": false,
        "transcription": "/f\u026a\u02c8l\u0252s.\u0259.fi/",
        "explanation": "Initial sound is /f/."
      },
      {
        "word": "physics",
        "isMatch": false,
        "transcription": "/\u02c8f\u026az.\u026aks/",
        "explanation": "Initial sound is /f/."
      },
      {
        "word": "pneumonia",
        "isMatch": false,
        "transcription": "/nju\u02d0\u02c8m\u0259\u028a.ni.\u0259/",
        "explanation": "Initial sound is /n/."
      },
      {
        "word": "psychology",
        "isMatch": true,
        "transcription": "/sa\u026a\u02c8k\u0252l.\u0259.d\u0292i/",
        "explanation": "Initial 'p' is silent; word begins with /s/."
      }
    ]
  },
  {
    "id": "sm-72",
    "targetSound": "/z/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced alveolar fricative /z/?",
    "options": [
      {
        "word": "bison",
        "isMatch": false,
        "transcription": "/\u02c8ba\u026a.s\u0259n/",
        "explanation": "'s' produces voiceless /s/."
      },
      {
        "word": "bask",
        "isMatch": false,
        "transcription": "/b\u0251\u02d0sk/",
        "explanation": "'s' produces voiceless /s/."
      },
      {
        "word": "busy",
        "isMatch": true,
        "transcription": "/\u02c8b\u026az.i/",
        "explanation": "'s' between vowels produces /z/ in 'busy'."
      },
      {
        "word": "basic",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.s\u026ak/",
        "explanation": "'s' produces voiceless /s/ in 'basic'."
      }
    ]
  },
  {
    "id": "sm-73",
    "targetSound": "/j/",
    "soundType": "consonant",
    "prompt": "Which word contains the palatal approximant /j/?",
    "options": [
      {
        "word": "ore",
        "isMatch": false,
        "transcription": "/\u0254\u02d0r/",
        "explanation": "'ore' begins with monophthong /\u0254\u02d0/."
      },
      {
        "word": "ewe",
        "isMatch": true,
        "transcription": "/ju\u02d0/",
        "explanation": "'ewe' is pronounced with palatal approximant /j/ as in 'you'."
      },
      {
        "word": "eye",
        "isMatch": false,
        "transcription": "/a\u026a/",
        "explanation": "'eye' begins with diphthong /a\u026a/."
      },
      {
        "word": "ear",
        "isMatch": false,
        "transcription": "/\u026a\u0259r/",
        "explanation": "'ear' begins with diphthong /\u026a\u0259/."
      }
    ]
  },
  {
    "id": "sm-74",
    "targetSound": "/w/",
    "soundType": "consonant",
    "prompt": "Which word contains the labial-velar approximant /w/?",
    "options": [
      {
        "word": "one",
        "isMatch": true,
        "transcription": "/w\u028cn/",
        "explanation": "'one' begins with the approximant /w/."
      },
      {
        "word": "on",
        "isMatch": false,
        "transcription": "/\u0252n/",
        "explanation": "'on' begins with vowel /\u0252/."
      },
      {
        "word": "own",
        "isMatch": false,
        "transcription": "/\u0259\u028an/",
        "explanation": "'own' begins with diphthong /\u0259\u028a/."
      },
      {
        "word": "in",
        "isMatch": false,
        "transcription": "/\u026an/",
        "explanation": "'in' begins with short vowel /\u026a/."
      }
    ]
  },
  {
    "id": "sm-75",
    "targetSound": "/h/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless glottal fricative /h/?",
    "options": [
      {
        "word": "what",
        "isMatch": false,
        "transcription": "/w\u0252t/",
        "explanation": "'wh' represents /w/ in 'what'."
      },
      {
        "word": "when",
        "isMatch": false,
        "transcription": "/wen/",
        "explanation": "'wh' represents /w/ in 'when'."
      },
      {
        "word": "where",
        "isMatch": false,
        "transcription": "/we\u0259r/",
        "explanation": "'wh' represents /w/ in 'where'."
      },
      {
        "word": "who",
        "isMatch": true,
        "transcription": "/hu\u02d0/",
        "explanation": "'wh' represents glottal fricative /h/ in 'who'."
      }
    ]
  },
  {
    "id": "sm-76",
    "targetSound": "/i\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close front unrounded vowel /i\u02d0/?",
    "options": [
      {
        "word": "stay",
        "isMatch": false,
        "transcription": "/ste\u026a/",
        "explanation": "'stay' has diphthong /e\u026a/."
      },
      {
        "word": "guy",
        "isMatch": false,
        "transcription": "/\u0261a\u026a/",
        "explanation": "'guy' has diphthong /a\u026a/."
      },
      {
        "word": "quay",
        "isMatch": true,
        "transcription": "/ki\u02d0/",
        "explanation": "'quay' is pronounced /ki\u02d0/ with long vowel /i\u02d0/."
      },
      {
        "word": "play",
        "isMatch": false,
        "transcription": "/ple\u026a/",
        "explanation": "'play' has diphthong /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-77",
    "targetSound": "/\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-front unrounded vowel /\u026a/?",
    "options": [
      {
        "word": "womb",
        "isMatch": false,
        "transcription": "/wu\u02d0m/",
        "explanation": "'womb' has long /u\u02d0/."
      },
      {
        "word": "women",
        "isMatch": true,
        "transcription": "/\u02c8w\u026am.\u026an/",
        "explanation": "Plural 'women' has short /\u026a/ in both syllables."
      },
      {
        "word": "woman",
        "isMatch": false,
        "transcription": "/\u02c8w\u028am.\u0259n/",
        "explanation": "Singular 'woman' has short /\u028a/."
      },
      {
        "word": "wooden",
        "isMatch": false,
        "transcription": "/\u02c8w\u028ad.n/",
        "explanation": "'wooden' has short /\u028a/."
      }
    ]
  },
  {
    "id": "sm-78",
    "targetSound": "/e/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open-mid front unrounded vowel /e/?",
    "options": [
      {
        "word": "leopard",
        "isMatch": true,
        "transcription": "/\u02c8lep.\u0259d/",
        "explanation": "'eo' in 'leopard' is pronounced as short /e/."
      },
      {
        "word": "people",
        "isMatch": false,
        "transcription": "/\u02c8pi\u02d0.pl/",
        "explanation": "'eo' in 'people' is long /i\u02d0/."
      },
      {
        "word": "jeopardy",
        "isMatch": false,
        "transcription": "/\u02c8d\u0292ep.\u0259.di/",
        "explanation": "Also has /e/ but leopard is target."
      },
      {
        "word": "leonine",
        "isMatch": false,
        "transcription": "/\u02c8li\u02d0.\u0259.na\u026an/",
        "explanation": "'eo' is /i\u02d0.\u0259/ in 'leonine'."
      }
    ]
  },
  {
    "id": "sm-79",
    "targetSound": "/\u00e6/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-open front unrounded vowel /\u00e6/?",
    "options": [
      {
        "word": "plain",
        "isMatch": false,
        "transcription": "/ple\u026an/",
        "explanation": "'ai' is diphthong /e\u026a/ in 'plain'."
      },
      {
        "word": "plait",
        "isMatch": false,
        "transcription": "/pl\u00e6t/",
        "explanation": "Alternative /pl\u00e6t/."
      },
      {
        "word": "plague",
        "isMatch": false,
        "transcription": "/ple\u026a\u0261/",
        "explanation": "'a' is diphthong /e\u026a/ in 'plague'."
      },
      {
        "word": "plaid",
        "isMatch": true,
        "transcription": "/pl\u00e6d/",
        "explanation": "'ai' in 'plaid' is pronounced as short /\u00e6/."
      }
    ]
  },
  {
    "id": "sm-80",
    "targetSound": "/\u0251\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open back unrounded vowel /\u0251\u02d0/?",
    "options": [
      {
        "word": "jerk",
        "isMatch": false,
        "transcription": "/d\u0292\u025c\u02d0k/",
        "explanation": "'er' is /\u025c\u02d0/ in 'jerk'."
      },
      {
        "word": "clergyman",
        "isMatch": false,
        "transcription": "/\u02c8kl\u025c\u02d0.d\u0292i.m\u0259n/",
        "explanation": "'er' is /\u025c\u02d0/ in 'clergyman'."
      },
      {
        "word": "clerk",
        "isMatch": true,
        "transcription": "/kl\u0251\u02d0k/",
        "explanation": "In British English, 'er' in 'clerk' is /\u0251\u02d0/."
      },
      {
        "word": "dark",
        "isMatch": false,
        "transcription": "/d\u0251\u02d0k/",
        "explanation": "Also /\u0251\u02d0/, clerk is standard UTME test word."
      }
    ]
  },
  {
    "id": "sm-81",
    "targetSound": "/\u0252/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open back rounded vowel /\u0252/?",
    "options": [
      {
        "word": "year",
        "isMatch": false,
        "transcription": "/j\u026a\u0259r/",
        "explanation": "'ear' is diphthong /\u026a\u0259/ in 'year'."
      },
      {
        "word": "yacht",
        "isMatch": true,
        "transcription": "/j\u0252t/",
        "explanation": "'ach' in 'yacht' produces the short vowel /\u0252/."
      },
      {
        "word": "yawn",
        "isMatch": false,
        "transcription": "/j\u0254\u02d0n/",
        "explanation": "'aw' is long vowel /\u0254\u02d0/ in 'yawn'."
      },
      {
        "word": "yard",
        "isMatch": false,
        "transcription": "/j\u0251\u02d0d/",
        "explanation": "'ar' is long vowel /\u0251\u02d0/ in 'yard'."
      }
    ]
  },
  {
    "id": "sm-82",
    "targetSound": "/\u0254\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid back rounded vowel /\u0254\u02d0/?",
    "options": [
      {
        "word": "broad",
        "isMatch": true,
        "transcription": "/br\u0254\u02d0d/",
        "explanation": "'oa' in 'broad' is pronounced /\u0254\u02d0/."
      },
      {
        "word": "board",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0d/",
        "explanation": "Both contain /\u0254\u02d0/."
      },
      {
        "word": "boat",
        "isMatch": false,
        "transcription": "/b\u0259\u028at/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'boat'."
      },
      {
        "word": "road",
        "isMatch": false,
        "transcription": "/r\u0259\u028ad/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'road'."
      }
    ]
  },
  {
    "id": "sm-83",
    "targetSound": "/u\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close back rounded vowel /u\u02d0/?",
    "options": [
      {
        "word": "suite",
        "isMatch": false,
        "transcription": "/swi\u02d0t/",
        "explanation": "'suite' is pronounced like 'sweet' /swi\u02d0t/."
      },
      {
        "word": "suit",
        "isMatch": false,
        "transcription": "/su\u02d0t/",
        "explanation": "Match."
      },
      {
        "word": "biscuit",
        "isMatch": false,
        "transcription": "/\u02c8b\u026as.k\u026at/",
        "explanation": "'ui' is /\u026a/ in 'biscuit'."
      },
      {
        "word": "suit",
        "isMatch": true,
        "transcription": "/su\u02d0t/",
        "explanation": "'ui' in 'suit' produces long vowel /u\u02d0/."
      }
    ]
  },
  {
    "id": "sm-84",
    "targetSound": "/\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-back rounded vowel /\u028a/?",
    "options": [
      {
        "word": "cool",
        "isMatch": false,
        "transcription": "/ku\u02d0l/",
        "explanation": "'oo' has long /u\u02d0/."
      },
      {
        "word": "cloud",
        "isMatch": false,
        "transcription": "/kla\u028ad/",
        "explanation": "'ou' has diphthong /a\u028a/."
      },
      {
        "word": "could",
        "isMatch": true,
        "transcription": "/k\u028ad/",
        "explanation": "'oul' produces short rounded vowel /\u028a/ in 'could'."
      },
      {
        "word": "cold",
        "isMatch": false,
        "transcription": "/k\u0259\u028ald/",
        "explanation": "'old' has diphthong /\u0259\u028a/."
      }
    ]
  },
  {
    "id": "sm-85",
    "targetSound": "/\u025c\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid central unrounded vowel /\u025c\u02d0/?",
    "options": [
      {
        "word": "four",
        "isMatch": false,
        "transcription": "/f\u0254\u02d0r/",
        "explanation": "'our' produces long vowel /\u0254\u02d0/ in 'four'."
      },
      {
        "word": "journey",
        "isMatch": true,
        "transcription": "/\u02c8d\u0292\u025c\u02d0.ni/",
        "explanation": "'our' produces long central /\u025c\u02d0/ in 'journey'."
      },
      {
        "word": "tour",
        "isMatch": false,
        "transcription": "/t\u028a\u0259r/",
        "explanation": "'our' produces diphthong /\u028a\u0259/ in 'tour'."
      },
      {
        "word": "sour",
        "isMatch": false,
        "transcription": "/sa\u028a\u0259r/",
        "explanation": "'our' produces triphthong /a\u028a\u0259/ in 'sour'."
      }
    ]
  },
  {
    "id": "sm-86",
    "targetSound": "/\u0259/",
    "soundType": "vowel",
    "prompt": "Which word contains the weak mid-central unrounded vowel (schwa) /\u0259/?",
    "options": [
      {
        "word": "banana",
        "isMatch": true,
        "transcription": "/b\u0259\u02c8n\u0251\u02d0.n\u0259/",
        "explanation": "First and last syllables contain schwa /\u0259/."
      },
      {
        "word": "badger",
        "isMatch": false,
        "transcription": "/\u02c8b\u00e6d\u0292.\u0259r/",
        "explanation": "First syllable has /\u00e6/."
      },
      {
        "word": "bacon",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.k\u0259n/",
        "explanation": "First syllable has /e\u026a/."
      },
      {
        "word": "barter",
        "isMatch": false,
        "transcription": "/\u02c8b\u0251\u02d0.t\u0259r/",
        "explanation": "First syllable has /\u0251\u02d0/."
      }
    ]
  },
  {
    "id": "sm-87",
    "targetSound": "/e\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /e\u026a/?",
    "options": [
      {
        "word": "gouge",
        "isMatch": false,
        "transcription": "/\u0261a\u028ad\u0292/",
        "explanation": "'ou' in 'gouge' is diphthong /a\u028a/."
      },
      {
        "word": "gauze",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0z/",
        "explanation": "'au' in 'gauze' is long /\u0254\u02d0/."
      },
      {
        "word": "gaunt",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0nt/",
        "explanation": "'au' in 'gaunt' is long /\u0254\u02d0/."
      },
      {
        "word": "gauge",
        "isMatch": true,
        "transcription": "/\u0261e\u026ad\u0292/",
        "explanation": "'au' in 'gauge' is pronounced with diphthong /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-88",
    "targetSound": "/a\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u026a/?",
    "options": [
      {
        "word": "freight",
        "isMatch": false,
        "transcription": "/fre\u026at/",
        "explanation": "'eigh' in 'freight' is pronounced /e\u026a/."
      },
      {
        "word": "eight",
        "isMatch": false,
        "transcription": "/e\u026at/",
        "explanation": "'eigh' in 'eight' is pronounced /e\u026a/."
      },
      {
        "word": "height",
        "isMatch": true,
        "transcription": "/ha\u026at/",
        "explanation": "'eigh' in 'height' is pronounced /a\u026a/."
      },
      {
        "word": "weight",
        "isMatch": false,
        "transcription": "/we\u026at/",
        "explanation": "'eigh' in 'weight' is pronounced /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-89",
    "targetSound": "/a\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u028a/?",
    "options": [
      {
        "word": "rough",
        "isMatch": false,
        "transcription": "/r\u028cf/",
        "explanation": "'ough' in 'rough' is /\u028cf/."
      },
      {
        "word": "drought",
        "isMatch": true,
        "transcription": "/dra\u028at/",
        "explanation": "'ough' in 'drought' is pronounced /a\u028a/."
      },
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'ough' in 'dough' is /\u0259\u028a/."
      },
      {
        "word": "bought",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0t/",
        "explanation": "'ough' in 'bought' is /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-90",
    "targetSound": "/\u0259\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /\u0259\u028a/?",
    "options": [
      {
        "word": "sew",
        "isMatch": true,
        "transcription": "/s\u0259\u028a/",
        "explanation": "'ew' in 'sew' is pronounced with diphthong /\u0259\u028a/."
      },
      {
        "word": "few",
        "isMatch": false,
        "transcription": "/fju\u02d0/",
        "explanation": "'ew' in 'few' is /ju\u02d0/."
      },
      {
        "word": "new",
        "isMatch": false,
        "transcription": "/nju\u02d0/",
        "explanation": "'ew' in 'new' is /nju\u02d0/."
      },
      {
        "word": "flew",
        "isMatch": false,
        "transcription": "/flu\u02d0/",
        "explanation": "'ew' in 'flew' is /u\u02d0/."
      }
    ]
  },
  {
    "id": "sm-91",
    "targetSound": "/\u03b8/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless dental fricative /\u03b8/?",
    "options": [
      {
        "word": "tin",
        "isMatch": false,
        "transcription": "/t\u026an/",
        "explanation": "In 'tin', 't' is an alveolar plosive /t/."
      },
      {
        "word": "sin",
        "isMatch": false,
        "transcription": "/s\u026an/",
        "explanation": "In 'sin', 's' is an alveolar fricative /s/."
      },
      {
        "word": "thin",
        "isMatch": true,
        "transcription": "/\u03b8\u026an/",
        "explanation": "In 'thin', 'th' produces the voiceless dental fricative /\u03b8/."
      },
      {
        "word": "then",
        "isMatch": false,
        "transcription": "/\u00f0en/",
        "explanation": "In 'then', 'th' produces the voiced dental fricative /\u00f0/."
      }
    ]
  },
  {
    "id": "sm-92",
    "targetSound": "/\u00f0/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced dental fricative /\u00f0/?",
    "options": [
      {
        "word": "breed",
        "isMatch": false,
        "transcription": "/bri\u02d0d/",
        "explanation": "In 'breed', 'd' is an alveolar plosive /d/."
      },
      {
        "word": "breathe",
        "isMatch": true,
        "transcription": "/bri\u02d0\u00f0/",
        "explanation": "In 'breathe', 'th' produces the voiced sound /\u00f0/."
      },
      {
        "word": "breath",
        "isMatch": false,
        "transcription": "/bre\u03b8/",
        "explanation": "In 'breath', 'th' produces the voiceless sound /\u03b8/."
      },
      {
        "word": "breeze",
        "isMatch": false,
        "transcription": "/bri\u02d0z/",
        "explanation": "In 'breeze', 'z' is an alveolar fricative /z/."
      }
    ]
  },
  {
    "id": "sm-93",
    "targetSound": "/\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar fricative /\u0283/?",
    "options": [
      {
        "word": "chef",
        "isMatch": true,
        "transcription": "/\u0283ef/",
        "explanation": "French loanword 'chef' uses 'ch' to produce /\u0283/."
      },
      {
        "word": "chief",
        "isMatch": false,
        "transcription": "/t\u0283i\u02d0f/",
        "explanation": "'chief' uses the affricate /t\u0283/."
      },
      {
        "word": "chemist",
        "isMatch": false,
        "transcription": "/\u02c8kem.\u026ast/",
        "explanation": "'chemist' uses the velar plosive /k/."
      },
      {
        "word": "chair",
        "isMatch": false,
        "transcription": "/t\u0283e\u0259r/",
        "explanation": "'chair' uses the affricate /t\u0283/."
      }
    ]
  },
  {
    "id": "sm-94",
    "targetSound": "/t\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar affricate /t\u0283/?",
    "options": [
      {
        "word": "nation",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'nation'."
      },
      {
        "word": "native",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.t\u026av/",
        "explanation": "'t' produces /t/ in 'native'."
      },
      {
        "word": "station",
        "isMatch": false,
        "transcription": "/\u02c8ste\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'station'."
      },
      {
        "word": "nature",
        "isMatch": true,
        "transcription": "/\u02c8ne\u026a.t\u0283\u0259r/",
        "explanation": "'t' before '-ure' produces /t\u0283/ in 'nature'."
      }
    ]
  },
  {
    "id": "sm-95",
    "targetSound": "/\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar fricative /\u0292/?",
    "options": [
      {
        "word": "ensure",
        "isMatch": false,
        "transcription": "/\u026an\u02c8\u0283\u0254\u02d0r/",
        "explanation": "'s' produces /\u0283/ in 'ensure'."
      },
      {
        "word": "major",
        "isMatch": false,
        "transcription": "/\u02c8me\u026a.d\u0292\u0259r/",
        "explanation": "'j' produces affricate /d\u0292/ in 'major'."
      },
      {
        "word": "measure",
        "isMatch": true,
        "transcription": "/\u02c8me\u0292.\u0259r/",
        "explanation": "'s' before '-ure' produces /\u0292/ in 'measure'."
      },
      {
        "word": "pressure",
        "isMatch": false,
        "transcription": "/\u02c8pre\u0283.\u0259r/",
        "explanation": "'ss' produces voiceless /\u0283/ in 'pressure'."
      }
    ]
  },
  {
    "id": "sm-96",
    "targetSound": "/d\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar affricate /d\u0292/?",
    "options": [
      {
        "word": "solemn",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u0259m/",
        "explanation": "'n' is silent, no affricate."
      },
      {
        "word": "soldier",
        "isMatch": true,
        "transcription": "/\u02c8s\u0259\u028al.d\u0292\u0259r/",
        "explanation": "'di' produces the affricate /d\u0292/ in 'soldier'."
      },
      {
        "word": "solid",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u026ad/",
        "explanation": "'d' produces simple plosive /d/."
      },
      {
        "word": "shoulder",
        "isMatch": false,
        "transcription": "/\u02c8\u0283\u0259\u028al.d\u0259r/",
        "explanation": "'d' produces plosive /d/."
      }
    ]
  },
  {
    "id": "sm-97",
    "targetSound": "/\u014b/",
    "soundType": "consonant",
    "prompt": "Which word contains the velar nasal /\u014b/?",
    "options": [
      {
        "word": "rank",
        "isMatch": true,
        "transcription": "/r\u00e6\u014bk/",
        "explanation": "'n' before 'k' assimilates to velar nasal /\u014b/."
      },
      {
        "word": "rain",
        "isMatch": false,
        "transcription": "/re\u026an/",
        "explanation": "'n' is alveolar nasal /n/ in 'rain'."
      },
      {
        "word": "range",
        "isMatch": false,
        "transcription": "/re\u026and\u0292/",
        "explanation": "'n' is followed by affricate /d\u0292/."
      },
      {
        "word": "ran",
        "isMatch": false,
        "transcription": "/r\u00e6n/",
        "explanation": "'n' is alveolar nasal /n/."
      }
    ]
  },
  {
    "id": "sm-98",
    "targetSound": "/f/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless labiodental fricative /f/?",
    "options": [
      {
        "word": "though",
        "isMatch": false,
        "transcription": "/\u00f0\u0259\u028a/",
        "explanation": "'gh' is silent in 'though'."
      },
      {
        "word": "through",
        "isMatch": false,
        "transcription": "/\u03b8ru\u02d0/",
        "explanation": "'gh' is silent in 'through'."
      },
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'gh' is silent in 'dough'."
      },
      {
        "word": "laugh",
        "isMatch": true,
        "transcription": "/l\u0251\u02d0f/",
        "explanation": "'gh' produces /f/ in 'laugh'."
      }
    ]
  },
  {
    "id": "sm-99",
    "targetSound": "/v/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced labiodental fricative /v/?",
    "options": [
      {
        "word": "often",
        "isMatch": false,
        "transcription": "/\u02c8\u0252f.n/",
        "explanation": "'f' produces voiceless /f/."
      },
      {
        "word": "orphan",
        "isMatch": false,
        "transcription": "/\u02c8\u0254\u02d0.f\u0259n/",
        "explanation": "'ph' produces voiceless /f/."
      },
      {
        "word": "of",
        "isMatch": true,
        "transcription": "/\u0259v/",
        "explanation": "'f' is pronounced /v/ in the preposition 'of'."
      },
      {
        "word": "off",
        "isMatch": false,
        "transcription": "/\u0252f/",
        "explanation": "'ff' produces voiceless /f/ in 'off'."
      }
    ]
  },
  {
    "id": "sm-100",
    "targetSound": "/k/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless velar plosive /k/?",
    "options": [
      {
        "word": "storage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0254\u02d0.r\u026ad\u0292/",
        "explanation": "Contains rhotic /r/."
      },
      {
        "word": "stomach",
        "isMatch": true,
        "transcription": "/\u02c8st\u028cm.\u0259k/",
        "explanation": "'ch' is pronounced /k/ in Greek loanword 'stomach'."
      },
      {
        "word": "stoppage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252p.\u026ad\u0292/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "stomping",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252m.p\u026a\u014b/",
        "explanation": "Contains plosive /p/."
      }
    ]
  },
  {
    "id": "sm-101",
    "targetSound": "/s/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless alveolar fricative /s/?",
    "options": [
      {
        "word": "psychology",
        "isMatch": true,
        "transcription": "/sa\u026a\u02c8k\u0252l.\u0259.d\u0292i/",
        "explanation": "Initial 'p' is silent; word begins with /s/."
      },
      {
        "word": "philosophy",
        "isMatch": false,
        "transcription": "/f\u026a\u02c8l\u0252s.\u0259.fi/",
        "explanation": "Initial sound is /f/."
      },
      {
        "word": "physics",
        "isMatch": false,
        "transcription": "/\u02c8f\u026az.\u026aks/",
        "explanation": "Initial sound is /f/."
      },
      {
        "word": "pneumonia",
        "isMatch": false,
        "transcription": "/nju\u02d0\u02c8m\u0259\u028a.ni.\u0259/",
        "explanation": "Initial sound is /n/."
      }
    ]
  },
  {
    "id": "sm-102",
    "targetSound": "/z/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced alveolar fricative /z/?",
    "options": [
      {
        "word": "basic",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.s\u026ak/",
        "explanation": "'s' produces voiceless /s/ in 'basic'."
      },
      {
        "word": "bison",
        "isMatch": false,
        "transcription": "/\u02c8ba\u026a.s\u0259n/",
        "explanation": "'s' produces voiceless /s/."
      },
      {
        "word": "bask",
        "isMatch": false,
        "transcription": "/b\u0251\u02d0sk/",
        "explanation": "'s' produces voiceless /s/."
      },
      {
        "word": "busy",
        "isMatch": true,
        "transcription": "/\u02c8b\u026az.i/",
        "explanation": "'s' between vowels produces /z/ in 'busy'."
      }
    ]
  },
  {
    "id": "sm-103",
    "targetSound": "/j/",
    "soundType": "consonant",
    "prompt": "Which word contains the palatal approximant /j/?",
    "options": [
      {
        "word": "ear",
        "isMatch": false,
        "transcription": "/\u026a\u0259r/",
        "explanation": "'ear' begins with diphthong /\u026a\u0259/."
      },
      {
        "word": "ore",
        "isMatch": false,
        "transcription": "/\u0254\u02d0r/",
        "explanation": "'ore' begins with monophthong /\u0254\u02d0/."
      },
      {
        "word": "ewe",
        "isMatch": true,
        "transcription": "/ju\u02d0/",
        "explanation": "'ewe' is pronounced with palatal approximant /j/ as in 'you'."
      },
      {
        "word": "eye",
        "isMatch": false,
        "transcription": "/a\u026a/",
        "explanation": "'eye' begins with diphthong /a\u026a/."
      }
    ]
  },
  {
    "id": "sm-104",
    "targetSound": "/w/",
    "soundType": "consonant",
    "prompt": "Which word contains the labial-velar approximant /w/?",
    "options": [
      {
        "word": "in",
        "isMatch": false,
        "transcription": "/\u026an/",
        "explanation": "'in' begins with short vowel /\u026a/."
      },
      {
        "word": "one",
        "isMatch": true,
        "transcription": "/w\u028cn/",
        "explanation": "'one' begins with the approximant /w/."
      },
      {
        "word": "on",
        "isMatch": false,
        "transcription": "/\u0252n/",
        "explanation": "'on' begins with vowel /\u0252/."
      },
      {
        "word": "own",
        "isMatch": false,
        "transcription": "/\u0259\u028an/",
        "explanation": "'own' begins with diphthong /\u0259\u028a/."
      }
    ]
  },
  {
    "id": "sm-105",
    "targetSound": "/h/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless glottal fricative /h/?",
    "options": [
      {
        "word": "who",
        "isMatch": true,
        "transcription": "/hu\u02d0/",
        "explanation": "'wh' represents glottal fricative /h/ in 'who'."
      },
      {
        "word": "what",
        "isMatch": false,
        "transcription": "/w\u0252t/",
        "explanation": "'wh' represents /w/ in 'what'."
      },
      {
        "word": "when",
        "isMatch": false,
        "transcription": "/wen/",
        "explanation": "'wh' represents /w/ in 'when'."
      },
      {
        "word": "where",
        "isMatch": false,
        "transcription": "/we\u0259r/",
        "explanation": "'wh' represents /w/ in 'where'."
      }
    ]
  },
  {
    "id": "sm-106",
    "targetSound": "/i\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close front unrounded vowel /i\u02d0/?",
    "options": [
      {
        "word": "play",
        "isMatch": false,
        "transcription": "/ple\u026a/",
        "explanation": "'play' has diphthong /e\u026a/."
      },
      {
        "word": "stay",
        "isMatch": false,
        "transcription": "/ste\u026a/",
        "explanation": "'stay' has diphthong /e\u026a/."
      },
      {
        "word": "guy",
        "isMatch": false,
        "transcription": "/\u0261a\u026a/",
        "explanation": "'guy' has diphthong /a\u026a/."
      },
      {
        "word": "quay",
        "isMatch": true,
        "transcription": "/ki\u02d0/",
        "explanation": "'quay' is pronounced /ki\u02d0/ with long vowel /i\u02d0/."
      }
    ]
  },
  {
    "id": "sm-107",
    "targetSound": "/\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-front unrounded vowel /\u026a/?",
    "options": [
      {
        "word": "wooden",
        "isMatch": false,
        "transcription": "/\u02c8w\u028ad.n/",
        "explanation": "'wooden' has short /\u028a/."
      },
      {
        "word": "womb",
        "isMatch": false,
        "transcription": "/wu\u02d0m/",
        "explanation": "'womb' has long /u\u02d0/."
      },
      {
        "word": "women",
        "isMatch": true,
        "transcription": "/\u02c8w\u026am.\u026an/",
        "explanation": "Plural 'women' has short /\u026a/ in both syllables."
      },
      {
        "word": "woman",
        "isMatch": false,
        "transcription": "/\u02c8w\u028am.\u0259n/",
        "explanation": "Singular 'woman' has short /\u028a/."
      }
    ]
  },
  {
    "id": "sm-108",
    "targetSound": "/e/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open-mid front unrounded vowel /e/?",
    "options": [
      {
        "word": "leonine",
        "isMatch": false,
        "transcription": "/\u02c8li\u02d0.\u0259.na\u026an/",
        "explanation": "'eo' is /i\u02d0.\u0259/ in 'leonine'."
      },
      {
        "word": "leopard",
        "isMatch": true,
        "transcription": "/\u02c8lep.\u0259d/",
        "explanation": "'eo' in 'leopard' is pronounced as short /e/."
      },
      {
        "word": "people",
        "isMatch": false,
        "transcription": "/\u02c8pi\u02d0.pl/",
        "explanation": "'eo' in 'people' is long /i\u02d0/."
      },
      {
        "word": "jeopardy",
        "isMatch": false,
        "transcription": "/\u02c8d\u0292ep.\u0259.di/",
        "explanation": "Also has /e/ but leopard is target."
      }
    ]
  },
  {
    "id": "sm-109",
    "targetSound": "/\u00e6/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-open front unrounded vowel /\u00e6/?",
    "options": [
      {
        "word": "plaid",
        "isMatch": true,
        "transcription": "/pl\u00e6d/",
        "explanation": "'ai' in 'plaid' is pronounced as short /\u00e6/."
      },
      {
        "word": "plain",
        "isMatch": false,
        "transcription": "/ple\u026an/",
        "explanation": "'ai' is diphthong /e\u026a/ in 'plain'."
      },
      {
        "word": "plait",
        "isMatch": false,
        "transcription": "/pl\u00e6t/",
        "explanation": "Alternative /pl\u00e6t/."
      },
      {
        "word": "plague",
        "isMatch": false,
        "transcription": "/ple\u026a\u0261/",
        "explanation": "'a' is diphthong /e\u026a/ in 'plague'."
      }
    ]
  },
  {
    "id": "sm-110",
    "targetSound": "/\u0251\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open back unrounded vowel /\u0251\u02d0/?",
    "options": [
      {
        "word": "dark",
        "isMatch": false,
        "transcription": "/d\u0251\u02d0k/",
        "explanation": "Also /\u0251\u02d0/, clerk is standard UTME test word."
      },
      {
        "word": "jerk",
        "isMatch": false,
        "transcription": "/d\u0292\u025c\u02d0k/",
        "explanation": "'er' is /\u025c\u02d0/ in 'jerk'."
      },
      {
        "word": "clergyman",
        "isMatch": false,
        "transcription": "/\u02c8kl\u025c\u02d0.d\u0292i.m\u0259n/",
        "explanation": "'er' is /\u025c\u02d0/ in 'clergyman'."
      },
      {
        "word": "clerk",
        "isMatch": true,
        "transcription": "/kl\u0251\u02d0k/",
        "explanation": "In British English, 'er' in 'clerk' is /\u0251\u02d0/."
      }
    ]
  },
  {
    "id": "sm-111",
    "targetSound": "/\u0252/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open back rounded vowel /\u0252/?",
    "options": [
      {
        "word": "yard",
        "isMatch": false,
        "transcription": "/j\u0251\u02d0d/",
        "explanation": "'ar' is long vowel /\u0251\u02d0/ in 'yard'."
      },
      {
        "word": "year",
        "isMatch": false,
        "transcription": "/j\u026a\u0259r/",
        "explanation": "'ear' is diphthong /\u026a\u0259/ in 'year'."
      },
      {
        "word": "yacht",
        "isMatch": true,
        "transcription": "/j\u0252t/",
        "explanation": "'ach' in 'yacht' produces the short vowel /\u0252/."
      },
      {
        "word": "yawn",
        "isMatch": false,
        "transcription": "/j\u0254\u02d0n/",
        "explanation": "'aw' is long vowel /\u0254\u02d0/ in 'yawn'."
      }
    ]
  },
  {
    "id": "sm-112",
    "targetSound": "/\u0254\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid back rounded vowel /\u0254\u02d0/?",
    "options": [
      {
        "word": "road",
        "isMatch": false,
        "transcription": "/r\u0259\u028ad/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'road'."
      },
      {
        "word": "broad",
        "isMatch": true,
        "transcription": "/br\u0254\u02d0d/",
        "explanation": "'oa' in 'broad' is pronounced /\u0254\u02d0/."
      },
      {
        "word": "board",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0d/",
        "explanation": "Both contain /\u0254\u02d0/."
      },
      {
        "word": "boat",
        "isMatch": false,
        "transcription": "/b\u0259\u028at/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'boat'."
      }
    ]
  },
  {
    "id": "sm-113",
    "targetSound": "/u\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close back rounded vowel /u\u02d0/?",
    "options": [
      {
        "word": "suit",
        "isMatch": true,
        "transcription": "/su\u02d0t/",
        "explanation": "'ui' in 'suit' produces long vowel /u\u02d0/."
      },
      {
        "word": "suite",
        "isMatch": false,
        "transcription": "/swi\u02d0t/",
        "explanation": "'suite' is pronounced like 'sweet' /swi\u02d0t/."
      },
      {
        "word": "suit",
        "isMatch": false,
        "transcription": "/su\u02d0t/",
        "explanation": "Match."
      },
      {
        "word": "biscuit",
        "isMatch": false,
        "transcription": "/\u02c8b\u026as.k\u026at/",
        "explanation": "'ui' is /\u026a/ in 'biscuit'."
      }
    ]
  },
  {
    "id": "sm-114",
    "targetSound": "/\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-back rounded vowel /\u028a/?",
    "options": [
      {
        "word": "cold",
        "isMatch": false,
        "transcription": "/k\u0259\u028ald/",
        "explanation": "'old' has diphthong /\u0259\u028a/."
      },
      {
        "word": "cool",
        "isMatch": false,
        "transcription": "/ku\u02d0l/",
        "explanation": "'oo' has long /u\u02d0/."
      },
      {
        "word": "cloud",
        "isMatch": false,
        "transcription": "/kla\u028ad/",
        "explanation": "'ou' has diphthong /a\u028a/."
      },
      {
        "word": "could",
        "isMatch": true,
        "transcription": "/k\u028ad/",
        "explanation": "'oul' produces short rounded vowel /\u028a/ in 'could'."
      }
    ]
  },
  {
    "id": "sm-115",
    "targetSound": "/\u025c\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid central unrounded vowel /\u025c\u02d0/?",
    "options": [
      {
        "word": "sour",
        "isMatch": false,
        "transcription": "/sa\u028a\u0259r/",
        "explanation": "'our' produces triphthong /a\u028a\u0259/ in 'sour'."
      },
      {
        "word": "four",
        "isMatch": false,
        "transcription": "/f\u0254\u02d0r/",
        "explanation": "'our' produces long vowel /\u0254\u02d0/ in 'four'."
      },
      {
        "word": "journey",
        "isMatch": true,
        "transcription": "/\u02c8d\u0292\u025c\u02d0.ni/",
        "explanation": "'our' produces long central /\u025c\u02d0/ in 'journey'."
      },
      {
        "word": "tour",
        "isMatch": false,
        "transcription": "/t\u028a\u0259r/",
        "explanation": "'our' produces diphthong /\u028a\u0259/ in 'tour'."
      }
    ]
  },
  {
    "id": "sm-116",
    "targetSound": "/\u0259/",
    "soundType": "vowel",
    "prompt": "Which word contains the weak mid-central unrounded vowel (schwa) /\u0259/?",
    "options": [
      {
        "word": "barter",
        "isMatch": false,
        "transcription": "/\u02c8b\u0251\u02d0.t\u0259r/",
        "explanation": "First syllable has /\u0251\u02d0/."
      },
      {
        "word": "banana",
        "isMatch": true,
        "transcription": "/b\u0259\u02c8n\u0251\u02d0.n\u0259/",
        "explanation": "First and last syllables contain schwa /\u0259/."
      },
      {
        "word": "badger",
        "isMatch": false,
        "transcription": "/\u02c8b\u00e6d\u0292.\u0259r/",
        "explanation": "First syllable has /\u00e6/."
      },
      {
        "word": "bacon",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.k\u0259n/",
        "explanation": "First syllable has /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-117",
    "targetSound": "/e\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /e\u026a/?",
    "options": [
      {
        "word": "gauge",
        "isMatch": true,
        "transcription": "/\u0261e\u026ad\u0292/",
        "explanation": "'au' in 'gauge' is pronounced with diphthong /e\u026a/."
      },
      {
        "word": "gouge",
        "isMatch": false,
        "transcription": "/\u0261a\u028ad\u0292/",
        "explanation": "'ou' in 'gouge' is diphthong /a\u028a/."
      },
      {
        "word": "gauze",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0z/",
        "explanation": "'au' in 'gauze' is long /\u0254\u02d0/."
      },
      {
        "word": "gaunt",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0nt/",
        "explanation": "'au' in 'gaunt' is long /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-118",
    "targetSound": "/a\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u026a/?",
    "options": [
      {
        "word": "weight",
        "isMatch": false,
        "transcription": "/we\u026at/",
        "explanation": "'eigh' in 'weight' is pronounced /e\u026a/."
      },
      {
        "word": "freight",
        "isMatch": false,
        "transcription": "/fre\u026at/",
        "explanation": "'eigh' in 'freight' is pronounced /e\u026a/."
      },
      {
        "word": "eight",
        "isMatch": false,
        "transcription": "/e\u026at/",
        "explanation": "'eigh' in 'eight' is pronounced /e\u026a/."
      },
      {
        "word": "height",
        "isMatch": true,
        "transcription": "/ha\u026at/",
        "explanation": "'eigh' in 'height' is pronounced /a\u026a/."
      }
    ]
  },
  {
    "id": "sm-119",
    "targetSound": "/a\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u028a/?",
    "options": [
      {
        "word": "bought",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0t/",
        "explanation": "'ough' in 'bought' is /\u0254\u02d0/."
      },
      {
        "word": "rough",
        "isMatch": false,
        "transcription": "/r\u028cf/",
        "explanation": "'ough' in 'rough' is /\u028cf/."
      },
      {
        "word": "drought",
        "isMatch": true,
        "transcription": "/dra\u028at/",
        "explanation": "'ough' in 'drought' is pronounced /a\u028a/."
      },
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'ough' in 'dough' is /\u0259\u028a/."
      }
    ]
  },
  {
    "id": "sm-120",
    "targetSound": "/\u0259\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /\u0259\u028a/?",
    "options": [
      {
        "word": "flew",
        "isMatch": false,
        "transcription": "/flu\u02d0/",
        "explanation": "'ew' in 'flew' is /u\u02d0/."
      },
      {
        "word": "sew",
        "isMatch": true,
        "transcription": "/s\u0259\u028a/",
        "explanation": "'ew' in 'sew' is pronounced with diphthong /\u0259\u028a/."
      },
      {
        "word": "few",
        "isMatch": false,
        "transcription": "/fju\u02d0/",
        "explanation": "'ew' in 'few' is /ju\u02d0/."
      },
      {
        "word": "new",
        "isMatch": false,
        "transcription": "/nju\u02d0/",
        "explanation": "'ew' in 'new' is /nju\u02d0/."
      }
    ]
  },
  {
    "id": "sm-121",
    "targetSound": "/\u03b8/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless dental fricative /\u03b8/?",
    "options": [
      {
        "word": "then",
        "isMatch": false,
        "transcription": "/\u00f0en/",
        "explanation": "In 'then', 'th' produces the voiced dental fricative /\u00f0/."
      },
      {
        "word": "tin",
        "isMatch": false,
        "transcription": "/t\u026an/",
        "explanation": "In 'tin', 't' is an alveolar plosive /t/."
      },
      {
        "word": "sin",
        "isMatch": false,
        "transcription": "/s\u026an/",
        "explanation": "In 'sin', 's' is an alveolar fricative /s/."
      },
      {
        "word": "thin",
        "isMatch": true,
        "transcription": "/\u03b8\u026an/",
        "explanation": "In 'thin', 'th' produces the voiceless dental fricative /\u03b8/."
      }
    ]
  },
  {
    "id": "sm-122",
    "targetSound": "/\u00f0/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced dental fricative /\u00f0/?",
    "options": [
      {
        "word": "breeze",
        "isMatch": false,
        "transcription": "/bri\u02d0z/",
        "explanation": "In 'breeze', 'z' is an alveolar fricative /z/."
      },
      {
        "word": "breed",
        "isMatch": false,
        "transcription": "/bri\u02d0d/",
        "explanation": "In 'breed', 'd' is an alveolar plosive /d/."
      },
      {
        "word": "breathe",
        "isMatch": true,
        "transcription": "/bri\u02d0\u00f0/",
        "explanation": "In 'breathe', 'th' produces the voiced sound /\u00f0/."
      },
      {
        "word": "breath",
        "isMatch": false,
        "transcription": "/bre\u03b8/",
        "explanation": "In 'breath', 'th' produces the voiceless sound /\u03b8/."
      }
    ]
  },
  {
    "id": "sm-123",
    "targetSound": "/\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar fricative /\u0283/?",
    "options": [
      {
        "word": "chair",
        "isMatch": false,
        "transcription": "/t\u0283e\u0259r/",
        "explanation": "'chair' uses the affricate /t\u0283/."
      },
      {
        "word": "chef",
        "isMatch": true,
        "transcription": "/\u0283ef/",
        "explanation": "French loanword 'chef' uses 'ch' to produce /\u0283/."
      },
      {
        "word": "chief",
        "isMatch": false,
        "transcription": "/t\u0283i\u02d0f/",
        "explanation": "'chief' uses the affricate /t\u0283/."
      },
      {
        "word": "chemist",
        "isMatch": false,
        "transcription": "/\u02c8kem.\u026ast/",
        "explanation": "'chemist' uses the velar plosive /k/."
      }
    ]
  },
  {
    "id": "sm-124",
    "targetSound": "/t\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar affricate /t\u0283/?",
    "options": [
      {
        "word": "nature",
        "isMatch": true,
        "transcription": "/\u02c8ne\u026a.t\u0283\u0259r/",
        "explanation": "'t' before '-ure' produces /t\u0283/ in 'nature'."
      },
      {
        "word": "nation",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'nation'."
      },
      {
        "word": "native",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.t\u026av/",
        "explanation": "'t' produces /t/ in 'native'."
      },
      {
        "word": "station",
        "isMatch": false,
        "transcription": "/\u02c8ste\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'station'."
      }
    ]
  },
  {
    "id": "sm-125",
    "targetSound": "/\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar fricative /\u0292/?",
    "options": [
      {
        "word": "pressure",
        "isMatch": false,
        "transcription": "/\u02c8pre\u0283.\u0259r/",
        "explanation": "'ss' produces voiceless /\u0283/ in 'pressure'."
      },
      {
        "word": "ensure",
        "isMatch": false,
        "transcription": "/\u026an\u02c8\u0283\u0254\u02d0r/",
        "explanation": "'s' produces /\u0283/ in 'ensure'."
      },
      {
        "word": "major",
        "isMatch": false,
        "transcription": "/\u02c8me\u026a.d\u0292\u0259r/",
        "explanation": "'j' produces affricate /d\u0292/ in 'major'."
      },
      {
        "word": "measure",
        "isMatch": true,
        "transcription": "/\u02c8me\u0292.\u0259r/",
        "explanation": "'s' before '-ure' produces /\u0292/ in 'measure'."
      }
    ]
  },
  {
    "id": "sm-126",
    "targetSound": "/d\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar affricate /d\u0292/?",
    "options": [
      {
        "word": "shoulder",
        "isMatch": false,
        "transcription": "/\u02c8\u0283\u0259\u028al.d\u0259r/",
        "explanation": "'d' produces plosive /d/."
      },
      {
        "word": "solemn",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u0259m/",
        "explanation": "'n' is silent, no affricate."
      },
      {
        "word": "soldier",
        "isMatch": true,
        "transcription": "/\u02c8s\u0259\u028al.d\u0292\u0259r/",
        "explanation": "'di' produces the affricate /d\u0292/ in 'soldier'."
      },
      {
        "word": "solid",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u026ad/",
        "explanation": "'d' produces simple plosive /d/."
      }
    ]
  },
  {
    "id": "sm-127",
    "targetSound": "/\u014b/",
    "soundType": "consonant",
    "prompt": "Which word contains the velar nasal /\u014b/?",
    "options": [
      {
        "word": "ran",
        "isMatch": false,
        "transcription": "/r\u00e6n/",
        "explanation": "'n' is alveolar nasal /n/."
      },
      {
        "word": "rank",
        "isMatch": true,
        "transcription": "/r\u00e6\u014bk/",
        "explanation": "'n' before 'k' assimilates to velar nasal /\u014b/."
      },
      {
        "word": "rain",
        "isMatch": false,
        "transcription": "/re\u026an/",
        "explanation": "'n' is alveolar nasal /n/ in 'rain'."
      },
      {
        "word": "range",
        "isMatch": false,
        "transcription": "/re\u026and\u0292/",
        "explanation": "'n' is followed by affricate /d\u0292/."
      }
    ]
  },
  {
    "id": "sm-128",
    "targetSound": "/f/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless labiodental fricative /f/?",
    "options": [
      {
        "word": "laugh",
        "isMatch": true,
        "transcription": "/l\u0251\u02d0f/",
        "explanation": "'gh' produces /f/ in 'laugh'."
      },
      {
        "word": "though",
        "isMatch": false,
        "transcription": "/\u00f0\u0259\u028a/",
        "explanation": "'gh' is silent in 'though'."
      },
      {
        "word": "through",
        "isMatch": false,
        "transcription": "/\u03b8ru\u02d0/",
        "explanation": "'gh' is silent in 'through'."
      },
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'gh' is silent in 'dough'."
      }
    ]
  },
  {
    "id": "sm-129",
    "targetSound": "/v/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced labiodental fricative /v/?",
    "options": [
      {
        "word": "off",
        "isMatch": false,
        "transcription": "/\u0252f/",
        "explanation": "'ff' produces voiceless /f/ in 'off'."
      },
      {
        "word": "often",
        "isMatch": false,
        "transcription": "/\u02c8\u0252f.n/",
        "explanation": "'f' produces voiceless /f/."
      },
      {
        "word": "orphan",
        "isMatch": false,
        "transcription": "/\u02c8\u0254\u02d0.f\u0259n/",
        "explanation": "'ph' produces voiceless /f/."
      },
      {
        "word": "of",
        "isMatch": true,
        "transcription": "/\u0259v/",
        "explanation": "'f' is pronounced /v/ in the preposition 'of'."
      }
    ]
  },
  {
    "id": "sm-130",
    "targetSound": "/k/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless velar plosive /k/?",
    "options": [
      {
        "word": "stomping",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252m.p\u026a\u014b/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "storage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0254\u02d0.r\u026ad\u0292/",
        "explanation": "Contains rhotic /r/."
      },
      {
        "word": "stomach",
        "isMatch": true,
        "transcription": "/\u02c8st\u028cm.\u0259k/",
        "explanation": "'ch' is pronounced /k/ in Greek loanword 'stomach'."
      },
      {
        "word": "stoppage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252p.\u026ad\u0292/",
        "explanation": "Contains plosive /p/."
      }
    ]
  },
  {
    "id": "sm-131",
    "targetSound": "/s/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless alveolar fricative /s/?",
    "options": [
      {
        "word": "pneumonia",
        "isMatch": false,
        "transcription": "/nju\u02d0\u02c8m\u0259\u028a.ni.\u0259/",
        "explanation": "Initial sound is /n/."
      },
      {
        "word": "psychology",
        "isMatch": true,
        "transcription": "/sa\u026a\u02c8k\u0252l.\u0259.d\u0292i/",
        "explanation": "Initial 'p' is silent; word begins with /s/."
      },
      {
        "word": "philosophy",
        "isMatch": false,
        "transcription": "/f\u026a\u02c8l\u0252s.\u0259.fi/",
        "explanation": "Initial sound is /f/."
      },
      {
        "word": "physics",
        "isMatch": false,
        "transcription": "/\u02c8f\u026az.\u026aks/",
        "explanation": "Initial sound is /f/."
      }
    ]
  },
  {
    "id": "sm-132",
    "targetSound": "/z/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced alveolar fricative /z/?",
    "options": [
      {
        "word": "busy",
        "isMatch": true,
        "transcription": "/\u02c8b\u026az.i/",
        "explanation": "'s' between vowels produces /z/ in 'busy'."
      },
      {
        "word": "basic",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.s\u026ak/",
        "explanation": "'s' produces voiceless /s/ in 'basic'."
      },
      {
        "word": "bison",
        "isMatch": false,
        "transcription": "/\u02c8ba\u026a.s\u0259n/",
        "explanation": "'s' produces voiceless /s/."
      },
      {
        "word": "bask",
        "isMatch": false,
        "transcription": "/b\u0251\u02d0sk/",
        "explanation": "'s' produces voiceless /s/."
      }
    ]
  },
  {
    "id": "sm-133",
    "targetSound": "/j/",
    "soundType": "consonant",
    "prompt": "Which word contains the palatal approximant /j/?",
    "options": [
      {
        "word": "eye",
        "isMatch": false,
        "transcription": "/a\u026a/",
        "explanation": "'eye' begins with diphthong /a\u026a/."
      },
      {
        "word": "ear",
        "isMatch": false,
        "transcription": "/\u026a\u0259r/",
        "explanation": "'ear' begins with diphthong /\u026a\u0259/."
      },
      {
        "word": "ore",
        "isMatch": false,
        "transcription": "/\u0254\u02d0r/",
        "explanation": "'ore' begins with monophthong /\u0254\u02d0/."
      },
      {
        "word": "ewe",
        "isMatch": true,
        "transcription": "/ju\u02d0/",
        "explanation": "'ewe' is pronounced with palatal approximant /j/ as in 'you'."
      }
    ]
  },
  {
    "id": "sm-134",
    "targetSound": "/w/",
    "soundType": "consonant",
    "prompt": "Which word contains the labial-velar approximant /w/?",
    "options": [
      {
        "word": "own",
        "isMatch": false,
        "transcription": "/\u0259\u028an/",
        "explanation": "'own' begins with diphthong /\u0259\u028a/."
      },
      {
        "word": "in",
        "isMatch": false,
        "transcription": "/\u026an/",
        "explanation": "'in' begins with short vowel /\u026a/."
      },
      {
        "word": "one",
        "isMatch": true,
        "transcription": "/w\u028cn/",
        "explanation": "'one' begins with the approximant /w/."
      },
      {
        "word": "on",
        "isMatch": false,
        "transcription": "/\u0252n/",
        "explanation": "'on' begins with vowel /\u0252/."
      }
    ]
  },
  {
    "id": "sm-135",
    "targetSound": "/h/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless glottal fricative /h/?",
    "options": [
      {
        "word": "where",
        "isMatch": false,
        "transcription": "/we\u0259r/",
        "explanation": "'wh' represents /w/ in 'where'."
      },
      {
        "word": "who",
        "isMatch": true,
        "transcription": "/hu\u02d0/",
        "explanation": "'wh' represents glottal fricative /h/ in 'who'."
      },
      {
        "word": "what",
        "isMatch": false,
        "transcription": "/w\u0252t/",
        "explanation": "'wh' represents /w/ in 'what'."
      },
      {
        "word": "when",
        "isMatch": false,
        "transcription": "/wen/",
        "explanation": "'wh' represents /w/ in 'when'."
      }
    ]
  },
  {
    "id": "sm-136",
    "targetSound": "/i\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close front unrounded vowel /i\u02d0/?",
    "options": [
      {
        "word": "quay",
        "isMatch": true,
        "transcription": "/ki\u02d0/",
        "explanation": "'quay' is pronounced /ki\u02d0/ with long vowel /i\u02d0/."
      },
      {
        "word": "play",
        "isMatch": false,
        "transcription": "/ple\u026a/",
        "explanation": "'play' has diphthong /e\u026a/."
      },
      {
        "word": "stay",
        "isMatch": false,
        "transcription": "/ste\u026a/",
        "explanation": "'stay' has diphthong /e\u026a/."
      },
      {
        "word": "guy",
        "isMatch": false,
        "transcription": "/\u0261a\u026a/",
        "explanation": "'guy' has diphthong /a\u026a/."
      }
    ]
  },
  {
    "id": "sm-137",
    "targetSound": "/\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-front unrounded vowel /\u026a/?",
    "options": [
      {
        "word": "woman",
        "isMatch": false,
        "transcription": "/\u02c8w\u028am.\u0259n/",
        "explanation": "Singular 'woman' has short /\u028a/."
      },
      {
        "word": "wooden",
        "isMatch": false,
        "transcription": "/\u02c8w\u028ad.n/",
        "explanation": "'wooden' has short /\u028a/."
      },
      {
        "word": "womb",
        "isMatch": false,
        "transcription": "/wu\u02d0m/",
        "explanation": "'womb' has long /u\u02d0/."
      },
      {
        "word": "women",
        "isMatch": true,
        "transcription": "/\u02c8w\u026am.\u026an/",
        "explanation": "Plural 'women' has short /\u026a/ in both syllables."
      }
    ]
  },
  {
    "id": "sm-138",
    "targetSound": "/e/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open-mid front unrounded vowel /e/?",
    "options": [
      {
        "word": "jeopardy",
        "isMatch": false,
        "transcription": "/\u02c8d\u0292ep.\u0259.di/",
        "explanation": "Also has /e/ but leopard is target."
      },
      {
        "word": "leonine",
        "isMatch": false,
        "transcription": "/\u02c8li\u02d0.\u0259.na\u026an/",
        "explanation": "'eo' is /i\u02d0.\u0259/ in 'leonine'."
      },
      {
        "word": "leopard",
        "isMatch": true,
        "transcription": "/\u02c8lep.\u0259d/",
        "explanation": "'eo' in 'leopard' is pronounced as short /e/."
      },
      {
        "word": "people",
        "isMatch": false,
        "transcription": "/\u02c8pi\u02d0.pl/",
        "explanation": "'eo' in 'people' is long /i\u02d0/."
      }
    ]
  },
  {
    "id": "sm-139",
    "targetSound": "/\u00e6/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-open front unrounded vowel /\u00e6/?",
    "options": [
      {
        "word": "plague",
        "isMatch": false,
        "transcription": "/ple\u026a\u0261/",
        "explanation": "'a' is diphthong /e\u026a/ in 'plague'."
      },
      {
        "word": "plaid",
        "isMatch": true,
        "transcription": "/pl\u00e6d/",
        "explanation": "'ai' in 'plaid' is pronounced as short /\u00e6/."
      },
      {
        "word": "plain",
        "isMatch": false,
        "transcription": "/ple\u026an/",
        "explanation": "'ai' is diphthong /e\u026a/ in 'plain'."
      },
      {
        "word": "plait",
        "isMatch": false,
        "transcription": "/pl\u00e6t/",
        "explanation": "Alternative /pl\u00e6t/."
      }
    ]
  },
  {
    "id": "sm-140",
    "targetSound": "/\u0251\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open back unrounded vowel /\u0251\u02d0/?",
    "options": [
      {
        "word": "clerk",
        "isMatch": true,
        "transcription": "/kl\u0251\u02d0k/",
        "explanation": "In British English, 'er' in 'clerk' is /\u0251\u02d0/."
      },
      {
        "word": "dark",
        "isMatch": false,
        "transcription": "/d\u0251\u02d0k/",
        "explanation": "Also /\u0251\u02d0/, clerk is standard UTME test word."
      },
      {
        "word": "jerk",
        "isMatch": false,
        "transcription": "/d\u0292\u025c\u02d0k/",
        "explanation": "'er' is /\u025c\u02d0/ in 'jerk'."
      },
      {
        "word": "clergyman",
        "isMatch": false,
        "transcription": "/\u02c8kl\u025c\u02d0.d\u0292i.m\u0259n/",
        "explanation": "'er' is /\u025c\u02d0/ in 'clergyman'."
      }
    ]
  },
  {
    "id": "sm-141",
    "targetSound": "/\u0252/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open back rounded vowel /\u0252/?",
    "options": [
      {
        "word": "yawn",
        "isMatch": false,
        "transcription": "/j\u0254\u02d0n/",
        "explanation": "'aw' is long vowel /\u0254\u02d0/ in 'yawn'."
      },
      {
        "word": "yard",
        "isMatch": false,
        "transcription": "/j\u0251\u02d0d/",
        "explanation": "'ar' is long vowel /\u0251\u02d0/ in 'yard'."
      },
      {
        "word": "year",
        "isMatch": false,
        "transcription": "/j\u026a\u0259r/",
        "explanation": "'ear' is diphthong /\u026a\u0259/ in 'year'."
      },
      {
        "word": "yacht",
        "isMatch": true,
        "transcription": "/j\u0252t/",
        "explanation": "'ach' in 'yacht' produces the short vowel /\u0252/."
      }
    ]
  },
  {
    "id": "sm-142",
    "targetSound": "/\u0254\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid back rounded vowel /\u0254\u02d0/?",
    "options": [
      {
        "word": "boat",
        "isMatch": false,
        "transcription": "/b\u0259\u028at/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'boat'."
      },
      {
        "word": "road",
        "isMatch": false,
        "transcription": "/r\u0259\u028ad/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'road'."
      },
      {
        "word": "broad",
        "isMatch": true,
        "transcription": "/br\u0254\u02d0d/",
        "explanation": "'oa' in 'broad' is pronounced /\u0254\u02d0/."
      },
      {
        "word": "board",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0d/",
        "explanation": "Both contain /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-143",
    "targetSound": "/u\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close back rounded vowel /u\u02d0/?",
    "options": [
      {
        "word": "biscuit",
        "isMatch": false,
        "transcription": "/\u02c8b\u026as.k\u026at/",
        "explanation": "'ui' is /\u026a/ in 'biscuit'."
      },
      {
        "word": "suit",
        "isMatch": true,
        "transcription": "/su\u02d0t/",
        "explanation": "'ui' in 'suit' produces long vowel /u\u02d0/."
      },
      {
        "word": "suite",
        "isMatch": false,
        "transcription": "/swi\u02d0t/",
        "explanation": "'suite' is pronounced like 'sweet' /swi\u02d0t/."
      },
      {
        "word": "suit",
        "isMatch": false,
        "transcription": "/su\u02d0t/",
        "explanation": "Match."
      }
    ]
  },
  {
    "id": "sm-144",
    "targetSound": "/\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-back rounded vowel /\u028a/?",
    "options": [
      {
        "word": "could",
        "isMatch": true,
        "transcription": "/k\u028ad/",
        "explanation": "'oul' produces short rounded vowel /\u028a/ in 'could'."
      },
      {
        "word": "cold",
        "isMatch": false,
        "transcription": "/k\u0259\u028ald/",
        "explanation": "'old' has diphthong /\u0259\u028a/."
      },
      {
        "word": "cool",
        "isMatch": false,
        "transcription": "/ku\u02d0l/",
        "explanation": "'oo' has long /u\u02d0/."
      },
      {
        "word": "cloud",
        "isMatch": false,
        "transcription": "/kla\u028ad/",
        "explanation": "'ou' has diphthong /a\u028a/."
      }
    ]
  },
  {
    "id": "sm-145",
    "targetSound": "/\u025c\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid central unrounded vowel /\u025c\u02d0/?",
    "options": [
      {
        "word": "tour",
        "isMatch": false,
        "transcription": "/t\u028a\u0259r/",
        "explanation": "'our' produces diphthong /\u028a\u0259/ in 'tour'."
      },
      {
        "word": "sour",
        "isMatch": false,
        "transcription": "/sa\u028a\u0259r/",
        "explanation": "'our' produces triphthong /a\u028a\u0259/ in 'sour'."
      },
      {
        "word": "four",
        "isMatch": false,
        "transcription": "/f\u0254\u02d0r/",
        "explanation": "'our' produces long vowel /\u0254\u02d0/ in 'four'."
      },
      {
        "word": "journey",
        "isMatch": true,
        "transcription": "/\u02c8d\u0292\u025c\u02d0.ni/",
        "explanation": "'our' produces long central /\u025c\u02d0/ in 'journey'."
      }
    ]
  },
  {
    "id": "sm-146",
    "targetSound": "/\u0259/",
    "soundType": "vowel",
    "prompt": "Which word contains the weak mid-central unrounded vowel (schwa) /\u0259/?",
    "options": [
      {
        "word": "bacon",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.k\u0259n/",
        "explanation": "First syllable has /e\u026a/."
      },
      {
        "word": "barter",
        "isMatch": false,
        "transcription": "/\u02c8b\u0251\u02d0.t\u0259r/",
        "explanation": "First syllable has /\u0251\u02d0/."
      },
      {
        "word": "banana",
        "isMatch": true,
        "transcription": "/b\u0259\u02c8n\u0251\u02d0.n\u0259/",
        "explanation": "First and last syllables contain schwa /\u0259/."
      },
      {
        "word": "badger",
        "isMatch": false,
        "transcription": "/\u02c8b\u00e6d\u0292.\u0259r/",
        "explanation": "First syllable has /\u00e6/."
      }
    ]
  },
  {
    "id": "sm-147",
    "targetSound": "/e\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /e\u026a/?",
    "options": [
      {
        "word": "gaunt",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0nt/",
        "explanation": "'au' in 'gaunt' is long /\u0254\u02d0/."
      },
      {
        "word": "gauge",
        "isMatch": true,
        "transcription": "/\u0261e\u026ad\u0292/",
        "explanation": "'au' in 'gauge' is pronounced with diphthong /e\u026a/."
      },
      {
        "word": "gouge",
        "isMatch": false,
        "transcription": "/\u0261a\u028ad\u0292/",
        "explanation": "'ou' in 'gouge' is diphthong /a\u028a/."
      },
      {
        "word": "gauze",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0z/",
        "explanation": "'au' in 'gauze' is long /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-148",
    "targetSound": "/a\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u026a/?",
    "options": [
      {
        "word": "height",
        "isMatch": true,
        "transcription": "/ha\u026at/",
        "explanation": "'eigh' in 'height' is pronounced /a\u026a/."
      },
      {
        "word": "weight",
        "isMatch": false,
        "transcription": "/we\u026at/",
        "explanation": "'eigh' in 'weight' is pronounced /e\u026a/."
      },
      {
        "word": "freight",
        "isMatch": false,
        "transcription": "/fre\u026at/",
        "explanation": "'eigh' in 'freight' is pronounced /e\u026a/."
      },
      {
        "word": "eight",
        "isMatch": false,
        "transcription": "/e\u026at/",
        "explanation": "'eigh' in 'eight' is pronounced /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-149",
    "targetSound": "/a\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u028a/?",
    "options": [
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'ough' in 'dough' is /\u0259\u028a/."
      },
      {
        "word": "bought",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0t/",
        "explanation": "'ough' in 'bought' is /\u0254\u02d0/."
      },
      {
        "word": "rough",
        "isMatch": false,
        "transcription": "/r\u028cf/",
        "explanation": "'ough' in 'rough' is /\u028cf/."
      },
      {
        "word": "drought",
        "isMatch": true,
        "transcription": "/dra\u028at/",
        "explanation": "'ough' in 'drought' is pronounced /a\u028a/."
      }
    ]
  },
  {
    "id": "sm-150",
    "targetSound": "/\u0259\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /\u0259\u028a/?",
    "options": [
      {
        "word": "new",
        "isMatch": false,
        "transcription": "/nju\u02d0/",
        "explanation": "'ew' in 'new' is /nju\u02d0/."
      },
      {
        "word": "flew",
        "isMatch": false,
        "transcription": "/flu\u02d0/",
        "explanation": "'ew' in 'flew' is /u\u02d0/."
      },
      {
        "word": "sew",
        "isMatch": true,
        "transcription": "/s\u0259\u028a/",
        "explanation": "'ew' in 'sew' is pronounced with diphthong /\u0259\u028a/."
      },
      {
        "word": "few",
        "isMatch": false,
        "transcription": "/fju\u02d0/",
        "explanation": "'ew' in 'few' is /ju\u02d0/."
      }
    ]
  },
  {
    "id": "sm-151",
    "targetSound": "/\u03b8/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless dental fricative /\u03b8/?",
    "options": [
      {
        "word": "thin",
        "isMatch": true,
        "transcription": "/\u03b8\u026an/",
        "explanation": "In 'thin', 'th' produces the voiceless dental fricative /\u03b8/."
      },
      {
        "word": "then",
        "isMatch": false,
        "transcription": "/\u00f0en/",
        "explanation": "In 'then', 'th' produces the voiced dental fricative /\u00f0/."
      },
      {
        "word": "tin",
        "isMatch": false,
        "transcription": "/t\u026an/",
        "explanation": "In 'tin', 't' is an alveolar plosive /t/."
      },
      {
        "word": "sin",
        "isMatch": false,
        "transcription": "/s\u026an/",
        "explanation": "In 'sin', 's' is an alveolar fricative /s/."
      }
    ]
  },
  {
    "id": "sm-152",
    "targetSound": "/\u00f0/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced dental fricative /\u00f0/?",
    "options": [
      {
        "word": "breath",
        "isMatch": false,
        "transcription": "/bre\u03b8/",
        "explanation": "In 'breath', 'th' produces the voiceless sound /\u03b8/."
      },
      {
        "word": "breeze",
        "isMatch": false,
        "transcription": "/bri\u02d0z/",
        "explanation": "In 'breeze', 'z' is an alveolar fricative /z/."
      },
      {
        "word": "breed",
        "isMatch": false,
        "transcription": "/bri\u02d0d/",
        "explanation": "In 'breed', 'd' is an alveolar plosive /d/."
      },
      {
        "word": "breathe",
        "isMatch": true,
        "transcription": "/bri\u02d0\u00f0/",
        "explanation": "In 'breathe', 'th' produces the voiced sound /\u00f0/."
      }
    ]
  },
  {
    "id": "sm-153",
    "targetSound": "/\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar fricative /\u0283/?",
    "options": [
      {
        "word": "chemist",
        "isMatch": false,
        "transcription": "/\u02c8kem.\u026ast/",
        "explanation": "'chemist' uses the velar plosive /k/."
      },
      {
        "word": "chair",
        "isMatch": false,
        "transcription": "/t\u0283e\u0259r/",
        "explanation": "'chair' uses the affricate /t\u0283/."
      },
      {
        "word": "chef",
        "isMatch": true,
        "transcription": "/\u0283ef/",
        "explanation": "French loanword 'chef' uses 'ch' to produce /\u0283/."
      },
      {
        "word": "chief",
        "isMatch": false,
        "transcription": "/t\u0283i\u02d0f/",
        "explanation": "'chief' uses the affricate /t\u0283/."
      }
    ]
  },
  {
    "id": "sm-154",
    "targetSound": "/t\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar affricate /t\u0283/?",
    "options": [
      {
        "word": "station",
        "isMatch": false,
        "transcription": "/\u02c8ste\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'station'."
      },
      {
        "word": "nature",
        "isMatch": true,
        "transcription": "/\u02c8ne\u026a.t\u0283\u0259r/",
        "explanation": "'t' before '-ure' produces /t\u0283/ in 'nature'."
      },
      {
        "word": "nation",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'nation'."
      },
      {
        "word": "native",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.t\u026av/",
        "explanation": "'t' produces /t/ in 'native'."
      }
    ]
  },
  {
    "id": "sm-155",
    "targetSound": "/\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar fricative /\u0292/?",
    "options": [
      {
        "word": "measure",
        "isMatch": true,
        "transcription": "/\u02c8me\u0292.\u0259r/",
        "explanation": "'s' before '-ure' produces /\u0292/ in 'measure'."
      },
      {
        "word": "pressure",
        "isMatch": false,
        "transcription": "/\u02c8pre\u0283.\u0259r/",
        "explanation": "'ss' produces voiceless /\u0283/ in 'pressure'."
      },
      {
        "word": "ensure",
        "isMatch": false,
        "transcription": "/\u026an\u02c8\u0283\u0254\u02d0r/",
        "explanation": "'s' produces /\u0283/ in 'ensure'."
      },
      {
        "word": "major",
        "isMatch": false,
        "transcription": "/\u02c8me\u026a.d\u0292\u0259r/",
        "explanation": "'j' produces affricate /d\u0292/ in 'major'."
      }
    ]
  },
  {
    "id": "sm-156",
    "targetSound": "/d\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar affricate /d\u0292/?",
    "options": [
      {
        "word": "solid",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u026ad/",
        "explanation": "'d' produces simple plosive /d/."
      },
      {
        "word": "shoulder",
        "isMatch": false,
        "transcription": "/\u02c8\u0283\u0259\u028al.d\u0259r/",
        "explanation": "'d' produces plosive /d/."
      },
      {
        "word": "solemn",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u0259m/",
        "explanation": "'n' is silent, no affricate."
      },
      {
        "word": "soldier",
        "isMatch": true,
        "transcription": "/\u02c8s\u0259\u028al.d\u0292\u0259r/",
        "explanation": "'di' produces the affricate /d\u0292/ in 'soldier'."
      }
    ]
  },
  {
    "id": "sm-157",
    "targetSound": "/\u014b/",
    "soundType": "consonant",
    "prompt": "Which word contains the velar nasal /\u014b/?",
    "options": [
      {
        "word": "range",
        "isMatch": false,
        "transcription": "/re\u026and\u0292/",
        "explanation": "'n' is followed by affricate /d\u0292/."
      },
      {
        "word": "ran",
        "isMatch": false,
        "transcription": "/r\u00e6n/",
        "explanation": "'n' is alveolar nasal /n/."
      },
      {
        "word": "rank",
        "isMatch": true,
        "transcription": "/r\u00e6\u014bk/",
        "explanation": "'n' before 'k' assimilates to velar nasal /\u014b/."
      },
      {
        "word": "rain",
        "isMatch": false,
        "transcription": "/re\u026an/",
        "explanation": "'n' is alveolar nasal /n/ in 'rain'."
      }
    ]
  },
  {
    "id": "sm-158",
    "targetSound": "/f/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless labiodental fricative /f/?",
    "options": [
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'gh' is silent in 'dough'."
      },
      {
        "word": "laugh",
        "isMatch": true,
        "transcription": "/l\u0251\u02d0f/",
        "explanation": "'gh' produces /f/ in 'laugh'."
      },
      {
        "word": "though",
        "isMatch": false,
        "transcription": "/\u00f0\u0259\u028a/",
        "explanation": "'gh' is silent in 'though'."
      },
      {
        "word": "through",
        "isMatch": false,
        "transcription": "/\u03b8ru\u02d0/",
        "explanation": "'gh' is silent in 'through'."
      }
    ]
  },
  {
    "id": "sm-159",
    "targetSound": "/v/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced labiodental fricative /v/?",
    "options": [
      {
        "word": "of",
        "isMatch": true,
        "transcription": "/\u0259v/",
        "explanation": "'f' is pronounced /v/ in the preposition 'of'."
      },
      {
        "word": "off",
        "isMatch": false,
        "transcription": "/\u0252f/",
        "explanation": "'ff' produces voiceless /f/ in 'off'."
      },
      {
        "word": "often",
        "isMatch": false,
        "transcription": "/\u02c8\u0252f.n/",
        "explanation": "'f' produces voiceless /f/."
      },
      {
        "word": "orphan",
        "isMatch": false,
        "transcription": "/\u02c8\u0254\u02d0.f\u0259n/",
        "explanation": "'ph' produces voiceless /f/."
      }
    ]
  },
  {
    "id": "sm-160",
    "targetSound": "/k/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless velar plosive /k/?",
    "options": [
      {
        "word": "stoppage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252p.\u026ad\u0292/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "stomping",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252m.p\u026a\u014b/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "storage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0254\u02d0.r\u026ad\u0292/",
        "explanation": "Contains rhotic /r/."
      },
      {
        "word": "stomach",
        "isMatch": true,
        "transcription": "/\u02c8st\u028cm.\u0259k/",
        "explanation": "'ch' is pronounced /k/ in Greek loanword 'stomach'."
      }
    ]
  },
  {
    "id": "sm-161",
    "targetSound": "/s/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless alveolar fricative /s/?",
    "options": [
      {
        "word": "physics",
        "isMatch": false,
        "transcription": "/\u02c8f\u026az.\u026aks/",
        "explanation": "Initial sound is /f/."
      },
      {
        "word": "pneumonia",
        "isMatch": false,
        "transcription": "/nju\u02d0\u02c8m\u0259\u028a.ni.\u0259/",
        "explanation": "Initial sound is /n/."
      },
      {
        "word": "psychology",
        "isMatch": true,
        "transcription": "/sa\u026a\u02c8k\u0252l.\u0259.d\u0292i/",
        "explanation": "Initial 'p' is silent; word begins with /s/."
      },
      {
        "word": "philosophy",
        "isMatch": false,
        "transcription": "/f\u026a\u02c8l\u0252s.\u0259.fi/",
        "explanation": "Initial sound is /f/."
      }
    ]
  },
  {
    "id": "sm-162",
    "targetSound": "/z/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced alveolar fricative /z/?",
    "options": [
      {
        "word": "bask",
        "isMatch": false,
        "transcription": "/b\u0251\u02d0sk/",
        "explanation": "'s' produces voiceless /s/."
      },
      {
        "word": "busy",
        "isMatch": true,
        "transcription": "/\u02c8b\u026az.i/",
        "explanation": "'s' between vowels produces /z/ in 'busy'."
      },
      {
        "word": "basic",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.s\u026ak/",
        "explanation": "'s' produces voiceless /s/ in 'basic'."
      },
      {
        "word": "bison",
        "isMatch": false,
        "transcription": "/\u02c8ba\u026a.s\u0259n/",
        "explanation": "'s' produces voiceless /s/."
      }
    ]
  },
  {
    "id": "sm-163",
    "targetSound": "/j/",
    "soundType": "consonant",
    "prompt": "Which word contains the palatal approximant /j/?",
    "options": [
      {
        "word": "ewe",
        "isMatch": true,
        "transcription": "/ju\u02d0/",
        "explanation": "'ewe' is pronounced with palatal approximant /j/ as in 'you'."
      },
      {
        "word": "eye",
        "isMatch": false,
        "transcription": "/a\u026a/",
        "explanation": "'eye' begins with diphthong /a\u026a/."
      },
      {
        "word": "ear",
        "isMatch": false,
        "transcription": "/\u026a\u0259r/",
        "explanation": "'ear' begins with diphthong /\u026a\u0259/."
      },
      {
        "word": "ore",
        "isMatch": false,
        "transcription": "/\u0254\u02d0r/",
        "explanation": "'ore' begins with monophthong /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-164",
    "targetSound": "/w/",
    "soundType": "consonant",
    "prompt": "Which word contains the labial-velar approximant /w/?",
    "options": [
      {
        "word": "on",
        "isMatch": false,
        "transcription": "/\u0252n/",
        "explanation": "'on' begins with vowel /\u0252/."
      },
      {
        "word": "own",
        "isMatch": false,
        "transcription": "/\u0259\u028an/",
        "explanation": "'own' begins with diphthong /\u0259\u028a/."
      },
      {
        "word": "in",
        "isMatch": false,
        "transcription": "/\u026an/",
        "explanation": "'in' begins with short vowel /\u026a/."
      },
      {
        "word": "one",
        "isMatch": true,
        "transcription": "/w\u028cn/",
        "explanation": "'one' begins with the approximant /w/."
      }
    ]
  },
  {
    "id": "sm-165",
    "targetSound": "/h/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless glottal fricative /h/?",
    "options": [
      {
        "word": "when",
        "isMatch": false,
        "transcription": "/wen/",
        "explanation": "'wh' represents /w/ in 'when'."
      },
      {
        "word": "where",
        "isMatch": false,
        "transcription": "/we\u0259r/",
        "explanation": "'wh' represents /w/ in 'where'."
      },
      {
        "word": "who",
        "isMatch": true,
        "transcription": "/hu\u02d0/",
        "explanation": "'wh' represents glottal fricative /h/ in 'who'."
      },
      {
        "word": "what",
        "isMatch": false,
        "transcription": "/w\u0252t/",
        "explanation": "'wh' represents /w/ in 'what'."
      }
    ]
  },
  {
    "id": "sm-166",
    "targetSound": "/i\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close front unrounded vowel /i\u02d0/?",
    "options": [
      {
        "word": "guy",
        "isMatch": false,
        "transcription": "/\u0261a\u026a/",
        "explanation": "'guy' has diphthong /a\u026a/."
      },
      {
        "word": "quay",
        "isMatch": true,
        "transcription": "/ki\u02d0/",
        "explanation": "'quay' is pronounced /ki\u02d0/ with long vowel /i\u02d0/."
      },
      {
        "word": "play",
        "isMatch": false,
        "transcription": "/ple\u026a/",
        "explanation": "'play' has diphthong /e\u026a/."
      },
      {
        "word": "stay",
        "isMatch": false,
        "transcription": "/ste\u026a/",
        "explanation": "'stay' has diphthong /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-167",
    "targetSound": "/\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-front unrounded vowel /\u026a/?",
    "options": [
      {
        "word": "women",
        "isMatch": true,
        "transcription": "/\u02c8w\u026am.\u026an/",
        "explanation": "Plural 'women' has short /\u026a/ in both syllables."
      },
      {
        "word": "woman",
        "isMatch": false,
        "transcription": "/\u02c8w\u028am.\u0259n/",
        "explanation": "Singular 'woman' has short /\u028a/."
      },
      {
        "word": "wooden",
        "isMatch": false,
        "transcription": "/\u02c8w\u028ad.n/",
        "explanation": "'wooden' has short /\u028a/."
      },
      {
        "word": "womb",
        "isMatch": false,
        "transcription": "/wu\u02d0m/",
        "explanation": "'womb' has long /u\u02d0/."
      }
    ]
  },
  {
    "id": "sm-168",
    "targetSound": "/e/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open-mid front unrounded vowel /e/?",
    "options": [
      {
        "word": "people",
        "isMatch": false,
        "transcription": "/\u02c8pi\u02d0.pl/",
        "explanation": "'eo' in 'people' is long /i\u02d0/."
      },
      {
        "word": "jeopardy",
        "isMatch": false,
        "transcription": "/\u02c8d\u0292ep.\u0259.di/",
        "explanation": "Also has /e/ but leopard is target."
      },
      {
        "word": "leonine",
        "isMatch": false,
        "transcription": "/\u02c8li\u02d0.\u0259.na\u026an/",
        "explanation": "'eo' is /i\u02d0.\u0259/ in 'leonine'."
      },
      {
        "word": "leopard",
        "isMatch": true,
        "transcription": "/\u02c8lep.\u0259d/",
        "explanation": "'eo' in 'leopard' is pronounced as short /e/."
      }
    ]
  },
  {
    "id": "sm-169",
    "targetSound": "/\u00e6/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-open front unrounded vowel /\u00e6/?",
    "options": [
      {
        "word": "plait",
        "isMatch": false,
        "transcription": "/pl\u00e6t/",
        "explanation": "Alternative /pl\u00e6t/."
      },
      {
        "word": "plague",
        "isMatch": false,
        "transcription": "/ple\u026a\u0261/",
        "explanation": "'a' is diphthong /e\u026a/ in 'plague'."
      },
      {
        "word": "plaid",
        "isMatch": true,
        "transcription": "/pl\u00e6d/",
        "explanation": "'ai' in 'plaid' is pronounced as short /\u00e6/."
      },
      {
        "word": "plain",
        "isMatch": false,
        "transcription": "/ple\u026an/",
        "explanation": "'ai' is diphthong /e\u026a/ in 'plain'."
      }
    ]
  },
  {
    "id": "sm-170",
    "targetSound": "/\u0251\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open back unrounded vowel /\u0251\u02d0/?",
    "options": [
      {
        "word": "clergyman",
        "isMatch": false,
        "transcription": "/\u02c8kl\u025c\u02d0.d\u0292i.m\u0259n/",
        "explanation": "'er' is /\u025c\u02d0/ in 'clergyman'."
      },
      {
        "word": "clerk",
        "isMatch": true,
        "transcription": "/kl\u0251\u02d0k/",
        "explanation": "In British English, 'er' in 'clerk' is /\u0251\u02d0/."
      },
      {
        "word": "dark",
        "isMatch": false,
        "transcription": "/d\u0251\u02d0k/",
        "explanation": "Also /\u0251\u02d0/, clerk is standard UTME test word."
      },
      {
        "word": "jerk",
        "isMatch": false,
        "transcription": "/d\u0292\u025c\u02d0k/",
        "explanation": "'er' is /\u025c\u02d0/ in 'jerk'."
      }
    ]
  },
  {
    "id": "sm-171",
    "targetSound": "/\u0252/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open back rounded vowel /\u0252/?",
    "options": [
      {
        "word": "yacht",
        "isMatch": true,
        "transcription": "/j\u0252t/",
        "explanation": "'ach' in 'yacht' produces the short vowel /\u0252/."
      },
      {
        "word": "yawn",
        "isMatch": false,
        "transcription": "/j\u0254\u02d0n/",
        "explanation": "'aw' is long vowel /\u0254\u02d0/ in 'yawn'."
      },
      {
        "word": "yard",
        "isMatch": false,
        "transcription": "/j\u0251\u02d0d/",
        "explanation": "'ar' is long vowel /\u0251\u02d0/ in 'yard'."
      },
      {
        "word": "year",
        "isMatch": false,
        "transcription": "/j\u026a\u0259r/",
        "explanation": "'ear' is diphthong /\u026a\u0259/ in 'year'."
      }
    ]
  },
  {
    "id": "sm-172",
    "targetSound": "/\u0254\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid back rounded vowel /\u0254\u02d0/?",
    "options": [
      {
        "word": "board",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0d/",
        "explanation": "Both contain /\u0254\u02d0/."
      },
      {
        "word": "boat",
        "isMatch": false,
        "transcription": "/b\u0259\u028at/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'boat'."
      },
      {
        "word": "road",
        "isMatch": false,
        "transcription": "/r\u0259\u028ad/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'road'."
      },
      {
        "word": "broad",
        "isMatch": true,
        "transcription": "/br\u0254\u02d0d/",
        "explanation": "'oa' in 'broad' is pronounced /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-173",
    "targetSound": "/u\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close back rounded vowel /u\u02d0/?",
    "options": [
      {
        "word": "suit",
        "isMatch": false,
        "transcription": "/su\u02d0t/",
        "explanation": "Match."
      },
      {
        "word": "biscuit",
        "isMatch": false,
        "transcription": "/\u02c8b\u026as.k\u026at/",
        "explanation": "'ui' is /\u026a/ in 'biscuit'."
      },
      {
        "word": "suit",
        "isMatch": true,
        "transcription": "/su\u02d0t/",
        "explanation": "'ui' in 'suit' produces long vowel /u\u02d0/."
      },
      {
        "word": "suite",
        "isMatch": false,
        "transcription": "/swi\u02d0t/",
        "explanation": "'suite' is pronounced like 'sweet' /swi\u02d0t/."
      }
    ]
  },
  {
    "id": "sm-174",
    "targetSound": "/\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-back rounded vowel /\u028a/?",
    "options": [
      {
        "word": "cloud",
        "isMatch": false,
        "transcription": "/kla\u028ad/",
        "explanation": "'ou' has diphthong /a\u028a/."
      },
      {
        "word": "could",
        "isMatch": true,
        "transcription": "/k\u028ad/",
        "explanation": "'oul' produces short rounded vowel /\u028a/ in 'could'."
      },
      {
        "word": "cold",
        "isMatch": false,
        "transcription": "/k\u0259\u028ald/",
        "explanation": "'old' has diphthong /\u0259\u028a/."
      },
      {
        "word": "cool",
        "isMatch": false,
        "transcription": "/ku\u02d0l/",
        "explanation": "'oo' has long /u\u02d0/."
      }
    ]
  },
  {
    "id": "sm-175",
    "targetSound": "/\u025c\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid central unrounded vowel /\u025c\u02d0/?",
    "options": [
      {
        "word": "journey",
        "isMatch": true,
        "transcription": "/\u02c8d\u0292\u025c\u02d0.ni/",
        "explanation": "'our' produces long central /\u025c\u02d0/ in 'journey'."
      },
      {
        "word": "tour",
        "isMatch": false,
        "transcription": "/t\u028a\u0259r/",
        "explanation": "'our' produces diphthong /\u028a\u0259/ in 'tour'."
      },
      {
        "word": "sour",
        "isMatch": false,
        "transcription": "/sa\u028a\u0259r/",
        "explanation": "'our' produces triphthong /a\u028a\u0259/ in 'sour'."
      },
      {
        "word": "four",
        "isMatch": false,
        "transcription": "/f\u0254\u02d0r/",
        "explanation": "'our' produces long vowel /\u0254\u02d0/ in 'four'."
      }
    ]
  },
  {
    "id": "sm-176",
    "targetSound": "/\u0259/",
    "soundType": "vowel",
    "prompt": "Which word contains the weak mid-central unrounded vowel (schwa) /\u0259/?",
    "options": [
      {
        "word": "badger",
        "isMatch": false,
        "transcription": "/\u02c8b\u00e6d\u0292.\u0259r/",
        "explanation": "First syllable has /\u00e6/."
      },
      {
        "word": "bacon",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.k\u0259n/",
        "explanation": "First syllable has /e\u026a/."
      },
      {
        "word": "barter",
        "isMatch": false,
        "transcription": "/\u02c8b\u0251\u02d0.t\u0259r/",
        "explanation": "First syllable has /\u0251\u02d0/."
      },
      {
        "word": "banana",
        "isMatch": true,
        "transcription": "/b\u0259\u02c8n\u0251\u02d0.n\u0259/",
        "explanation": "First and last syllables contain schwa /\u0259/."
      }
    ]
  },
  {
    "id": "sm-177",
    "targetSound": "/e\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /e\u026a/?",
    "options": [
      {
        "word": "gauze",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0z/",
        "explanation": "'au' in 'gauze' is long /\u0254\u02d0/."
      },
      {
        "word": "gaunt",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0nt/",
        "explanation": "'au' in 'gaunt' is long /\u0254\u02d0/."
      },
      {
        "word": "gauge",
        "isMatch": true,
        "transcription": "/\u0261e\u026ad\u0292/",
        "explanation": "'au' in 'gauge' is pronounced with diphthong /e\u026a/."
      },
      {
        "word": "gouge",
        "isMatch": false,
        "transcription": "/\u0261a\u028ad\u0292/",
        "explanation": "'ou' in 'gouge' is diphthong /a\u028a/."
      }
    ]
  },
  {
    "id": "sm-178",
    "targetSound": "/a\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u026a/?",
    "options": [
      {
        "word": "eight",
        "isMatch": false,
        "transcription": "/e\u026at/",
        "explanation": "'eigh' in 'eight' is pronounced /e\u026a/."
      },
      {
        "word": "height",
        "isMatch": true,
        "transcription": "/ha\u026at/",
        "explanation": "'eigh' in 'height' is pronounced /a\u026a/."
      },
      {
        "word": "weight",
        "isMatch": false,
        "transcription": "/we\u026at/",
        "explanation": "'eigh' in 'weight' is pronounced /e\u026a/."
      },
      {
        "word": "freight",
        "isMatch": false,
        "transcription": "/fre\u026at/",
        "explanation": "'eigh' in 'freight' is pronounced /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-179",
    "targetSound": "/a\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u028a/?",
    "options": [
      {
        "word": "drought",
        "isMatch": true,
        "transcription": "/dra\u028at/",
        "explanation": "'ough' in 'drought' is pronounced /a\u028a/."
      },
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'ough' in 'dough' is /\u0259\u028a/."
      },
      {
        "word": "bought",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0t/",
        "explanation": "'ough' in 'bought' is /\u0254\u02d0/."
      },
      {
        "word": "rough",
        "isMatch": false,
        "transcription": "/r\u028cf/",
        "explanation": "'ough' in 'rough' is /\u028cf/."
      }
    ]
  },
  {
    "id": "sm-180",
    "targetSound": "/\u0259\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /\u0259\u028a/?",
    "options": [
      {
        "word": "few",
        "isMatch": false,
        "transcription": "/fju\u02d0/",
        "explanation": "'ew' in 'few' is /ju\u02d0/."
      },
      {
        "word": "new",
        "isMatch": false,
        "transcription": "/nju\u02d0/",
        "explanation": "'ew' in 'new' is /nju\u02d0/."
      },
      {
        "word": "flew",
        "isMatch": false,
        "transcription": "/flu\u02d0/",
        "explanation": "'ew' in 'flew' is /u\u02d0/."
      },
      {
        "word": "sew",
        "isMatch": true,
        "transcription": "/s\u0259\u028a/",
        "explanation": "'ew' in 'sew' is pronounced with diphthong /\u0259\u028a/."
      }
    ]
  },
  {
    "id": "sm-181",
    "targetSound": "/\u03b8/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless dental fricative /\u03b8/?",
    "options": [
      {
        "word": "sin",
        "isMatch": false,
        "transcription": "/s\u026an/",
        "explanation": "In 'sin', 's' is an alveolar fricative /s/."
      },
      {
        "word": "thin",
        "isMatch": true,
        "transcription": "/\u03b8\u026an/",
        "explanation": "In 'thin', 'th' produces the voiceless dental fricative /\u03b8/."
      },
      {
        "word": "then",
        "isMatch": false,
        "transcription": "/\u00f0en/",
        "explanation": "In 'then', 'th' produces the voiced dental fricative /\u00f0/."
      },
      {
        "word": "tin",
        "isMatch": false,
        "transcription": "/t\u026an/",
        "explanation": "In 'tin', 't' is an alveolar plosive /t/."
      }
    ]
  },
  {
    "id": "sm-182",
    "targetSound": "/\u00f0/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced dental fricative /\u00f0/?",
    "options": [
      {
        "word": "breathe",
        "isMatch": true,
        "transcription": "/bri\u02d0\u00f0/",
        "explanation": "In 'breathe', 'th' produces the voiced sound /\u00f0/."
      },
      {
        "word": "breath",
        "isMatch": false,
        "transcription": "/bre\u03b8/",
        "explanation": "In 'breath', 'th' produces the voiceless sound /\u03b8/."
      },
      {
        "word": "breeze",
        "isMatch": false,
        "transcription": "/bri\u02d0z/",
        "explanation": "In 'breeze', 'z' is an alveolar fricative /z/."
      },
      {
        "word": "breed",
        "isMatch": false,
        "transcription": "/bri\u02d0d/",
        "explanation": "In 'breed', 'd' is an alveolar plosive /d/."
      }
    ]
  },
  {
    "id": "sm-183",
    "targetSound": "/\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar fricative /\u0283/?",
    "options": [
      {
        "word": "chief",
        "isMatch": false,
        "transcription": "/t\u0283i\u02d0f/",
        "explanation": "'chief' uses the affricate /t\u0283/."
      },
      {
        "word": "chemist",
        "isMatch": false,
        "transcription": "/\u02c8kem.\u026ast/",
        "explanation": "'chemist' uses the velar plosive /k/."
      },
      {
        "word": "chair",
        "isMatch": false,
        "transcription": "/t\u0283e\u0259r/",
        "explanation": "'chair' uses the affricate /t\u0283/."
      },
      {
        "word": "chef",
        "isMatch": true,
        "transcription": "/\u0283ef/",
        "explanation": "French loanword 'chef' uses 'ch' to produce /\u0283/."
      }
    ]
  },
  {
    "id": "sm-184",
    "targetSound": "/t\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar affricate /t\u0283/?",
    "options": [
      {
        "word": "native",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.t\u026av/",
        "explanation": "'t' produces /t/ in 'native'."
      },
      {
        "word": "station",
        "isMatch": false,
        "transcription": "/\u02c8ste\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'station'."
      },
      {
        "word": "nature",
        "isMatch": true,
        "transcription": "/\u02c8ne\u026a.t\u0283\u0259r/",
        "explanation": "'t' before '-ure' produces /t\u0283/ in 'nature'."
      },
      {
        "word": "nation",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'nation'."
      }
    ]
  },
  {
    "id": "sm-185",
    "targetSound": "/\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar fricative /\u0292/?",
    "options": [
      {
        "word": "major",
        "isMatch": false,
        "transcription": "/\u02c8me\u026a.d\u0292\u0259r/",
        "explanation": "'j' produces affricate /d\u0292/ in 'major'."
      },
      {
        "word": "measure",
        "isMatch": true,
        "transcription": "/\u02c8me\u0292.\u0259r/",
        "explanation": "'s' before '-ure' produces /\u0292/ in 'measure'."
      },
      {
        "word": "pressure",
        "isMatch": false,
        "transcription": "/\u02c8pre\u0283.\u0259r/",
        "explanation": "'ss' produces voiceless /\u0283/ in 'pressure'."
      },
      {
        "word": "ensure",
        "isMatch": false,
        "transcription": "/\u026an\u02c8\u0283\u0254\u02d0r/",
        "explanation": "'s' produces /\u0283/ in 'ensure'."
      }
    ]
  },
  {
    "id": "sm-186",
    "targetSound": "/d\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar affricate /d\u0292/?",
    "options": [
      {
        "word": "soldier",
        "isMatch": true,
        "transcription": "/\u02c8s\u0259\u028al.d\u0292\u0259r/",
        "explanation": "'di' produces the affricate /d\u0292/ in 'soldier'."
      },
      {
        "word": "solid",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u026ad/",
        "explanation": "'d' produces simple plosive /d/."
      },
      {
        "word": "shoulder",
        "isMatch": false,
        "transcription": "/\u02c8\u0283\u0259\u028al.d\u0259r/",
        "explanation": "'d' produces plosive /d/."
      },
      {
        "word": "solemn",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u0259m/",
        "explanation": "'n' is silent, no affricate."
      }
    ]
  },
  {
    "id": "sm-187",
    "targetSound": "/\u014b/",
    "soundType": "consonant",
    "prompt": "Which word contains the velar nasal /\u014b/?",
    "options": [
      {
        "word": "rain",
        "isMatch": false,
        "transcription": "/re\u026an/",
        "explanation": "'n' is alveolar nasal /n/ in 'rain'."
      },
      {
        "word": "range",
        "isMatch": false,
        "transcription": "/re\u026and\u0292/",
        "explanation": "'n' is followed by affricate /d\u0292/."
      },
      {
        "word": "ran",
        "isMatch": false,
        "transcription": "/r\u00e6n/",
        "explanation": "'n' is alveolar nasal /n/."
      },
      {
        "word": "rank",
        "isMatch": true,
        "transcription": "/r\u00e6\u014bk/",
        "explanation": "'n' before 'k' assimilates to velar nasal /\u014b/."
      }
    ]
  },
  {
    "id": "sm-188",
    "targetSound": "/f/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless labiodental fricative /f/?",
    "options": [
      {
        "word": "through",
        "isMatch": false,
        "transcription": "/\u03b8ru\u02d0/",
        "explanation": "'gh' is silent in 'through'."
      },
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'gh' is silent in 'dough'."
      },
      {
        "word": "laugh",
        "isMatch": true,
        "transcription": "/l\u0251\u02d0f/",
        "explanation": "'gh' produces /f/ in 'laugh'."
      },
      {
        "word": "though",
        "isMatch": false,
        "transcription": "/\u00f0\u0259\u028a/",
        "explanation": "'gh' is silent in 'though'."
      }
    ]
  },
  {
    "id": "sm-189",
    "targetSound": "/v/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced labiodental fricative /v/?",
    "options": [
      {
        "word": "orphan",
        "isMatch": false,
        "transcription": "/\u02c8\u0254\u02d0.f\u0259n/",
        "explanation": "'ph' produces voiceless /f/."
      },
      {
        "word": "of",
        "isMatch": true,
        "transcription": "/\u0259v/",
        "explanation": "'f' is pronounced /v/ in the preposition 'of'."
      },
      {
        "word": "off",
        "isMatch": false,
        "transcription": "/\u0252f/",
        "explanation": "'ff' produces voiceless /f/ in 'off'."
      },
      {
        "word": "often",
        "isMatch": false,
        "transcription": "/\u02c8\u0252f.n/",
        "explanation": "'f' produces voiceless /f/."
      }
    ]
  },
  {
    "id": "sm-190",
    "targetSound": "/k/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless velar plosive /k/?",
    "options": [
      {
        "word": "stomach",
        "isMatch": true,
        "transcription": "/\u02c8st\u028cm.\u0259k/",
        "explanation": "'ch' is pronounced /k/ in Greek loanword 'stomach'."
      },
      {
        "word": "stoppage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252p.\u026ad\u0292/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "stomping",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252m.p\u026a\u014b/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "storage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0254\u02d0.r\u026ad\u0292/",
        "explanation": "Contains rhotic /r/."
      }
    ]
  },
  {
    "id": "sm-191",
    "targetSound": "/s/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless alveolar fricative /s/?",
    "options": [
      {
        "word": "philosophy",
        "isMatch": false,
        "transcription": "/f\u026a\u02c8l\u0252s.\u0259.fi/",
        "explanation": "Initial sound is /f/."
      },
      {
        "word": "physics",
        "isMatch": false,
        "transcription": "/\u02c8f\u026az.\u026aks/",
        "explanation": "Initial sound is /f/."
      },
      {
        "word": "pneumonia",
        "isMatch": false,
        "transcription": "/nju\u02d0\u02c8m\u0259\u028a.ni.\u0259/",
        "explanation": "Initial sound is /n/."
      },
      {
        "word": "psychology",
        "isMatch": true,
        "transcription": "/sa\u026a\u02c8k\u0252l.\u0259.d\u0292i/",
        "explanation": "Initial 'p' is silent; word begins with /s/."
      }
    ]
  },
  {
    "id": "sm-192",
    "targetSound": "/z/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced alveolar fricative /z/?",
    "options": [
      {
        "word": "bison",
        "isMatch": false,
        "transcription": "/\u02c8ba\u026a.s\u0259n/",
        "explanation": "'s' produces voiceless /s/."
      },
      {
        "word": "bask",
        "isMatch": false,
        "transcription": "/b\u0251\u02d0sk/",
        "explanation": "'s' produces voiceless /s/."
      },
      {
        "word": "busy",
        "isMatch": true,
        "transcription": "/\u02c8b\u026az.i/",
        "explanation": "'s' between vowels produces /z/ in 'busy'."
      },
      {
        "word": "basic",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.s\u026ak/",
        "explanation": "'s' produces voiceless /s/ in 'basic'."
      }
    ]
  },
  {
    "id": "sm-193",
    "targetSound": "/j/",
    "soundType": "consonant",
    "prompt": "Which word contains the palatal approximant /j/?",
    "options": [
      {
        "word": "ore",
        "isMatch": false,
        "transcription": "/\u0254\u02d0r/",
        "explanation": "'ore' begins with monophthong /\u0254\u02d0/."
      },
      {
        "word": "ewe",
        "isMatch": true,
        "transcription": "/ju\u02d0/",
        "explanation": "'ewe' is pronounced with palatal approximant /j/ as in 'you'."
      },
      {
        "word": "eye",
        "isMatch": false,
        "transcription": "/a\u026a/",
        "explanation": "'eye' begins with diphthong /a\u026a/."
      },
      {
        "word": "ear",
        "isMatch": false,
        "transcription": "/\u026a\u0259r/",
        "explanation": "'ear' begins with diphthong /\u026a\u0259/."
      }
    ]
  },
  {
    "id": "sm-194",
    "targetSound": "/w/",
    "soundType": "consonant",
    "prompt": "Which word contains the labial-velar approximant /w/?",
    "options": [
      {
        "word": "one",
        "isMatch": true,
        "transcription": "/w\u028cn/",
        "explanation": "'one' begins with the approximant /w/."
      },
      {
        "word": "on",
        "isMatch": false,
        "transcription": "/\u0252n/",
        "explanation": "'on' begins with vowel /\u0252/."
      },
      {
        "word": "own",
        "isMatch": false,
        "transcription": "/\u0259\u028an/",
        "explanation": "'own' begins with diphthong /\u0259\u028a/."
      },
      {
        "word": "in",
        "isMatch": false,
        "transcription": "/\u026an/",
        "explanation": "'in' begins with short vowel /\u026a/."
      }
    ]
  },
  {
    "id": "sm-195",
    "targetSound": "/h/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless glottal fricative /h/?",
    "options": [
      {
        "word": "what",
        "isMatch": false,
        "transcription": "/w\u0252t/",
        "explanation": "'wh' represents /w/ in 'what'."
      },
      {
        "word": "when",
        "isMatch": false,
        "transcription": "/wen/",
        "explanation": "'wh' represents /w/ in 'when'."
      },
      {
        "word": "where",
        "isMatch": false,
        "transcription": "/we\u0259r/",
        "explanation": "'wh' represents /w/ in 'where'."
      },
      {
        "word": "who",
        "isMatch": true,
        "transcription": "/hu\u02d0/",
        "explanation": "'wh' represents glottal fricative /h/ in 'who'."
      }
    ]
  },
  {
    "id": "sm-196",
    "targetSound": "/i\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close front unrounded vowel /i\u02d0/?",
    "options": [
      {
        "word": "stay",
        "isMatch": false,
        "transcription": "/ste\u026a/",
        "explanation": "'stay' has diphthong /e\u026a/."
      },
      {
        "word": "guy",
        "isMatch": false,
        "transcription": "/\u0261a\u026a/",
        "explanation": "'guy' has diphthong /a\u026a/."
      },
      {
        "word": "quay",
        "isMatch": true,
        "transcription": "/ki\u02d0/",
        "explanation": "'quay' is pronounced /ki\u02d0/ with long vowel /i\u02d0/."
      },
      {
        "word": "play",
        "isMatch": false,
        "transcription": "/ple\u026a/",
        "explanation": "'play' has diphthong /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-197",
    "targetSound": "/\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-front unrounded vowel /\u026a/?",
    "options": [
      {
        "word": "womb",
        "isMatch": false,
        "transcription": "/wu\u02d0m/",
        "explanation": "'womb' has long /u\u02d0/."
      },
      {
        "word": "women",
        "isMatch": true,
        "transcription": "/\u02c8w\u026am.\u026an/",
        "explanation": "Plural 'women' has short /\u026a/ in both syllables."
      },
      {
        "word": "woman",
        "isMatch": false,
        "transcription": "/\u02c8w\u028am.\u0259n/",
        "explanation": "Singular 'woman' has short /\u028a/."
      },
      {
        "word": "wooden",
        "isMatch": false,
        "transcription": "/\u02c8w\u028ad.n/",
        "explanation": "'wooden' has short /\u028a/."
      }
    ]
  },
  {
    "id": "sm-198",
    "targetSound": "/e/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open-mid front unrounded vowel /e/?",
    "options": [
      {
        "word": "leopard",
        "isMatch": true,
        "transcription": "/\u02c8lep.\u0259d/",
        "explanation": "'eo' in 'leopard' is pronounced as short /e/."
      },
      {
        "word": "people",
        "isMatch": false,
        "transcription": "/\u02c8pi\u02d0.pl/",
        "explanation": "'eo' in 'people' is long /i\u02d0/."
      },
      {
        "word": "jeopardy",
        "isMatch": false,
        "transcription": "/\u02c8d\u0292ep.\u0259.di/",
        "explanation": "Also has /e/ but leopard is target."
      },
      {
        "word": "leonine",
        "isMatch": false,
        "transcription": "/\u02c8li\u02d0.\u0259.na\u026an/",
        "explanation": "'eo' is /i\u02d0.\u0259/ in 'leonine'."
      }
    ]
  },
  {
    "id": "sm-199",
    "targetSound": "/\u00e6/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-open front unrounded vowel /\u00e6/?",
    "options": [
      {
        "word": "plain",
        "isMatch": false,
        "transcription": "/ple\u026an/",
        "explanation": "'ai' is diphthong /e\u026a/ in 'plain'."
      },
      {
        "word": "plait",
        "isMatch": false,
        "transcription": "/pl\u00e6t/",
        "explanation": "Alternative /pl\u00e6t/."
      },
      {
        "word": "plague",
        "isMatch": false,
        "transcription": "/ple\u026a\u0261/",
        "explanation": "'a' is diphthong /e\u026a/ in 'plague'."
      },
      {
        "word": "plaid",
        "isMatch": true,
        "transcription": "/pl\u00e6d/",
        "explanation": "'ai' in 'plaid' is pronounced as short /\u00e6/."
      }
    ]
  },
  {
    "id": "sm-200",
    "targetSound": "/\u0251\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open back unrounded vowel /\u0251\u02d0/?",
    "options": [
      {
        "word": "jerk",
        "isMatch": false,
        "transcription": "/d\u0292\u025c\u02d0k/",
        "explanation": "'er' is /\u025c\u02d0/ in 'jerk'."
      },
      {
        "word": "clergyman",
        "isMatch": false,
        "transcription": "/\u02c8kl\u025c\u02d0.d\u0292i.m\u0259n/",
        "explanation": "'er' is /\u025c\u02d0/ in 'clergyman'."
      },
      {
        "word": "clerk",
        "isMatch": true,
        "transcription": "/kl\u0251\u02d0k/",
        "explanation": "In British English, 'er' in 'clerk' is /\u0251\u02d0/."
      },
      {
        "word": "dark",
        "isMatch": false,
        "transcription": "/d\u0251\u02d0k/",
        "explanation": "Also /\u0251\u02d0/, clerk is standard UTME test word."
      }
    ]
  },
  {
    "id": "sm-201",
    "targetSound": "/\u0252/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open back rounded vowel /\u0252/?",
    "options": [
      {
        "word": "year",
        "isMatch": false,
        "transcription": "/j\u026a\u0259r/",
        "explanation": "'ear' is diphthong /\u026a\u0259/ in 'year'."
      },
      {
        "word": "yacht",
        "isMatch": true,
        "transcription": "/j\u0252t/",
        "explanation": "'ach' in 'yacht' produces the short vowel /\u0252/."
      },
      {
        "word": "yawn",
        "isMatch": false,
        "transcription": "/j\u0254\u02d0n/",
        "explanation": "'aw' is long vowel /\u0254\u02d0/ in 'yawn'."
      },
      {
        "word": "yard",
        "isMatch": false,
        "transcription": "/j\u0251\u02d0d/",
        "explanation": "'ar' is long vowel /\u0251\u02d0/ in 'yard'."
      }
    ]
  },
  {
    "id": "sm-202",
    "targetSound": "/\u0254\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid back rounded vowel /\u0254\u02d0/?",
    "options": [
      {
        "word": "broad",
        "isMatch": true,
        "transcription": "/br\u0254\u02d0d/",
        "explanation": "'oa' in 'broad' is pronounced /\u0254\u02d0/."
      },
      {
        "word": "board",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0d/",
        "explanation": "Both contain /\u0254\u02d0/."
      },
      {
        "word": "boat",
        "isMatch": false,
        "transcription": "/b\u0259\u028at/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'boat'."
      },
      {
        "word": "road",
        "isMatch": false,
        "transcription": "/r\u0259\u028ad/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'road'."
      }
    ]
  },
  {
    "id": "sm-203",
    "targetSound": "/u\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close back rounded vowel /u\u02d0/?",
    "options": [
      {
        "word": "suite",
        "isMatch": false,
        "transcription": "/swi\u02d0t/",
        "explanation": "'suite' is pronounced like 'sweet' /swi\u02d0t/."
      },
      {
        "word": "suit",
        "isMatch": false,
        "transcription": "/su\u02d0t/",
        "explanation": "Match."
      },
      {
        "word": "biscuit",
        "isMatch": false,
        "transcription": "/\u02c8b\u026as.k\u026at/",
        "explanation": "'ui' is /\u026a/ in 'biscuit'."
      },
      {
        "word": "suit",
        "isMatch": true,
        "transcription": "/su\u02d0t/",
        "explanation": "'ui' in 'suit' produces long vowel /u\u02d0/."
      }
    ]
  },
  {
    "id": "sm-204",
    "targetSound": "/\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-back rounded vowel /\u028a/?",
    "options": [
      {
        "word": "cool",
        "isMatch": false,
        "transcription": "/ku\u02d0l/",
        "explanation": "'oo' has long /u\u02d0/."
      },
      {
        "word": "cloud",
        "isMatch": false,
        "transcription": "/kla\u028ad/",
        "explanation": "'ou' has diphthong /a\u028a/."
      },
      {
        "word": "could",
        "isMatch": true,
        "transcription": "/k\u028ad/",
        "explanation": "'oul' produces short rounded vowel /\u028a/ in 'could'."
      },
      {
        "word": "cold",
        "isMatch": false,
        "transcription": "/k\u0259\u028ald/",
        "explanation": "'old' has diphthong /\u0259\u028a/."
      }
    ]
  },
  {
    "id": "sm-205",
    "targetSound": "/\u025c\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid central unrounded vowel /\u025c\u02d0/?",
    "options": [
      {
        "word": "four",
        "isMatch": false,
        "transcription": "/f\u0254\u02d0r/",
        "explanation": "'our' produces long vowel /\u0254\u02d0/ in 'four'."
      },
      {
        "word": "journey",
        "isMatch": true,
        "transcription": "/\u02c8d\u0292\u025c\u02d0.ni/",
        "explanation": "'our' produces long central /\u025c\u02d0/ in 'journey'."
      },
      {
        "word": "tour",
        "isMatch": false,
        "transcription": "/t\u028a\u0259r/",
        "explanation": "'our' produces diphthong /\u028a\u0259/ in 'tour'."
      },
      {
        "word": "sour",
        "isMatch": false,
        "transcription": "/sa\u028a\u0259r/",
        "explanation": "'our' produces triphthong /a\u028a\u0259/ in 'sour'."
      }
    ]
  },
  {
    "id": "sm-206",
    "targetSound": "/\u0259/",
    "soundType": "vowel",
    "prompt": "Which word contains the weak mid-central unrounded vowel (schwa) /\u0259/?",
    "options": [
      {
        "word": "banana",
        "isMatch": true,
        "transcription": "/b\u0259\u02c8n\u0251\u02d0.n\u0259/",
        "explanation": "First and last syllables contain schwa /\u0259/."
      },
      {
        "word": "badger",
        "isMatch": false,
        "transcription": "/\u02c8b\u00e6d\u0292.\u0259r/",
        "explanation": "First syllable has /\u00e6/."
      },
      {
        "word": "bacon",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.k\u0259n/",
        "explanation": "First syllable has /e\u026a/."
      },
      {
        "word": "barter",
        "isMatch": false,
        "transcription": "/\u02c8b\u0251\u02d0.t\u0259r/",
        "explanation": "First syllable has /\u0251\u02d0/."
      }
    ]
  },
  {
    "id": "sm-207",
    "targetSound": "/e\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /e\u026a/?",
    "options": [
      {
        "word": "gouge",
        "isMatch": false,
        "transcription": "/\u0261a\u028ad\u0292/",
        "explanation": "'ou' in 'gouge' is diphthong /a\u028a/."
      },
      {
        "word": "gauze",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0z/",
        "explanation": "'au' in 'gauze' is long /\u0254\u02d0/."
      },
      {
        "word": "gaunt",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0nt/",
        "explanation": "'au' in 'gaunt' is long /\u0254\u02d0/."
      },
      {
        "word": "gauge",
        "isMatch": true,
        "transcription": "/\u0261e\u026ad\u0292/",
        "explanation": "'au' in 'gauge' is pronounced with diphthong /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-208",
    "targetSound": "/a\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u026a/?",
    "options": [
      {
        "word": "freight",
        "isMatch": false,
        "transcription": "/fre\u026at/",
        "explanation": "'eigh' in 'freight' is pronounced /e\u026a/."
      },
      {
        "word": "eight",
        "isMatch": false,
        "transcription": "/e\u026at/",
        "explanation": "'eigh' in 'eight' is pronounced /e\u026a/."
      },
      {
        "word": "height",
        "isMatch": true,
        "transcription": "/ha\u026at/",
        "explanation": "'eigh' in 'height' is pronounced /a\u026a/."
      },
      {
        "word": "weight",
        "isMatch": false,
        "transcription": "/we\u026at/",
        "explanation": "'eigh' in 'weight' is pronounced /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-209",
    "targetSound": "/a\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u028a/?",
    "options": [
      {
        "word": "rough",
        "isMatch": false,
        "transcription": "/r\u028cf/",
        "explanation": "'ough' in 'rough' is /\u028cf/."
      },
      {
        "word": "drought",
        "isMatch": true,
        "transcription": "/dra\u028at/",
        "explanation": "'ough' in 'drought' is pronounced /a\u028a/."
      },
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'ough' in 'dough' is /\u0259\u028a/."
      },
      {
        "word": "bought",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0t/",
        "explanation": "'ough' in 'bought' is /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-210",
    "targetSound": "/\u0259\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /\u0259\u028a/?",
    "options": [
      {
        "word": "sew",
        "isMatch": true,
        "transcription": "/s\u0259\u028a/",
        "explanation": "'ew' in 'sew' is pronounced with diphthong /\u0259\u028a/."
      },
      {
        "word": "few",
        "isMatch": false,
        "transcription": "/fju\u02d0/",
        "explanation": "'ew' in 'few' is /ju\u02d0/."
      },
      {
        "word": "new",
        "isMatch": false,
        "transcription": "/nju\u02d0/",
        "explanation": "'ew' in 'new' is /nju\u02d0/."
      },
      {
        "word": "flew",
        "isMatch": false,
        "transcription": "/flu\u02d0/",
        "explanation": "'ew' in 'flew' is /u\u02d0/."
      }
    ]
  },
  {
    "id": "sm-211",
    "targetSound": "/\u03b8/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless dental fricative /\u03b8/?",
    "options": [
      {
        "word": "tin",
        "isMatch": false,
        "transcription": "/t\u026an/",
        "explanation": "In 'tin', 't' is an alveolar plosive /t/."
      },
      {
        "word": "sin",
        "isMatch": false,
        "transcription": "/s\u026an/",
        "explanation": "In 'sin', 's' is an alveolar fricative /s/."
      },
      {
        "word": "thin",
        "isMatch": true,
        "transcription": "/\u03b8\u026an/",
        "explanation": "In 'thin', 'th' produces the voiceless dental fricative /\u03b8/."
      },
      {
        "word": "then",
        "isMatch": false,
        "transcription": "/\u00f0en/",
        "explanation": "In 'then', 'th' produces the voiced dental fricative /\u00f0/."
      }
    ]
  },
  {
    "id": "sm-212",
    "targetSound": "/\u00f0/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced dental fricative /\u00f0/?",
    "options": [
      {
        "word": "breed",
        "isMatch": false,
        "transcription": "/bri\u02d0d/",
        "explanation": "In 'breed', 'd' is an alveolar plosive /d/."
      },
      {
        "word": "breathe",
        "isMatch": true,
        "transcription": "/bri\u02d0\u00f0/",
        "explanation": "In 'breathe', 'th' produces the voiced sound /\u00f0/."
      },
      {
        "word": "breath",
        "isMatch": false,
        "transcription": "/bre\u03b8/",
        "explanation": "In 'breath', 'th' produces the voiceless sound /\u03b8/."
      },
      {
        "word": "breeze",
        "isMatch": false,
        "transcription": "/bri\u02d0z/",
        "explanation": "In 'breeze', 'z' is an alveolar fricative /z/."
      }
    ]
  },
  {
    "id": "sm-213",
    "targetSound": "/\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar fricative /\u0283/?",
    "options": [
      {
        "word": "chef",
        "isMatch": true,
        "transcription": "/\u0283ef/",
        "explanation": "French loanword 'chef' uses 'ch' to produce /\u0283/."
      },
      {
        "word": "chief",
        "isMatch": false,
        "transcription": "/t\u0283i\u02d0f/",
        "explanation": "'chief' uses the affricate /t\u0283/."
      },
      {
        "word": "chemist",
        "isMatch": false,
        "transcription": "/\u02c8kem.\u026ast/",
        "explanation": "'chemist' uses the velar plosive /k/."
      },
      {
        "word": "chair",
        "isMatch": false,
        "transcription": "/t\u0283e\u0259r/",
        "explanation": "'chair' uses the affricate /t\u0283/."
      }
    ]
  },
  {
    "id": "sm-214",
    "targetSound": "/t\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar affricate /t\u0283/?",
    "options": [
      {
        "word": "nation",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'nation'."
      },
      {
        "word": "native",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.t\u026av/",
        "explanation": "'t' produces /t/ in 'native'."
      },
      {
        "word": "station",
        "isMatch": false,
        "transcription": "/\u02c8ste\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'station'."
      },
      {
        "word": "nature",
        "isMatch": true,
        "transcription": "/\u02c8ne\u026a.t\u0283\u0259r/",
        "explanation": "'t' before '-ure' produces /t\u0283/ in 'nature'."
      }
    ]
  },
  {
    "id": "sm-215",
    "targetSound": "/\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar fricative /\u0292/?",
    "options": [
      {
        "word": "ensure",
        "isMatch": false,
        "transcription": "/\u026an\u02c8\u0283\u0254\u02d0r/",
        "explanation": "'s' produces /\u0283/ in 'ensure'."
      },
      {
        "word": "major",
        "isMatch": false,
        "transcription": "/\u02c8me\u026a.d\u0292\u0259r/",
        "explanation": "'j' produces affricate /d\u0292/ in 'major'."
      },
      {
        "word": "measure",
        "isMatch": true,
        "transcription": "/\u02c8me\u0292.\u0259r/",
        "explanation": "'s' before '-ure' produces /\u0292/ in 'measure'."
      },
      {
        "word": "pressure",
        "isMatch": false,
        "transcription": "/\u02c8pre\u0283.\u0259r/",
        "explanation": "'ss' produces voiceless /\u0283/ in 'pressure'."
      }
    ]
  },
  {
    "id": "sm-216",
    "targetSound": "/d\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar affricate /d\u0292/?",
    "options": [
      {
        "word": "solemn",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u0259m/",
        "explanation": "'n' is silent, no affricate."
      },
      {
        "word": "soldier",
        "isMatch": true,
        "transcription": "/\u02c8s\u0259\u028al.d\u0292\u0259r/",
        "explanation": "'di' produces the affricate /d\u0292/ in 'soldier'."
      },
      {
        "word": "solid",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u026ad/",
        "explanation": "'d' produces simple plosive /d/."
      },
      {
        "word": "shoulder",
        "isMatch": false,
        "transcription": "/\u02c8\u0283\u0259\u028al.d\u0259r/",
        "explanation": "'d' produces plosive /d/."
      }
    ]
  },
  {
    "id": "sm-217",
    "targetSound": "/\u014b/",
    "soundType": "consonant",
    "prompt": "Which word contains the velar nasal /\u014b/?",
    "options": [
      {
        "word": "rank",
        "isMatch": true,
        "transcription": "/r\u00e6\u014bk/",
        "explanation": "'n' before 'k' assimilates to velar nasal /\u014b/."
      },
      {
        "word": "rain",
        "isMatch": false,
        "transcription": "/re\u026an/",
        "explanation": "'n' is alveolar nasal /n/ in 'rain'."
      },
      {
        "word": "range",
        "isMatch": false,
        "transcription": "/re\u026and\u0292/",
        "explanation": "'n' is followed by affricate /d\u0292/."
      },
      {
        "word": "ran",
        "isMatch": false,
        "transcription": "/r\u00e6n/",
        "explanation": "'n' is alveolar nasal /n/."
      }
    ]
  },
  {
    "id": "sm-218",
    "targetSound": "/f/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless labiodental fricative /f/?",
    "options": [
      {
        "word": "though",
        "isMatch": false,
        "transcription": "/\u00f0\u0259\u028a/",
        "explanation": "'gh' is silent in 'though'."
      },
      {
        "word": "through",
        "isMatch": false,
        "transcription": "/\u03b8ru\u02d0/",
        "explanation": "'gh' is silent in 'through'."
      },
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'gh' is silent in 'dough'."
      },
      {
        "word": "laugh",
        "isMatch": true,
        "transcription": "/l\u0251\u02d0f/",
        "explanation": "'gh' produces /f/ in 'laugh'."
      }
    ]
  },
  {
    "id": "sm-219",
    "targetSound": "/v/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced labiodental fricative /v/?",
    "options": [
      {
        "word": "often",
        "isMatch": false,
        "transcription": "/\u02c8\u0252f.n/",
        "explanation": "'f' produces voiceless /f/."
      },
      {
        "word": "orphan",
        "isMatch": false,
        "transcription": "/\u02c8\u0254\u02d0.f\u0259n/",
        "explanation": "'ph' produces voiceless /f/."
      },
      {
        "word": "of",
        "isMatch": true,
        "transcription": "/\u0259v/",
        "explanation": "'f' is pronounced /v/ in the preposition 'of'."
      },
      {
        "word": "off",
        "isMatch": false,
        "transcription": "/\u0252f/",
        "explanation": "'ff' produces voiceless /f/ in 'off'."
      }
    ]
  },
  {
    "id": "sm-220",
    "targetSound": "/k/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless velar plosive /k/?",
    "options": [
      {
        "word": "storage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0254\u02d0.r\u026ad\u0292/",
        "explanation": "Contains rhotic /r/."
      },
      {
        "word": "stomach",
        "isMatch": true,
        "transcription": "/\u02c8st\u028cm.\u0259k/",
        "explanation": "'ch' is pronounced /k/ in Greek loanword 'stomach'."
      },
      {
        "word": "stoppage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252p.\u026ad\u0292/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "stomping",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252m.p\u026a\u014b/",
        "explanation": "Contains plosive /p/."
      }
    ]
  },
  {
    "id": "sm-221",
    "targetSound": "/s/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless alveolar fricative /s/?",
    "options": [
      {
        "word": "psychology",
        "isMatch": true,
        "transcription": "/sa\u026a\u02c8k\u0252l.\u0259.d\u0292i/",
        "explanation": "Initial 'p' is silent; word begins with /s/."
      },
      {
        "word": "philosophy",
        "isMatch": false,
        "transcription": "/f\u026a\u02c8l\u0252s.\u0259.fi/",
        "explanation": "Initial sound is /f/."
      },
      {
        "word": "physics",
        "isMatch": false,
        "transcription": "/\u02c8f\u026az.\u026aks/",
        "explanation": "Initial sound is /f/."
      },
      {
        "word": "pneumonia",
        "isMatch": false,
        "transcription": "/nju\u02d0\u02c8m\u0259\u028a.ni.\u0259/",
        "explanation": "Initial sound is /n/."
      }
    ]
  },
  {
    "id": "sm-222",
    "targetSound": "/z/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced alveolar fricative /z/?",
    "options": [
      {
        "word": "basic",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.s\u026ak/",
        "explanation": "'s' produces voiceless /s/ in 'basic'."
      },
      {
        "word": "bison",
        "isMatch": false,
        "transcription": "/\u02c8ba\u026a.s\u0259n/",
        "explanation": "'s' produces voiceless /s/."
      },
      {
        "word": "bask",
        "isMatch": false,
        "transcription": "/b\u0251\u02d0sk/",
        "explanation": "'s' produces voiceless /s/."
      },
      {
        "word": "busy",
        "isMatch": true,
        "transcription": "/\u02c8b\u026az.i/",
        "explanation": "'s' between vowels produces /z/ in 'busy'."
      }
    ]
  },
  {
    "id": "sm-223",
    "targetSound": "/j/",
    "soundType": "consonant",
    "prompt": "Which word contains the palatal approximant /j/?",
    "options": [
      {
        "word": "ear",
        "isMatch": false,
        "transcription": "/\u026a\u0259r/",
        "explanation": "'ear' begins with diphthong /\u026a\u0259/."
      },
      {
        "word": "ore",
        "isMatch": false,
        "transcription": "/\u0254\u02d0r/",
        "explanation": "'ore' begins with monophthong /\u0254\u02d0/."
      },
      {
        "word": "ewe",
        "isMatch": true,
        "transcription": "/ju\u02d0/",
        "explanation": "'ewe' is pronounced with palatal approximant /j/ as in 'you'."
      },
      {
        "word": "eye",
        "isMatch": false,
        "transcription": "/a\u026a/",
        "explanation": "'eye' begins with diphthong /a\u026a/."
      }
    ]
  },
  {
    "id": "sm-224",
    "targetSound": "/w/",
    "soundType": "consonant",
    "prompt": "Which word contains the labial-velar approximant /w/?",
    "options": [
      {
        "word": "in",
        "isMatch": false,
        "transcription": "/\u026an/",
        "explanation": "'in' begins with short vowel /\u026a/."
      },
      {
        "word": "one",
        "isMatch": true,
        "transcription": "/w\u028cn/",
        "explanation": "'one' begins with the approximant /w/."
      },
      {
        "word": "on",
        "isMatch": false,
        "transcription": "/\u0252n/",
        "explanation": "'on' begins with vowel /\u0252/."
      },
      {
        "word": "own",
        "isMatch": false,
        "transcription": "/\u0259\u028an/",
        "explanation": "'own' begins with diphthong /\u0259\u028a/."
      }
    ]
  },
  {
    "id": "sm-225",
    "targetSound": "/h/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless glottal fricative /h/?",
    "options": [
      {
        "word": "who",
        "isMatch": true,
        "transcription": "/hu\u02d0/",
        "explanation": "'wh' represents glottal fricative /h/ in 'who'."
      },
      {
        "word": "what",
        "isMatch": false,
        "transcription": "/w\u0252t/",
        "explanation": "'wh' represents /w/ in 'what'."
      },
      {
        "word": "when",
        "isMatch": false,
        "transcription": "/wen/",
        "explanation": "'wh' represents /w/ in 'when'."
      },
      {
        "word": "where",
        "isMatch": false,
        "transcription": "/we\u0259r/",
        "explanation": "'wh' represents /w/ in 'where'."
      }
    ]
  },
  {
    "id": "sm-226",
    "targetSound": "/i\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close front unrounded vowel /i\u02d0/?",
    "options": [
      {
        "word": "play",
        "isMatch": false,
        "transcription": "/ple\u026a/",
        "explanation": "'play' has diphthong /e\u026a/."
      },
      {
        "word": "stay",
        "isMatch": false,
        "transcription": "/ste\u026a/",
        "explanation": "'stay' has diphthong /e\u026a/."
      },
      {
        "word": "guy",
        "isMatch": false,
        "transcription": "/\u0261a\u026a/",
        "explanation": "'guy' has diphthong /a\u026a/."
      },
      {
        "word": "quay",
        "isMatch": true,
        "transcription": "/ki\u02d0/",
        "explanation": "'quay' is pronounced /ki\u02d0/ with long vowel /i\u02d0/."
      }
    ]
  },
  {
    "id": "sm-227",
    "targetSound": "/\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-front unrounded vowel /\u026a/?",
    "options": [
      {
        "word": "wooden",
        "isMatch": false,
        "transcription": "/\u02c8w\u028ad.n/",
        "explanation": "'wooden' has short /\u028a/."
      },
      {
        "word": "womb",
        "isMatch": false,
        "transcription": "/wu\u02d0m/",
        "explanation": "'womb' has long /u\u02d0/."
      },
      {
        "word": "women",
        "isMatch": true,
        "transcription": "/\u02c8w\u026am.\u026an/",
        "explanation": "Plural 'women' has short /\u026a/ in both syllables."
      },
      {
        "word": "woman",
        "isMatch": false,
        "transcription": "/\u02c8w\u028am.\u0259n/",
        "explanation": "Singular 'woman' has short /\u028a/."
      }
    ]
  },
  {
    "id": "sm-228",
    "targetSound": "/e/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open-mid front unrounded vowel /e/?",
    "options": [
      {
        "word": "leonine",
        "isMatch": false,
        "transcription": "/\u02c8li\u02d0.\u0259.na\u026an/",
        "explanation": "'eo' is /i\u02d0.\u0259/ in 'leonine'."
      },
      {
        "word": "leopard",
        "isMatch": true,
        "transcription": "/\u02c8lep.\u0259d/",
        "explanation": "'eo' in 'leopard' is pronounced as short /e/."
      },
      {
        "word": "people",
        "isMatch": false,
        "transcription": "/\u02c8pi\u02d0.pl/",
        "explanation": "'eo' in 'people' is long /i\u02d0/."
      },
      {
        "word": "jeopardy",
        "isMatch": false,
        "transcription": "/\u02c8d\u0292ep.\u0259.di/",
        "explanation": "Also has /e/ but leopard is target."
      }
    ]
  },
  {
    "id": "sm-229",
    "targetSound": "/\u00e6/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-open front unrounded vowel /\u00e6/?",
    "options": [
      {
        "word": "plaid",
        "isMatch": true,
        "transcription": "/pl\u00e6d/",
        "explanation": "'ai' in 'plaid' is pronounced as short /\u00e6/."
      },
      {
        "word": "plain",
        "isMatch": false,
        "transcription": "/ple\u026an/",
        "explanation": "'ai' is diphthong /e\u026a/ in 'plain'."
      },
      {
        "word": "plait",
        "isMatch": false,
        "transcription": "/pl\u00e6t/",
        "explanation": "Alternative /pl\u00e6t/."
      },
      {
        "word": "plague",
        "isMatch": false,
        "transcription": "/ple\u026a\u0261/",
        "explanation": "'a' is diphthong /e\u026a/ in 'plague'."
      }
    ]
  },
  {
    "id": "sm-230",
    "targetSound": "/\u0251\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open back unrounded vowel /\u0251\u02d0/?",
    "options": [
      {
        "word": "dark",
        "isMatch": false,
        "transcription": "/d\u0251\u02d0k/",
        "explanation": "Also /\u0251\u02d0/, clerk is standard UTME test word."
      },
      {
        "word": "jerk",
        "isMatch": false,
        "transcription": "/d\u0292\u025c\u02d0k/",
        "explanation": "'er' is /\u025c\u02d0/ in 'jerk'."
      },
      {
        "word": "clergyman",
        "isMatch": false,
        "transcription": "/\u02c8kl\u025c\u02d0.d\u0292i.m\u0259n/",
        "explanation": "'er' is /\u025c\u02d0/ in 'clergyman'."
      },
      {
        "word": "clerk",
        "isMatch": true,
        "transcription": "/kl\u0251\u02d0k/",
        "explanation": "In British English, 'er' in 'clerk' is /\u0251\u02d0/."
      }
    ]
  },
  {
    "id": "sm-231",
    "targetSound": "/\u0252/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open back rounded vowel /\u0252/?",
    "options": [
      {
        "word": "yard",
        "isMatch": false,
        "transcription": "/j\u0251\u02d0d/",
        "explanation": "'ar' is long vowel /\u0251\u02d0/ in 'yard'."
      },
      {
        "word": "year",
        "isMatch": false,
        "transcription": "/j\u026a\u0259r/",
        "explanation": "'ear' is diphthong /\u026a\u0259/ in 'year'."
      },
      {
        "word": "yacht",
        "isMatch": true,
        "transcription": "/j\u0252t/",
        "explanation": "'ach' in 'yacht' produces the short vowel /\u0252/."
      },
      {
        "word": "yawn",
        "isMatch": false,
        "transcription": "/j\u0254\u02d0n/",
        "explanation": "'aw' is long vowel /\u0254\u02d0/ in 'yawn'."
      }
    ]
  },
  {
    "id": "sm-232",
    "targetSound": "/\u0254\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid back rounded vowel /\u0254\u02d0/?",
    "options": [
      {
        "word": "road",
        "isMatch": false,
        "transcription": "/r\u0259\u028ad/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'road'."
      },
      {
        "word": "broad",
        "isMatch": true,
        "transcription": "/br\u0254\u02d0d/",
        "explanation": "'oa' in 'broad' is pronounced /\u0254\u02d0/."
      },
      {
        "word": "board",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0d/",
        "explanation": "Both contain /\u0254\u02d0/."
      },
      {
        "word": "boat",
        "isMatch": false,
        "transcription": "/b\u0259\u028at/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'boat'."
      }
    ]
  },
  {
    "id": "sm-233",
    "targetSound": "/u\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close back rounded vowel /u\u02d0/?",
    "options": [
      {
        "word": "suit",
        "isMatch": true,
        "transcription": "/su\u02d0t/",
        "explanation": "'ui' in 'suit' produces long vowel /u\u02d0/."
      },
      {
        "word": "suite",
        "isMatch": false,
        "transcription": "/swi\u02d0t/",
        "explanation": "'suite' is pronounced like 'sweet' /swi\u02d0t/."
      },
      {
        "word": "suit",
        "isMatch": false,
        "transcription": "/su\u02d0t/",
        "explanation": "Match."
      },
      {
        "word": "biscuit",
        "isMatch": false,
        "transcription": "/\u02c8b\u026as.k\u026at/",
        "explanation": "'ui' is /\u026a/ in 'biscuit'."
      }
    ]
  },
  {
    "id": "sm-234",
    "targetSound": "/\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-back rounded vowel /\u028a/?",
    "options": [
      {
        "word": "cold",
        "isMatch": false,
        "transcription": "/k\u0259\u028ald/",
        "explanation": "'old' has diphthong /\u0259\u028a/."
      },
      {
        "word": "cool",
        "isMatch": false,
        "transcription": "/ku\u02d0l/",
        "explanation": "'oo' has long /u\u02d0/."
      },
      {
        "word": "cloud",
        "isMatch": false,
        "transcription": "/kla\u028ad/",
        "explanation": "'ou' has diphthong /a\u028a/."
      },
      {
        "word": "could",
        "isMatch": true,
        "transcription": "/k\u028ad/",
        "explanation": "'oul' produces short rounded vowel /\u028a/ in 'could'."
      }
    ]
  },
  {
    "id": "sm-235",
    "targetSound": "/\u025c\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid central unrounded vowel /\u025c\u02d0/?",
    "options": [
      {
        "word": "sour",
        "isMatch": false,
        "transcription": "/sa\u028a\u0259r/",
        "explanation": "'our' produces triphthong /a\u028a\u0259/ in 'sour'."
      },
      {
        "word": "four",
        "isMatch": false,
        "transcription": "/f\u0254\u02d0r/",
        "explanation": "'our' produces long vowel /\u0254\u02d0/ in 'four'."
      },
      {
        "word": "journey",
        "isMatch": true,
        "transcription": "/\u02c8d\u0292\u025c\u02d0.ni/",
        "explanation": "'our' produces long central /\u025c\u02d0/ in 'journey'."
      },
      {
        "word": "tour",
        "isMatch": false,
        "transcription": "/t\u028a\u0259r/",
        "explanation": "'our' produces diphthong /\u028a\u0259/ in 'tour'."
      }
    ]
  },
  {
    "id": "sm-236",
    "targetSound": "/\u0259/",
    "soundType": "vowel",
    "prompt": "Which word contains the weak mid-central unrounded vowel (schwa) /\u0259/?",
    "options": [
      {
        "word": "barter",
        "isMatch": false,
        "transcription": "/\u02c8b\u0251\u02d0.t\u0259r/",
        "explanation": "First syllable has /\u0251\u02d0/."
      },
      {
        "word": "banana",
        "isMatch": true,
        "transcription": "/b\u0259\u02c8n\u0251\u02d0.n\u0259/",
        "explanation": "First and last syllables contain schwa /\u0259/."
      },
      {
        "word": "badger",
        "isMatch": false,
        "transcription": "/\u02c8b\u00e6d\u0292.\u0259r/",
        "explanation": "First syllable has /\u00e6/."
      },
      {
        "word": "bacon",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.k\u0259n/",
        "explanation": "First syllable has /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-237",
    "targetSound": "/e\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /e\u026a/?",
    "options": [
      {
        "word": "gauge",
        "isMatch": true,
        "transcription": "/\u0261e\u026ad\u0292/",
        "explanation": "'au' in 'gauge' is pronounced with diphthong /e\u026a/."
      },
      {
        "word": "gouge",
        "isMatch": false,
        "transcription": "/\u0261a\u028ad\u0292/",
        "explanation": "'ou' in 'gouge' is diphthong /a\u028a/."
      },
      {
        "word": "gauze",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0z/",
        "explanation": "'au' in 'gauze' is long /\u0254\u02d0/."
      },
      {
        "word": "gaunt",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0nt/",
        "explanation": "'au' in 'gaunt' is long /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-238",
    "targetSound": "/a\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u026a/?",
    "options": [
      {
        "word": "weight",
        "isMatch": false,
        "transcription": "/we\u026at/",
        "explanation": "'eigh' in 'weight' is pronounced /e\u026a/."
      },
      {
        "word": "freight",
        "isMatch": false,
        "transcription": "/fre\u026at/",
        "explanation": "'eigh' in 'freight' is pronounced /e\u026a/."
      },
      {
        "word": "eight",
        "isMatch": false,
        "transcription": "/e\u026at/",
        "explanation": "'eigh' in 'eight' is pronounced /e\u026a/."
      },
      {
        "word": "height",
        "isMatch": true,
        "transcription": "/ha\u026at/",
        "explanation": "'eigh' in 'height' is pronounced /a\u026a/."
      }
    ]
  },
  {
    "id": "sm-239",
    "targetSound": "/a\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u028a/?",
    "options": [
      {
        "word": "bought",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0t/",
        "explanation": "'ough' in 'bought' is /\u0254\u02d0/."
      },
      {
        "word": "rough",
        "isMatch": false,
        "transcription": "/r\u028cf/",
        "explanation": "'ough' in 'rough' is /\u028cf/."
      },
      {
        "word": "drought",
        "isMatch": true,
        "transcription": "/dra\u028at/",
        "explanation": "'ough' in 'drought' is pronounced /a\u028a/."
      },
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'ough' in 'dough' is /\u0259\u028a/."
      }
    ]
  },
  {
    "id": "sm-240",
    "targetSound": "/\u0259\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /\u0259\u028a/?",
    "options": [
      {
        "word": "flew",
        "isMatch": false,
        "transcription": "/flu\u02d0/",
        "explanation": "'ew' in 'flew' is /u\u02d0/."
      },
      {
        "word": "sew",
        "isMatch": true,
        "transcription": "/s\u0259\u028a/",
        "explanation": "'ew' in 'sew' is pronounced with diphthong /\u0259\u028a/."
      },
      {
        "word": "few",
        "isMatch": false,
        "transcription": "/fju\u02d0/",
        "explanation": "'ew' in 'few' is /ju\u02d0/."
      },
      {
        "word": "new",
        "isMatch": false,
        "transcription": "/nju\u02d0/",
        "explanation": "'ew' in 'new' is /nju\u02d0/."
      }
    ]
  },
  {
    "id": "sm-241",
    "targetSound": "/\u03b8/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless dental fricative /\u03b8/?",
    "options": [
      {
        "word": "then",
        "isMatch": false,
        "transcription": "/\u00f0en/",
        "explanation": "In 'then', 'th' produces the voiced dental fricative /\u00f0/."
      },
      {
        "word": "tin",
        "isMatch": false,
        "transcription": "/t\u026an/",
        "explanation": "In 'tin', 't' is an alveolar plosive /t/."
      },
      {
        "word": "sin",
        "isMatch": false,
        "transcription": "/s\u026an/",
        "explanation": "In 'sin', 's' is an alveolar fricative /s/."
      },
      {
        "word": "thin",
        "isMatch": true,
        "transcription": "/\u03b8\u026an/",
        "explanation": "In 'thin', 'th' produces the voiceless dental fricative /\u03b8/."
      }
    ]
  },
  {
    "id": "sm-242",
    "targetSound": "/\u00f0/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced dental fricative /\u00f0/?",
    "options": [
      {
        "word": "breeze",
        "isMatch": false,
        "transcription": "/bri\u02d0z/",
        "explanation": "In 'breeze', 'z' is an alveolar fricative /z/."
      },
      {
        "word": "breed",
        "isMatch": false,
        "transcription": "/bri\u02d0d/",
        "explanation": "In 'breed', 'd' is an alveolar plosive /d/."
      },
      {
        "word": "breathe",
        "isMatch": true,
        "transcription": "/bri\u02d0\u00f0/",
        "explanation": "In 'breathe', 'th' produces the voiced sound /\u00f0/."
      },
      {
        "word": "breath",
        "isMatch": false,
        "transcription": "/bre\u03b8/",
        "explanation": "In 'breath', 'th' produces the voiceless sound /\u03b8/."
      }
    ]
  },
  {
    "id": "sm-243",
    "targetSound": "/\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar fricative /\u0283/?",
    "options": [
      {
        "word": "chair",
        "isMatch": false,
        "transcription": "/t\u0283e\u0259r/",
        "explanation": "'chair' uses the affricate /t\u0283/."
      },
      {
        "word": "chef",
        "isMatch": true,
        "transcription": "/\u0283ef/",
        "explanation": "French loanword 'chef' uses 'ch' to produce /\u0283/."
      },
      {
        "word": "chief",
        "isMatch": false,
        "transcription": "/t\u0283i\u02d0f/",
        "explanation": "'chief' uses the affricate /t\u0283/."
      },
      {
        "word": "chemist",
        "isMatch": false,
        "transcription": "/\u02c8kem.\u026ast/",
        "explanation": "'chemist' uses the velar plosive /k/."
      }
    ]
  },
  {
    "id": "sm-244",
    "targetSound": "/t\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar affricate /t\u0283/?",
    "options": [
      {
        "word": "nature",
        "isMatch": true,
        "transcription": "/\u02c8ne\u026a.t\u0283\u0259r/",
        "explanation": "'t' before '-ure' produces /t\u0283/ in 'nature'."
      },
      {
        "word": "nation",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'nation'."
      },
      {
        "word": "native",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.t\u026av/",
        "explanation": "'t' produces /t/ in 'native'."
      },
      {
        "word": "station",
        "isMatch": false,
        "transcription": "/\u02c8ste\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'station'."
      }
    ]
  },
  {
    "id": "sm-245",
    "targetSound": "/\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar fricative /\u0292/?",
    "options": [
      {
        "word": "pressure",
        "isMatch": false,
        "transcription": "/\u02c8pre\u0283.\u0259r/",
        "explanation": "'ss' produces voiceless /\u0283/ in 'pressure'."
      },
      {
        "word": "ensure",
        "isMatch": false,
        "transcription": "/\u026an\u02c8\u0283\u0254\u02d0r/",
        "explanation": "'s' produces /\u0283/ in 'ensure'."
      },
      {
        "word": "major",
        "isMatch": false,
        "transcription": "/\u02c8me\u026a.d\u0292\u0259r/",
        "explanation": "'j' produces affricate /d\u0292/ in 'major'."
      },
      {
        "word": "measure",
        "isMatch": true,
        "transcription": "/\u02c8me\u0292.\u0259r/",
        "explanation": "'s' before '-ure' produces /\u0292/ in 'measure'."
      }
    ]
  },
  {
    "id": "sm-246",
    "targetSound": "/d\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar affricate /d\u0292/?",
    "options": [
      {
        "word": "shoulder",
        "isMatch": false,
        "transcription": "/\u02c8\u0283\u0259\u028al.d\u0259r/",
        "explanation": "'d' produces plosive /d/."
      },
      {
        "word": "solemn",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u0259m/",
        "explanation": "'n' is silent, no affricate."
      },
      {
        "word": "soldier",
        "isMatch": true,
        "transcription": "/\u02c8s\u0259\u028al.d\u0292\u0259r/",
        "explanation": "'di' produces the affricate /d\u0292/ in 'soldier'."
      },
      {
        "word": "solid",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u026ad/",
        "explanation": "'d' produces simple plosive /d/."
      }
    ]
  },
  {
    "id": "sm-247",
    "targetSound": "/\u014b/",
    "soundType": "consonant",
    "prompt": "Which word contains the velar nasal /\u014b/?",
    "options": [
      {
        "word": "ran",
        "isMatch": false,
        "transcription": "/r\u00e6n/",
        "explanation": "'n' is alveolar nasal /n/."
      },
      {
        "word": "rank",
        "isMatch": true,
        "transcription": "/r\u00e6\u014bk/",
        "explanation": "'n' before 'k' assimilates to velar nasal /\u014b/."
      },
      {
        "word": "rain",
        "isMatch": false,
        "transcription": "/re\u026an/",
        "explanation": "'n' is alveolar nasal /n/ in 'rain'."
      },
      {
        "word": "range",
        "isMatch": false,
        "transcription": "/re\u026and\u0292/",
        "explanation": "'n' is followed by affricate /d\u0292/."
      }
    ]
  },
  {
    "id": "sm-248",
    "targetSound": "/f/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless labiodental fricative /f/?",
    "options": [
      {
        "word": "laugh",
        "isMatch": true,
        "transcription": "/l\u0251\u02d0f/",
        "explanation": "'gh' produces /f/ in 'laugh'."
      },
      {
        "word": "though",
        "isMatch": false,
        "transcription": "/\u00f0\u0259\u028a/",
        "explanation": "'gh' is silent in 'though'."
      },
      {
        "word": "through",
        "isMatch": false,
        "transcription": "/\u03b8ru\u02d0/",
        "explanation": "'gh' is silent in 'through'."
      },
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'gh' is silent in 'dough'."
      }
    ]
  },
  {
    "id": "sm-249",
    "targetSound": "/v/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced labiodental fricative /v/?",
    "options": [
      {
        "word": "off",
        "isMatch": false,
        "transcription": "/\u0252f/",
        "explanation": "'ff' produces voiceless /f/ in 'off'."
      },
      {
        "word": "often",
        "isMatch": false,
        "transcription": "/\u02c8\u0252f.n/",
        "explanation": "'f' produces voiceless /f/."
      },
      {
        "word": "orphan",
        "isMatch": false,
        "transcription": "/\u02c8\u0254\u02d0.f\u0259n/",
        "explanation": "'ph' produces voiceless /f/."
      },
      {
        "word": "of",
        "isMatch": true,
        "transcription": "/\u0259v/",
        "explanation": "'f' is pronounced /v/ in the preposition 'of'."
      }
    ]
  },
  {
    "id": "sm-250",
    "targetSound": "/k/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless velar plosive /k/?",
    "options": [
      {
        "word": "stomping",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252m.p\u026a\u014b/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "storage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0254\u02d0.r\u026ad\u0292/",
        "explanation": "Contains rhotic /r/."
      },
      {
        "word": "stomach",
        "isMatch": true,
        "transcription": "/\u02c8st\u028cm.\u0259k/",
        "explanation": "'ch' is pronounced /k/ in Greek loanword 'stomach'."
      },
      {
        "word": "stoppage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252p.\u026ad\u0292/",
        "explanation": "Contains plosive /p/."
      }
    ]
  },
  {
    "id": "sm-251",
    "targetSound": "/s/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless alveolar fricative /s/?",
    "options": [
      {
        "word": "pneumonia",
        "isMatch": false,
        "transcription": "/nju\u02d0\u02c8m\u0259\u028a.ni.\u0259/",
        "explanation": "Initial sound is /n/."
      },
      {
        "word": "psychology",
        "isMatch": true,
        "transcription": "/sa\u026a\u02c8k\u0252l.\u0259.d\u0292i/",
        "explanation": "Initial 'p' is silent; word begins with /s/."
      },
      {
        "word": "philosophy",
        "isMatch": false,
        "transcription": "/f\u026a\u02c8l\u0252s.\u0259.fi/",
        "explanation": "Initial sound is /f/."
      },
      {
        "word": "physics",
        "isMatch": false,
        "transcription": "/\u02c8f\u026az.\u026aks/",
        "explanation": "Initial sound is /f/."
      }
    ]
  },
  {
    "id": "sm-252",
    "targetSound": "/z/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced alveolar fricative /z/?",
    "options": [
      {
        "word": "busy",
        "isMatch": true,
        "transcription": "/\u02c8b\u026az.i/",
        "explanation": "'s' between vowels produces /z/ in 'busy'."
      },
      {
        "word": "basic",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.s\u026ak/",
        "explanation": "'s' produces voiceless /s/ in 'basic'."
      },
      {
        "word": "bison",
        "isMatch": false,
        "transcription": "/\u02c8ba\u026a.s\u0259n/",
        "explanation": "'s' produces voiceless /s/."
      },
      {
        "word": "bask",
        "isMatch": false,
        "transcription": "/b\u0251\u02d0sk/",
        "explanation": "'s' produces voiceless /s/."
      }
    ]
  },
  {
    "id": "sm-253",
    "targetSound": "/j/",
    "soundType": "consonant",
    "prompt": "Which word contains the palatal approximant /j/?",
    "options": [
      {
        "word": "eye",
        "isMatch": false,
        "transcription": "/a\u026a/",
        "explanation": "'eye' begins with diphthong /a\u026a/."
      },
      {
        "word": "ear",
        "isMatch": false,
        "transcription": "/\u026a\u0259r/",
        "explanation": "'ear' begins with diphthong /\u026a\u0259/."
      },
      {
        "word": "ore",
        "isMatch": false,
        "transcription": "/\u0254\u02d0r/",
        "explanation": "'ore' begins with monophthong /\u0254\u02d0/."
      },
      {
        "word": "ewe",
        "isMatch": true,
        "transcription": "/ju\u02d0/",
        "explanation": "'ewe' is pronounced with palatal approximant /j/ as in 'you'."
      }
    ]
  },
  {
    "id": "sm-254",
    "targetSound": "/w/",
    "soundType": "consonant",
    "prompt": "Which word contains the labial-velar approximant /w/?",
    "options": [
      {
        "word": "own",
        "isMatch": false,
        "transcription": "/\u0259\u028an/",
        "explanation": "'own' begins with diphthong /\u0259\u028a/."
      },
      {
        "word": "in",
        "isMatch": false,
        "transcription": "/\u026an/",
        "explanation": "'in' begins with short vowel /\u026a/."
      },
      {
        "word": "one",
        "isMatch": true,
        "transcription": "/w\u028cn/",
        "explanation": "'one' begins with the approximant /w/."
      },
      {
        "word": "on",
        "isMatch": false,
        "transcription": "/\u0252n/",
        "explanation": "'on' begins with vowel /\u0252/."
      }
    ]
  },
  {
    "id": "sm-255",
    "targetSound": "/h/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless glottal fricative /h/?",
    "options": [
      {
        "word": "where",
        "isMatch": false,
        "transcription": "/we\u0259r/",
        "explanation": "'wh' represents /w/ in 'where'."
      },
      {
        "word": "who",
        "isMatch": true,
        "transcription": "/hu\u02d0/",
        "explanation": "'wh' represents glottal fricative /h/ in 'who'."
      },
      {
        "word": "what",
        "isMatch": false,
        "transcription": "/w\u0252t/",
        "explanation": "'wh' represents /w/ in 'what'."
      },
      {
        "word": "when",
        "isMatch": false,
        "transcription": "/wen/",
        "explanation": "'wh' represents /w/ in 'when'."
      }
    ]
  },
  {
    "id": "sm-256",
    "targetSound": "/i\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close front unrounded vowel /i\u02d0/?",
    "options": [
      {
        "word": "quay",
        "isMatch": true,
        "transcription": "/ki\u02d0/",
        "explanation": "'quay' is pronounced /ki\u02d0/ with long vowel /i\u02d0/."
      },
      {
        "word": "play",
        "isMatch": false,
        "transcription": "/ple\u026a/",
        "explanation": "'play' has diphthong /e\u026a/."
      },
      {
        "word": "stay",
        "isMatch": false,
        "transcription": "/ste\u026a/",
        "explanation": "'stay' has diphthong /e\u026a/."
      },
      {
        "word": "guy",
        "isMatch": false,
        "transcription": "/\u0261a\u026a/",
        "explanation": "'guy' has diphthong /a\u026a/."
      }
    ]
  },
  {
    "id": "sm-257",
    "targetSound": "/\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-front unrounded vowel /\u026a/?",
    "options": [
      {
        "word": "woman",
        "isMatch": false,
        "transcription": "/\u02c8w\u028am.\u0259n/",
        "explanation": "Singular 'woman' has short /\u028a/."
      },
      {
        "word": "wooden",
        "isMatch": false,
        "transcription": "/\u02c8w\u028ad.n/",
        "explanation": "'wooden' has short /\u028a/."
      },
      {
        "word": "womb",
        "isMatch": false,
        "transcription": "/wu\u02d0m/",
        "explanation": "'womb' has long /u\u02d0/."
      },
      {
        "word": "women",
        "isMatch": true,
        "transcription": "/\u02c8w\u026am.\u026an/",
        "explanation": "Plural 'women' has short /\u026a/ in both syllables."
      }
    ]
  },
  {
    "id": "sm-258",
    "targetSound": "/e/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open-mid front unrounded vowel /e/?",
    "options": [
      {
        "word": "jeopardy",
        "isMatch": false,
        "transcription": "/\u02c8d\u0292ep.\u0259.di/",
        "explanation": "Also has /e/ but leopard is target."
      },
      {
        "word": "leonine",
        "isMatch": false,
        "transcription": "/\u02c8li\u02d0.\u0259.na\u026an/",
        "explanation": "'eo' is /i\u02d0.\u0259/ in 'leonine'."
      },
      {
        "word": "leopard",
        "isMatch": true,
        "transcription": "/\u02c8lep.\u0259d/",
        "explanation": "'eo' in 'leopard' is pronounced as short /e/."
      },
      {
        "word": "people",
        "isMatch": false,
        "transcription": "/\u02c8pi\u02d0.pl/",
        "explanation": "'eo' in 'people' is long /i\u02d0/."
      }
    ]
  },
  {
    "id": "sm-259",
    "targetSound": "/\u00e6/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-open front unrounded vowel /\u00e6/?",
    "options": [
      {
        "word": "plague",
        "isMatch": false,
        "transcription": "/ple\u026a\u0261/",
        "explanation": "'a' is diphthong /e\u026a/ in 'plague'."
      },
      {
        "word": "plaid",
        "isMatch": true,
        "transcription": "/pl\u00e6d/",
        "explanation": "'ai' in 'plaid' is pronounced as short /\u00e6/."
      },
      {
        "word": "plain",
        "isMatch": false,
        "transcription": "/ple\u026an/",
        "explanation": "'ai' is diphthong /e\u026a/ in 'plain'."
      },
      {
        "word": "plait",
        "isMatch": false,
        "transcription": "/pl\u00e6t/",
        "explanation": "Alternative /pl\u00e6t/."
      }
    ]
  },
  {
    "id": "sm-260",
    "targetSound": "/\u0251\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open back unrounded vowel /\u0251\u02d0/?",
    "options": [
      {
        "word": "clerk",
        "isMatch": true,
        "transcription": "/kl\u0251\u02d0k/",
        "explanation": "In British English, 'er' in 'clerk' is /\u0251\u02d0/."
      },
      {
        "word": "dark",
        "isMatch": false,
        "transcription": "/d\u0251\u02d0k/",
        "explanation": "Also /\u0251\u02d0/, clerk is standard UTME test word."
      },
      {
        "word": "jerk",
        "isMatch": false,
        "transcription": "/d\u0292\u025c\u02d0k/",
        "explanation": "'er' is /\u025c\u02d0/ in 'jerk'."
      },
      {
        "word": "clergyman",
        "isMatch": false,
        "transcription": "/\u02c8kl\u025c\u02d0.d\u0292i.m\u0259n/",
        "explanation": "'er' is /\u025c\u02d0/ in 'clergyman'."
      }
    ]
  },
  {
    "id": "sm-261",
    "targetSound": "/\u0252/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open back rounded vowel /\u0252/?",
    "options": [
      {
        "word": "yawn",
        "isMatch": false,
        "transcription": "/j\u0254\u02d0n/",
        "explanation": "'aw' is long vowel /\u0254\u02d0/ in 'yawn'."
      },
      {
        "word": "yard",
        "isMatch": false,
        "transcription": "/j\u0251\u02d0d/",
        "explanation": "'ar' is long vowel /\u0251\u02d0/ in 'yard'."
      },
      {
        "word": "year",
        "isMatch": false,
        "transcription": "/j\u026a\u0259r/",
        "explanation": "'ear' is diphthong /\u026a\u0259/ in 'year'."
      },
      {
        "word": "yacht",
        "isMatch": true,
        "transcription": "/j\u0252t/",
        "explanation": "'ach' in 'yacht' produces the short vowel /\u0252/."
      }
    ]
  },
  {
    "id": "sm-262",
    "targetSound": "/\u0254\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid back rounded vowel /\u0254\u02d0/?",
    "options": [
      {
        "word": "boat",
        "isMatch": false,
        "transcription": "/b\u0259\u028at/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'boat'."
      },
      {
        "word": "road",
        "isMatch": false,
        "transcription": "/r\u0259\u028ad/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'road'."
      },
      {
        "word": "broad",
        "isMatch": true,
        "transcription": "/br\u0254\u02d0d/",
        "explanation": "'oa' in 'broad' is pronounced /\u0254\u02d0/."
      },
      {
        "word": "board",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0d/",
        "explanation": "Both contain /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-263",
    "targetSound": "/u\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close back rounded vowel /u\u02d0/?",
    "options": [
      {
        "word": "biscuit",
        "isMatch": false,
        "transcription": "/\u02c8b\u026as.k\u026at/",
        "explanation": "'ui' is /\u026a/ in 'biscuit'."
      },
      {
        "word": "suit",
        "isMatch": true,
        "transcription": "/su\u02d0t/",
        "explanation": "'ui' in 'suit' produces long vowel /u\u02d0/."
      },
      {
        "word": "suite",
        "isMatch": false,
        "transcription": "/swi\u02d0t/",
        "explanation": "'suite' is pronounced like 'sweet' /swi\u02d0t/."
      },
      {
        "word": "suit",
        "isMatch": false,
        "transcription": "/su\u02d0t/",
        "explanation": "Match."
      }
    ]
  },
  {
    "id": "sm-264",
    "targetSound": "/\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-back rounded vowel /\u028a/?",
    "options": [
      {
        "word": "could",
        "isMatch": true,
        "transcription": "/k\u028ad/",
        "explanation": "'oul' produces short rounded vowel /\u028a/ in 'could'."
      },
      {
        "word": "cold",
        "isMatch": false,
        "transcription": "/k\u0259\u028ald/",
        "explanation": "'old' has diphthong /\u0259\u028a/."
      },
      {
        "word": "cool",
        "isMatch": false,
        "transcription": "/ku\u02d0l/",
        "explanation": "'oo' has long /u\u02d0/."
      },
      {
        "word": "cloud",
        "isMatch": false,
        "transcription": "/kla\u028ad/",
        "explanation": "'ou' has diphthong /a\u028a/."
      }
    ]
  },
  {
    "id": "sm-265",
    "targetSound": "/\u025c\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid central unrounded vowel /\u025c\u02d0/?",
    "options": [
      {
        "word": "tour",
        "isMatch": false,
        "transcription": "/t\u028a\u0259r/",
        "explanation": "'our' produces diphthong /\u028a\u0259/ in 'tour'."
      },
      {
        "word": "sour",
        "isMatch": false,
        "transcription": "/sa\u028a\u0259r/",
        "explanation": "'our' produces triphthong /a\u028a\u0259/ in 'sour'."
      },
      {
        "word": "four",
        "isMatch": false,
        "transcription": "/f\u0254\u02d0r/",
        "explanation": "'our' produces long vowel /\u0254\u02d0/ in 'four'."
      },
      {
        "word": "journey",
        "isMatch": true,
        "transcription": "/\u02c8d\u0292\u025c\u02d0.ni/",
        "explanation": "'our' produces long central /\u025c\u02d0/ in 'journey'."
      }
    ]
  },
  {
    "id": "sm-266",
    "targetSound": "/\u0259/",
    "soundType": "vowel",
    "prompt": "Which word contains the weak mid-central unrounded vowel (schwa) /\u0259/?",
    "options": [
      {
        "word": "bacon",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.k\u0259n/",
        "explanation": "First syllable has /e\u026a/."
      },
      {
        "word": "barter",
        "isMatch": false,
        "transcription": "/\u02c8b\u0251\u02d0.t\u0259r/",
        "explanation": "First syllable has /\u0251\u02d0/."
      },
      {
        "word": "banana",
        "isMatch": true,
        "transcription": "/b\u0259\u02c8n\u0251\u02d0.n\u0259/",
        "explanation": "First and last syllables contain schwa /\u0259/."
      },
      {
        "word": "badger",
        "isMatch": false,
        "transcription": "/\u02c8b\u00e6d\u0292.\u0259r/",
        "explanation": "First syllable has /\u00e6/."
      }
    ]
  },
  {
    "id": "sm-267",
    "targetSound": "/e\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /e\u026a/?",
    "options": [
      {
        "word": "gaunt",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0nt/",
        "explanation": "'au' in 'gaunt' is long /\u0254\u02d0/."
      },
      {
        "word": "gauge",
        "isMatch": true,
        "transcription": "/\u0261e\u026ad\u0292/",
        "explanation": "'au' in 'gauge' is pronounced with diphthong /e\u026a/."
      },
      {
        "word": "gouge",
        "isMatch": false,
        "transcription": "/\u0261a\u028ad\u0292/",
        "explanation": "'ou' in 'gouge' is diphthong /a\u028a/."
      },
      {
        "word": "gauze",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0z/",
        "explanation": "'au' in 'gauze' is long /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-268",
    "targetSound": "/a\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u026a/?",
    "options": [
      {
        "word": "height",
        "isMatch": true,
        "transcription": "/ha\u026at/",
        "explanation": "'eigh' in 'height' is pronounced /a\u026a/."
      },
      {
        "word": "weight",
        "isMatch": false,
        "transcription": "/we\u026at/",
        "explanation": "'eigh' in 'weight' is pronounced /e\u026a/."
      },
      {
        "word": "freight",
        "isMatch": false,
        "transcription": "/fre\u026at/",
        "explanation": "'eigh' in 'freight' is pronounced /e\u026a/."
      },
      {
        "word": "eight",
        "isMatch": false,
        "transcription": "/e\u026at/",
        "explanation": "'eigh' in 'eight' is pronounced /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-269",
    "targetSound": "/a\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u028a/?",
    "options": [
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'ough' in 'dough' is /\u0259\u028a/."
      },
      {
        "word": "bought",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0t/",
        "explanation": "'ough' in 'bought' is /\u0254\u02d0/."
      },
      {
        "word": "rough",
        "isMatch": false,
        "transcription": "/r\u028cf/",
        "explanation": "'ough' in 'rough' is /\u028cf/."
      },
      {
        "word": "drought",
        "isMatch": true,
        "transcription": "/dra\u028at/",
        "explanation": "'ough' in 'drought' is pronounced /a\u028a/."
      }
    ]
  },
  {
    "id": "sm-270",
    "targetSound": "/\u0259\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /\u0259\u028a/?",
    "options": [
      {
        "word": "new",
        "isMatch": false,
        "transcription": "/nju\u02d0/",
        "explanation": "'ew' in 'new' is /nju\u02d0/."
      },
      {
        "word": "flew",
        "isMatch": false,
        "transcription": "/flu\u02d0/",
        "explanation": "'ew' in 'flew' is /u\u02d0/."
      },
      {
        "word": "sew",
        "isMatch": true,
        "transcription": "/s\u0259\u028a/",
        "explanation": "'ew' in 'sew' is pronounced with diphthong /\u0259\u028a/."
      },
      {
        "word": "few",
        "isMatch": false,
        "transcription": "/fju\u02d0/",
        "explanation": "'ew' in 'few' is /ju\u02d0/."
      }
    ]
  },
  {
    "id": "sm-271",
    "targetSound": "/\u03b8/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless dental fricative /\u03b8/?",
    "options": [
      {
        "word": "thin",
        "isMatch": true,
        "transcription": "/\u03b8\u026an/",
        "explanation": "In 'thin', 'th' produces the voiceless dental fricative /\u03b8/."
      },
      {
        "word": "then",
        "isMatch": false,
        "transcription": "/\u00f0en/",
        "explanation": "In 'then', 'th' produces the voiced dental fricative /\u00f0/."
      },
      {
        "word": "tin",
        "isMatch": false,
        "transcription": "/t\u026an/",
        "explanation": "In 'tin', 't' is an alveolar plosive /t/."
      },
      {
        "word": "sin",
        "isMatch": false,
        "transcription": "/s\u026an/",
        "explanation": "In 'sin', 's' is an alveolar fricative /s/."
      }
    ]
  },
  {
    "id": "sm-272",
    "targetSound": "/\u00f0/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced dental fricative /\u00f0/?",
    "options": [
      {
        "word": "breath",
        "isMatch": false,
        "transcription": "/bre\u03b8/",
        "explanation": "In 'breath', 'th' produces the voiceless sound /\u03b8/."
      },
      {
        "word": "breeze",
        "isMatch": false,
        "transcription": "/bri\u02d0z/",
        "explanation": "In 'breeze', 'z' is an alveolar fricative /z/."
      },
      {
        "word": "breed",
        "isMatch": false,
        "transcription": "/bri\u02d0d/",
        "explanation": "In 'breed', 'd' is an alveolar plosive /d/."
      },
      {
        "word": "breathe",
        "isMatch": true,
        "transcription": "/bri\u02d0\u00f0/",
        "explanation": "In 'breathe', 'th' produces the voiced sound /\u00f0/."
      }
    ]
  },
  {
    "id": "sm-273",
    "targetSound": "/\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar fricative /\u0283/?",
    "options": [
      {
        "word": "chemist",
        "isMatch": false,
        "transcription": "/\u02c8kem.\u026ast/",
        "explanation": "'chemist' uses the velar plosive /k/."
      },
      {
        "word": "chair",
        "isMatch": false,
        "transcription": "/t\u0283e\u0259r/",
        "explanation": "'chair' uses the affricate /t\u0283/."
      },
      {
        "word": "chef",
        "isMatch": true,
        "transcription": "/\u0283ef/",
        "explanation": "French loanword 'chef' uses 'ch' to produce /\u0283/."
      },
      {
        "word": "chief",
        "isMatch": false,
        "transcription": "/t\u0283i\u02d0f/",
        "explanation": "'chief' uses the affricate /t\u0283/."
      }
    ]
  },
  {
    "id": "sm-274",
    "targetSound": "/t\u0283/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless palato-alveolar affricate /t\u0283/?",
    "options": [
      {
        "word": "station",
        "isMatch": false,
        "transcription": "/\u02c8ste\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'station'."
      },
      {
        "word": "nature",
        "isMatch": true,
        "transcription": "/\u02c8ne\u026a.t\u0283\u0259r/",
        "explanation": "'t' before '-ure' produces /t\u0283/ in 'nature'."
      },
      {
        "word": "nation",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.\u0283n/",
        "explanation": "'t' produces /\u0283/ in 'nation'."
      },
      {
        "word": "native",
        "isMatch": false,
        "transcription": "/\u02c8ne\u026a.t\u026av/",
        "explanation": "'t' produces /t/ in 'native'."
      }
    ]
  },
  {
    "id": "sm-275",
    "targetSound": "/\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar fricative /\u0292/?",
    "options": [
      {
        "word": "measure",
        "isMatch": true,
        "transcription": "/\u02c8me\u0292.\u0259r/",
        "explanation": "'s' before '-ure' produces /\u0292/ in 'measure'."
      },
      {
        "word": "pressure",
        "isMatch": false,
        "transcription": "/\u02c8pre\u0283.\u0259r/",
        "explanation": "'ss' produces voiceless /\u0283/ in 'pressure'."
      },
      {
        "word": "ensure",
        "isMatch": false,
        "transcription": "/\u026an\u02c8\u0283\u0254\u02d0r/",
        "explanation": "'s' produces /\u0283/ in 'ensure'."
      },
      {
        "word": "major",
        "isMatch": false,
        "transcription": "/\u02c8me\u026a.d\u0292\u0259r/",
        "explanation": "'j' produces affricate /d\u0292/ in 'major'."
      }
    ]
  },
  {
    "id": "sm-276",
    "targetSound": "/d\u0292/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced palato-alveolar affricate /d\u0292/?",
    "options": [
      {
        "word": "solid",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u026ad/",
        "explanation": "'d' produces simple plosive /d/."
      },
      {
        "word": "shoulder",
        "isMatch": false,
        "transcription": "/\u02c8\u0283\u0259\u028al.d\u0259r/",
        "explanation": "'d' produces plosive /d/."
      },
      {
        "word": "solemn",
        "isMatch": false,
        "transcription": "/\u02c8s\u0252l.\u0259m/",
        "explanation": "'n' is silent, no affricate."
      },
      {
        "word": "soldier",
        "isMatch": true,
        "transcription": "/\u02c8s\u0259\u028al.d\u0292\u0259r/",
        "explanation": "'di' produces the affricate /d\u0292/ in 'soldier'."
      }
    ]
  },
  {
    "id": "sm-277",
    "targetSound": "/\u014b/",
    "soundType": "consonant",
    "prompt": "Which word contains the velar nasal /\u014b/?",
    "options": [
      {
        "word": "range",
        "isMatch": false,
        "transcription": "/re\u026and\u0292/",
        "explanation": "'n' is followed by affricate /d\u0292/."
      },
      {
        "word": "ran",
        "isMatch": false,
        "transcription": "/r\u00e6n/",
        "explanation": "'n' is alveolar nasal /n/."
      },
      {
        "word": "rank",
        "isMatch": true,
        "transcription": "/r\u00e6\u014bk/",
        "explanation": "'n' before 'k' assimilates to velar nasal /\u014b/."
      },
      {
        "word": "rain",
        "isMatch": false,
        "transcription": "/re\u026an/",
        "explanation": "'n' is alveolar nasal /n/ in 'rain'."
      }
    ]
  },
  {
    "id": "sm-278",
    "targetSound": "/f/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless labiodental fricative /f/?",
    "options": [
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'gh' is silent in 'dough'."
      },
      {
        "word": "laugh",
        "isMatch": true,
        "transcription": "/l\u0251\u02d0f/",
        "explanation": "'gh' produces /f/ in 'laugh'."
      },
      {
        "word": "though",
        "isMatch": false,
        "transcription": "/\u00f0\u0259\u028a/",
        "explanation": "'gh' is silent in 'though'."
      },
      {
        "word": "through",
        "isMatch": false,
        "transcription": "/\u03b8ru\u02d0/",
        "explanation": "'gh' is silent in 'through'."
      }
    ]
  },
  {
    "id": "sm-279",
    "targetSound": "/v/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced labiodental fricative /v/?",
    "options": [
      {
        "word": "of",
        "isMatch": true,
        "transcription": "/\u0259v/",
        "explanation": "'f' is pronounced /v/ in the preposition 'of'."
      },
      {
        "word": "off",
        "isMatch": false,
        "transcription": "/\u0252f/",
        "explanation": "'ff' produces voiceless /f/ in 'off'."
      },
      {
        "word": "often",
        "isMatch": false,
        "transcription": "/\u02c8\u0252f.n/",
        "explanation": "'f' produces voiceless /f/."
      },
      {
        "word": "orphan",
        "isMatch": false,
        "transcription": "/\u02c8\u0254\u02d0.f\u0259n/",
        "explanation": "'ph' produces voiceless /f/."
      }
    ]
  },
  {
    "id": "sm-280",
    "targetSound": "/k/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless velar plosive /k/?",
    "options": [
      {
        "word": "stoppage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252p.\u026ad\u0292/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "stomping",
        "isMatch": false,
        "transcription": "/\u02c8st\u0252m.p\u026a\u014b/",
        "explanation": "Contains plosive /p/."
      },
      {
        "word": "storage",
        "isMatch": false,
        "transcription": "/\u02c8st\u0254\u02d0.r\u026ad\u0292/",
        "explanation": "Contains rhotic /r/."
      },
      {
        "word": "stomach",
        "isMatch": true,
        "transcription": "/\u02c8st\u028cm.\u0259k/",
        "explanation": "'ch' is pronounced /k/ in Greek loanword 'stomach'."
      }
    ]
  },
  {
    "id": "sm-281",
    "targetSound": "/s/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless alveolar fricative /s/?",
    "options": [
      {
        "word": "physics",
        "isMatch": false,
        "transcription": "/\u02c8f\u026az.\u026aks/",
        "explanation": "Initial sound is /f/."
      },
      {
        "word": "pneumonia",
        "isMatch": false,
        "transcription": "/nju\u02d0\u02c8m\u0259\u028a.ni.\u0259/",
        "explanation": "Initial sound is /n/."
      },
      {
        "word": "psychology",
        "isMatch": true,
        "transcription": "/sa\u026a\u02c8k\u0252l.\u0259.d\u0292i/",
        "explanation": "Initial 'p' is silent; word begins with /s/."
      },
      {
        "word": "philosophy",
        "isMatch": false,
        "transcription": "/f\u026a\u02c8l\u0252s.\u0259.fi/",
        "explanation": "Initial sound is /f/."
      }
    ]
  },
  {
    "id": "sm-282",
    "targetSound": "/z/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiced alveolar fricative /z/?",
    "options": [
      {
        "word": "bask",
        "isMatch": false,
        "transcription": "/b\u0251\u02d0sk/",
        "explanation": "'s' produces voiceless /s/."
      },
      {
        "word": "busy",
        "isMatch": true,
        "transcription": "/\u02c8b\u026az.i/",
        "explanation": "'s' between vowels produces /z/ in 'busy'."
      },
      {
        "word": "basic",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.s\u026ak/",
        "explanation": "'s' produces voiceless /s/ in 'basic'."
      },
      {
        "word": "bison",
        "isMatch": false,
        "transcription": "/\u02c8ba\u026a.s\u0259n/",
        "explanation": "'s' produces voiceless /s/."
      }
    ]
  },
  {
    "id": "sm-283",
    "targetSound": "/j/",
    "soundType": "consonant",
    "prompt": "Which word contains the palatal approximant /j/?",
    "options": [
      {
        "word": "ewe",
        "isMatch": true,
        "transcription": "/ju\u02d0/",
        "explanation": "'ewe' is pronounced with palatal approximant /j/ as in 'you'."
      },
      {
        "word": "eye",
        "isMatch": false,
        "transcription": "/a\u026a/",
        "explanation": "'eye' begins with diphthong /a\u026a/."
      },
      {
        "word": "ear",
        "isMatch": false,
        "transcription": "/\u026a\u0259r/",
        "explanation": "'ear' begins with diphthong /\u026a\u0259/."
      },
      {
        "word": "ore",
        "isMatch": false,
        "transcription": "/\u0254\u02d0r/",
        "explanation": "'ore' begins with monophthong /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-284",
    "targetSound": "/w/",
    "soundType": "consonant",
    "prompt": "Which word contains the labial-velar approximant /w/?",
    "options": [
      {
        "word": "on",
        "isMatch": false,
        "transcription": "/\u0252n/",
        "explanation": "'on' begins with vowel /\u0252/."
      },
      {
        "word": "own",
        "isMatch": false,
        "transcription": "/\u0259\u028an/",
        "explanation": "'own' begins with diphthong /\u0259\u028a/."
      },
      {
        "word": "in",
        "isMatch": false,
        "transcription": "/\u026an/",
        "explanation": "'in' begins with short vowel /\u026a/."
      },
      {
        "word": "one",
        "isMatch": true,
        "transcription": "/w\u028cn/",
        "explanation": "'one' begins with the approximant /w/."
      }
    ]
  },
  {
    "id": "sm-285",
    "targetSound": "/h/",
    "soundType": "consonant",
    "prompt": "Which word contains the voiceless glottal fricative /h/?",
    "options": [
      {
        "word": "when",
        "isMatch": false,
        "transcription": "/wen/",
        "explanation": "'wh' represents /w/ in 'when'."
      },
      {
        "word": "where",
        "isMatch": false,
        "transcription": "/we\u0259r/",
        "explanation": "'wh' represents /w/ in 'where'."
      },
      {
        "word": "who",
        "isMatch": true,
        "transcription": "/hu\u02d0/",
        "explanation": "'wh' represents glottal fricative /h/ in 'who'."
      },
      {
        "word": "what",
        "isMatch": false,
        "transcription": "/w\u0252t/",
        "explanation": "'wh' represents /w/ in 'what'."
      }
    ]
  },
  {
    "id": "sm-286",
    "targetSound": "/i\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close front unrounded vowel /i\u02d0/?",
    "options": [
      {
        "word": "guy",
        "isMatch": false,
        "transcription": "/\u0261a\u026a/",
        "explanation": "'guy' has diphthong /a\u026a/."
      },
      {
        "word": "quay",
        "isMatch": true,
        "transcription": "/ki\u02d0/",
        "explanation": "'quay' is pronounced /ki\u02d0/ with long vowel /i\u02d0/."
      },
      {
        "word": "play",
        "isMatch": false,
        "transcription": "/ple\u026a/",
        "explanation": "'play' has diphthong /e\u026a/."
      },
      {
        "word": "stay",
        "isMatch": false,
        "transcription": "/ste\u026a/",
        "explanation": "'stay' has diphthong /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-287",
    "targetSound": "/\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-front unrounded vowel /\u026a/?",
    "options": [
      {
        "word": "women",
        "isMatch": true,
        "transcription": "/\u02c8w\u026am.\u026an/",
        "explanation": "Plural 'women' has short /\u026a/ in both syllables."
      },
      {
        "word": "woman",
        "isMatch": false,
        "transcription": "/\u02c8w\u028am.\u0259n/",
        "explanation": "Singular 'woman' has short /\u028a/."
      },
      {
        "word": "wooden",
        "isMatch": false,
        "transcription": "/\u02c8w\u028ad.n/",
        "explanation": "'wooden' has short /\u028a/."
      },
      {
        "word": "womb",
        "isMatch": false,
        "transcription": "/wu\u02d0m/",
        "explanation": "'womb' has long /u\u02d0/."
      }
    ]
  },
  {
    "id": "sm-288",
    "targetSound": "/e/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open-mid front unrounded vowel /e/?",
    "options": [
      {
        "word": "people",
        "isMatch": false,
        "transcription": "/\u02c8pi\u02d0.pl/",
        "explanation": "'eo' in 'people' is long /i\u02d0/."
      },
      {
        "word": "jeopardy",
        "isMatch": false,
        "transcription": "/\u02c8d\u0292ep.\u0259.di/",
        "explanation": "Also has /e/ but leopard is target."
      },
      {
        "word": "leonine",
        "isMatch": false,
        "transcription": "/\u02c8li\u02d0.\u0259.na\u026an/",
        "explanation": "'eo' is /i\u02d0.\u0259/ in 'leonine'."
      },
      {
        "word": "leopard",
        "isMatch": true,
        "transcription": "/\u02c8lep.\u0259d/",
        "explanation": "'eo' in 'leopard' is pronounced as short /e/."
      }
    ]
  },
  {
    "id": "sm-289",
    "targetSound": "/\u00e6/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-open front unrounded vowel /\u00e6/?",
    "options": [
      {
        "word": "plait",
        "isMatch": false,
        "transcription": "/pl\u00e6t/",
        "explanation": "Alternative /pl\u00e6t/."
      },
      {
        "word": "plague",
        "isMatch": false,
        "transcription": "/ple\u026a\u0261/",
        "explanation": "'a' is diphthong /e\u026a/ in 'plague'."
      },
      {
        "word": "plaid",
        "isMatch": true,
        "transcription": "/pl\u00e6d/",
        "explanation": "'ai' in 'plaid' is pronounced as short /\u00e6/."
      },
      {
        "word": "plain",
        "isMatch": false,
        "transcription": "/ple\u026an/",
        "explanation": "'ai' is diphthong /e\u026a/ in 'plain'."
      }
    ]
  },
  {
    "id": "sm-290",
    "targetSound": "/\u0251\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open back unrounded vowel /\u0251\u02d0/?",
    "options": [
      {
        "word": "clergyman",
        "isMatch": false,
        "transcription": "/\u02c8kl\u025c\u02d0.d\u0292i.m\u0259n/",
        "explanation": "'er' is /\u025c\u02d0/ in 'clergyman'."
      },
      {
        "word": "clerk",
        "isMatch": true,
        "transcription": "/kl\u0251\u02d0k/",
        "explanation": "In British English, 'er' in 'clerk' is /\u0251\u02d0/."
      },
      {
        "word": "dark",
        "isMatch": false,
        "transcription": "/d\u0251\u02d0k/",
        "explanation": "Also /\u0251\u02d0/, clerk is standard UTME test word."
      },
      {
        "word": "jerk",
        "isMatch": false,
        "transcription": "/d\u0292\u025c\u02d0k/",
        "explanation": "'er' is /\u025c\u02d0/ in 'jerk'."
      }
    ]
  },
  {
    "id": "sm-291",
    "targetSound": "/\u0252/",
    "soundType": "vowel",
    "prompt": "Which word contains the short open back rounded vowel /\u0252/?",
    "options": [
      {
        "word": "yacht",
        "isMatch": true,
        "transcription": "/j\u0252t/",
        "explanation": "'ach' in 'yacht' produces the short vowel /\u0252/."
      },
      {
        "word": "yawn",
        "isMatch": false,
        "transcription": "/j\u0254\u02d0n/",
        "explanation": "'aw' is long vowel /\u0254\u02d0/ in 'yawn'."
      },
      {
        "word": "yard",
        "isMatch": false,
        "transcription": "/j\u0251\u02d0d/",
        "explanation": "'ar' is long vowel /\u0251\u02d0/ in 'yard'."
      },
      {
        "word": "year",
        "isMatch": false,
        "transcription": "/j\u026a\u0259r/",
        "explanation": "'ear' is diphthong /\u026a\u0259/ in 'year'."
      }
    ]
  },
  {
    "id": "sm-292",
    "targetSound": "/\u0254\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid back rounded vowel /\u0254\u02d0/?",
    "options": [
      {
        "word": "board",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0d/",
        "explanation": "Both contain /\u0254\u02d0/."
      },
      {
        "word": "boat",
        "isMatch": false,
        "transcription": "/b\u0259\u028at/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'boat'."
      },
      {
        "word": "road",
        "isMatch": false,
        "transcription": "/r\u0259\u028ad/",
        "explanation": "'oa' is diphthong /\u0259\u028a/ in 'road'."
      },
      {
        "word": "broad",
        "isMatch": true,
        "transcription": "/br\u0254\u02d0d/",
        "explanation": "'oa' in 'broad' is pronounced /\u0254\u02d0/."
      }
    ]
  },
  {
    "id": "sm-293",
    "targetSound": "/u\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long close back rounded vowel /u\u02d0/?",
    "options": [
      {
        "word": "suit",
        "isMatch": false,
        "transcription": "/su\u02d0t/",
        "explanation": "Match."
      },
      {
        "word": "biscuit",
        "isMatch": false,
        "transcription": "/\u02c8b\u026as.k\u026at/",
        "explanation": "'ui' is /\u026a/ in 'biscuit'."
      },
      {
        "word": "suit",
        "isMatch": true,
        "transcription": "/su\u02d0t/",
        "explanation": "'ui' in 'suit' produces long vowel /u\u02d0/."
      },
      {
        "word": "suite",
        "isMatch": false,
        "transcription": "/swi\u02d0t/",
        "explanation": "'suite' is pronounced like 'sweet' /swi\u02d0t/."
      }
    ]
  },
  {
    "id": "sm-294",
    "targetSound": "/\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the short near-close near-back rounded vowel /\u028a/?",
    "options": [
      {
        "word": "cloud",
        "isMatch": false,
        "transcription": "/kla\u028ad/",
        "explanation": "'ou' has diphthong /a\u028a/."
      },
      {
        "word": "could",
        "isMatch": true,
        "transcription": "/k\u028ad/",
        "explanation": "'oul' produces short rounded vowel /\u028a/ in 'could'."
      },
      {
        "word": "cold",
        "isMatch": false,
        "transcription": "/k\u0259\u028ald/",
        "explanation": "'old' has diphthong /\u0259\u028a/."
      },
      {
        "word": "cool",
        "isMatch": false,
        "transcription": "/ku\u02d0l/",
        "explanation": "'oo' has long /u\u02d0/."
      }
    ]
  },
  {
    "id": "sm-295",
    "targetSound": "/\u025c\u02d0/",
    "soundType": "vowel",
    "prompt": "Which word contains the long open-mid central unrounded vowel /\u025c\u02d0/?",
    "options": [
      {
        "word": "journey",
        "isMatch": true,
        "transcription": "/\u02c8d\u0292\u025c\u02d0.ni/",
        "explanation": "'our' produces long central /\u025c\u02d0/ in 'journey'."
      },
      {
        "word": "tour",
        "isMatch": false,
        "transcription": "/t\u028a\u0259r/",
        "explanation": "'our' produces diphthong /\u028a\u0259/ in 'tour'."
      },
      {
        "word": "sour",
        "isMatch": false,
        "transcription": "/sa\u028a\u0259r/",
        "explanation": "'our' produces triphthong /a\u028a\u0259/ in 'sour'."
      },
      {
        "word": "four",
        "isMatch": false,
        "transcription": "/f\u0254\u02d0r/",
        "explanation": "'our' produces long vowel /\u0254\u02d0/ in 'four'."
      }
    ]
  },
  {
    "id": "sm-296",
    "targetSound": "/\u0259/",
    "soundType": "vowel",
    "prompt": "Which word contains the weak mid-central unrounded vowel (schwa) /\u0259/?",
    "options": [
      {
        "word": "badger",
        "isMatch": false,
        "transcription": "/\u02c8b\u00e6d\u0292.\u0259r/",
        "explanation": "First syllable has /\u00e6/."
      },
      {
        "word": "bacon",
        "isMatch": false,
        "transcription": "/\u02c8be\u026a.k\u0259n/",
        "explanation": "First syllable has /e\u026a/."
      },
      {
        "word": "barter",
        "isMatch": false,
        "transcription": "/\u02c8b\u0251\u02d0.t\u0259r/",
        "explanation": "First syllable has /\u0251\u02d0/."
      },
      {
        "word": "banana",
        "isMatch": true,
        "transcription": "/b\u0259\u02c8n\u0251\u02d0.n\u0259/",
        "explanation": "First and last syllables contain schwa /\u0259/."
      }
    ]
  },
  {
    "id": "sm-297",
    "targetSound": "/e\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /e\u026a/?",
    "options": [
      {
        "word": "gauze",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0z/",
        "explanation": "'au' in 'gauze' is long /\u0254\u02d0/."
      },
      {
        "word": "gaunt",
        "isMatch": false,
        "transcription": "/\u0261\u0254\u02d0nt/",
        "explanation": "'au' in 'gaunt' is long /\u0254\u02d0/."
      },
      {
        "word": "gauge",
        "isMatch": true,
        "transcription": "/\u0261e\u026ad\u0292/",
        "explanation": "'au' in 'gauge' is pronounced with diphthong /e\u026a/."
      },
      {
        "word": "gouge",
        "isMatch": false,
        "transcription": "/\u0261a\u028ad\u0292/",
        "explanation": "'ou' in 'gouge' is diphthong /a\u028a/."
      }
    ]
  },
  {
    "id": "sm-298",
    "targetSound": "/a\u026a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u026a/?",
    "options": [
      {
        "word": "eight",
        "isMatch": false,
        "transcription": "/e\u026at/",
        "explanation": "'eigh' in 'eight' is pronounced /e\u026a/."
      },
      {
        "word": "height",
        "isMatch": true,
        "transcription": "/ha\u026at/",
        "explanation": "'eigh' in 'height' is pronounced /a\u026a/."
      },
      {
        "word": "weight",
        "isMatch": false,
        "transcription": "/we\u026at/",
        "explanation": "'eigh' in 'weight' is pronounced /e\u026a/."
      },
      {
        "word": "freight",
        "isMatch": false,
        "transcription": "/fre\u026at/",
        "explanation": "'eigh' in 'freight' is pronounced /e\u026a/."
      }
    ]
  },
  {
    "id": "sm-299",
    "targetSound": "/a\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /a\u028a/?",
    "options": [
      {
        "word": "drought",
        "isMatch": true,
        "transcription": "/dra\u028at/",
        "explanation": "'ough' in 'drought' is pronounced /a\u028a/."
      },
      {
        "word": "dough",
        "isMatch": false,
        "transcription": "/d\u0259\u028a/",
        "explanation": "'ough' in 'dough' is /\u0259\u028a/."
      },
      {
        "word": "bought",
        "isMatch": false,
        "transcription": "/b\u0254\u02d0t/",
        "explanation": "'ough' in 'bought' is /\u0254\u02d0/."
      },
      {
        "word": "rough",
        "isMatch": false,
        "transcription": "/r\u028cf/",
        "explanation": "'ough' in 'rough' is /\u028cf/."
      }
    ]
  },
  {
    "id": "sm-300",
    "targetSound": "/\u0259\u028a/",
    "soundType": "vowel",
    "prompt": "Which word contains the diphthong /\u0259\u028a/?",
    "options": [
      {
        "word": "few",
        "isMatch": false,
        "transcription": "/fju\u02d0/",
        "explanation": "'ew' in 'few' is /ju\u02d0/."
      },
      {
        "word": "new",
        "isMatch": false,
        "transcription": "/nju\u02d0/",
        "explanation": "'ew' in 'new' is /nju\u02d0/."
      },
      {
        "word": "flew",
        "isMatch": false,
        "transcription": "/flu\u02d0/",
        "explanation": "'ew' in 'flew' is /u\u02d0/."
      },
      {
        "word": "sew",
        "isMatch": true,
        "transcription": "/s\u0259\u028a/",
        "explanation": "'ew' in 'sew' is pronounced with diphthong /\u0259\u028a/."
      }
    ]
  }
];
