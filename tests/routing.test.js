var assert = require('assert');
var pageConfig;
var storageMemory = {};
var navigationCalls = [];
var wxCallCount = 0;
var scheduledTimer;
var countdownTimer;

global.Page = function (config) {
  pageConfig = config;
};

global.wx = {
  getStorageSync: function (key) {
    wxCallCount += 1;
    return storageMemory[key];
  },
  setStorageSync: function (key, value) {
    wxCallCount += 1;
    storageMemory[key] = value;
  },
  createInnerAudioContext: function () {
    wxCallCount += 1;
    return {
      onEnded: function (callback) { this.endedCallback = callback; },
      onError: function (callback) { this.errorCallback = callback; },
      play: function () {},
      stop: function () {},
      destroy: function () {}
    };
  },
  navigateTo: function (options) {
    wxCallCount += 1;
    navigationCalls.push({ method: 'navigateTo', url: options.url });
  },
  redirectTo: function (options) {
    wxCallCount += 1;
    navigationCalls.push({ method: 'redirectTo', url: options.url });
  }
};

global.setTimeout = function (callback, delay) {
  scheduledTimer = {
    callback: callback,
    delay: delay,
    cleared: false
  };
  return scheduledTimer;
};

global.clearTimeout = function (timer) {
  timer.cleared = true;
};

global.setInterval = function (callback, delay) {
  countdownTimer = { callback: callback, delay: delay, cleared: false };
  return countdownTimer;
};

global.clearInterval = function (timer) {
  timer.cleared = true;
};

require('../pages/index/index.js');
assert.strictEqual(wxCallCount, 0, 'loading the page must not call wx before Page registration');

var page = {};
var configKey;
for (configKey in pageConfig) {
  if (Object.prototype.hasOwnProperty.call(pageConfig, configKey) && configKey !== 'data') {
    page[configKey] = pageConfig[configKey];
  }
}
page.data = JSON.parse(JSON.stringify(pageConfig.data));
page.setData = function (patch) {
  var key;
  for (key in patch) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      this.data[key] = patch[key];
    }
  }
};

pageConfig.onShow.call(page);
assert.strictEqual(page.data.todayItems.length, 6);
assert.strictEqual(page.data.showLessonControls, true);
pageConfig.onPreviousLessonTap.call(page);
assert.strictEqual(page.data.notice, '已经是第一课了');
pageConfig.onNextLessonTap.call(page);
assert.deepStrictEqual(page.data.todayItems.map(function (item) { return item.char; }), ['杯', '盘', '纸', '床', '被', '巾']);
assert.strictEqual(page.data.notice, '已经切换到下一课');
pageConfig.onPreviousLessonTap.call(page);
assert.deepStrictEqual(page.data.todayItems.map(function (item) { return item.char; }), ['门', '窗', '灯', '桌', '椅', '碗']);
page.appData.setCourseLesson(page.localState, page.course, 34, Date.now());
page.refreshTodayView('');
pageConfig.onNextLessonTap.call(page);
assert.strictEqual(page.data.notice, '已经是最后一课了');
page.appData.setCourseLesson(page.localState, page.course, 0, Date.now());
page.refreshTodayView('');
page.localState.chars['医院'] = {
  char: '医院', pinyin: 'yī yuàn', words: ['看病'], sentence: '', tip: '', lesson: 0
};
page.localState.today = { date: '2026-09-01', chars: ['医院'] };
page.localState.courseMode = 'custom';
page.refreshTodayView('');
assert.deepStrictEqual(page.data.todayItems.map(function (item) { return item.char; }), ['医院']);
assert.strictEqual(page.data.showLessonControls, false);
assert.strictEqual(page.data.showDefaultCourseSwitch, true);
pageConfig.onDefaultCourseTap.call(page);
assert.strictEqual(page.localState.courseMode, 'default');
assert.strictEqual(page.data.showLessonControls, true);
assert.strictEqual(page.data.showDefaultCourseSwitch, false);
assert.strictEqual(page.data.notice, '已切换到默认课程');
pageConfig.onWordTap.call(page, { currentTarget: { dataset: { index: 1 } } });
assert.strictEqual(page.data.notice, '正在读“窗”');
pageConfig.onStartTap.call(page);
assert.deepStrictEqual(navigationCalls.pop(), {
  method: 'navigateTo',
  url: '/study/pages/learn/learn?mode=today'
});

pageConfig.onReviewTap.call(page);
assert.deepStrictEqual(navigationCalls.pop(), {
  method: 'redirectTo',
  url: '/pages/review/review'
});

pageConfig.onProfileTap.call(page);
assert.deepStrictEqual(navigationCalls.pop(), {
  method: 'redirectTo',
  url: '/pages/profile/profile'
});

pageConfig.onInputTouchStart.call(page);
assert.strictEqual(scheduledTimer.delay, 3000);
assert.strictEqual(page.data.inputNavLabel, '3');
countdownTimer.callback();
assert.strictEqual(page.data.inputNavLabel, '2');
pageConfig.onInputTouchEnd.call(page);
assert.strictEqual(page.data.inputNavLabel, '录入');
if (!scheduledTimer.cleared) {
  scheduledTimer.callback();
}
assert.strictEqual(navigationCalls.length, 0, 'short press must not open input');

pageConfig.onInputTouchStart.call(page);
assert.strictEqual(scheduledTimer.delay, 3000);
countdownTimer.callback();
countdownTimer.callback();
assert.strictEqual(page.data.inputNavLabel, '1');
scheduledTimer.callback();
assert.strictEqual(page.data.inputNavLabel, '录入');
assert.deepStrictEqual(navigationCalls.pop(), {
  method: 'navigateTo',
  url: '/pages/input/input'
});

console.log('All routing tests passed.');
