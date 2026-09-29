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
  assert.strictEqual(result.state.courseMode, 'default');
  assert.deepStrictEqual(result.state.progress, {});
  assert.deepStrictEqual(result.state.recordings, {});
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
  assert.strictEqual(result.recovered, false);
  assert.strictEqual(result.state.testTapCount, 7);
  assert.deepStrictEqual(result.state.recordings, {});
  assert.strictEqual(result.state.stats.streak, 0);
  assert.deepStrictEqual(result.state.coursePlan, { date: '', lessonIndex: 0 });
  assert.strictEqual(result.state.courseMode, 'default');
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
});

runTest('saved state can be loaded again', function () {
  var adapter = createMemoryAdapter();
  var store = storageModule.createStorage(adapter);
  var state = storageModule.createDefaultState();
  state.testTapCount = 3;

  assert.strictEqual(store.save(state).ok, true);
  assert.strictEqual(store.load().state.testTapCount, 3);
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
