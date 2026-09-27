function uniqueStrings(values) {
  var result = [];
  var seen = {};
  var index;

  for (index = 0; index < values.length; index += 1) {
    if (!seen[values[index]]) {
      seen[values[index]] = true;
      result.push(values[index]);
    }
  }
  return result;
}

function createSecondRound(unfamiliarKeys) {
  return uniqueStrings(unfamiliarKeys || []);
}

function rotateOptions(options, offset) {
  if (options.length < 2) {
    return options;
  }
  return options.slice(offset).concat(options.slice(0, offset));
}

function createQuizQuestions(targetCards, taughtCards) {
  var questions = [];
  var questionIndex;

  for (questionIndex = 0; questionIndex < targetCards.length; questionIndex += 1) {
    var answer = targetCards[questionIndex];
    var options = [answer];
    var seen = {};
    var taughtIndex;

    seen[answer.char] = true;
    for (taughtIndex = 0; taughtIndex < taughtCards.length && options.length < 4; taughtIndex += 1) {
      var candidate = taughtCards[taughtIndex];
      if (!seen[candidate.char] && candidate.pinyin !== answer.pinyin) {
        seen[candidate.char] = true;
        options.push(candidate);
      }
    }

    questions.push({
      answer: answer,
      options: rotateOptions(options, questionIndex % options.length)
    });
  }
  return questions;
}

module.exports = {
  createSecondRound: createSecondRound,
  createQuizQuestions: createQuizQuestions
};
