var assert = require('assert');
var storage = require('../utils/storage.js');
var appData = require('../utils/app-data.js');
var queue = require('../utils/learning-queue.js');
var srs = require('../utils/srs.js');
var course = require('../data/course.js');
var now = new Date(2026, 8, 26, 9, 0, 0).getTime();
var state = storage.createDefaultState();
var todayCards = appData.getTodayCards(state, course, now);

assert.deepStrictEqual(todayCards.map(function (item) { return item.char; }), ['门', '窗', '灯', '桌', '椅', '碗']);

todayCards.forEach(function (item) {
  state.progress[item.char] = srs.recordFirstSeen(null, item.char, now);
});
assert.deepStrictEqual(queue.createSecondRound(['窗', '窗']), ['窗']);

var questions = queue.createQuizQuestions(todayCards, appData.getTaughtCards(state, course, todayCards));
assert.strictEqual(questions.length, 6);

questions.forEach(function (question) {
  state.progress[question.answer.char] = srs.recordFirstSessionAnswer(
    state.progress[question.answer.char],
    true,
    now + 1000
  );
});
assert.strictEqual(state.progress['门'].stage, 0);
assert.strictEqual(state.progress['门'].nextAt, now + 30 * 60 * 1000);

var dueTime = now + 30 * 60 * 1000;
assert.deepStrictEqual(srs.getDueKeys(state.progress, dueTime), ['门', '窗', '灯', '桌', '椅', '碗']);
state.progress['门'] = srs.recordReview(state.progress['门'], true, dueTime);
assert.strictEqual(state.progress['门'].stage, 1);

console.log('All study flow tests passed.');
