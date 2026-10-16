var assert = require('assert');
var storage = require('../utils/storage.js');
var appData = require('../utils/app-data.js');
var course = require('../data/course.js');
var now = new Date(2026, 8, 26, 12, 0, 0).getTime();
var state = storage.createDefaultState();

var firstLesson = appData.getTodayCards(state, course, now);
assert.deepStrictEqual(firstLesson.map(function (item) { return item.char; }), ['一', '二', '三', '十', '人', '口', '我']);
assert.deepStrictEqual(state.coursePlan, { date: '2026-09-26', lessonIndex: 0 });

firstLesson.forEach(function (item) { state.progress[item.char] = { nextAt: now + 1 }; });
var sameLesson = appData.getTodayCards(state, course, now);
assert.deepStrictEqual(sameLesson.map(function (item) { return item.char; }), ['一', '二', '三', '十', '人', '口', '我'], 'completed lesson stays selected');

var nextDay = now + 24 * 60 * 60 * 1000;
var secondDayLesson = appData.getTodayCards(state, course, nextDay);
assert.deepStrictEqual(secondDayLesson.map(function (item) { return item.char; }), ['一', '二', '三', '十', '人', '口', '我']);
assert.strictEqual(state.coursePlan.lessonIndex, 0, 'a new day must not change lessons');

appData.setCourseLesson(state, course, 1, nextDay);
assert.deepStrictEqual(appData.getTodayCards(state, course, nextDay).map(function (item) { return item.char; }), ['大', '小', '多', '少', '上', '下', '中']);
assert.strictEqual(appData.getTodayCards(state, course, nextDay + 24 * 60 * 60 * 1000)[0].char, '大', 'manually chosen lesson remains selected');

appData.setCourseLesson(state, course, 0, nextDay);
assert.deepStrictEqual(appData.getTodayCards(state, course, nextDay).map(function (item) { return item.char; }), ['一', '二', '三', '十', '人', '口', '我']);

state.chars['医院'] = {
  char: '医院', pinyin: 'yī yuàn', words: ['看病'],
  sentence: '我去医院。', tip: '两个字一起认。', lesson: 0, updatedAt: now
};
state.today = { date: appData.formatDate(now), chars: ['医院'] };
appData.activateCustomCourse(state, now);
assert.deepStrictEqual(appData.getTodayCards(state, course, now).map(function (item) {
  return item.char;
}), ['医院']);
assert.deepStrictEqual(appData.getTodayCards(state, course, nextDay).map(function (item) {
  return item.char;
}), ['医院'], 'custom course must remain active on later days');
assert.strictEqual(state.coursePlan.lessonIndex, 0, 'custom course must pause the default lesson');

appData.activateDefaultCourse(state, course, nextDay);
assert.strictEqual(state.courseMode, 'default');
assert.strictEqual(state.coursePlan.lessonIndex, 0, 'returning to default must keep the previous lesson');
assert.strictEqual(state.coursePlan.date, '2026-09-27');
assert.deepStrictEqual(appData.getTodayCards(state, course, nextDay).map(function (item) {
  return item.char;
}), ['一', '二', '三', '十', '人', '口', '我']);

state.today = { date: appData.formatDate(now), chars: [] };
appData.activateCustomCourse(state, now);
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
