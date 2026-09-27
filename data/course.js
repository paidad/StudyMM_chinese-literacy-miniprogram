var builtin = require('./builtin-course-data.js');

var cachedLessons = null;
var cachedCards = null;
var cachedCardMap = null;
var cachedPinyinMap = null;

function build() {
  var cards = [];
  var cardMap = {};
  var pinyinMap = {};
  if (cachedLessons) { return; }
  cachedLessons = builtin.LESSONS.map(function (lesson, lessonIndex) {
    return {
      title: lesson.name,
      cards: lesson.chars.map(function (key) {
        var source = builtin.CHARS[key];
        var item = {
          char: key,
          pinyin: source.pinyin,
          words: source.words.slice(),
          sentence: source.sentence,
          tip: source.tip,
          lesson: lessonIndex + 1,
          updatedAt: 0
        };
        cards.push(item);
        cardMap[key] = item;
        pinyinMap[key] = item.pinyin;
        return item;
      })
    };
  });
  cachedCards = cards;
  cachedCardMap = cardMap;
  cachedPinyinMap = pinyinMap;
}

function getLessons() { build(); return cachedLessons; }
function getAllCards() { build(); return cachedCards; }
function getCardMap() { build(); return cachedCardMap; }
function getPinyinMap() { build(); return cachedPinyinMap; }

module.exports = {
  getLessons: getLessons,
  getAllCards: getAllCards,
  getCardMap: getCardMap,
  getPinyinMap: getPinyinMap
};
