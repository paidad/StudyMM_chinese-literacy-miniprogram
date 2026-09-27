var assert = require('assert');
var strokes = require('../stroke/data/strokes.js');

assert.ok(Object.keys(strokes).length >= 2988);
assert.strictEqual(strokes['一'].length, 1);
Object.keys(strokes).forEach(function (char) {
  assert.ok(strokes[char].length > 0);
  strokes[char].forEach(function (stroke) {
    assert.ok(stroke.length >= 2);
    stroke.forEach(function (point) {
      assert.strictEqual(point.length, 2);
      assert.ok(point[0] >= -100 && point[0] <= 1100);
      assert.ok(point[1] >= -100 && point[1] <= 1100);
    });
  });
});

console.log('All stroke data tests passed.');
