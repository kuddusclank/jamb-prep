import test from 'node:test';
import assert from 'node:assert/strict';
import { getAttemptAppRating, parseAppRatingInput } from '../worker/services/app-rating-service.ts';

const attemptId = '0f8fad5b-d9cb-469f-a165-70867728950e';
const userId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

function sqlWith(row) {
  return async (parts, ...values) => {
    const query = Array.from(parts).join('?');
    assert.match(query, /FROM attempts a/);
    assert.deepEqual(values, [attemptId, userId]);
    return row ? [row] : [];
  };
}

test('rating input accepts 1–5 and trims optional feedback', () => {
  assert.deepEqual(parseAppRatingInput({ rating: 4, comment: '  Great mock  ' }), { rating: 4, comment: 'Great mock' });
  assert.deepEqual(parseAppRatingInput({ rating: 5 }), { rating: 5, comment: null });
});

test('rating input rejects out-of-range scores and oversized feedback', () => {
  for (const value of [{ rating: 0 }, { rating: 6 }, { rating: 3.5 }, { rating: 4, comment: 'x'.repeat(501) }]) {
    assert.throws(() => parseAppRatingInput(value), (error) => error.status === 422);
  }
});

test('only a completed graded mock is eligible and existing submissions are reported', async () => {
  const result = await getAttemptAppRating(sqlWith({ mode: 'mock', status: 'completed', has_result: true, submitted: true }), userId, attemptId);
  assert.deepEqual(result, { eligible: true, submitted: true });
  const practice = await getAttemptAppRating(sqlWith({ mode: 'practice', status: 'completed', has_result: true, submitted: false }), userId, attemptId);
  assert.deepEqual(practice, { eligible: false, submitted: false });
  const ungraded = await getAttemptAppRating(sqlWith({ mode: 'mock', status: 'completed', has_result: false, submitted: false }), userId, attemptId);
  assert.equal(ungraded.eligible, false);
});

test('rating lookup returns not-found for an attempt not owned by the student', async () => {
  await assert.rejects(getAttemptAppRating(sqlWith(null), userId, attemptId), (error) => error.status === 404);
});
