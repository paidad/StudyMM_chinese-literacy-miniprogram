var assert = require('assert');
var srs = require('../utils/srs.js');
var now = new Date('2026-09-26T00:00:00.000Z').getTime();

var first = srs.recordFirstSeen(null, '一', now);
assert.strictEqual(first.stage, 0);
assert.strictEqual(first.right, 0);
assert.strictEqual(first.wrong, 0);
assert.strictEqual(first.firstAt, now);
assert.strictEqual(first.nextAt, now + 30 * 60 * 1000);

var seenAgain = srs.recordFirstSeen(first, '一', now + 1000);
assert.strictEqual(seenAgain.firstAt, now);
assert.strictEqual(seenAgain.nextAt, first.nextAt);

var correct = srs.recordReview(first, true, now + 2000);
assert.strictEqual(correct.stage, 1);
assert.strictEqual(correct.right, 1);
assert.strictEqual(correct.nextAt, now + 2000 + 24 * 60 * 60 * 1000);

var wrong = srs.recordReview(correct, false, now + 3000);
assert.strictEqual(wrong.stage, 0);
assert.strictEqual(wrong.wrong, 1);
assert.strictEqual(wrong.nextAt, now + 3000 + 30 * 60 * 1000);

var firstAnswer = srs.recordFirstSessionAnswer(first, true, now + 4000);
assert.strictEqual(firstAnswer.stage, 0);
assert.strictEqual(firstAnswer.right, 1);
assert.strictEqual(firstAnswer.nextAt, first.nextAt);

var maximum = srs.recordReview({
  char: '一', stage: 5, right: 8, wrong: 1,
  firstAt: now, lastAt: now, nextAt: now
}, true, now + 5000);
assert.strictEqual(maximum.stage, 5);
assert.strictEqual(maximum.nextAt, now + 5000 + 30 * 24 * 60 * 60 * 1000);

assert.deepStrictEqual(srs.getDueKeys({
  '一': { nextAt: now - 1 },
  '二': { nextAt: now + 1 },
  '三': { nextAt: now }
}, now), ['一', '三']);

console.log('All SRS tests passed.');
