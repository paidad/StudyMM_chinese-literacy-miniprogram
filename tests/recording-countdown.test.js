var assert = require('assert');
var pageConfig;
var intervalCallback;
var cleared = false;

global.Page = function (config) { pageConfig = config; };
global.setInterval = function (callback, delay) {
  assert.strictEqual(delay, 1000);
  intervalCallback = callback;
  return { timer: true };
};
global.clearInterval = function () { cleared = true; };

require('../pages/input/input.js');

var page = {
  data: { recordingStatus: '' },
  setData: function (patch) { Object.assign(this.data, patch); },
  startRecordingCountdown: pageConfig.startRecordingCountdown,
  clearRecordingCountdown: pageConfig.clearRecordingCountdown
};

page.startRecordingCountdown();
assert.strictEqual(page.data.recordingStatus, '录音倒计时：3 秒');
intervalCallback();
assert.strictEqual(page.data.recordingStatus, '录音倒计时：2 秒');
intervalCallback();
assert.strictEqual(page.data.recordingStatus, '录音倒计时：1 秒');
intervalCallback();
assert.strictEqual(cleared, true);
assert.strictEqual(page.recordingCountdownTimer, null);

console.log('All recording countdown tests passed.');
