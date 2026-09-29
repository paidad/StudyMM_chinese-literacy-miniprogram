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

function firstUnfinishedLessonIndex(state, lessons) {
  var lessonIndex;
  for (lessonIndex = 0; lessonIndex < lessons.length; lessonIndex += 1) {
    if (lessons[lessonIndex].cards.some(function (item) {
      return !state.progress[item.char];
    })) {
      return lessonIndex;
    }
  }
  return Math.max(lessons.length - 1, 0);
}

function ensureDailyCoursePlan(state, course, now) {
  var lessons = course.getLessons();
  var todayText = formatDate(now);
  var plan = state.coursePlan;
  var nextIndex;
  var changed = false;

  if (!plan || typeof plan.date !== 'string' || typeof plan.lessonIndex !== 'number') {
    plan = { date: '', lessonIndex: 0 };
    state.coursePlan = plan;
    changed = true;
  }
  if (!plan.date) {
    plan.lessonIndex = firstUnfinishedLessonIndex(state, lessons);
    plan.date = todayText;
    changed = true;
  } else if (plan.date !== todayText) {
    nextIndex = Math.max(plan.lessonIndex, 0);
    if (dateNumber(todayText) > dateNumber(plan.date)) {
      nextIndex = Math.min(nextIndex + 1, Math.max(lessons.length - 1, 0));
    }
    plan.lessonIndex = nextIndex;
    plan.date = todayText;
    changed = true;
  }
  if (plan.lessonIndex >= lessons.length) {
    plan.lessonIndex = Math.max(lessons.length - 1, 0);
    changed = true;
  }
  return { changed: changed, lessonIndex: plan.lessonIndex };
}

function setCourseLesson(state, course, lessonIndex, now) {
  var maximum = Math.max(course.getLessons().length - 1, 0);
  var nextIndex = Math.max(0, Math.min(Number(lessonIndex) || 0, maximum));
  state.coursePlan = {
    date: formatDate(now),
    lessonIndex: nextIndex
  };
  return nextIndex;
}

function getCustomCards(state, course) {
  var customCards = [];
  state.today.chars.forEach(function (key) {
    var item = getCard(state, course, key);
    if (item) {
      customCards.push(item);
    }
  });
  return customCards;
}

function activateCustomCourse(state, now) {
  state.courseMode = 'custom';
  state.today.date = formatDate(now);
}

function activateDefaultCourse(state, course, now) {
  var lessons = course.getLessons();
  var plan = state.coursePlan;
  var lessonIndex;

  if (!plan || typeof plan.lessonIndex !== 'number') {
    lessonIndex = firstUnfinishedLessonIndex(state, lessons);
  } else {
    lessonIndex = plan.lessonIndex;
  }
  state.courseMode = 'default';
  return setCourseLesson(state, course, lessonIndex, now);
}

function getTodayCards(state, course, now) {
  var lessons;
  var plan;

  if (state.courseMode === 'custom') {
    return getCustomCards(state, course);
  }

  lessons = course.getLessons();
  plan = ensureDailyCoursePlan(state, course, now);
  return lessons[plan.lessonIndex] ? lessons[plan.lessonIndex].cards.slice() : [];
}

function getCurrentLessonInfo(state, course) {
  var lessons = course.getLessons();
  if (state.courseMode === 'custom') {
    return { number: 0, title: '录入课程', isCustom: true };
  }
  var plan = ensureDailyCoursePlan(state, course, Date.now());
  var lesson = lessons[plan.lessonIndex];
  if (lesson) {
    return { number: plan.lessonIndex + 1, title: lesson.title };
  }
  return {
    number: 0,
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
  getCustomCards: getCustomCards,
  getTodayCards: getTodayCards,
  ensureDailyCoursePlan: ensureDailyCoursePlan,
  setCourseLesson: setCourseLesson,
  activateCustomCourse: activateCustomCourse,
  activateDefaultCourse: activateDefaultCourse,
  getCurrentLessonInfo: getCurrentLessonInfo,
  getTaughtCards: getTaughtCards,
  updateStreak: updateStreak
};
