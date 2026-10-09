var assert = require('assert');
var fs = require('fs');
var path = require('path');
var storageModule = require('../utils/storage.js');
var storageState = storageModule.createDefaultState();
var pageConfig;

global.Page = function (config) { pageConfig = config; };
global.wx = {
  getStorageSync: function () { return storageState; },
  setStorageSync: function (key, value) { storageState = value; }
};

require('../stroke/pages/write/write.js');

function createPage() {
  var page = {};
  Object.keys(pageConfig).forEach(function (key) {
    if (key !== 'data') { page[key] = pageConfig[key]; }
  });
  page.data = JSON.parse(JSON.stringify(pageConfig.data));
  page.setData = function (patch, callback) {
    Object.assign(this.data, patch);
    if (callback) { callback(); }
  };
  return page;
}

var writeMarkup = fs.readFileSync(path.join(__dirname, '../stroke/pages/write/write.wxml'), 'utf8');
var speakerPosition = writeMarkup.indexOf('trace-listen-button');
var switchPosition = writeMarkup.indexOf('class="writing-mode-switch"');
assert.ok(speakerPosition >= 0 && switchPosition > speakerPosition, 'mode switch belongs below the tracing speaker');
assert.ok(writeMarkup.indexOf('<text class="write-title">看“{{char}}”怎么写</text>') >= 0,
  'both writing states should retain the original heading');

function checkInitialMode(mode, expectedGuideCount) {
  storageState.writingMode = mode;
  var page = createPage();
  var guides = 0;
  var grids = 0;
  var writtenDraws = 0;
  page.onLoad({ char: encodeURIComponent('门') });
  page.clearAnimationTimer = function () {};
  page.measureCanvases = function (callback) { callback.call(this); };
  page.drawCompleteReference = function () {};
  page.drawGrid = function () { grids += 1; };
  page.drawTraceGuide = function () { guides += 1; };
  page.traceContext = {
    setStrokeStyle: function () {}, setLineWidth: function () {}, setLineCap: function () {},
    beginPath: function () {}, moveTo: function () {}, lineTo: function () {},
    stroke: function () {}, draw: function () { writtenDraws += 1; }
  };

  page.onTraceModeTap();
  assert.strictEqual(grids, 1);
  assert.strictEqual(guides, expectedGuideCount);
  assert.strictEqual(page.data.status, mode === 'blank' ?
    '点上面的字重放，再在下面写一遍' : '点上面的字重放，再在下面描一遍');

  page.onTraceStart({ touches: [{ x: 20, y: 30 }] });
  page.onTraceMove({ touches: [{ x: 40, y: 50 }] });
  assert.strictEqual(page.traceSegments.length, 1);
  assert.strictEqual(writtenDraws, 1);

  var otherMode = mode === 'blank' ? 'trace' : 'blank';
  page.onWritingModeTap({ currentTarget: { dataset: { mode: otherMode } } });
  assert.strictEqual(page.data.writingMode, otherMode);
  assert.strictEqual(storageState.writingMode, otherMode);
  assert.strictEqual(page.traceSegments.length, 1, 'switching should preserve handwriting');
  assert.strictEqual(writtenDraws, 2, 'handwriting must be redrawn above the new grid');
  assert.strictEqual(grids, 2);
  assert.strictEqual(guides, expectedGuideCount + (otherMode === 'trace' ? 1 : 0));

  page.onEraseTap();
  assert.strictEqual(page.traceSegments.length, 0);
  assert.strictEqual(grids, 3);
  assert.strictEqual(guides, expectedGuideCount + (otherMode === 'trace' ? 2 : 0));

  var reopenedPage = createPage();
  reopenedPage.onLoad({ char: encodeURIComponent('门') });
  assert.strictEqual(reopenedPage.data.writingMode, otherMode, 'mode should persist across page visits');
}

checkInitialMode('blank', 0);
checkInitialMode('trace', 1);
console.log('All writing mode tests passed.');
