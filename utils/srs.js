var INTERVALS = [
  30 * 60 * 1000,
  24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  15 * 24 * 60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000
];

function copyProgress(progress) {
  return {
    char: progress.char,
    stage: progress.stage,
    right: progress.right,
    wrong: progress.wrong,
    firstAt: progress.firstAt,
    lastAt: progress.lastAt,
    nextAt: progress.nextAt
  };
}

function recordFirstSeen(existing, char, now) {
  if (existing) {
    return copyProgress(existing);
  }
  return {
    char: char,
    stage: 0,
    right: 0,
    wrong: 0,
    firstAt: now,
    lastAt: now,
    nextAt: now + INTERVALS[0]
  };
}

function recordFirstSessionAnswer(existing, isCorrect, now) {
  var next = copyProgress(existing);
  if (isCorrect) {
    next.right += 1;
  } else {
    next.wrong += 1;
  }
  next.lastAt = now;
  return next;
}

function recordReview(existing, isCorrect, now) {
  var next = copyProgress(existing);
  if (isCorrect) {
    next.stage = Math.min(next.stage + 1, INTERVALS.length - 1);
    next.right += 1;
  } else {
    next.stage = Math.max(next.stage - 1, 0);
    next.wrong += 1;
  }
  next.lastAt = now;
  next.nextAt = now + INTERVALS[next.stage];
  return next;
}

function getDueKeys(progressMap, now) {
  return Object.keys(progressMap).filter(function (key) {
    return progressMap[key] && progressMap[key].nextAt <= now;
  }).sort(function (left, right) {
    return progressMap[left].nextAt - progressMap[right].nextAt;
  });
}

module.exports = {
  intervals: INTERVALS.slice(),
  recordFirstSeen: recordFirstSeen,
  recordFirstSessionAnswer: recordFirstSessionAnswer,
  recordReview: recordReview,
  getDueKeys: getDueKeys
};
