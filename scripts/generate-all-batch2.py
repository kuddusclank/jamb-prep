import re
import json

def classify_phe(stem, opts):
    t = (stem + " " + " ".join(opts)).lower()
    if any(k in t for k in ['sprain', 'strain', 'fracture', 'first aid', 'bleeding', 'injury', 'dislocation', 'burn', 'gauze', 'bandage', 'artificial respiration', 'mouth to mouth', 'drug abuse', 'drug misuse', 'self-medication', 'opioid']):
        return 'first-aid-safety-and-sports-injuries'
    if any(k in t for k in ['track', 'field event', 'sprint', 'relay', 'baton', 'hurdle', 'steeplechase', 'long jump', 'high jump', 'triple jump', 'pole vault', 'shot put', 'discus', 'javelin', 'hammer throw', '800m', '100m', 'take-off board', 'lane']):
        return 'athletics-track-and-field-events'
    if any(k in t for k in ['basketball', 'volleyball', 'soccer', 'football', 'handball', 'badminton', 'tennis', 'table tennis', 'squash', 'hockey', 'referee', 'linesman', 'racket', 'shuttlecock', 'fifa', 'fiba', 'pitch', 'court', 'deuce', 'dribbling', 'tackling']):
        return 'ball-and-racket-games'
    if any(k in t for k in ['gymnastic', 'vault', 'roll', 'somersault', 'stunt', 'boxing', 'judo', 'wrestling', 'traditional dance', 'atilogwu', 'bata', 'swange', 'eyo', 'ekombi', 'ayo game']):
        return 'gymnastics-and-traditional-sports'
    if any(k in t for k in ['fitness', 'endurance', 'agility', 'flexibility', 'warm up', 'warm-up', 'cool-down', 'somatotype', 'endomorph', 'ectomorph', 'mesomorph', 'fatigue', 'strength training', 'aerobic', 'posture', 'flat foot', 'flatfoot', 'kyphosis', 'lordosis', 'scoliosis']):
        return 'physical-fitness-and-conditioning'
    if any(k in t for k in ['skeleton', 'bone', 'muscle', 'joint', 'heart', 'respiratory', 'trachea', 'lungs', 'pulse', 'circulation', 'anatomy', 'physiology', 'cranium', 'spinal cord', 'vertebra', 'rib', 'deltoid', 'cartilage', 'alveoli', 'digestion', 'saliva']):
        return 'human-anatomy-and-physiology-in-sports'
    if any(k in t for k in ['communicable', 'disease', 'hygiene', 'pollution', 'water-borne', 'nutrition', 'vitamin', 'diet', 'balanced diet', 'rickets', 'scurvy', 'obesity', 'community health', 'waste', 'sewage', 'refuse', 'sunscreen', 'health education']):
        return 'health-education-and-personal-hygiene'
    return 'foundations-and-history-of-physical-education'

def classify_agr(stem, opts):
    t = (stem + " " + " ".join(opts)).lower()
    if any(k in t for k in ['soil texture', 'soil structure', 'soil profile', 'horizon', 'weathering', 'igneous', 'rock', 'sand', 'loam', 'clay', 'erosion', 'leaching', 'capillary water', 'hygroscopic']):
        return 'soil-science-soil-texture-and-structure'
    if any(k in t for k in ['ph', 'liming', 'alkaline', 'acidic', 'gypsum', 'calcium carbonate']):
        return 'soil-chemistry-soil-ph-and-liming'
    if any(k in t for k in ['nitrogen', 'phosphorus', 'potassium', 'fertilizer', 'urea', 'nutrient', 'chlorosis', 'deficiency', 'micronutrient', 'macro-nutrient', 'manure', 'compost', 'npk']):
        return 'plant-nutrients-and-fertilizers'
    if any(k in t for k in ['tractor', 'plough', 'plow', 'harrow', 'ridger', 'planter', 'mower', 'harvester', 'implement', 'sprayer', 'spark plug', 'engine oil']):
        return 'farm-tools-and-machinery'
    if any(k in t for k in ['propagation', 'grafting', 'budding', 'layering', 'cuttings', 'nursery', 'germination', 'seedbed', 'seedling', 'thinning', 'transplanting']):
        return 'crop-propagation-and-nursery-management'
    if any(k in t for k in ['pasture', 'forage', 'silage', 'hay', 'grazing', 'rangeland', 'guinea grass', 'elephant grass', 'centrosema', 'stylosanthes', 'legume']):
        return 'pasture-and-forage-crops'
    if any(k in t for k in ['ruminant', 'abomasum', 'rumen', 'reticulum', 'omasum', 'monogastric', 'polygastric', 'poultry', 'gizzard', 'crop', 'anatomy', 'gonad', 'mammal']):
        return 'animal-science-anatomy-of-ruminants'
    if any(k in t for k in ['feed', 'ration', 'protein', 'nutrition', 'malnutrition', 'colostrum', 'feed conversion', 'maintenance ration', 'production ration']):
        return 'animal-nutrition-feed-classification'
    if any(k in t for k in ['pest', 'disease', 'weeds', 'weed', 'fungus', 'bacterium', 'virus', 'nematode', 'borer', 'weevil', 'mosaic', 'swollen shoot', 'blight', 'rust', 'coccidiosis', 'rinderpest', 'anthrax', 'liver fluke', 'tapeworm', 'nagana']):
        return 'crop-protection-pests-and-diseases'
    if any(k in t for k in ['estrus', 'oestrus', 'gestation', 'parturition', 'artificial insemination', 'breeding', 'mendel', 'genotype', 'cross breeding', 'inbreeding', 'heifer', 'sow', 'bull', 'heat']):
        return 'animal-reproduction-and-breeding'
    if any(k in t for k in ['fish', 'pond', 'aquaculture', 'fingerling', 'plankton', 'fishing', 'dragnet', 'liming of pond']):
        return 'fisheries-and-aquaculture'
    if any(k in t for k in ['forestry', 'forest', 'wildlife', 'game reserve', 'taungya', 'timber', 'afforestation', 'poaching']):
        return 'forestry-and-wildlife-management'
    if any(k in t for k in ['surveying', 'gunter', 'ranging pole', 'theodolite', 'abney level', 'compass', 'farmstead']):
        return 'farm-surveying-and-farmstead-planning'
    if any(k in t for k in ['biotechnology', 'tissue culture', 'genetic engineering', 'recombinant', 'gmo', 'hybridization', 'crop improvement']):
        return 'agricultural-biotechnology-and-crop-improvement'
    if any(k in t for k in ['subsistence', 'commercial agriculture', 'land tenure', 'freehold', 'communal', 'inheritance', 'lease', 'land use act']):
        return 'land-use-and-land-tenure-system'
    if any(k in t for k in ['extension', 'agent', 'dissemination', 'adoption', 'innovators', 'mass media', 'rural']):
        return 'agricultural-extension-and-rural-sociology'
    if any(k in t for k in ['demand', 'supply', 'price', 'elasticity', 'loan', 'credit', 'subsidy', 'profit', 'depreciation', 'records', 'market']):
        return 'agricultural-economics-farm-records'
    if any(k in t for k in ['cereal', 'maize', 'rice', 'sorghum', 'millet', 'cassava', 'yam', 'cowpea', 'groundnut', 'cocoa', 'oil palm', 'cotton', 'crop rotation', 'mixed cropping']):
        return 'crop-husbandry-cereals-and-legumes'
    return 'importance-of-agriculture'

def classify_his(stem, opts):
    t = (stem + " " + " ".join(opts)).lower()
    if any(k in t for k in ['nok', 'terracotta']):
        return 'early-nigerian-civilizations-nok-culture'
    if any(k in t for k in ['igbo-ukwu', 'metallurgy']):
        return 'igbo-ukwu-bronze-metallurgy'
    if any(k in t for k in ['benin', 'ogiso', 'ewuare', 'ovonramwen', 'iyoba', 'uzama', 'punitive expedition']):
        return 'kingdom-of-benin-dynastic-evolution'
    if any(k in t for k in ['oyo', 'alaafin', 'bashorun', 'oyomesi', 'afonja', 'kakanfo']):
        return 'the-old-oyo-empire-constitutional-structure'
    if any(k in t for k in ['kanem', 'borno', 'bornu', 'saifawa', 'idris alooma', 'mai ']):
        return 'kanem-borno-empire-the-saifawa-dynasty'
    if any(k in t for k in ['sokoto jihad', 'dan fodio', 'danfodio', 'caliphate', 'shehu']):
        return 'the-19th-century-sokoto-jihad'
    if any(k in t for k in ['yoruba war', 'ekiti parapo', 'ibadan', 'ijaye', 'kiriji']):
        return 'the-yoruba-19th-century-wars'
    if any(k in t for k in ['amalgamation', 'lugard', 'flora shaw', '1914']):
        return 'the-1914-amalgamation-of-nigeria'
    if any(k in t for k in ['civil war', 'biafra', 'ojukwu', 'gowon', 'no victor', 'secession']):
        return 'the-nigerian-civil-war-1967-1970-'
    if any(k in t for k in ['murtala', 'obasanjo', 'buhari', 'babangida', 'abacha', 'military rule', 'coup', 'decree', 'supreme military council', 'dimka', 'ironisi', 'aguiyi']):
        return 'military-rule-the-murtala-obasanjo-regime'
    if any(k in t for k in ['first republic', 'second republic', 'shagari', 'azikiwe', 'balewa', 'awolowo', '1979 constitution', '1960', '1963', 'republican']):
        return 'post-independence-nigeria-and-military-regimes'
    if any(k in t for k in ['nationalist', 'clifford', 'richards', 'macpherson', 'lyttleton', 'macaulay', 'nndp', 'nym', 'ncnc', 'indirect rule', 'warrant chief', 'native authority', 'aba women', 'elective principle']):
        return 'colonial-administration-and-constitutional-development'
    if any(k in t for k in ['mfecane', 'zulu', 'shaka', 'great trek', 'boer', 'apartheid', 'anc', 'mandela', 'steve biko', 'south africa', 'ethiopia', 'adwa', 'menelik', 'theodore', 'mahdi', 'sudan', 'samori toure', 'egypt', 'muhammad ali', 'suez', 'liberia', 'sierra leone', 'mau mau', 'kenya', 'oau', 'ecowas', 'amani', 'zanzibar', 'buganda']):
        return 'african-history-and-liberation-struggles'
    if any(k in t for k in ['world war', 'cold war', 'league of nations', 'united nations', 'berlin conference', 'scramble for africa', 'treaty of versailles', 'hitler', 'bolshevik', 'french revolution', 'magna carta', 'cuban missile']):
        return 'world-history-and-international-relations'
    if any(k in t for k in ['oral tradition', 'archaeology', 'numismatics', 'epigraphy', 'palaeography', 'historiography', 'sources of history']):
        return 'historiography-and-sources-of-history'
    if any(k in t for k in ['trans-saharan', 'slave trade', 'islam in nigeria', 'christian missionary']):
        return 'trans-saharan-trade-and-islam'
    return 'pre-colonial-systems-and-inter-group-relations'

def parse_and_generate(txt_file, subject_code, prefix, classifier):
    with open(txt_file, 'r') as f:
        text = f.read()
        
    paper_starts = [m.start() for m in re.finditer(r'(?<!Answer key — )(?:JAMB UTME|JAMB-style practice paper)\s*\(?(\d{4})\)?', text)]
    print(f"\n================ Processing [{subject_code}] from {txt_file} ================")
    
    for idx, pos in enumerate(paper_starts):
        end_pos = paper_starts[idx+1] if idx+1 < len(paper_starts) else len(text)
        chunk = text[pos:end_pos]
        m_yr = re.search(r'(\d{4})', chunk[:50])
        yr = int(m_yr.group(1))
        
        k_match = re.search(r'Answer key\s*—.*?\n(.*)', chunk, re.DOTALL)
        ans = {}
        if k_match:
            key_text = k_match.group(1)
            ans = dict(re.findall(r'(\d+)\.\s*([A-D]*)', key_text))
            
        # Fill known missing keys in source
        if subject_code == 'PHE':
            if yr == 2023:
                ans['5'] = 'A'; ans['16'] = 'A'; ans['42'] = 'A'; ans['68'] = 'C'
            elif yr == 2024:
                ans['80'] = 'D'
            elif yr == 2025:
                ans['62'] = 'D'
        elif subject_code == 'AGR':
            if yr == 2021:
                ans['41'] = 'C'
                
        q_sec = chunk[:k_match.start()] if k_match else chunk
        q_sec = re.sub(r'---\s*PAGE\s*\d+\s*---', '', q_sec)
        
        blocks = re.split(r'\n(?=\s*\d+\.\s)', q_sec)
        questions = []
        
        for b in blocks:
            b = b.strip()
            m_num = re.match(r'^(\d+)\.\s*(.*)', b, re.DOTALL)
            if not m_num:
                continue
            qnum = int(m_num.group(1))
            content = m_num.group(2).strip()
            
            # Skip images/diagrams
            if '[diagram]' in content.lower() or '[image' in content.lower() or 'see linked' in content.lower():
                continue
                
            opt_matches = list(re.finditer(r'(?:^|\n)\s*([A-D])\.\s*(.*?)(?=\n\s*[A-D]\.|$)', content, re.DOTALL))
            if len(opt_matches) != 4:
                continue
                
            stem = content[:opt_matches[0].start()].strip()
            stem = ' '.join(stem.split())
            if not stem or len(stem) < 3:
                continue
                
            # Assign options safely by position
            labels = ['A', 'B', 'C', 'D']
            opts = {}
            for i, om in enumerate(opt_matches):
                val = om.group(2).strip()
                opts[labels[i]] = ' '.join(val.split())
                
            corr = ans.get(str(qnum))
            if not corr or corr not in ['A', 'B', 'C', 'D']:
                continue
                
            questions.append({
                'num': qnum,
                'stem': stem,
                'a': opts['A'],
                'b': opts['B'],
                'c': opts['C'],
                'd': opts['D'],
                'corr': corr
            })
            
        dataset = []
        for qidx, q in enumerate(questions):
            slug = classifier(q['stem'], [q['a'], q['b'], q['c'], q['d']])
            ref = f"{subject_code}-{yr}-{qidx+1:03d}"
            explanation = f"The correct answer is Option {q['corr']}: {q[q['corr'].lower()]}. In {subject_code}, this conforms to standard syllabus principles, scientific mechanisms, or historical facts."
            dataset.append({
                'external_reference': ref,
                'stem': q['stem'],
                'option_a': q['a'],
                'option_b': q['b'],
                'option_c': q['c'],
                'option_d': q['d'],
                'correct_option': q['corr'],
                'explanation': explanation,
                'topic_slug': slug,
                'difficulty': 'medium',
                'exam_year': yr,
                'tags': f"{prefix}|{slug}|jamb-{yr}"
            })
            
        out_file = f"jambprep/scripts/dataset-{prefix}-{yr}.mjs"
        with open(out_file, 'w') as out_f:
            out_f.write(f"export const questions{yr} = {json.dumps(dataset, indent=2)};\nexport const questions = questions{yr};\n")
        print(f"[{subject_code}] Year {yr}: Extracted {len(dataset)} valid questions -> {out_file}")

parse_and_generate('jambprep/scripts/extracted-phe.txt', 'PHE', 'physical-health', classify_phe)
parse_and_generate('jambprep/scripts/extracted-agriculture.txt', 'AGR', 'agriculture', classify_agr)
parse_and_generate('jambprep/scripts/extracted-history.txt', 'HIS', 'history', classify_his)
