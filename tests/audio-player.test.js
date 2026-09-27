var assert = require('assert');
var audioPlayerModule = require('../utils/audio-player.js');
var contexts = [];

function createContext() {
  var context = {
    destroyed: false,
    played: false,
    onPlay: function (callback) {
      this.playCallback = callback;
    },
    onEnded: function (callback) {
      this.endedCallback = callback;
    },
    onError: function (callback) {
      this.errorCallback = callback;
    },
    play: function () {
      this.played = true;
      this.playCallback();
    },
    destroy: function () {
      this.destroyed = true;
    }
  };
  contexts.push(context);
  return context;
}

var player = audioPlayerModule.createAudioPlayer(createContext);
assert.strictEqual(player.play('/first.mp3', {}), true);
assert.strictEqual(contexts[0].src, '/first.mp3');
assert.strictEqual(contexts[0].played, true);

assert.strictEqual(player.play('/second.mp3', {}), true);
assert.strictEqual(contexts[0].destroyed, true);
assert.strictEqual(contexts[1].src, '/second.mp3');

contexts[1].endedCallback();
assert.strictEqual(contexts[1].destroyed, true);

player.play('/third.mp3', {});
contexts[2].errorCallback();
assert.strictEqual(contexts[2].destroyed, true);

console.log('All audio player tests passed.');
