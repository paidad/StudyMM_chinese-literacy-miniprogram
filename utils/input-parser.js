function chineseOnly(text) {
  var matches = text.match(/[\u3400-\u9fff]+/g);
  return matches ? matches.join('') : '';
}

function addUnique(result, seen, value) {
  if (value && !seen[value]) {
    seen[value] = true;
    result.push(value);
  }
}

function parseInput(text) {
  var source = typeof text === 'string' ? text.trim() : '';
  var result = [];
  var seen = {};
  var parts;
  var index;
  var cleaned;

  if (!source) {
    return result;
  }

  if (/[\s,，、;；。]/.test(source)) {
    parts = source.split(/[\s,，、;；。]+/);
    for (index = 0; index < parts.length; index += 1) {
      cleaned = chineseOnly(parts[index]);
      addUnique(result, seen, cleaned);
    }
    return result;
  }

  cleaned = chineseOnly(source);
  for (index = 0; index < cleaned.length; index += 1) {
    addUnique(result, seen, cleaned.charAt(index));
  }
  return result;
}

module.exports = {
  parseInput: parseInput
};
