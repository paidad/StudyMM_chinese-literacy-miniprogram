var STORAGE_KEY = 'mama_literacy_state_v1';

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
    progress: {},
    recordings: {},
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
    isRecord(value.coursePlan) &&
    typeof value.coursePlan.date === 'string' &&
    typeof value.coursePlan.lessonIndex === 'number' &&
    value.coursePlan.lessonIndex >= 0 &&
    Math.floor(value.coursePlan.lessonIndex) === value.coursePlan.lessonIndex &&
    isRecord(value.recordings) &&
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

      if (storedValue.recordings === undefined) {
        storedValue.recordings = {};
      } else if (!isRecord(storedValue.recordings)) {
        storedValue.recordings = {};
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

      if (storedValue.stats === undefined) {
        storedValue.stats = createDefaultState().stats;
      } else if (!isRecord(storedValue.stats) ||
        typeof storedValue.stats.lastStudyDate !== 'string' ||
        typeof storedValue.stats.streak !== 'number' ||
        typeof storedValue.stats.totalSessions !== 'number') {
        storedValue.stats = createDefaultState().stats;
        recovered = true;
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
