var TONE = {
  'ā': ['a', 1], 'á': ['a', 2], 'ǎ': ['a', 3], 'à': ['a', 4],
  'ē': ['e', 1], 'é': ['e', 2], 'ě': ['e', 3], 'è': ['e', 4],
  'ī': ['i', 1], 'í': ['i', 2], 'ǐ': ['i', 3], 'ì': ['i', 4],
  'ō': ['o', 1], 'ó': ['o', 2], 'ǒ': ['o', 3], 'ò': ['o', 4],
  'ū': ['u', 1], 'ú': ['u', 2], 'ǔ': ['u', 3], 'ù': ['u', 4],
  'ǖ': ['v', 1], 'ǘ': ['v', 2], 'ǚ': ['v', 3], 'ǜ': ['v', 4],
  'ü': ['v', 0]
};
var SKIP = '，。！？；：、,.!?;:（）()“”\"\' \n\r\t';

function syllableKey(pinyin) {
  var text = String(pinyin || '').toLowerCase();
  var out = '';
  var tone = 0;
  var index;
  var item;
  for (index = 0; index < text.length; index += 1) {
    item = TONE[text.charAt(index)];
    if (item) {
      out += item[0];
      if (item[1]) { tone = item[1]; }
    } else if (/[a-z]/.test(text.charAt(index))) {
      out += text.charAt(index);
    }
  }
  return out ? out + (tone || 5) : '';
}

function textToSyllableSources(text, pinyinMap) {
  var sources = [];
  var index;
  var key;
  var ch;
  for (index = 0; index < text.length; index += 1) {
    ch = text.charAt(index);
    if (SKIP.indexOf(ch) >= 0) { continue; }
    key = syllableKey(pinyinMap[ch]);
    if (!key) { return []; }
    sources.push('/audio-py/' + key + '.mp3');
  }
  return sources;
}

module.exports = {
  syllableKey: syllableKey,
  textToSyllableSources: textToSyllableSources
};
