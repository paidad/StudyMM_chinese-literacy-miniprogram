var assert = require('assert');
var pageConfig;
var storageMemory = {};

global.setTimeout = function () { return { timer: true }; };
global.clearTimeout = function () {};
global.Page = function (config) { pageConfig = config; };
global.wx = {
  getStorageSync: function (key) { return storageMemory[key]; },
  setStorageSync: function (key, value) { storageMemory[key] = value; }
};

require('../study/pages/learn/learn.js');

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

var backPage = createPage();
backPage.onLoad({ mode: 'today' });
assert.strictEqual(backPage.data.card.char, '门');
assert.deepStrictEqual(backPage.localState.progress, {}, 'opening a card must not mark it as learned');
backPage.onUnload();
assert.deepStrictEqual(backPage.localState.progress, {}, 'leaving with the back button must not mark it as learned');

var unfamiliarPage = createPage();
unfamiliarPage.onLoad({ mode: 'today' });
unfamiliarPage.onNotKnownTap();
assert.strictEqual(unfamiliarPage.localState.progress['门'], undefined, 'not familiar must not mark the card as learned');

var knownPage = createPage();
knownPage.onLoad({ mode: 'today' });
knownPage.onKnownTap();
assert.ok(knownPage.localState.progress['门'], 'only the known action marks a new card as learned');
assert.strictEqual(knownPage.localState.progress['门'].char, '门');

console.log('All learn progress tests passed.');
