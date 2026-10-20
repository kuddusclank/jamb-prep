import test from 'node:test';
import assert from 'node:assert/strict';
import { DictionaryService } from '../src/lib/dictionary/dictionary-service.ts';
import { UTME_LEXICON } from '../src/lib/dictionary/utme-lexicon-data.ts';
import { 
  STRESS_GAME_ITEMS, 
  EMPHATIC_STRESS_ITEMS, 
  SOUND_MATCH_ITEMS, 
  SILENT_LETTER_ITEMS, 
  SYN_ANTONYM_ITEMS 
} from '../src/lib/dictionary/game-data.ts';

test('UTME Lexicon data integrity and accuracy', () => {
  assert.ok(UTME_LEXICON.length >= 10, 'Curated lexicon should contain at least 10 high-yield UTME entries');

  for (const entry of UTME_LEXICON) {
    assert.ok(entry.word && entry.word.length > 1, `Word must not be empty: ${entry.id}`);
    assert.ok(entry.definition && entry.definition.length > 5, `Definition must be clear for ${entry.word}`);
    assert.ok(entry.contextSentence && entry.contextSentence.length > 5, `Context sentence must exist for ${entry.word}`);
    assert.ok(Array.isArray(entry.synonyms), `Synonyms must be array for ${entry.word}`);
    assert.ok(Array.isArray(entry.antonyms), `Antonyms must be array for ${entry.word}`);
    
    // Phonetics check
    assert.ok(entry.phonetics.ipa, `IPA transcription required for ${entry.word}`);
    assert.ok(entry.phonetics.syllables.length > 0, `Syllable list must not be empty for ${entry.word}`);
    assert.ok(
      entry.phonetics.primaryStressIndex >= 0 && 
      entry.phonetics.primaryStressIndex < entry.phonetics.syllables.length,
      `Primary stress index must be in range of syllables for ${entry.word}`
    );

    // Verb conjugation check for irregular verbs
    if (entry.verbForms) {
      assert.ok(entry.verbForms.base, `Verb base form required for ${entry.word}`);
      assert.ok(entry.verbForms.past, `Verb past form required for ${entry.word}`);
      assert.ok(entry.verbForms.pastParticiple, `Verb past participle required for ${entry.word}`);
    }
  }
});

test('DictionaryService local search matches word, definition, and synonyms', () => {
  const matchWord = DictionaryService.searchWords('subtle');
  assert.ok(matchWord.some(w => w.word.toLowerCase() === 'subtle'), 'Should find subtle by word name');

  const matchDef = DictionaryService.searchWords('reserved');
  assert.ok(matchDef.some(w => w.word.toLowerCase() === 'taciturn'), 'Should find taciturn by definition containing reserved');

  const matchSyn = DictionaryService.searchWords('fleeting');
  assert.ok(matchSyn.some(w => w.word.toLowerCase() === 'ephemeral'), 'Should find ephemeral via synonym fleeting');

  const exactGet = DictionaryService.getWord('RECEIPT');
  assert.equal(exactGet?.word.toLowerCase(), 'receipt');
  assert.equal(exactGet?.phonetics.silentLetters?.[0].letter, 'p');
});

test('Deterministic Daily 5 generator produces 5 entries and varies across days', () => {
  const pack1 = DictionaryService.getDailyFive('2026-05-10');
  const pack1Repeat = DictionaryService.getDailyFive('2026-05-10');
  const pack2 = DictionaryService.getDailyFive('2026-05-11');

  assert.equal(pack1.words.length, 5, 'Daily pack must contain 5 words');
  assert.deepEqual(pack1.words.map(w => w.id), pack1Repeat.words.map(w => w.id), 'Same date must produce identical Daily 5 pack');
  assert.notDeepEqual(pack1.words.map(w => w.id), pack2.words.map(w => w.id), 'Different dates should produce different packs');
});

test('Word Game datasets: Stress Master & Emphatic Contrast validation', () => {
  assert.ok(STRESS_GAME_ITEMS.length >= 5, 'Should have at least 5 syllable stress drills');
  for (const drill of STRESS_GAME_ITEMS) {
    assert.ok(drill.syllables.length > 1, `Syllable drill word must have multiple syllables: ${drill.word}`);
    assert.ok(drill.stressedIndex >= 0 && drill.stressedIndex < drill.syllables.length, `Correct index out of bounds for ${drill.word}`);
    assert.ok(drill.explanation, `Explanation must exist for ${drill.word}`);
  }

  assert.ok(EMPHATIC_STRESS_ITEMS.length >= 2, 'Should have at least 2 emphatic contrast drills');
  for (const drill of EMPHATIC_STRESS_ITEMS) {
    assert.ok(drill.stressedWord, 'Must specify stressed word');
    assert.ok(drill.options.length >= 3, 'Must have at least 3 options');
    assert.ok(drill.options.some(o => o.isCorrect), 'Must have at least 1 correct option');
  }
});

test('Word Game datasets: Sound Match, Synonyms & Silent Letters validation', () => {
  assert.ok(SOUND_MATCH_ITEMS.length >= 5, 'Should have sound match drills');
  for (const drill of SOUND_MATCH_ITEMS) {
    assert.ok(drill.targetSound, 'Sound match drill requires target sound IPA');
    assert.ok(drill.options.length === 4, 'Must have 4 options');
    assert.ok(drill.options.some(o => o.isMatch), 'Must have a matching option');
  }

  assert.ok(SYN_ANTONYM_ITEMS.length >= 5, 'Should have synonym/antonym drills');
  for (const drill of SYN_ANTONYM_ITEMS) {
    assert.ok(['synonym', 'antonym'].includes(drill.mode));
    assert.ok(drill.targetWord && drill.sentence);
    assert.ok(drill.options.length === 4);
    assert.ok(drill.options.includes(drill.correctOption));
  }

  assert.ok(SILENT_LETTER_ITEMS.length >= 5, 'Should have silent letter drills');
  for (const drill of SILENT_LETTER_ITEMS) {
    assert.ok(drill.word);
    assert.ok(drill.silentIndices.length > 0, `Word must have at least one silent index: ${drill.word}`);
    for (const idx of drill.silentIndices) {
      assert.ok(idx >= 0 && idx < drill.word.length, `Silent index ${idx} out of range for word ${drill.word}`);
    }
    assert.ok(drill.explanation);
  }
});
