var assert = require('assert');
var course = require('../data/course.js');
var lessons = course.getLessons();
var cards = course.getAllCards();
var seen = {};

assert.strictEqual(lessons.length, 25);
cards.forEach(function (card) {
  assert.ok(card.char);
  assert.ok(card.pinyin);
  assert.ok(card.words.length > 0);
  assert.ok(card.sentence);
  assert.ok(card.tip);
  seen[card.char] = true;
});
assert.strictEqual(Object.keys(seen).length, 79);
assert.strictEqual(course.getCardMap()['一'].pinyin, 'yī');
assert.strictEqual(course.getPinyinMap()['院'], 'yuàn');

console.log('All course tests passed.');
