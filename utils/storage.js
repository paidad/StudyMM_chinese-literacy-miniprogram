var STORAGE_KEY = 'mama_literacy_state_v1';
var DEFAULT_COURSE_REVISION = 2;

function createDefaultState() {
  return {
    version: 1,
    chars: {},
    today: {
      date: '',
      chars: []
    },
    coursePlan: {
      date: '',
      lessonIndex: 0
    },
    defaultCourseRevision: DEFAULT_COURSE_REVISION,
    courseMode: 'default',
    writingMode: 'trace',
    progress: {},
    recordings: {},
    hiddenRecorded: {},
    stats: {
      lastStudyDate: '',
      streak: 0,
      totalSessions: 0
    },
    testTapCount: 0
  };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidCoreState(value) {
  return isRecord(value) &&
    value.version === 1 &&
    isRecord(value.chars) &&
    isRecord(value.today) &&
    typeof value.today.date === 'string' &&
    Array.isArray(value.today.chars) &&
    isRecord(value.progress) &&
    typeof value.testTapCount === 'number' &&
    value.testTapCount >= 0 &&
    Math.floor(value.testTapCount) === value.testTapCount;
}

function isValidState(value) {
  return isValidCoreState(value) &&
    (value.courseMode === 'default' || value.courseMode === 'custom') &&
    (value.writingMode === 'blank' || value.writingMode === 'trace') &&
    isRecord(value.coursePlan) &&
    value.defaultCourseRevision === DEFAULT_COURSE_REVISION &&
    typeof value.coursePlan.date === 'string' &&
    typeof value.coursePlan.lessonIndex === 'number' &&
    value.coursePlan.lessonIndex >= 0 &&
    Math.floor(value.coursePlan.lessonIndex) === value.coursePlan.lessonIndex &&
    isRecord(value.recordings) &&
    isRecord(value.hiddenRecorded) &&
    isRecord(value.stats) &&
    typeof value.stats.lastStudyDate === 'string' &&
    typeof value.stats.streak === 'number' &&
    typeof value.stats.totalSessions === 'number';
}

function createStorage(adapter) {
  return {
    load: function () {
      var storedValue;

      try {
        storedValue = adapter.get(STORAGE_KEY);
      } catch (error) {
        return {
          ok: false,
          recovered: false,
          state: createDefaultState()
        };
      }

      if (storedValue === undefined || storedValue === null || storedValue === '') {
        return {
          ok: true,
          recovered: false,
          state: createDefaultState()
        };
      }

      if (!isValidCoreState(storedValue)) {
        return {
          ok: true,
          recovered: true,
          state: createDefaultState()
        };
      }

      var recovered = false;
      var courseMigrated = false;

      if (storedValue.recordings === undefined) {
        storedValue.recordings = {};
      } else if (!isRecord(storedValue.recordings)) {
        storedValue.recordings = {};
        recovered = true;
      }

      if (!isRecord(storedValue.hiddenRecorded)) {
        storedValue.hiddenRecorded = {};
        recovered = true;
      }

      if (storedValue.coursePlan === undefined) {
        storedValue.coursePlan = createDefaultState().coursePlan;
      } else if (!isRecord(storedValue.coursePlan) ||
        typeof storedValue.coursePlan.date !== 'string' ||
        typeof storedValue.coursePlan.lessonIndex !== 'number' ||
        storedValue.coursePlan.lessonIndex < 0 ||
        Math.floor(storedValue.coursePlan.lessonIndex) !== storedValue.coursePlan.lessonIndex) {
        storedValue.coursePlan = createDefaultState().coursePlan;
        recovered = true;
      }

      // The 30-lesson course has a different order. Reset only its selected
      // lesson; keep recognition progress, custom tasks, and recordings.
      if (storedValue.defaultCourseRevision !== DEFAULT_COURSE_REVISION) {
        storedValue.coursePlan = { date: '', lessonIndex: 0 };
        storedValue.defaultCourseRevision = DEFAULT_COURSE_REVISION;
        recovered = true;
        courseMigrated = true;
      }

      if (storedValue.courseMode === undefined) {
        storedValue.courseMode = storedValue.today.chars.length > 0 ? 'custom' : 'default';
      } else if (storedValue.courseMode !== 'default' && storedValue.courseMode !== 'custom') {
        storedValue.courseMode = storedValue.today.chars.length > 0 ? 'custom' : 'default';
        recovered = true;
      }

      if (storedValue.writingMode === undefined) {
        storedValue.writingMode = 'trace';
      } else if (storedValue.writingMode !== 'blank' && storedValue.writingMode !== 'trace') {
        storedValue.writingMode = 'trace';
        recovered = true;
      }

      if (storedValue.stats === undefined) {
        storedValue.stats = createDefaultState().stats;
      } else if (!isRecord(storedValue.stats) ||
        typeof storedValue.stats.lastStudyDate !== 'string' ||
        typeof storedValue.stats.streak !== 'number' ||
        typeof storedValue.stats.totalSessions !== 'number') {
        storedValue.stats = createDefaultState().stats;
        recovered = true;
      }

      // Persist the version marker immediately: a restored non-home page may
      // load before the homepage, and the one-time reset must still stick.
      if (courseMigrated) {
        try {
          adapter.set(STORAGE_KEY, storedValue);
        } catch (error) {
          return { ok: false, recovered: true, state: storedValue };
        }
      }

      return {
        ok: true,
        recovered: recovered,
        state: storedValue
      };
    },

    save: function (state) {
      if (!isValidState(state)) {
        return { ok: false };
      }

      try {
        adapter.set(STORAGE_KEY, state);
        return { ok: true };
      } catch (error) {
        return { ok: false };
      }
    }
  };
}

module.exports = {
  createDefaultState: createDefaultState,
  createStorage: createStorage
};
