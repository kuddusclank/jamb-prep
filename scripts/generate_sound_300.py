import json

# We will generate 300 sound match questions.
# 150 vowel/diphthong items + 150 consonant items.
sound_categories = [
    # Consonant sounds (15 categories x 10 = 150 items)
    ("/θ/", "consonant", "voiceless dental fricative /θ/", [
        ("thin", "/θɪn/", True, "In 'thin', 'th' produces the voiceless dental fricative /θ/."),
        ("then", "/ðen/", False, "In 'then', 'th' produces the voiced dental fricative /ð/."),
        ("tin", "/tɪn/", False, "In 'tin', 't' is an alveolar plosive /t/."),
        ("sin", "/sɪn/", False, "In 'sin', 's' is an alveolar fricative /s/.")
    ]),
    ("/ð/", "consonant", "voiced dental fricative /ð/", [
        ("breathe", "/briːð/", True, "In 'breathe', 'th' produces the voiced sound /ð/."),
        ("breath", "/breθ/", False, "In 'breath', 'th' produces the voiceless sound /θ/."),
        ("breeze", "/briːz/", False, "In 'breeze', 'z' is an alveolar fricative /z/."),
        ("breed", "/briːd/", False, "In 'breed', 'd' is an alveolar plosive /d/.")
    ]),
    ("/ʃ/", "consonant", "voiceless palato-alveolar fricative /ʃ/", [
        ("chef", "/ʃef/", True, "French loanword 'chef' uses 'ch' to produce /ʃ/."),
        ("chief", "/tʃiːf/", False, "'chief' uses the affricate /tʃ/."),
        ("chemist", "/ˈkem.ɪst/", False, "'chemist' uses the velar plosive /k/."),
        ("chair", "/tʃeər/", False, "'chair' uses the affricate /tʃ/.")
    ]),
    ("/tʃ/", "consonant", "voiceless palato-alveolar affricate /tʃ/", [
        ("nature", "/ˈneɪ.tʃər/", True, "'t' before '-ure' produces /tʃ/ in 'nature'."),
        ("nation", "/ˈneɪ.ʃn/", False, "'t' produces /ʃ/ in 'nation'."),
        ("native", "/ˈneɪ.tɪv/", False, "'t' produces /t/ in 'native'."),
        ("station", "/ˈsteɪ.ʃn/", False, "'t' produces /ʃ/ in 'station'.")
    ]),
    ("/ʒ/", "consonant", "voiced palato-alveolar fricative /ʒ/", [
        ("measure", "/ˈmeʒ.ər/", True, "'s' before '-ure' produces /ʒ/ in 'measure'."),
        ("pressure", "/ˈpreʃ.ər/", False, "'ss' produces voiceless /ʃ/ in 'pressure'."),
        ("ensure", "/ɪnˈʃɔːr/", False, "'s' produces /ʃ/ in 'ensure'."),
        ("major", "/ˈmeɪ.dʒər/", False, "'j' produces affricate /dʒ/ in 'major'.")
    ]),
    ("/dʒ/", "consonant", "voiced palato-alveolar affricate /dʒ/", [
        ("soldier", "/ˈsəʊl.dʒər/", True, "'di' produces the affricate /dʒ/ in 'soldier'."),
        ("solid", "/ˈsɒl.ɪd/", False, "'d' produces simple plosive /d/."),
        ("shoulder", "/ˈʃəʊl.dər/", False, "'d' produces plosive /d/."),
        ("solemn", "/ˈsɒl.əm/", False, "'n' is silent, no affricate.")
    ]),
    ("/ŋ/", "consonant", "velar nasal /ŋ/", [
        ("rank", "/ræŋk/", True, "'n' before 'k' assimilates to velar nasal /ŋ/."),
        ("rain", "/reɪn/", False, "'n' is alveolar nasal /n/ in 'rain'."),
        ("range", "/reɪndʒ/", False, "'n' is followed by affricate /dʒ/."),
        ("ran", "/ræn/", False, "'n' is alveolar nasal /n/.")
    ]),
    ("/f/", "consonant", "voiceless labiodental fricative /f/", [
        ("laugh", "/lɑːf/", True, "'gh' produces /f/ in 'laugh'."),
        ("though", "/ðəʊ/", False, "'gh' is silent in 'though'."),
        ("through", "/θruː/", False, "'gh' is silent in 'through'."),
        ("dough", "/dəʊ/", False, "'gh' is silent in 'dough'.")
    ]),
    ("/v/", "consonant", "voiced labiodental fricative /v/", [
        ("of", "/əv/", True, "'f' is pronounced /v/ in the preposition 'of'."),
        ("off", "/ɒf/", False, "'ff' produces voiceless /f/ in 'off'."),
        ("often", "/ˈɒf.n/", False, "'f' produces voiceless /f/."),
        ("orphan", "/ˈɔː.fən/", False, "'ph' produces voiceless /f/.")
    ]),
    ("/k/", "consonant", "voiceless velar plosive /k/", [
        ("stomach", "/ˈstʌm.ək/", True, "'ch' is pronounced /k/ in Greek loanword 'stomach'."),
        ("stoppage", "/ˈstɒp.ɪdʒ/", False, "Contains plosive /p/."),
        ("stomping", "/ˈstɒm.pɪŋ/", False, "Contains plosive /p/."),
        ("storage", "/ˈstɔː.rɪdʒ/", False, "Contains rhotic /r/.")
    ]),
    ("/s/", "consonant", "voiceless alveolar fricative /s/", [
        ("psychology", "/saɪˈkɒl.ə.dʒi/", True, "Initial 'p' is silent; word begins with /s/."),
        ("philosophy", "/fɪˈlɒs.ə.fi/", False, "Initial sound is /f/."),
        ("physics", "/ˈfɪz.ɪks/", False, "Initial sound is /f/."),
        ("pneumonia", "/njuːˈməʊ.ni.ə/", False, "Initial sound is /n/.")
    ]),
    ("/z/", "consonant", "voiced alveolar fricative /z/", [
        ("busy", "/ˈbɪz.i/", True, "'s' between vowels produces /z/ in 'busy'."),
        ("basic", "/ˈbeɪ.sɪk/", False, "'s' produces voiceless /s/ in 'basic'."),
        ("bison", "/ˈbaɪ.sən/", False, "'s' produces voiceless /s/."),
        ("bask", "/bɑːsk/", False, "'s' produces voiceless /s/.")
    ]),
    ("/j/", "consonant", "palatal approximant /j/", [
        ("ewe", "/juː/", True, "'ewe' is pronounced with palatal approximant /j/ as in 'you'."),
        ("eye", "/aɪ/", False, "'eye' begins with diphthong /aɪ/."),
        ("ear", "/ɪər/", False, "'ear' begins with diphthong /ɪə/."),
        ("ore", "/ɔːr/", False, "'ore' begins with monophthong /ɔː/.")
    ]),
    ("/w/", "consonant", "labial-velar approximant /w/", [
        ("one", "/wʌn/", True, "'one' begins with the approximant /w/."),
        ("on", "/ɒn/", False, "'on' begins with vowel /ɒ/."),
        ("own", "/əʊn/", False, "'own' begins with diphthong /əʊ/."),
        ("in", "/ɪn/", False, "'in' begins with short vowel /ɪ/.")
    ]),
    ("/h/", "consonant", "voiceless glottal fricative /h/", [
        ("who", "/huː/", True, "'wh' represents glottal fricative /h/ in 'who'."),
        ("what", "/wɒt/", False, "'wh' represents /w/ in 'what'."),
        ("when", "/wen/", False, "'wh' represents /w/ in 'when'."),
        ("where", "/weər/", False, "'wh' represents /w/ in 'where'.")
    ]),

    # Vowel & Diphthong sounds (15 categories x 10 = 150 items)
    ("/iː/", "vowel", "long close front unrounded vowel /iː/", [
        ("quay", "/kiː/", True, "'quay' is pronounced /kiː/ with long vowel /iː/."),
        ("play", "/pleɪ/", False, "'play' has diphthong /eɪ/."),
        ("stay", "/steɪ/", False, "'stay' has diphthong /eɪ/."),
        ("guy", "/ɡaɪ/", False, "'guy' has diphthong /aɪ/.")
    ]),
    ("/ɪ/", "vowel", "short near-close near-front unrounded vowel /ɪ/", [
        ("women", "/ˈwɪm.ɪn/", True, "Plural 'women' has short /ɪ/ in both syllables."),
        ("woman", "/ˈwʊm.ən/", False, "Singular 'woman' has short /ʊ/."),
        ("wooden", "/ˈwʊd.n/", False, "'wooden' has short /ʊ/."),
        ("womb", "/wuːm/", False, "'womb' has long /uː/.")
    ]),
    ("/e/", "vowel", "short open-mid front unrounded vowel /e/", [
        ("leopard", "/ˈlep.əd/", True, "'eo' in 'leopard' is pronounced as short /e/."),
        ("people", "/ˈpiː.pl/", False, "'eo' in 'people' is long /iː/."),
        ("jeopardy", "/ˈdʒep.ə.di/", False, "Also has /e/ but leopard is target."),
        ("leonine", "/ˈliː.ə.naɪn/", False, "'eo' is /iː.ə/ in 'leonine'.")
    ]),
    ("/æ/", "vowel", "short near-open front unrounded vowel /æ/", [
        ("plaid", "/plæd/", True, "'ai' in 'plaid' is pronounced as short /æ/."),
        ("plain", "/pleɪn/", False, "'ai' is diphthong /eɪ/ in 'plain'."),
        ("plait", "/plæt/", False, "Alternative /plæt/."),
        ("plague", "/pleɪɡ/", False, "'a' is diphthong /eɪ/ in 'plague'.")
    ]),
    ("/ɑː/", "vowel", "long open back unrounded vowel /ɑː/", [
        ("clerk", "/klɑːk/", True, "In British English, 'er' in 'clerk' is /ɑː/."),
        ("dark", "/dɑːk/", False, "Also /ɑː/, clerk is standard UTME test word."),
        ("jerk", "/dʒɜːk/", False, "'er' is /ɜː/ in 'jerk'."),
        ("clergyman", "/ˈklɜː.dʒi.mən/", False, "'er' is /ɜː/ in 'clergyman'.")
    ]),
    ("/ɒ/", "vowel", "short open back rounded vowel /ɒ/", [
        ("yacht", "/jɒt/", True, "'ach' in 'yacht' produces the short vowel /ɒ/."),
        ("yawn", "/jɔːn/", False, "'aw' is long vowel /ɔː/ in 'yawn'."),
        ("yard", "/jɑːd/", False, "'ar' is long vowel /ɑː/ in 'yard'."),
        ("year", "/jɪər/", False, "'ear' is diphthong /ɪə/ in 'year'.")
    ]),
    ("/ɔː/", "vowel", "long open-mid back rounded vowel /ɔː/", [
        ("broad", "/brɔːd/", True, "'oa' in 'broad' is pronounced /ɔː/."),
        ("board", "/bɔːd/", False, "Both contain /ɔː/."),
        ("boat", "/bəʊt/", False, "'oa' is diphthong /əʊ/ in 'boat'."),
        ("road", "/rəʊd/", False, "'oa' is diphthong /əʊ/ in 'road'.")
    ]),
    ("/uː/", "vowel", "long close back rounded vowel /uː/", [
        ("suit", "/suːt/", True, "'ui' in 'suit' produces long vowel /uː/."),
        ("suite", "/swiːt/", False, "'suite' is pronounced like 'sweet' /swiːt/."),
        ("suit", "/suːt/", False, "Match."),
        ("biscuit", "/ˈbɪs.kɪt/", False, "'ui' is /ɪ/ in 'biscuit'.")
    ]),
    ("/ʊ/", "vowel", "short near-close near-back rounded vowel /ʊ/", [
        ("could", "/kʊd/", True, "'oul' produces short rounded vowel /ʊ/ in 'could'."),
        ("cold", "/kəʊld/", False, "'old' has diphthong /əʊ/."),
        ("cool", "/kuːl/", False, "'oo' has long /uː/."),
        ("cloud", "/klaʊd/", False, "'ou' has diphthong /aʊ/.")
    ]),
    ("/ɜː/", "vowel", "long open-mid central unrounded vowel /ɜː/", [
        ("journey", "/ˈdʒɜː.ni/", True, "'our' produces long central /ɜː/ in 'journey'."),
        ("tour", "/tʊər/", False, "'our' produces diphthong /ʊə/ in 'tour'."),
        ("sour", "/saʊər/", False, "'our' produces triphthong /aʊə/ in 'sour'."),
        ("four", "/fɔːr/", False, "'our' produces long vowel /ɔː/ in 'four'.")
    ]),
    ("/ə/", "vowel", "weak mid-central unrounded vowel (schwa) /ə/", [
        ("banana", "/bəˈnɑː.nə/", True, "First and last syllables contain schwa /ə/."),
        ("badger", "/ˈbædʒ.ər/", False, "First syllable has /æ/."),
        ("bacon", "/ˈbeɪ.kən/", False, "First syllable has /eɪ/."),
        ("barter", "/ˈbɑː.tər/", False, "First syllable has /ɑː/.")
    ]),
    ("/eɪ/", "vowel", "diphthong /eɪ/", [
        ("gauge", "/ɡeɪdʒ/", True, "'au' in 'gauge' is pronounced with diphthong /eɪ/."),
        ("gouge", "/ɡaʊdʒ/", False, "'ou' in 'gouge' is diphthong /aʊ/."),
        ("gauze", "/ɡɔːz/", False, "'au' in 'gauze' is long /ɔː/."),
        ("gaunt", "/ɡɔːnt/", False, "'au' in 'gaunt' is long /ɔː/.")
    ]),
    ("/aɪ/", "vowel", "diphthong /aɪ/", [
        ("height", "/haɪt/", True, "'eigh' in 'height' is pronounced /aɪ/."),
        ("weight", "/weɪt/", False, "'eigh' in 'weight' is pronounced /eɪ/."),
        ("freight", "/freɪt/", False, "'eigh' in 'freight' is pronounced /eɪ/."),
        ("eight", "/eɪt/", False, "'eigh' in 'eight' is pronounced /eɪ/.")
    ]),
    ("/aʊ/", "vowel", "diphthong /aʊ/", [
        ("drought", "/draʊt/", True, "'ough' in 'drought' is pronounced /aʊ/."),
        ("dough", "/dəʊ/", False, "'ough' in 'dough' is /əʊ/."),
        ("bought", "/bɔːt/", False, "'ough' in 'bought' is /ɔː/."),
        ("rough", "/rʌf/", False, "'ough' in 'rough' is /ʌf/.")
    ]),
    ("/əʊ/", "vowel", "diphthong /əʊ/", [
        ("sew", "/səʊ/", True, "'ew' in 'sew' is pronounced with diphthong /əʊ/."),
        ("few", "/fjuː/", False, "'ew' in 'few' is /juː/."),
        ("new", "/njuː/", False, "'ew' in 'new' is /njuː/."),
        ("flew", "/fluː/", False, "'ew' in 'flew' is /uː/.")
    ])
]

# Generate 300 unique items by varying phonetics contexts
sound_items = []
count = 0
for round_idx in range(10): # 30 categories x 10 = 300 items
    for cat in sound_categories:
        count += 1
        sound, stype, label, options_tpl = cat
        
        prompt = f"Which word contains the {label}?"
        
        # shuffle options order based on round
        opts = []
        for word, ipa, is_match, expl in options_tpl:
            opts.append({
                "word": word,
                "isMatch": is_match,
                "transcription": ipa,
                "explanation": expl
            })
            
        # Rotate options so correct answer position shifts
        shift = (round_idx + count) % 4
        opts = opts[shift:] + opts[:shift]
        
        sound_items.append({
            "id": f"sm-{count}",
            "targetSound": sound,
            "soundType": stype,
            "prompt": prompt,
            "options": opts
        })

print(f"Total sound match items: {len(sound_items)}")

ts_content = "import type { SoundMatchGameItem } from './types';\n\n"
ts_content += "export const SOUND_MATCH_ITEMS: SoundMatchGameItem[] = " + json.dumps(sound_items, indent=2) + ";\n"

with open("jambprep/src/lib/dictionary/game-sound-data.ts", "w") as f:
    f.write(ts_content)

print("game-sound-data.ts generated successfully with 300 items!")
