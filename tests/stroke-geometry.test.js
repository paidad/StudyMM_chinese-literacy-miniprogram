var assert = require('assert');
var strokes = require('../stroke/data/strokes.js');
var geometry = require('../stroke/utils/stroke-geometry.js');

function boundsFor(char) {
  var transform = geometry.createTransform(strokes[char], 300, 28);
  var points = [];
  strokes[char].forEach(function (stroke) {
    stroke.forEach(function (point) {
      points.push(geometry.transformPoint(point, transform));
    });
  });
  return {
    minX: Math.min.apply(null, points.map(function (point) { return point[0]; })),
    maxX: Math.max.apply(null, points.map(function (point) { return point[0]; })),
    minY: Math.min.apply(null, points.map(function (point) { return point[1]; })),
    maxY: Math.max.apply(null, points.map(function (point) { return point[1]; }))
  };
}

['一', '十', '人', '口'].forEach(function (char) {
  var bounds = boundsFor(char);
  var centerX = (bounds.minX + bounds.maxX) / 2;
  var centerY = (bounds.minY + bounds.maxY) / 2;
  assert.ok(Math.abs(centerX - 150) < 0.01, char + ' should be horizontally centered');
  assert.ok(Math.abs(centerY - 150) < 0.01, char + ' should be vertically centered');
  assert.ok(bounds.minX >= 27.9 && bounds.maxX <= 272.1);
  assert.ok(bounds.minY >= 27.9 && bounds.maxY <= 272.1);
});

var transform = geometry.createTransform(strokes['十'], 300, 28);
var expanded = geometry.expandStroke(strokes['十'][0], transform, 7);
assert.ok(expanded.length > strokes['十'][0].length * 3, 'stroke should gain animation frames');
expanded.slice(1).forEach(function (point, index) {
  var previous = expanded[index];
  var dx = point[0] - previous[0];
  var dy = point[1] - previous[1];
  assert.ok(Math.sqrt(dx * dx + dy * dy) <= 7.01);
});

console.log('All stroke geometry tests passed.');
