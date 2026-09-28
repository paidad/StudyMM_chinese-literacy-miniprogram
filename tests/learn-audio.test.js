var assert = require('assert');
var storageModule = require('../utils/storage.js');
var course = require('../data/course.js');
var speechData = require('../utils/speech-data.js');
var pinyinMap = require('../data/pinyin.js');
var phraseMap = require('../study/data/phrase-map.js');
var pageConfig;
var contexts = [];
var state = storageModule.createDefaultState();

state.recordings['门'] = '/user/family.mp3';
global.Page = function (config) { pageConfig = config; };
global.wx = {
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

require('../study/pages/learn/learn.js');
assert.strictEqual(contexts.length, 0, 'page load must not create an audio context');

var page = {};
Object.keys(pageConfig).forEach(function (key) {
  if (key !== 'data') { page[key] = pageConfig[key]; }
});
page.data = JSON.parse(JSON.stringify(pageConfig.data));
page.setData = function (patch) { Object.assign(this.data, patch); };
page.localState = state;
page.currentCard = course.getCardMap()['门'];
page.speechData = speechData;
page.pinyinMap = pinyinMap;
page.phraseMap = phraseMap;

page.onListenTap();
assert.strictEqual(contexts[0].src, '/user/family.mp3');

state.recordings = {};
page.onListenTap();
assert.strictEqual(contexts[0].destroyed, true);
assert.strictEqual(contexts[1].src, '/audio-py/men2.mp3');

page.playCardAudio('word', 0);
assert.ok(/^\/study\/audio\/.+\.mp3$/.test(contexts[2].src));

console.log('All learn audio tests passed.');
