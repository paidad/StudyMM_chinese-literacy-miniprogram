var assert = require('assert');
var course = require('../data/course.js');
var lessons = course.getLessons();
var cards = course.getAllCards();
var seen = {};

assert.strictEqual(lessons.length, 35);
lessons.forEach(function (lesson) {
  assert.strictEqual(lesson.cards.length, 6, lesson.title + ' must contain 6 characters');
});
cards.forEach(function (card) {
  assert.ok(card.char);
  assert.ok(card.pinyin);
  assert.ok(card.words.length > 0);
  assert.ok(card.sentence);
  assert.ok(card.tip);
  seen[card.char] = true;
});
assert.strictEqual(Object.keys(seen).length, 210);
assert.strictEqual(cards.length, 210, 'every lesson position must be a new character');
assert.strictEqual(course.getCardMap()['门'].pinyin, 'mén');
assert.strictEqual(course.getPinyinMap()['院'], 'yuàn');
assert.strictEqual(course.getCardMap()['一'], undefined, 'already-known number characters are not part of the new course');

console.log('All course tests passed.');
