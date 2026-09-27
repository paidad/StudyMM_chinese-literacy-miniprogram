var assert = require('assert');
var queue = require('../utils/learning-queue.js');

assert.deepStrictEqual(queue.createSecondRound(['一', '二', '一']), ['一', '二']);

var taught = [
  { char: '一', pinyin: 'yī' },
  { char: '衣', pinyin: 'yī' },
  { char: '二', pinyin: 'èr' },
  { char: '三', pinyin: 'sān' },
  { char: '人', pinyin: 'rén' },
  { char: '口', pinyin: 'kǒu' }
];
var questions = queue.createQuizQuestions([taught[0], taught[2]], taught);

assert.strictEqual(questions.length, 2);
questions.forEach(function (question) {
  assert.ok(question.options.length <= 4);
  assert.ok(question.options.some(function (option) {
    return option.char === question.answer.char;
  }));
  question.options.forEach(function (option) {
    if (option.char !== question.answer.char) {
      assert.notStrictEqual(option.pinyin, question.answer.pinyin);
      assert.ok(taught.some(function (card) {
        return card.char === option.char;
      }));
    }
  });
});

console.log('All learning queue tests passed.');
