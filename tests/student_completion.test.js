import assert from 'node:assert';
import test from 'node:test';
import { computeCompletionPercent } from '../lib/student/progress.js';

test('computeCompletionPercent basic scenarios', () => {
  assert.strictEqual(computeCompletionPercent(0, 0), 0);
  assert.strictEqual(computeCompletionPercent(0, 10), 0);
  assert.strictEqual(computeCompletionPercent(5, 10), 50);
  assert.strictEqual(computeCompletionPercent(10, 10), 100);
  assert.strictEqual(computeCompletionPercent(15, 10), 100);
  assert.strictEqual(computeCompletionPercent(NaN, 10), 0);
  assert.strictEqual(computeCompletionPercent(5, NaN), 0);
  assert.strictEqual(computeCompletionPercent(-1, 10), 0);
  assert.strictEqual(computeCompletionPercent(5, -10), 0);
});
