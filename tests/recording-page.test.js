var assert = require('assert');
var pageConfig;
var storageMemory = {};
var recorderCallbacks = {};
var savedFilePath = '';
var savedFiles = {};
var playedPaths = [];
var failNextUnlink = false;
var failNextSave = false;

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
    if (failNextUnlink) {
      failNextUnlink = false;
      if (options.fail) { options.fail(); }
      if (options.complete) { options.complete(); }
      return;
    }
    if (!savedFiles[options.filePath]) {
      if (options.fail) { options.fail(); }
      if (options.complete) { options.complete(); }
      return;
    }
    delete savedFiles[options.filePath];
    if (options.success) {
      options.success();
    }
    if (options.complete) {
      options.complete();
    }
  },
  saveFile: function (options) {
    if (failNextSave || savedFiles[options.filePath]) {
      failNextSave = false;
      options.fail();
      return;
    }
    savedFilePath = options.filePath;
    savedFiles[options.filePath] = true;
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
  },
  createInnerAudioContext: function () {
    return {
      onEnded: function () {},
      onError: function () {},
      play: function () { playedPaths.push(this.src); },
      stop: function () {},
      destroy: function () {}
    };
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
assert.ok(/^\/user\/recording_[0-9a-f]+_[0-9a-z]+_[0-9a-z]+_[0-9a-z]+\.mp3$/.test(savedFilePath));
assert.strictEqual(page.localState.recordings['一'], savedFilePath);
var firstPath = savedFilePath;
page.onTodayWordTap({ currentTarget: { dataset: { char: '一' } } });
assert.strictEqual(playedPaths.pop(), firstPath, 'playback uses the saved family recording');

page.onDeleteRecordingTap();
assert.strictEqual(page.data.hasRecording, false);
assert.strictEqual(page.localState.recordings['一'], undefined);
assert.strictEqual(savedFiles[firstPath], undefined, 'delete removes the old file immediately');

page.onRecordTap();
page.onRecordTap();
var secondPath = savedFilePath;
assert.notStrictEqual(secondPath, firstPath, 're-recording uses a different path');
assert.deepStrictEqual(Object.keys(savedFiles), [secondPath]);
page.onTodayWordTap({ currentTarget: { dataset: { char: '一' } } });
assert.strictEqual(playedPaths.pop(), secondPath, 'playback switches to the new path');

failNextUnlink = true;
page.onDeleteRecordingTap();
assert.strictEqual(page.localState.recordings['一'], secondPath, 'failed deletion keeps the recording');
assert.strictEqual(savedFiles[secondPath], true);
assert.strictEqual(page.data.notice, '录音没有删掉，请再试一次');

page.onDeleteRecordingTap();
assert.strictEqual(savedFiles[secondPath], undefined);
failNextSave = true;
page.onRecordTap();
page.onRecordTap();
assert.strictEqual(page.localState.recordings['一'], undefined, 'failed save does not create a playback path');
assert.strictEqual(Object.keys(savedFiles).length, 0);
assert.strictEqual(page.data.notice, '声音没有保存好，请再录一次');

page.onRecordTap();
page.onRecordTap();
var thirdPath = savedFilePath;
assert.notStrictEqual(thirdPath, secondPath);
assert.deepStrictEqual(Object.keys(savedFiles), [thirdPath]);
page.onTodayWordTap({ currentTarget: { dataset: { char: '一' } } });
assert.strictEqual(playedPaths.pop(), thirdPath);

page.onDeleteRecordingTap();
assert.strictEqual(savedFiles[thirdPath], undefined);
var legacyPath = '/user/recording_7f3a.mp3';
savedFiles[legacyPath] = true;
page.localState.recordings['一'] = legacyPath;
page.onTodayWordTap({ currentTarget: { dataset: { char: '一' } } });
assert.strictEqual(playedPaths.pop(), legacyPath, 'existing fixed-name recordings still play');
page.onDeleteRecordingTap();
assert.strictEqual(savedFiles[legacyPath], undefined, 'existing fixed-name recordings can still be deleted');

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
