import test from 'node:test';
import assert from 'node:assert/strict';

// Helper reproduction to verify week key and expiry boundaries in UTC+1 (WAT)
function getWatWeekKey(now) {
  const watMs = now.getTime() + 3600000;
  const watDate = new Date(watMs);
  const dayOfWeek = watDate.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(watMs - daysSinceMonday * 86400000);
  const year = monday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7;
  const firstMonday = new Date(Date.UTC(year, 0, 4 - firstThursdayDay));
  const weekNum = Math.floor((monday.getTime() - firstMonday.getTime()) / (7 * 86400000)) + 1;
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

function getWatWeekExpiry(now) {
  const watMs = now.getTime() + 3600000;
  const watDate = new Date(watMs);
  const dayOfWeek = watDate.getUTCDay();
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  const sundayWatMs = watMs + daysUntilSunday * 86400000;
  const sundayWat = new Date(sundayWatMs);
  const sundayEndWat = Date.UTC(
    sundayWat.getUTCFullYear(),
    sundayWat.getUTCMonth(),
    sundayWat.getUTCDate(),
    23, 59, 59, 999
  );
  return new Date(sundayEndWat - 3600000);
}

test('getWatWeekKey produces consistent Monday-Sunday week identifiers', () => {
  // 2026-10-21 is a Wednesday
  const wednesday = new Date('2026-10-21T12:00:00Z');
  const weekKeyWed = getWatWeekKey(wednesday);
  assert.equal(weekKeyWed, '2026-W43');

  // Monday of the same week
  const monday = new Date('2026-10-19T08:00:00Z');
  assert.equal(getWatWeekKey(monday), '2026-W43');

  // Sunday evening in WAT (e.g. 2026-10-25 22:00 UTC = 23:00 WAT)
  const sundayNight = new Date('2026-10-25T22:00:00Z');
  assert.equal(getWatWeekKey(sundayNight), '2026-W43');

  // Following Monday morning in WAT (2026-10-26 00:01 WAT = 2026-10-25 23:01 UTC)
  const nextMonday = new Date('2026-10-25T23:01:00Z');
  assert.equal(getWatWeekKey(nextMonday), '2026-W44');
});

test('getWatWeekExpiry sets expiration to Sunday 23:59:59 WAT (22:59:59 UTC)', () => {
  const wednesday = new Date('2026-10-21T12:00:00Z');
  const expiry = getWatWeekExpiry(wednesday);
  assert.equal(expiry.toISOString(), '2026-10-25T22:59:59.999Z');
});
