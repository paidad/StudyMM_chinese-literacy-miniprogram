var assert = require('assert');
var storage = require('../utils/storage.js');
var appData = require('../utils/app-data.js');
var course = require('../data/course.js');
var now = new Date(2026, 8, 26, 12, 0, 0).getTime();
var state = storage.createDefaultState();

var firstLesson = appData.getTodayCards(state, course, now);
assert.deepStrictEqual(firstLesson.map(function (item) { return item.char; }), ['一', '二', '三']);

state.progress['一'] = { nextAt: now + 1 };
var remaining = appData.getTodayCards(state, course, now);
assert.deepStrictEqual(remaining.map(function (item) { return item.char; }), ['二', '三']);

state.chars['医院'] = {
  char: '医院', pinyin: 'yī yuàn', words: ['看病'],
  sentence: '我去医院。', tip: '两个字一起认。', lesson: 0, updatedAt: now
};
state.today = { date: appData.formatDate(now), chars: ['医院'] };
assert.deepStrictEqual(appData.getTodayCards(state, course, now).map(function (item) {
  return item.char;
}), ['医院']);

assert.deepStrictEqual(appData.updateStreak({
  lastStudyDate: '', streak: 0, totalSessions: 0
}, now), {
  lastStudyDate: '2026-09-26', streak: 1, totalSessions: 1
});
assert.strictEqual(appData.updateStreak({
  lastStudyDate: '2026-09-25', streak: 2, totalSessions: 2
}, now).streak, 3);
assert.strictEqual(appData.updateStreak({
  lastStudyDate: '2026-09-20', streak: 8, totalSessions: 8
}, now).streak, 1);

console.log('All app data tests passed.');
