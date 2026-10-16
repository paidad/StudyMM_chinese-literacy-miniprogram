var assert = require('assert');
var storageModule = require('../utils/storage.js');

function createMemoryAdapter(initialValue) {
  var value = initialValue;

  return {
    get: function () {
      return value;
    },
    set: function (key, nextValue) {
      value = nextValue;
    }
  };
}

function runTest(name, testFunction) {
  try {
    testFunction();
    console.log('PASS ' + name);
  } catch (error) {
    console.error('FAIL ' + name);
    throw error;
  }
}

runTest('empty storage returns a fresh state', function () {
  var store = storageModule.createStorage(createMemoryAdapter());
  var result = store.load();

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.recovered, false);
  assert.strictEqual(result.state.version, 1);
  assert.strictEqual(result.state.testTapCount, 0);
  assert.deepStrictEqual(result.state.chars, {});
  assert.deepStrictEqual(result.state.today, { date: '', chars: [] });
  assert.deepStrictEqual(result.state.coursePlan, { date: '', lessonIndex: 0 });
  assert.strictEqual(result.state.defaultCourseRevision, 2);
  assert.strictEqual(result.state.courseMode, 'default');
  assert.strictEqual(result.state.writingMode, 'trace');
  assert.deepStrictEqual(result.state.progress, {});
  assert.deepStrictEqual(result.state.recordings, {});
  assert.deepStrictEqual(result.state.hiddenRecorded, {});
  assert.deepStrictEqual(result.state.stats, {
    lastStudyDate: '',
    streak: 0,
    totalSessions: 0
  });
});

runTest('older state gains an empty recording map without losing data', function () {
  var legacyState = {
    version: 1,
    chars: {},
    today: { date: '', chars: [] },
    progress: {},
    testTapCount: 7
  };
  var store = storageModule.createStorage(createMemoryAdapter(legacyState));
  var result = store.load();

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.recovered, true);
  assert.strictEqual(result.state.testTapCount, 7);
  assert.deepStrictEqual(result.state.recordings, {});
  assert.deepStrictEqual(result.state.hiddenRecorded, {});
  assert.strictEqual(result.state.stats.streak, 0);
  assert.deepStrictEqual(result.state.coursePlan, { date: '', lessonIndex: 0 });
  assert.strictEqual(result.state.defaultCourseRevision, 2);
  assert.strictEqual(result.state.courseMode, 'default');
  assert.strictEqual(result.state.writingMode, 'trace');
});

runTest('older custom tasks stay active after storage migration', function () {
  var legacyState = {
    version: 1,
    chars: { '山': { char: '山' } },
    today: { date: '2026-09-20', chars: ['山'] },
    coursePlan: { date: '2026-09-20', lessonIndex: 3 },
    progress: {},
    recordings: {},
    stats: { lastStudyDate: '', streak: 0, totalSessions: 0 },
    testTapCount: 0
  };
  var store = storageModule.createStorage(createMemoryAdapter(legacyState));
  var result = store.load();

  assert.strictEqual(result.state.courseMode, 'custom');
  assert.deepStrictEqual(result.state.today.chars, ['山']);
  assert.deepStrictEqual(result.state.coursePlan, { date: '', lessonIndex: 0 });
});

runTest('new course migration resets only lesson selection once', function () {
  var oldState = storageModule.createDefaultState();
  oldState.defaultCourseRevision = 1;
  oldState.coursePlan = { date: '2026-10-14', lessonIndex: 24 };
  oldState.courseMode = 'custom';
  oldState.today = { date: '2026-10-14', chars: ['山'] };
  oldState.chars = { '山': { char: '山' } };
  oldState.progress = { '旧': { char: '旧', interval: 5, due: '2026-10-20' } };
  oldState.recordings = { '山': 'wxfile://recording.mp3' };
  var persisted = JSON.stringify(oldState);
  var saveCount = 0;
  var store = storageModule.createStorage({
    get: function () { return JSON.parse(persisted); },
    set: function (key, value) {
      persisted = JSON.stringify(value);
      saveCount += 1;
    }
  });

  var migrated = store.load();
  assert.strictEqual(migrated.recovered, true);
  assert.deepStrictEqual(migrated.state.coursePlan, { date: '', lessonIndex: 0 });
  assert.strictEqual(migrated.state.courseMode, 'custom');
  assert.deepStrictEqual(migrated.state.today.chars, ['山']);
  assert.deepStrictEqual(migrated.state.chars, { '山': { char: '山' } });
  assert.deepStrictEqual(migrated.state.progress, { '旧': { char: '旧', interval: 5, due: '2026-10-20' } });
  assert.deepStrictEqual(migrated.state.recordings, { '山': 'wxfile://recording.mp3' });
  assert.strictEqual(saveCount, 1, 'migration marker must persist even when a non-home page loads first');
  var later = store.load();
  assert.strictEqual(later.recovered, false);
  assert.deepStrictEqual(later.state.coursePlan, { date: '', lessonIndex: 0 });
  assert.strictEqual(saveCount, 1, 'the reset must happen only once');
});

runTest('saved state can be loaded again', function () {
  var adapter = createMemoryAdapter();
  var store = storageModule.createStorage(adapter);
  var state = storageModule.createDefaultState();
  state.testTapCount = 3;

  assert.strictEqual(store.save(state).ok, true);
  assert.strictEqual(store.load().state.testTapCount, 3);
});

runTest('writing preference survives reload and invalid values recover to tracing', function () {
  var adapter = createMemoryAdapter();
  var store = storageModule.createStorage(adapter);
  var state = storageModule.createDefaultState();
  state.writingMode = 'blank';

  assert.strictEqual(store.save(state).ok, true);
  assert.strictEqual(store.load().state.writingMode, 'blank');
  state.writingMode = 'invalid';
  assert.strictEqual(store.load().state.writingMode, 'trace');
});

runTest('damaged storage is replaced with a safe state', function () {
  var store = storageModule.createStorage(createMemoryAdapter({ broken: true }));
  var result = store.load();

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.recovered, true);
  assert.strictEqual(result.state.testTapCount, 0);
});

runTest('read failure returns a visible-safe result', function () {
  var store = storageModule.createStorage({
    get: function () {
      throw new Error('read failed');
    },
    set: function () {}
  });
  var result = store.load();

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.state.testTapCount, 0);
});

runTest('write failure is reported', function () {
  var store = storageModule.createStorage({
    get: function () {},
    set: function () {
      throw new Error('write failed');
    }
  });
  var result = store.save(storageModule.createDefaultState());

  assert.strictEqual(result.ok, false);
});

console.log('All storage tests passed.');
