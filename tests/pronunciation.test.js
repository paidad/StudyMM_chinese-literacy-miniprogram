var assert = require('assert');
var pronunciation = require('../utils/pronunciation.js');

function runTest(name, testFunction) {
  try {
    testFunction();
    console.log('PASS ' + name);
  } catch (error) {
    console.error('FAIL ' + name);
    throw error;
  }
}

runTest('family recording has first priority', function () {
  var result = pronunciation.selectPronunciation({
    recordingPath: '/user/family.mp3',
    builtinPath: '/assets/audio/word.mp3',
    syllablePaths: ['/assets/audio/yi.mp3']
  });

  assert.strictEqual(result.type, 'recording');
  assert.deepStrictEqual(result.sources, ['/user/family.mp3']);
});

runTest('built-in whole audio is second priority', function () {
  var result = pronunciation.selectPronunciation({
    recordingPath: '',
    builtinPath: '/assets/audio/word.mp3',
    syllablePaths: ['/assets/audio/yi.mp3']
  });

  assert.strictEqual(result.type, 'builtin');
  assert.deepStrictEqual(result.sources, ['/assets/audio/word.mp3']);
});

runTest('syllable files are the offline fallback', function () {
  var result = pronunciation.selectPronunciation({
    recordingPath: '',
    builtinPath: '',
    syllablePaths: ['/assets/audio/yi.mp3']
  });

  assert.strictEqual(result.type, 'syllables');
  assert.deepStrictEqual(result.sources, ['/assets/audio/yi.mp3']);
});

runTest('missing audio returns a human-readable message', function () {
  var result = pronunciation.selectPronunciation({
    recordingPath: '',
    builtinPath: '',
    syllablePaths: []
  });

  assert.strictEqual(result.type, 'missing');
  assert.strictEqual(result.message, '还没有声音，请家人录一遍');
});

console.log('All pronunciation tests passed.');
