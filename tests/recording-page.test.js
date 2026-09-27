var assert = require('assert');
var pageConfig;
var storageMemory = {};
var recorderCallbacks = {};
var savedFilePath = '';

var recorderManager = {
  onStart: function (callback) {
    recorderCallbacks.start = callback;
  },
  onStop: function (callback) {
    recorderCallbacks.stop = callback;
  },
  onError: function (callback) {
    recorderCallbacks.error = callback;
  },
  start: function (options) {
    assert.strictEqual(options.duration, 4000);
    recorderCallbacks.start();
  },
  stop: function () {
    recorderCallbacks.stop({ tempFilePath: '/temp/new-recording.mp3' });
  }
};

var fileSystem = {
  access: function (options) {
    options.fail();
  },
  unlink: function (options) {
    if (options.success) {
      options.success();
    }
    if (options.complete) {
      options.complete();
    }
  },
  saveFile: function (options) {
    savedFilePath = options.filePath;
    options.success({ savedFilePath: options.filePath });
  }
};

global.Page = function (config) {
  pageConfig = config;
};

global.wx = {
  env: { USER_DATA_PATH: '/user' },
  getStorageSync: function (key) {
    return storageMemory[key];
  },
  setStorageSync: function (key, value) {
    storageMemory[key] = value;
  },
  getFileSystemManager: function () {
    return fileSystem;
  },
  getRecorderManager: function () {
    return recorderManager;
  },
  authorize: function (options) {
    options.success();
  }
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
page.data.rawInput = '一';
page.onParseTap();
page.onRecordTap();
assert.strictEqual(page.data.isRecording, true);
assert.strictEqual(page.data.recordButtonText, '停止录音');
assert.strictEqual(page.data.recordingStatus, '录音倒计时：3 秒');

page.onRecordTap();
assert.strictEqual(page.data.isRecording, false);
assert.strictEqual(page.data.hasRecording, true);
assert.ok(/^\/user\/recording_[0-9a-f]+\.mp3$/.test(savedFilePath));
assert.strictEqual(page.localState.recordings['一'], savedFilePath);

page.onDeleteRecordingTap();
assert.strictEqual(page.data.hasRecording, false);
assert.strictEqual(page.localState.recordings['一'], undefined);

wx.authorize = function (options) {
  options.fail();
};
var deniedPage = createPage();
deniedPage.onLoad();
deniedPage.data.rawInput = '一';
deniedPage.onParseTap();
deniedPage.onRecordTap();
assert.strictEqual(deniedPage.data.showSettings, true);
assert.strictEqual(deniedPage.data.recordingStatus, '请先允许使用麦克风');

console.log('All recording page tests passed.');
