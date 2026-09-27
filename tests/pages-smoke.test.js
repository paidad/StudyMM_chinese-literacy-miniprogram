var assert = require('assert');
var fs = require('fs');
var path = require('path');
var storageMemory = {};

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
assert.strictEqual(learn.data.card.char, '一');
assert.strictEqual(learn.originalCards.length, 3);
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
assert.ok(/\.listen-button\s*\{[^}]*background:\s*transparent;/m.test(writeStyles));

console.log('All page smoke tests passed.');
