var assert = require('assert');
var recordingModule = require('../utils/recording.js');

function runTest(name, testFunction) {
  try {
    testFunction();
    console.log('PASS ' + name);
  } catch (error) {
    console.error('FAIL ' + name);
    throw error;
  }
}

runTest('each recording gets a new safe file name', function () {
  var first = recordingModule.createRecordingFileName('一');
  var second = recordingModule.createRecordingFileName('一');

  assert.notStrictEqual(first, second);
  assert.ok(/^recording_[0-9a-f]+_[0-9a-z]+_[0-9a-z]+_[0-9a-z]+\.mp3$/.test(first));
});

runTest('different words get different file names', function () {
  assert.notStrictEqual(
    recordingModule.createRecordingFileName('一'),
    recordingModule.createRecordingFileName('二')
  );
});

runTest('recording is limited to about four seconds', function () {
  var options = recordingModule.createRecorderOptions();

  assert.strictEqual(options.duration, 4000);
  assert.strictEqual(options.format, 'mp3');
  assert.strictEqual(options.numberOfChannels, 1);
});

console.log('All recording tests passed.');
