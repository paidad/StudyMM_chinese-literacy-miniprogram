var assert = require('assert');
var fs = require('fs');
var path = require('path');
var storageMemory = {};

var appConfig = require('../app.json');
var registeredPages = appConfig.pages.concat(appConfig.subpackages.reduce(function (result, subpackage) {
  return result.concat(subpackage.pages.map(function (pagePath) {
    return subpackage.root + '/' + pagePath;
  }));
}, []));
assert.strictEqual(appConfig.permission, undefined, 'record permission must be requested at runtime, not declared in app.json');
registeredPages.forEach(function (pagePath) {
  assert.ok(fs.existsSync(path.join(__dirname, '..', pagePath + '.json')), pagePath + '.json must exist');
});

global.setTimeout = function () {
  return { fake: true };
};
global.clearTimeout = function () {};
global.wx = {
  getStorageSync: function (key) { return storageMemory[key]; },
  setStorageSync: function (key, value) { storageMemory[key] = value; }
};

function loadPage(modulePath) {
  var config;
  global.Page = function (pageConfig) { config = pageConfig; };
  delete require.cache[require.resolve(modulePath)];
  require(modulePath);
  var page = {};
  var key;
  for (key in config) {
    if (Object.prototype.hasOwnProperty.call(config, key) && key !== 'data') {
      page[key] = config[key];
    }
  }
  page.data = JSON.parse(JSON.stringify(config.data));
  page.setData = function (patch) {
    var patchKey;
    for (patchKey in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, patchKey)) {
        this.data[patchKey] = patch[patchKey];
      }
    }
  };
  return page;
}

var review = loadPage('../pages/review/review.js');
review.onShow();
assert.strictEqual(review.data.hasDue, false);

var profile = loadPage('../pages/profile/profile.js');
profile.onShow();
assert.strictEqual(profile.data.knownCount, 0);
assert.ok(/^第 1 课/.test(profile.data.lessonText));

var learn = loadPage('../study/pages/learn/learn.js');
learn.onLoad({ mode: 'today' });
assert.strictEqual(learn.data.showCard, true);
assert.strictEqual(learn.data.card.char, '门');
assert.strictEqual(learn.originalCards.length, 6);
assert.strictEqual(learn.data.hasSentence, true);
assert.strictEqual(learn.shouldShowSentence(''), false);
assert.strictEqual(learn.shouldShowSentence('   '), false);
assert.strictEqual(learn.shouldShowSentence('请家人补一句常用的话。'), false);
assert.strictEqual(learn.shouldShowSentence('我回家了。'), true);

var write = loadPage('../stroke/pages/write/write.js');
write.onLoad({ char: encodeURIComponent('一') });
assert.strictEqual(write.data.hasStrokeData, true);
assert.strictEqual(write.strokeList.length, 1);
assert.strictEqual(write.data.status, '点“回放”看笔顺');

var missingWrite = loadPage('../stroke/pages/write/write.js');
missingWrite.onLoad({ char: encodeURIComponent('㐂') });
assert.strictEqual(missingWrite.data.hasStrokeData, false);
assert.ok(missingWrite.data.status.indexOf('还没有笔顺动画') >= 0);

var indexMarkup = fs.readFileSync(path.join(__dirname, '../pages/index/index.wxml'), 'utf8');
var indexStyles = fs.readFileSync(path.join(__dirname, '../pages/index/index.wxss'), 'utf8');
assert.strictEqual(indexMarkup.indexOf('慢慢来，听一听，看一看'), -1);
assert.strictEqual(indexMarkup.indexOf('今天有 {{todayCount}} 个字词'), -1);
assert.strictEqual(indexMarkup.indexOf('复习以前学过的字'), -1);
assert.strictEqual(indexMarkup.indexOf('已经认识的字词'), -1);
assert.ok(indexMarkup.indexOf('{{notice}}') >= 0, 'important failure messages must remain visible');
assert.ok(indexMarkup.indexOf('wx:for="{{todayItems}}"') >= 0, 'today page must list every study item');
assert.ok(indexMarkup.indexOf('data-index="{{item.index}}"') >= 0, 'each study item must be independently clickable');
assert.ok(indexMarkup.indexOf('{{item.pinyin}}') >= 0, 'each study item must show its pinyin');
assert.ok(indexMarkup.indexOf('bindtap="onPreviousLessonTap"') >= 0);
assert.ok(indexMarkup.indexOf('←</text><text>上一课') >= 0);
assert.ok(indexMarkup.indexOf('bindtap="onNextLessonTap"') >= 0);
assert.ok(indexMarkup.indexOf('下一课</text><text class="lesson-arrow lesson-arrow-right">→') >= 0);
assert.ok(indexMarkup.indexOf('bindtap="onCustomCourseTap"') >= 0);
assert.ok(indexMarkup.indexOf('>切换到录入课程</button>') >= 0);
assert.ok(indexMarkup.indexOf('bindtap="onDefaultCourseTap"') >= 0);
assert.ok(indexMarkup.indexOf('↩</text><text>切换到默认课程') >= 0);
assert.ok(/\.lesson-nav\s*\{[^}]*position:\s*fixed;[^}]*bottom:\s*310rpx;/m.test(indexStyles));
assert.ok(/\.custom-course-switch\s*\{[^}]*position:\s*fixed;[^}]*bottom:\s*430rpx;/m.test(indexStyles));
assert.ok(/\.default-course-button\s*\{[^}]*width:\s*100%;/m.test(indexStyles));

var inputMarkup = fs.readFileSync(path.join(__dirname, '../pages/input/input.wxml'), 'utf8');
var inputStyles = fs.readFileSync(path.join(__dirname, '../pages/input/input.wxss'), 'utf8');
assert.ok(inputMarkup.indexOf('>加入学习</button>') >= 0);
assert.ok(inputMarkup.indexOf('bindtap="onTodayWordTap"') >= 0);
assert.ok(inputMarkup.indexOf('bindtap="onRecordRowTap"') >= 0);
assert.ok(inputMarkup.indexOf('bindtap="onSupplementTap"') >= 0);
assert.ok(inputMarkup.indexOf('bindtap="onRemoveTodayTap"') >= 0);
assert.ok(inputMarkup.indexOf('wx:if="{{showSupplement}}" class="modal-mask"') >= 0);
assert.ok(inputMarkup.indexOf('nav-item nav-current') >= 0);
assert.ok(/\.bottom-nav\s*\{[^}]*position:\s*fixed;[^}]*bottom:\s*0;/m.test(inputStyles));

var learnMarkup = fs.readFileSync(path.join(__dirname, '../study/pages/learn/learn.wxml'), 'utf8');
var learnStyles = fs.readFileSync(path.join(__dirname, '../study/pages/learn/learn.wxss'), 'utf8');
assert.ok(learnMarkup.indexOf('✎</text><text>看怎么写') >= 0);
assert.ok(learnMarkup.indexOf('×</text><text>还不熟') >= 0);
assert.ok(learnMarkup.indexOf('✓</text><text>认识了') >= 0);
assert.ok(learnMarkup.indexOf('wx:if="{{hasSentence}}" class="sentence-button"') >= 0);
assert.ok(/\.write-action\s*\{[^}]*border:\s*4rpx solid #a63e0c;[^}]*background:\s*#a63e0c;/m.test(learnStyles));
assert.ok(/\.primary-button\s*\{[^}]*bottom:\s*170rpx;/m.test(indexStyles));
assert.ok(/\.study-actions\s*\{[^}]*bottom:\s*170rpx;/m.test(learnStyles));

var writeMarkup = fs.readFileSync(path.join(__dirname, '../stroke/pages/write/write.wxml'), 'utf8');
var writeStyles = fs.readFileSync(path.join(__dirname, '../stroke/pages/write/write.wxss'), 'utf8');
assert.ok(writeMarkup.indexOf('↻</text><text>回放') >= 0);
assert.ok(writeMarkup.indexOf('✎</text><text>手写') >= 0);
assert.ok(writeMarkup.indexOf('class="write-button listen-button"') >= 0);
assert.ok(writeMarkup.indexOf('<text class="speaker-icon">🔊</text>') >= 0);
assert.ok(writeMarkup.indexOf('class="trace-action-icon rewrite-icon">↺</text><text>重写') >= 0);
assert.ok(writeMarkup.indexOf('✓</text><text>下一个') >= 0);
assert.ok(writeMarkup.indexOf('class="write-button listen-button trace-listen-button"') >= 0);
assert.ok(/\.trace-mode-button\s*\{[^}]*border:\s*4rpx solid #39704d;[^}]*background:\s*#39704d;/m.test(writeStyles));
assert.ok(/\.done-action\s*\{[^}]*border:\s*4rpx solid #39704D;[^}]*color:\s*#ffffff;[^}]*background:\s*#39704D;/m.test(writeStyles));
assert.ok(/\.listen-button\s*\{[^}]*background:\s*transparent;/m.test(writeStyles));

console.log('All page smoke tests passed.');
