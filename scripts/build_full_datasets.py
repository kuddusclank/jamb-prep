import json, re, sys

with open('jambprep/scripts/parsed_raw_history.json') as f:
    raw_data = json.load(f)

ALLOWED_TOPICS = [
    'early-nigerian-civilizations-nok-culture',
    'igbo-ukwu-bronze-metallurgy',
    'kingdom-of-benin-dynastic-evolution',
    'the-old-oyo-empire-constitutional-structure',
    'kanem-borno-empire-the-saifawa-dynasty',
    'trans-saharan-trade-and-islam',
    'the-19th-century-sokoto-jihad',
    'the-yoruba-19th-century-wars',
    'british-conquest-the-benin-punitive-expedition',
    'the-1914-amalgamation-of-nigeria',
    'nationalist-movements-early-parties',
    'nigeria-s-independence-1960-coalition',
    'the-nigerian-civil-war-1967-1970-',
    'military-rule-the-murtala-obasanjo-regime',
    'the-fourth-republic-1999-transition-',
    'african-history-and-liberation-struggles',
    'world-history-and-international-relations',
    'historiography-and-sources-of-history',
    'colonial-administration-and-constitutional-development',
    'post-independence-nigeria-and-military-regimes',
    'pre-colonial-systems-and-inter-group-relations'
]

print("Ready to process datasets.")
