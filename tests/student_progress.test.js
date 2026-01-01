import assert from 'node:assert';
import test from 'node:test';
import { computeProgressPercent } from '../lib/student/progress.js';

test('computeProgressPercent clamps values to 0..100', () => {
  assert.strictEqual(computeProgressPercent(null), 0);
  assert.strictEqual(computeProgressPercent(NaN), 0);
  assert.strictEqual(computeProgressPercent(-10), 0);
  assert.strictEqual(computeProgressPercent(0), 0);
  assert.strictEqual(computeProgressPercent(50), 50);
  assert.strictEqual(computeProgressPercent(100), 100);
  assert.strictEqual(computeProgressPercent(120), 100);
});
