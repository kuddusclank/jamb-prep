import re
import json

art_topics = [
    'classification-and-branches-of-art',
    'elements-and-principles-of-design',
    'drawing-painting-and-colour-theory',
    'sculpture-ceramics-and-pottery',
    'textile-design-and-crafts',
    'traditional-nigerian-art-and-culture',
    'african-and-world-art-history',
    'graphic-design-and-computer-graphics'
]

def classify_art(stem, opts):
    text = (stem + " " + " ".join(opts)).lower()
    if any(k in text for k in ['nok', 'ife', 'benin', 'igbo-ukwu', 'owo', 'esie', 'yoruba', 'igbo', 'thorn carving', 'mbari', 'ashogbo', 'oshogbo', 'adire', 'aso-oke', 'nsibidi', 'uli', 'igwe', 'igue']):
        return 'traditional-nigerian-art-and-culture'
    if any(k in text for k in ['sculpture', 'ceramic', 'pottery', 'clay', 'kiln', 'armature', 'carving', 'modelling', 'casting', 'plasticine', 'bronze', 'relief', 'assemblage', 'subtractive', 'mould']):
        return 'sculpture-ceramics-and-pottery'
    if any(k in text for k in ['textile', 'dye', 'batik', 'tie-dye', 'weaving', 'fabric', 'leather', 'embroidery', 'beadwork', 'calabash', 'silkscreening']):
        return 'textile-design-and-crafts'
    if any(k in text for k in ['gothic', 'byzantine', 'egypt', 'roman', 'cathedral', 'renaissance', 'monument', 'cave painting', 'prehistoric', 'impressionism', 'cubism', 'surrealism', 'mali', 'dogo']):
        return 'african-and-world-art-history'
    if any(k in text for k in ['graphics', 'computer graphics', 'lettering', 'calligraphy', 'corel draw', 'ruler guide', 'poster', 'typography', 'mouse', 'caption', 'television announcements']):
        return 'graphic-design-and-computer-graphics'
    if any(k in text for k in ['balance', 'rhythm', 'harmony', 'unity', 'contrast', 'emphasis', 'proportion', 'variety', 'perspective', 'vanishing point', 'movement', 'composition', 'focal point']):
        return 'elements-and-principles-of-design'
    if any(k in text for k in ['pencil', 'drawing', 'painting', 'colour', 'color', 'shading', 'hue', 'value', 'tint', 'pigment', 'pointillism', 'texture', 'line', 'still life', 'oil painting', 'varnish']):
        return 'drawing-painting-and-colour-theory'
    return 'classification-and-branches-of-art'

def classify_music(stem, opts):
    text = (stem + " " + " ".join(opts)).lower()
    if any(k in text for k in ['gulum', 'aerophone', 'chordophone', 'idiophone', 'membranophone', 'griots', 'ekpo', 'eki-gene', 'bata', 'kalangu', 'kaho', 'ogene', 'umoja', 'shata', 'shantu']):
        return 'african-traditional-music-and-instruments'
    if any(k in text for k in ['allemande', 'palestrina', 'handel', 'bach', 'monteverdi', 'schoenberg', 'atonal', 'stravinsky', 'schubert', 'romantic period', 'medieval', 'ars nova', 'ars antiqua', 'missa brevis']):
        return 'western-art-music-and-history'
    if any(k in text for k in ['reggae', 'fela sowande', 'kwaa mensah', 'fanti trio', 'lionel richie', 'd\'banj', 'sasha', 'weird mc', 'pop', 'blues', 'negro spiritual', 'can we chill', 'rock the party', 'adara', 'lucky dube']):
        return 'contemporary-african-and-popular-music'
    if any(k in text for k in ['sol-fa', 'tonic', 'sing ye choirs', 'sight']):
        return 'music-reading-and-sight-singing'
    if any(k in text for k in ['anthem', 'stanzaic', 'ternary', 'binary', 'rondo', 'form', 'responsorial']):
        return 'musical-forms-and-analysis'
    return 'rudiments-and-theory-of-music'

def parse_subject_papers(filename, subject_code):
    with open(filename, 'r') as f:
        text = f.read()
        
    paper_starts = [m.start() for m in re.finditer(r'(?<!Answer key — )(?:JAMB UTME|JAMB-style practice paper)\s*\(?(\d{4})\)?', text)]
    results = {}
    
    for idx, pos in enumerate(paper_starts):
        end_pos = paper_starts[idx+1] if idx+1 < len(paper_starts) else len(text)
        chunk = text[pos:end_pos]
        m_yr = re.search(r'(\d{4})', chunk[:50])
        yr = int(m_yr.group(1))
        
        k_match = re.search(r'Answer key\s*—.*?\n(.*)', chunk, re.DOTALL)
        ans = {}
        if k_match:
            key_text = k_match.group(1)
            ans = dict(re.findall(r'(\d+)\.\s*([A-D])', key_text))
            
        # Manual completions for missing keys in source
        if subject_code == 'ART' and yr == 2025:
            ans['48'] = 'C' # Applied art
            ans['49'] = 'C' # Carving
            ans['63'] = 'C' # Benin
            
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
            
            # Critical user instruction: skip questions related to images/diagrams
            if '[diagram]' in content.lower() or '[image' in content.lower() or 'see linked' in content.lower():
                continue
                
            opt_matches = list(re.finditer(r'(?:^|\n)\s*([A-D])\.\s*(.*?)(?=\n\s*[A-D]\.|$)', content, re.DOTALL))
            if len(opt_matches) != 4:
                continue
                
            stem = content[:opt_matches[0].start()].strip()
            stem = ' '.join(stem.split())
            if not stem or len(stem) < 3:
                continue
                
            opts = {}
            for om in opt_matches:
                label = om.group(1)
                val = om.group(2).strip()
                opts[label] = ' '.join(val.split())
                
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
            
        results[yr] = questions
    return results

# Process Art
art_data = parse_subject_papers('jambprep/scripts/extracted-fine-arts.txt', 'ART')
for yr, qs in art_data.items():
    dataset = []
    for idx, q in enumerate(qs):
        slug = classify_art(q['stem'], [q['a'], q['b'], q['c'], q['d']])
        ref = f"ART-{yr}-{idx+1:03d}"
        explanation = f"The correct answer is Option {q['corr']}: {q[q['corr'].lower()]}. In Fine and Applied Arts, this aligns with canonical art history, design principles, and technical studio practices."
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
            'tags': f"fine-art|{slug}|jamb-{yr}"
        })
    out_file = f"jambprep/scripts/dataset-art-{yr}.mjs"
    with open(out_file, 'w') as f:
        f.write(f"export const questions{yr} = {json.dumps(dataset, indent=2)};\nexport const questions = questions{yr};\n")
    print(f"[ART] Wrote {len(dataset)} questions to {out_file}")

# Process Music
mus_data = parse_subject_papers('jambprep/scripts/extracted-music.txt', 'MUS')
for yr, qs in mus_data.items():
    dataset = []
    for idx, q in enumerate(qs):
        slug = classify_music(q['stem'], [q['a'], q['b'], q['c'], q['d']])
        ref = f"MUS-{yr}-{idx+1:03d}"
        explanation = f"The correct answer is Option {q['corr']}: {q[q['corr'].lower()]}. In music theory, ethnomusicology, and history, this aligns with conventional harmonic structures, instrument categories, or historical periods."
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
            'tags': f"music|{slug}|jamb-{yr}"
        })
    out_file = f"jambprep/scripts/dataset-music-{yr}.mjs"
    with open(out_file, 'w') as f:
        f.write(f"export const questions{yr} = {json.dumps(dataset, indent=2)};\nexport const questions = questions{yr};\n")
    print(f"[MUS] Wrote {len(dataset)} questions to {out_file}")
