var assert = require('assert');
var storageModule = require('../utils/storage.js');
var pageConfig;
var contexts = [];
var state = storageModule.createDefaultState();

state.recordings['火'] = '/user/fire.mp3';

global.Page = function (config) { pageConfig = config; };
global.wx = {
  getStorageSync: function () { return state; },
  setStorageSync: function () {},
  createInnerAudioContext: function () {
    var context = {
      destroyed: false,
      onEnded: function (callback) { this.endedCallback = callback; },
      onError: function (callback) { this.errorCallback = callback; },
      play: function () {},
      stop: function () {},
      destroy: function () { this.destroyed = true; }
    };
    contexts.push(context);
    return context;
  }
};

require('../stroke/pages/write/write.js');

var page = {};
Object.keys(pageConfig).forEach(function (key) {
  if (key !== 'data') { page[key] = pageConfig[key]; }
});
page.data = JSON.parse(JSON.stringify(pageConfig.data));
page.setData = function (patch) { Object.assign(this.data, patch); };
page.onLoad({ char: encodeURIComponent('火') });

page.onSpeakerTap();
assert.strictEqual(contexts[0].src, '/user/fire.mp3');

state.recordings = {};
page.onSpeakerTap();
assert.strictEqual(contexts[0].destroyed, true);
assert.strictEqual(contexts[1].src, '/audio-py/huo3.mp3');

page.onUnload();
assert.strictEqual(contexts[1].destroyed, true);

console.log('All write audio tests passed.');
