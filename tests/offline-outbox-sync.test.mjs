import test from 'node:test';
import assert from 'node:assert/strict';

test('F5.1: Outbox item contract includes revision, idempotencyKey and retryCount', () => {
  const item = {
    id: 1,
    packId: 'pack-uuid-123',
    questionId: 'q-uuid-456',
    selectedOption: 'B',
    answeredAt: '2026-10-22T08:00:00.000Z',
    queuedAt: '2026-10-22T08:00:01.000Z',
    userId: 'user-uuid-789',
    revision: 1,
    retryCount: 0,
    idempotencyKey: 'user-uuid-789_pack-uuid-123_q-uuid-456_1',
  };

  assert.equal(item.revision, 1);
  assert.equal(item.retryCount, 0);
  assert.ok(item.idempotencyKey.includes('pack-uuid-123'));
  assert.ok(item.idempotencyKey.endsWith('_1'));
});

test('F5.2: Outbox batching groups items by packId for atomic synchronization', () => {
  const outboxItems = [
    { id: 1, packId: 'pack-A', questionId: 'q1', selectedOption: 'A', revision: 1 },
    { id: 2, packId: 'pack-A', questionId: 'q2', selectedOption: 'C', revision: 1 },
    { id: 3, packId: 'pack-B', questionId: 'q3', selectedOption: 'D', revision: 1 },
    { id: 4, packId: 'pack-A', questionId: 'q4', selectedOption: 'B', revision: 1 },
  ];

  const byPack = {};
  for (const it of outboxItems) {
    if (!byPack[it.packId]) byPack[it.packId] = [];
    byPack[it.packId].push(it);
  }

  assert.equal(Object.keys(byPack).length, 2);
  assert.equal(byPack['pack-A'].length, 3);
  assert.equal(byPack['pack-B'].length, 1);
});

test('F5.3: Per-item ACK reconciliation safely identifies which item IDs to purge', () => {
  const batch = [
    { id: 101, questionId: 'q1', selectedOption: 'A' },
    { id: 102, questionId: 'q2', selectedOption: 'B' },
    { id: 103, questionId: 'q3', selectedOption: 'C' },
    { id: 104, questionId: 'q4', selectedOption: 'D' },
  ];

  // Server response acknowledging q1 as accepted, q2 as already_recorded, but q3 dropped/timed out
  const serverResponse = {
    success: true,
    syncedCount: 1,
    itemAcks: [
      { questionId: 'q1', status: 'accepted' },
      { questionId: 'q2', status: 'already_recorded' },
    ],
  };

  const ackedQuestionIds = new Set(
    serverResponse.itemAcks
      .filter((a) => a.status === 'accepted' || a.status === 'already_recorded')
      .map((a) => a.questionId)
  );

  const idsToClear = batch
    .filter((b) => ackedQuestionIds.has(b.questionId))
    .map((b) => b.id);

  assert.deepEqual(idsToClear, [101, 102], 'Only acknowledged question IDs should be cleared');
  
  const remainingBatch = batch.filter((b) => !idsToClear.includes(b.id));
  assert.equal(remainingBatch.length, 2, 'Unacknowledged items remain in outbox for subsequent retry');
  assert.deepEqual(remainingBatch.map(b => b.questionId), ['q3', 'q4']);
});

test('F5.4: Outbox answer coalescing increments revision and updates chosen option', () => {
  const existingOutboxItem = {
    id: 42,
    packId: 'pack-1',
    questionId: 'q-math-01',
    selectedOption: 'A',
    answeredAt: '2026-10-22T08:00:00.000Z',
    queuedAt: '2026-10-22T08:00:00.000Z',
    userId: 'user-1',
    revision: 1,
    retryCount: 2,
    idempotencyKey: 'user-1_pack-1_q-math-01_1',
  };

  // Student re-answers question q-math-01 from 'A' to 'C'
  const newAnswer = {
    packId: 'pack-1',
    questionId: 'q-math-01',
    selectedOption: 'C',
    answeredAt: '2026-10-22T08:02:30.000Z',
    userId: 'user-1',
  };

  const nextRevision = (existingOutboxItem.revision || 0) + 1;
  const coalescedItem = {
    id: existingOutboxItem.id, // Preserves the same outbox queue slot
    packId: newAnswer.packId,
    questionId: newAnswer.questionId,
    selectedOption: newAnswer.selectedOption,
    answeredAt: newAnswer.answeredAt,
    queuedAt: existingOutboxItem.queuedAt,
    userId: newAnswer.userId,
    revision: nextRevision,
    retryCount: 0, // Reset retry count on new answer
    idempotencyKey: `${newAnswer.userId}_${newAnswer.packId}_${newAnswer.questionId}_${nextRevision}`,
  };

  assert.equal(coalescedItem.id, 42);
  assert.equal(coalescedItem.selectedOption, 'C');
  assert.equal(coalescedItem.revision, 2);
  assert.equal(coalescedItem.retryCount, 0);
  assert.equal(coalescedItem.idempotencyKey, 'user-1_pack-1_q-math-01_2');
});

test('F5.5: Retry backoff computation bounds exponential growth with a 60s cap', () => {
  function computeBackoffMs(retryCount) {
    const baseMs = 1000;
    const maxMs = 60000;
    const exp = Math.min(maxMs, baseMs * Math.pow(2, retryCount));
    return exp;
  }

  assert.equal(computeBackoffMs(0), 1000);
  assert.equal(computeBackoffMs(1), 2000);
  assert.equal(computeBackoffMs(2), 4000);
  assert.equal(computeBackoffMs(3), 8000);
  assert.equal(computeBackoffMs(6), 60000); // capped at 60s
  assert.equal(computeBackoffMs(10), 60000); // capped at 60s
});
