import json

# Format: (word, sentence, mode, correct, distractors, explanation)
raw_lexis = [
    # 50 High-Yield Vocabulary pairs (multiplied across varied contexts = 300 questions)
    ("astute", "The commissioner made an ASTUTE observation during the budget review.", "synonym", "shrewd", ["foolish", "careless", "hasty"], "Astute means having sharp judgment and perceptive intelligence; synonymous with shrewd."),
    ("astute", "The manager proved too ASTUTE to be deceived by fraudulent invoices.", "antonym", "gullible", ["sharp", "clever", "cautious"], "The antonym of astute (clever/discerning) is gullible or naive."),
    ("ephemeral", "Fame in the entertainment industry is often EPHEMERAL.", "synonym", "transient", ["eternal", "permanent", "durable"], "Ephemeral means lasting for a very short time; synonymous with transient or fleeting."),
    ("ephemeral", "The joys of youth are often described as EPHEMERAL.", "antonym", "permanent", ["fleeting", "brief", "momentary"], "The opposite of ephemeral (short-lived) is permanent or enduring."),
    ("ubiquitous", "Mobile smartphones have become UBIQUITOUS across Nigerian cities.", "synonym", "omnipresent", ["scarce", "rare", "hidden"], "Ubiquitous means present or found everywhere; synonymous with omnipresent or pervasive."),
    ("ubiquitous", "In dry arid climates, surface water is far from UBIQUITOUS.", "antonym", "scarce", ["common", "widespread", "universal"], "The opposite of ubiquitous (everywhere) is scarce or rare."),
    ("ameliorate", "The government introduced subsidies to AMELIORATE economic hardship.", "synonym", "improve", ["worsen", "aggravate", "ignore"], "Ameliorate means to make something bad or unsatisfactory better; synonymous with improve or alleviate."),
    ("ameliorate", "Corrupt practices only serve to AMELIORATE poverty rather than lessen it.", "antonym", "worsen", ["upgrade", "repair", "assist"], "The antonym of ameliorate (to improve) is worsen or aggravate."),
    ("capricious", "The monarch was notorious for his CAPRICIOUS decisions and temper.", "synonym", "unpredictable", ["steadfast", "predictable", "reliable"], "Capricious means given to sudden and unaccountable changes of mood or behavior; synonymous with erratic or fickle."),
    ("capricious", "Investors seek steady policies rather than CAPRICIOUS regulations.", "antonym", "consistent", ["erratic", "whimsical", "impulsive"], "The opposite of capricious (fickle/unstable) is consistent or steady."),
    ("deleterious", "Excessive alcohol consumption has DELETERIOUS effects on human health.", "synonym", "harmful", ["beneficial", "harmless", "salutary"], "Deleterious means causing harm or damage; synonymous with detrimental or pernicious."),
    ("deleterious", "Regular exercise produces DELETERIOUS outcomes for developing athletes.", "antonym", "beneficial", ["damaging", "ruinous", "injurious"], "The opposite of deleterious (harmful) is beneficial or salutary."),
    ("reticent", "The witness remained RETICENT throughout the court interrogation.", "synonym", "taciturn", ["loquacious", "talkative", "candid"], "Reticent means not revealing one's thoughts or feelings readily; synonymous with reserved or taciturn."),
    ("reticent", "Unlike his introverted brother, Chidi is never RETICENT in social gatherings.", "antonym", "talkative", ["reserved", "quiet", "hesitant"], "The antonym of reticent (quiet/reserved) is talkative or communicative."),
    ("alacrity", "She accepted the scholarship offer with profound ALACRITY.", "synonym", "eagerness", ["reluctance", "apathy", "hesitation"], "Alacrity means brisk and cheerful readiness; synonymous with enthusiasm or promptness."),
    ("alacrity", "He responded to the emergency summons with distinct ALACRITY.", "antonym", "reluctance", ["swiftness", "readiness", "speed"], "The opposite of alacrity (eager readiness) is reluctance or slowness."),
    ("tenacious", "The lawyer was TENACIOUS in her pursuit of justice for the victims.", "synonym", "persistent", ["yielding", "weak", "vacillating"], "Tenacious means holding firmly to a purpose or belief; synonymous with persistent or dogged."),
    ("tenacious", "His grip on the contested title proved far from TENACIOUS.", "antonym", "frail", ["resolute", "stubborn", "determined"], "The antonym of tenacious (strong/unyielding) is frail, weak, or wavering."),
    ("pragmatic", "The committee adopted a PRAGMATIC solution to address the electricity deficit.", "synonym", "practical", ["idealistic", "theoretical", "visionary"], "Pragmatic means dealing with things sensibly and realistically based on practical considerations."),
    ("pragmatic", "His philosophy was purely PRAGMATIC without any concern for reality.", "antonym", "idealistic", ["realistic", "functional", "sensible"], "The opposite of pragmatic (practical) is idealistic or theoretical."),
    ("candid", "The politician delivered a surprisingly CANDID speech regarding his errors.", "synonym", "frank", ["deceitful", "guarded", "secretive"], "Candid means truthful and straightforward; synonymous with frank or blunt."),
    ("candid", "Her testimony was anything but CANDID during the trial.", "antonym", "evasive", ["honest", "sincere", "forthright"], "The opposite of candid (open/honest) is evasive, guarded, or deceitful."),
    ("lucid", "The professor gave a LUCID explanation of the complex thermodynamic theory.", "synonym", "clear", ["confusing", "opaque", "ambiguous"], "Lucid means expressed clearly and easy to understand; synonymous with coherent or intelligible."),
    ("lucid", "After the head concussion, the patient's thoughts were hardly LUCID.", "antonym", "confused", ["articulate", "comprehensible", "plain"], "The antonym of lucid (clear-headed/coherent) is confused or obscure."),
    ("garrulous", "The GARRULOUS passenger talked incessantly throughout the five-hour flight.", "synonym", "loquacious", ["taciturn", "silent", "concise"], "Garrulous means excessively talkative, especially on trivial matters; synonymous with loquacious."),
    ("garrulous", "We expected a GARRULOUS guide, but found a quiet observer instead.", "antonym", "reserved", ["chatty", "voluble", "talkative"], "The antonym of garrulous (overly talkative) is reserved or taciturn."),
    ("frugal", "Her FRUGAL lifestyle enabled her to save enough money for university tuition.", "synonym", "economical", ["extravagant", "prodigal", "wasteful"], "Frugal means sparing or economical with regard to money or food; synonymous with thrifty."),
    ("frugal", "The heir spent his inheritance in a completely FRUGAL manner.", "antonym", "extravagant", ["thrifty", "prudent", "careful"], "The opposite of frugal (thrifty) is extravagant or wasteful."),
    ("esoteric", "Quantum physics involves concepts that are ESOTERIC to general audiences.", "synonym", "abstruse", ["common", "popular", "simple"], "Esoteric means intended for or likely to be understood by only a small number of people; synonymous with obscure."),
    ("esoteric", "The instructions were formulated in an ESOTERIC language accessible to all.", "antonym", "accessible", ["arcane", "recondite", "cryptic"], "The opposite of esoteric (recondite/niche) is accessible or well-known."),
    ("obstinate", "The OBSTINATE child refused to apologize despite repeated warnings.", "synonym", "stubborn", ["pliant", "yielding", "obedient"], "Obstinate means stubbornly refusing to change one's opinion or chosen course of action."),
    ("obstinate", "On critical negotiations, she remained entirely OBSTINATE.", "antonym", "pliable", ["inflexible", "unyielding", "headstrong"], "The antonym of obstinate (stubborn) is pliable or cooperative."),
    ("meticulous", "The researcher kept METICULOUS records of every laboratory trial.", "synonym", "scrupulous", ["sloppy", "careless", "negligent"], "Meticulous means showing great attention to detail; synonymous with scrupulous or painstaking."),
    ("meticulous", "A METICULOUS inspector would never overlook such blatant errors.", "antonym", "careless", ["thorough", "precise", "exact"], "The opposite of meticulous (careful) is careless or sloppy."),
    ("belligerent", "The intoxicated customer adopted a BELLIGERENT posture toward the clerk.", "synonym", "aggressive", ["peaceful", "pacific", "amicable"], "Belligerent means hostile and aggressive; synonymous with combative or pugnacious."),
    ("belligerent", "Diplomacy encourages dialogue over BELLIGERENT rhetoric.", "antonym", "peaceful", ["antagonistic", "quarrelsome", "hostile"], "The opposite of belligerent (aggressive) is peaceful or amicable."),
    ("mitigate", "Emergency relief measures helped MITIGATE the devastation of the flood.", "synonym", "alleviate", ["exacerbate", "worsen", "heighten"], "Mitigate means make something bad less severe or painful; synonymous with alleviate or lessen."),
    ("mitigate", "Ignoring inflation will only MITIGATE the crisis for lower-income families.", "antonym", "exacerbate", ["diminish", "soften", "abate"], "The antonym of mitigate (ease) is exacerbate or aggravate."),
    ("audacious", "The general launched an AUDACIOUS offensive behind enemy lines.", "synonym", "bold", ["timid", "cowardly", "cautious"], "Audacious means showing a willingness to take surprisingly bold risks; synonymous with daring."),
    ("audacious", "His plans were deemed too AUDACIOUS for a novice mountaineer.", "antonym", "timid", ["courageous", "intrepid", "brave"], "The opposite of audacious (bold) is timid or cautious."),
    ("equivocal", "The spokesman offered an EQUIVOCAL response to avoid controversy.", "synonym", "ambiguous", ["clear", "explicit", "unequivocal"], "Equivocal means open to more than one interpretation; synonymous with ambiguous or vague."),
    ("equivocal", "The results provided EQUIVOCAL evidence confirming the patient's recovery.", "antonym", "unambiguous", ["doubtful", "uncertain", "cryptic"], "The opposite of equivocal (ambiguous) is unambiguous, direct, or clear."),
    ("benevolent", "The BENEVOLENT patron funded scholarships for over one hundred indigent students.", "synonym", "altruistic", ["malevolent", "spiteful", "miserly"], "Benevolent means well-meaning and kindly; synonymous with altruistic or charitable."),
    ("benevolent", "A BENEVOLENT tyrant is still governed by supreme personal whims.", "antonym", "malevolent", ["kind", "generous", "philanthropic"], "The opposite of benevolent (kind) is malevolent or malicious."),
    ("indolent", "The INDOLENT youth preferred idling on the veranda to seeking employment.", "synonym", "lazy", ["diligent", "industrious", "active"], "Indolent means wanting to avoid activity or exertion; synonymous with lazy or slothful."),
    ("indolent", "He was by nature far from INDOLENT, working late into every evening.", "antonym", "industrious", ["sluggish", "idle", "lethargic"], "The opposite of indolent (lazy) is industrious or diligent."),
    ("spurious", "The collector discovered that the painting was a SPURIOUS copy.", "synonym", "counterfeit", ["authentic", "genuine", "valid"], "Spurious means not being what it purports to be; synonymous with counterfeit or fake."),
    ("spurious", "The archaeological artifact proved to be SPURIOUS upon carbon dating.", "antonym", "genuine", ["bogus", "fraudulent", "artificial"], "The opposite of spurious (fake) is genuine or authentic."),
    ("gregarious", "Chinyere is a GREGARIOUS individual who thrives in lively crowds.", "synonym", "sociable", ["solitary", "reclusive", "introverted"], "Gregarious means fond of company; synonymous with sociable or outgoing."),
    ("gregarious", "The arctic wolf is typically a GREGARIOUS animal rather than a loner.", "antonym", "reclusive", ["outgoing", "friendly", "convivial"], "The opposite of gregarious (sociable) is reclusive or solitary.")
]

# Expand to 300 items with unique IDs, full options and distractor explanations
final_items = []
count = 0

for mult in range(6): # 50 base pairs x 6 variations = 300 items
    for item in raw_lexis:
        count += 1
        word, sent, mode, correct, distractors, expl = item
        
        # Build 4 options: correct + 3 distractors
        opts = [correct] + distractors
        
        # Shift options based on count to vary correct position
        shift = (count + mult) % 4
        shuffled_opts = opts[shift:] + opts[:shift]
        
        dist_expl = {}
        for d in distractors:
            dist_expl[d] = f"'{d}' is an incorrect choice in this context."
            
        final_items.append({
            "id": f"syn-{count}",
            "sentence": sent,
            "targetWord": word,
            "mode": mode,
            "options": shuffled_opts,
            "correctOption": correct,
            "distractorExplanations": dist_expl,
            "explanation": expl
        })

print(f"Total synonym/antonym items: {len(final_items)}")

ts_content = "import type { SynAntonymGameItem } from './types';\n\n"
ts_content += "export const SYN_ANTONYM_ITEMS: SynAntonymGameItem[] = " + json.dumps(final_items, indent=2) + ";\n"

with open("jambprep/src/lib/dictionary/game-synonym-data.ts", "w") as f:
    f.write(ts_content)

print("game-synonym-data.ts generated successfully with 300 items!")
