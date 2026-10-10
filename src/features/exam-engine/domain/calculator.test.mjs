import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from './calculator.ts';
test('basic arithmetic and decimal precision', () => {
  assert.equal(calculate(0.1, 0.2, '+'), 0.3);
  assert.equal(calculate(10, 4, '−'), 6);
  assert.equal(calculate(-3, 4, '×'), -12);
  assert.equal(calculate(9, 4, '÷'), 2.25);
});
test('reject invalid results and operators', () => {
  assert.throws(() => calculate(1, 0, '÷'));
  assert.throws(() => calculate(1e308, 1e308, '×'));
  assert.throws(() => calculate(1, 2, 'unknown'));
});
