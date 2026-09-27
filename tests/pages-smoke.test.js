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

var write = loadPage('../stroke/pages/write/write.js');
write.onLoad({ char: encodeURIComponent('一') });
assert.strictEqual(write.data.hasStrokeData, true);
assert.strictEqual(write.strokeList.length, 1);

var missingWrite = loadPage('../stroke/pages/write/write.js');
missingWrite.onLoad({ char: encodeURIComponent('㐂') });
assert.strictEqual(missingWrite.data.hasStrokeData, false);
assert.ok(missingWrite.data.status.indexOf('还没有笔顺动画') >= 0);

var indexMarkup = fs.readFileSync(path.join(__dirname, '../pages/index/index.wxml'), 'utf8');
assert.strictEqual(indexMarkup.indexOf('慢慢来，听一听，看一看'), -1);
assert.strictEqual(indexMarkup.indexOf('今天有 {{todayCount}} 个字词'), -1);
assert.strictEqual(indexMarkup.indexOf('复习以前学过的字'), -1);
assert.strictEqual(indexMarkup.indexOf('已经认识的字词'), -1);
assert.ok(indexMarkup.indexOf('{{notice}}') >= 0, 'important failure messages must remain visible');

console.log('All page smoke tests passed.');
