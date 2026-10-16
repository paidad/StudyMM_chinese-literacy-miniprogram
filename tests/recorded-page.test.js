var assert = require('assert');
var storage = require('../utils/storage.js');
var appData = require('../utils/app-data.js');
var pageConfig;
var state = storage.createDefaultState();
var modalConfirm = true;
var played = [];

state.chars['山'] = { char: '山', pinyin: 'shān', lastInputAt: 10, updatedAt: 10 };
state.chars['医院'] = { char: '医院', pinyin: 'yī yuàn', lastInputAt: 20, updatedAt: 20 };
state.chars['河'] = { char: '河', pinyin: 'hé', lastInputAt: 30, updatedAt: 30 };
state.progress['山'] = { char: '山', firstAt: 11 };
state.progress['医院'] = { char: '医院', firstAt: 21 };
state.progress['一'] = { char: '一', firstAt: 5 };
state.recordings['山'] = '/user/shan.mp3';
state.today.chars = ['河'];

global.Page = function (config) { pageConfig = config; };
global.wx = {
  getStorageSync: function () { return state; },
  setStorageSync: function (key, value) { state = value; },
  showModal: function (options) { options.success({ confirm: modalConfirm }); },
  createInnerAudioContext: function () {
    return {
      onEnded: function () {},
      onError: function () {},
      play: function () { played.push(this.src); },
      stop: function () {},
      destroy: function () {}
    };
  }
};

require('../pages/profile/profile.js');
var page = {};
Object.keys(pageConfig).forEach(function (key) {
  if (key !== 'data') { page[key] = pageConfig[key]; }
});
page.data = JSON.parse(JSON.stringify(pageConfig.data));
page.setData = function (patch) {
  Object.keys(patch).forEach(function (key) { page.data[key] = patch[key]; });
};

page.onShow();
assert.deepStrictEqual(page.data.recordedItems.map(function (item) { return item.char; }), ['医院', '山']);
assert.strictEqual(page.data.recordedCount, 2, 'not-yet-known and default-only words stay out');
state.today = { date: '2026-10-17', chars: [] };
page.onShow();
assert.strictEqual(page.data.recordedCount, 2, 'clearing and crossing days do not remove learned input');
page.onRecordedTap({ currentTarget: { dataset: { char: '山' } } });
assert.deepStrictEqual(played, ['/user/shan.mp3'], 'family recording has priority');

page.onOrganizeTap();
page.onRecordedTap({ currentTarget: { dataset: { char: '山' } } });
assert.strictEqual(page.data.selectedCount, 1);
assert.strictEqual(played.length, 1, 'selection does not play audio');
modalConfirm = false;
page.onRemoveSelectedTap();
assert.strictEqual(page.data.recordedCount, 2, 'cancel keeps the tile');
modalConfirm = true;
page.onRemoveSelectedTap();
assert.deepStrictEqual(page.data.recordedItems.map(function (item) { return item.char; }), ['医院']);
assert.ok(state.progress['山'], 'learning progress is retained');
assert.strictEqual(state.recordings['山'], '/user/shan.mp3', 'recording is retained');
assert.deepStrictEqual(state.today.chars, [], 'current task is unchanged');

state.chars['山'].lastInputAt = 40;
delete state.hiddenRecorded['山'];
page.onShow();
assert.deepStrictEqual(page.data.recordedItems.map(function (item) { return item.char; }), ['山', '医院'], 're-entry restores and reorders once');

var oldState = storage.createDefaultState();
oldState.chars['木'] = { char: '木', pinyin: 'mù', updatedAt: 7 };
oldState.progress['木'] = { char: '木', firstAt: 5 };
assert.deepStrictEqual(appData.getRecordedLearnedCards(oldState).map(function (item) { return item.char; }), ['木'], 'old input records remain visible');

console.log('All recorded page tests passed.');
