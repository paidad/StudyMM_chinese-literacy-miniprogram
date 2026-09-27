var assert = require('assert');
var fs = require('fs');
var path = require('path');
var pinyin = require('../data/pinyin.js');
var words = require('../data/words.js');
var phraseMap = require('../study/data/phrase-map.js');
var speechData = require('../utils/speech-data.js');

assert.ok(Object.keys(pinyin).length > 20000);
assert.strictEqual(pinyin['妈'], 'mā');
assert.ok(Array.isArray(words));
assert.ok(words.length > 6000);
assert.strictEqual(Object.keys(phraseMap).length, 292);
Object.keys(phraseMap).forEach(function (text) {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'study', 'audio', phraseMap[text] + '.mp3')));
});
assert.strictEqual(speechData.syllableKey('lǚ'), 'lv3');
assert.deepStrictEqual(speechData.textToSyllableSources('妈妈。', pinyin), [
  '/audio-py/ma1.mp3', '/audio-py/ma1.mp3'
]);
assert.ok(fs.existsSync(path.join(__dirname, '..', 'audio-py', 'ma1.mp3')));

console.log('All resource data tests passed.');
