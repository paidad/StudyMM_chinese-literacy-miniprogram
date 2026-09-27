function createTransform(strokes, size, padding) {
  var minX = Infinity;
  var maxX = -Infinity;
  var minY = Infinity;
  var maxY = -Infinity;
  var target = size - padding * 2;
  var scale;
  var width;
  var height;

  strokes.forEach(function (stroke) {
    stroke.forEach(function (point) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      minY = Math.min(minY, point[1]);
      maxY = Math.max(maxY, point[1]);
    });
  });
  width = Math.max(1, maxX - minX);
  height = Math.max(1, maxY - minY);
  scale = Math.min(target / width, target / height);
  return {
    minX: minX,
    maxY: maxY,
    scale: scale,
    offsetX: (size - width * scale) / 2,
    offsetY: (size - height * scale) / 2
  };
}

function transformPoint(point, transform) {
  return [
    transform.offsetX + (point[0] - transform.minX) * transform.scale,
    transform.offsetY + (transform.maxY - point[1]) * transform.scale
  ];
}

function expandStroke(stroke, transform, step) {
  var source = stroke.map(function (point) {
    return transformPoint(point, transform);
  });
  var expanded = [];
  var index;
  var from;
  var to;
  var dx;
  var dy;
  var count;
  var part;

  if (source.length === 0) { return expanded; }
  expanded.push(source[0]);
  for (index = 1; index < source.length; index += 1) {
    from = source[index - 1];
    to = source[index];
    dx = to[0] - from[0];
    dy = to[1] - from[1];
    count = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy) / step));
    for (part = 1; part <= count; part += 1) {
      expanded.push([
        from[0] + dx * part / count,
        from[1] + dy * part / count
      ]);
    }
  }
  return expanded;
}

module.exports = {
  createTransform: createTransform,
  transformPoint: transformPoint,
  expandStroke: expandStroke
};
