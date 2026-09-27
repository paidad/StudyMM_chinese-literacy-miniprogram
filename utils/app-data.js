function pad(number) {
  return number < 10 ? '0' + number : String(number);
}

function formatDate(timestamp) {
  var date = new Date(timestamp);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function dateNumber(dateText) {
  var parts = dateText.split('-');
  return Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) / (24 * 60 * 60 * 1000);
}

function getCard(state, course, key) {
  return state.chars[key] || course.getCardMap()[key] || null;
}

function getTodayCards(state, course, now) {
  var todayText = formatDate(now);
  var customCards = [];
  var lessons;
  var lessonIndex;

  if (state.today.date === todayText && state.today.chars.length > 0) {
    state.today.chars.forEach(function (key) {
      var item = getCard(state, course, key);
      if (item) {
        customCards.push(item);
      }
    });
    if (customCards.length > 0) {
      return customCards;
    }
  }

  lessons = course.getLessons();
  for (lessonIndex = 0; lessonIndex < lessons.length; lessonIndex += 1) {
    var unfinished = lessons[lessonIndex].cards.filter(function (item) {
      return !state.progress[item.char];
    });
    if (unfinished.length > 0) {
      return unfinished;
    }
  }
  return [];
}

function getCurrentLessonInfo(state, course) {
  var lessons = course.getLessons();
  var lessonIndex;

  for (lessonIndex = 0; lessonIndex < lessons.length; lessonIndex += 1) {
    if (lessons[lessonIndex].cards.some(function (item) {
      return !state.progress[item.char];
    })) {
      return {
        number: lessonIndex + 1,
        title: lessons[lessonIndex].title
      };
    }
  }
  return {
    number: lessons.length,
    title: '全部学完'
  };
}

function getTaughtCards(state, course, extraCards) {
  var result = [];
  var seen = {};

  Object.keys(state.progress).forEach(function (key) {
    var item = getCard(state, course, key);
    if (item && !seen[item.char]) {
      seen[item.char] = true;
      result.push(item);
    }
  });
  (extraCards || []).forEach(function (item) {
    if (item && !seen[item.char]) {
      seen[item.char] = true;
      result.push(item);
    }
  });
  return result;
}

function updateStreak(stats, now) {
  var todayText = formatDate(now);
  var next = {
    lastStudyDate: todayText,
    streak: stats.streak,
    totalSessions: stats.totalSessions + 1
  };

  if (!stats.lastStudyDate) {
    next.streak = 1;
  } else if (stats.lastStudyDate === todayText) {
    next.streak = Math.max(stats.streak, 1);
  } else if (dateNumber(todayText) - dateNumber(stats.lastStudyDate) === 1) {
    next.streak = stats.streak + 1;
  } else {
    next.streak = 1;
  }
  return next;
}

module.exports = {
  formatDate: formatDate,
  getCard: getCard,
  getTodayCards: getTodayCards,
  getCurrentLessonInfo: getCurrentLessonInfo,
  getTaughtCards: getTaughtCards,
  updateStreak: updateStreak
};
