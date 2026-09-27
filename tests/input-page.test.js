var assert = require('assert');
var pageConfig;
var storageMemory = {};

global.Page = function (config) { pageConfig = config; };
global.wx = {
  env: { USER_DATA_PATH: '/user' },
  getStorageSync: function (key) { return storageMemory[key]; },
  setStorageSync: function (key, value) { storageMemory[key] = value; },
  getFileSystemManager: function () {
    return {
      unlink: function (options) { if (options.success) { options.success(); } },
      saveFile: function () {},
      access: function (options) { if (options.fail) { options.fail(); } }
    };
  },
  getRecorderManager: function () {
    return { onStart: function () {}, onStop: function () {}, onError: function () {} };
  },
  showModal: function (options) { options.success({ confirm: true, cancel: false }); }
};

require('../pages/input/input.js');

function createPage() {
  var page = {};
  var key;
  for (key in pageConfig) {
    if (Object.prototype.hasOwnProperty.call(pageConfig, key) && key !== 'data') {
      page[key] = pageConfig[key];
    }
  }
  page.data = JSON.parse(JSON.stringify(pageConfig.data));
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

var page = createPage();
page.onLoad();
assert.deepStrictEqual(page.data.todayItems.map(function (item) { return item.char; }), ['一', '二', '三']);

page.data.rawInput = '山 河';
page.onAddLearningTap();
assert.deepStrictEqual(page.localState.today.chars, ['山', '河']);
assert.strictEqual(page.data.rawInput, '');
assert.strictEqual(page.data.todayCount, 2);

page.data.rawInput = '山 河';
page.rawInputValue = '山 河';
page.onAddLearningTap();
assert.deepStrictEqual(page.localState.today.chars, ['山', '河'], 'duplicates must not be added twice');

page.onSupplementTap({ currentTarget: { dataset: { char: '山' } } });
assert.strictEqual(page.data.showSupplement, true);
page.onWordsInput({ detail: { value: '山上、高山' } });
page.onSentenceInput({ detail: { value: '那边有座山。' } });
page.onTipInput({ detail: { value: '三个山头。' } });
page.onSaveSupplement();
assert.strictEqual(page.localState.chars['山'].hasSupplement, true);
assert.deepStrictEqual(page.localState.chars['山'].words, ['山上', '高山']);
assert.strictEqual(page.data.todayItems[0].supplementLabel, '✓ 已补充');

page.localState.recordings['山'] = '/user/mountain.mp3';
page.saveState();
page.onRemoveTodayTap({ currentTarget: { dataset: { char: '山' } } });
assert.deepStrictEqual(page.localState.today.chars, ['河']);
assert.strictEqual(page.localState.recordings['山'], '/user/mountain.mp3', 'removing a task must retain its recording');
assert.strictEqual(page.localState.chars['山'].hasSupplement, true, 'removing a task must retain supplements');

page.onClearTodayTap();
assert.deepStrictEqual(page.localState.today.chars, []);
assert.strictEqual(page.data.todayCount, 0);

console.log('All input page tests passed.');
