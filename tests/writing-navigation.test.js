var assert = require('assert');
var learnConfig;
var writeConfig;
var writeDoneHandler;
var emitted = false;
var navigatedBack = false;

global.Page = function (config) { learnConfig = config; };
global.wx = {
  navigateTo: function (options) {
    options.success({
      eventChannel: {
        on: function (name, handler) {
          assert.strictEqual(name, 'writeDone');
          writeDoneHandler = handler;
        }
      }
    });
  }
};
require('../study/pages/learn/learn.js');

var learnPage = {
  currentCard: { char: '一' },
  destroyAudioPlayer: function () {},
  setData: function () {},
  advanceCard: function () { this.advanceCount = (this.advanceCount || 0) + 1; }
};
learnConfig.onWriteTap.call(learnPage);
assert.strictEqual(typeof writeDoneHandler, 'function');
writeDoneHandler();
assert.strictEqual(learnPage.advanceCount, 1);

global.Page = function (config) { writeConfig = config; };
global.setTimeout = function (handler) { handler(); return 1; };
global.wx = {
  navigateBack: function (options) {
    assert.strictEqual(options.delta, 1);
    navigatedBack = true;
  }
};
require('../stroke/pages/write/write.js');

var writePage = {
  didFinishWriting: false,
  setData: function (patch) { this.status = patch.status; },
  getOpenerEventChannel: function () {
    return {
      emit: function (name) {
        assert.strictEqual(name, 'writeDone');
        emitted = true;
      }
    };
  }
};
writeConfig.onDoneTap.call(writePage);
assert.strictEqual(emitted, true);
assert.strictEqual(navigatedBack, true);
assert.strictEqual(writePage.status, '写好了，继续学下一个字');

console.log('All writing navigation tests passed.');
