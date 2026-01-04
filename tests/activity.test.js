const assert = require('assert');
const { computeTotalStudyMinutes, computeExpectedScore } = require('../lib/student/metrics.js');

assert.strictEqual(computeTotalStudyMinutes([]), 0);
assert.strictEqual(computeTotalStudyMinutes([{ duration_minutes: 10 }, { duration_minutes: 5 }]), 15);
assert.strictEqual(computeTotalStudyMinutes([{ duration_minutes: -3 }, { duration_minutes: '7.8' }]), 7);

assert.strictEqual(computeExpectedScore([]), null);
assert.strictEqual(computeExpectedScore([{ score: 100 }]), 100);
assert.strictEqual(computeExpectedScore([{ score: 50 }, { score: 70 }, { score: 90 }]), 70);
assert.strictEqual(computeExpectedScore([{ score: -10 }, { score: 105 }]), 50);

const bigSessions = Array.from({ length: 10000 }, (_, i) => ({ duration_minutes: i % 60 }));
const startS = Date.now();
const total = computeTotalStudyMinutes(bigSessions);
const durS = Date.now() - startS;
assert.ok(total > 0);
assert.ok(durS < 2000);

const bigResults = Array.from({ length: 10000 }, (_, i) => ({ score: i % 101 }));
const startR = Date.now();
const avg = computeExpectedScore(bigResults);
const durR = Date.now() - startR;
assert.ok(avg !== null);
assert.ok(durR < 2000);
