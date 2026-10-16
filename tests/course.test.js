var assert = require('assert');
var course = require('../data/course.js');
var lessons = course.getLessons();
var cards = course.getAllCards();
var seen = {};

assert.strictEqual(lessons.length, 30);
lessons.forEach(function (lesson) {
  assert.strictEqual(lesson.cards.length, 7, lesson.title + ' must contain 7 characters');
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
assert.strictEqual(course.getCardMap()['一'].pinyin, 'yī');
assert.deepStrictEqual(lessons[0].cards.map(function (item) { return item.char; }), ['一', '二', '三', '十', '人', '口', '我']);
assert.deepStrictEqual(lessons[29].cards.map(function (item) { return item.char; }), ['公', '园', '老', '伴', '午', '们', '平']);

var checkpoints = [
  [3, '你好，爸妈好。'],
  [6, '我有爸妈，爸妈有我。'],
  [9, '早上天晴，我看云。'],
  [12, '我在家洗菜，妈妈煮饭。'],
  [15, '三人坐车，四人走路。'],
  [18, '我拿钱去市场买菜，一斤三元钱。'],
  [21, '女儿发微信，问我好不好。'],
  [24, '我可以回微信，女儿很高兴。'],
  [27, '我和女儿去市场，路上车多，小心慢行。'],
  [30, '今天天晴，我和老伴去公园。路上车多，我们小心慢行。中午回家吃饭，我很高兴。']
];
checkpoints.forEach(function (item) {
  var taught = {};
  lessons.slice(0, item[0]).forEach(function (lesson) {
    lesson.cards.forEach(function (card) { taught[card.char] = true; });
  });
  Array.from(item[1]).forEach(function (character) {
    if (/^[\u4e00-\u9fff]$/.test(character)) {
      assert.ok(taught[character], 'checkpoint after lesson ' + item[0] + ' uses untaught “' + character + '”');
    }
  });
});

console.log('All course tests passed.');
