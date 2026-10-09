var assert = require('assert');
var storageModule = require('../utils/storage.js');
var storageState = storageModule.createDefaultState();
var pageConfig;

global.Page = function (config) { pageConfig = config; };
global.wx = {
  getStorageSync: function () { return storageState; },
  setStorageSync: function (key, value) { storageState = value; }
};

function createPage(config) {
  var page = {};
  Object.keys(config).forEach(function (key) {
    if (key !== 'data') { page[key] = config[key]; }
  });
  page.data = JSON.parse(JSON.stringify(config.data));
  page.setData = function (patch, callback) {
    Object.assign(this.data, patch);
    if (callback) { callback(); }
  };
  return page;
}

require('../pages/profile/profile.js');
var profile = createPage(pageConfig);
profile.onShow();
assert.strictEqual(profile.data.writingMode, 'trace');
profile.onWritingModeTap({ currentTarget: { dataset: { mode: 'blank' } } });
assert.strictEqual(profile.data.writingMode, 'blank');
assert.strictEqual(storageState.writingMode, 'blank');
var reopenedProfile = createPage(pageConfig);
reopenedProfile.onShow();
assert.strictEqual(reopenedProfile.data.writingMode, 'blank');

require('../stroke/pages/write/write.js');
var writeConfig = pageConfig;

function checkWritingMode(mode, expectedGuideCount) {
  storageState.writingMode = mode;
  var page = createPage(writeConfig);
  var guides = 0;
  var grids = 0;
  page.onLoad({ char: encodeURIComponent('门') });
  page.clearAnimationTimer = function () {};
  page.measureCanvases = function (callback) { callback.call(this); };
  page.drawCompleteReference = function () {};
  page.drawGrid = function () { grids += 1; };
  page.drawTraceGuide = function () { guides += 1; };
  page.traceContext = {};

  page.onTraceModeTap();
  assert.strictEqual(grids, 1);
  assert.strictEqual(guides, expectedGuideCount);
  assert.strictEqual(page.data.status, mode === 'blank' ?
    '点上面的字重放，再在下面写一遍' : '点上面的字重放，再在下面描一遍');

  page.onEraseTap();
  assert.strictEqual(grids, 2);
  assert.strictEqual(guides, expectedGuideCount * 2);
}

checkWritingMode('blank', 0);
checkWritingMode('trace', 1);
console.log('All writing mode tests passed.');
