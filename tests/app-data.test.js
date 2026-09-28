var assert = require('assert');
var storage = require('../utils/storage.js');
var appData = require('../utils/app-data.js');
var course = require('../data/course.js');
var now = new Date(2026, 8, 26, 12, 0, 0).getTime();
var state = storage.createDefaultState();

var firstLesson = appData.getTodayCards(state, course, now);
assert.deepStrictEqual(firstLesson.map(function (item) { return item.char; }), ['门', '窗', '灯', '桌', '椅', '碗']);
assert.deepStrictEqual(state.coursePlan, { date: '2026-09-26', lessonIndex: 0 });

firstLesson.forEach(function (item) { state.progress[item.char] = { nextAt: now + 1 }; });
var sameLesson = appData.getTodayCards(state, course, now);
assert.deepStrictEqual(sameLesson.map(function (item) { return item.char; }), ['门', '窗', '灯', '桌', '椅', '碗'], 'today stays on the same full lesson after learning');

var nextDay = now + 24 * 60 * 60 * 1000;
var secondLesson = appData.getTodayCards(state, course, nextDay);
assert.deepStrictEqual(secondLesson.map(function (item) { return item.char; }), ['杯', '盘', '纸', '床', '被', '巾']);
assert.strictEqual(state.coursePlan.lessonIndex, 1);

appData.setCourseLesson(state, course, 0, nextDay);
assert.deepStrictEqual(appData.getTodayCards(state, course, nextDay).map(function (item) { return item.char; }), ['门', '窗', '灯', '桌', '椅', '碗']);

state.chars['医院'] = {
  char: '医院', pinyin: 'yī yuàn', words: ['看病'],
  sentence: '我去医院。', tip: '两个字一起认。', lesson: 0, updatedAt: now
};
state.today = { date: appData.formatDate(now), chars: ['医院'] };
assert.deepStrictEqual(appData.getTodayCards(state, course, now).map(function (item) {
  return item.char;
}), ['医院']);

state.today = { date: appData.formatDate(now), chars: [] };
assert.deepStrictEqual(appData.getTodayCards(state, course, now), [], 'an explicitly cleared day must stay empty');

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
