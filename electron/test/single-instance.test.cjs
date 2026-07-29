const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');

const { acquireSingleInstanceLock } = require('../lib/single-instance.cjs');

class FakeElectronApp extends EventEmitter {
  constructor(lockGranted) {
    super();
    this.lockGranted = lockGranted;
    this.lockRequests = 0;
    this.quitCalls = 0;
  }

  requestSingleInstanceLock() {
    this.lockRequests += 1;
    return this.lockGranted;
  }

  quit() {
    this.quitCalls += 1;
  }
}

function createWindow({ minimized }) {
  const calls = [];

  return {
    calls,
    isMinimized: () => minimized,
    restore: () => calls.push('restore'),
    focus: () => calls.push('focus'),
  };
}

test('quits without registering a second-instance listener when the lock is denied', () => {
  const app = new FakeElectronApp(false);

  const acquired = acquireSingleInstanceLock({
    app,
    getMainWindow: () => null,
  });

  assert.equal(acquired, false);
  assert.equal(app.lockRequests, 1);
  assert.equal(app.quitCalls, 1);
  assert.equal(app.listenerCount('second-instance'), 0);
});

test('restores and focuses a minimized primary window when another instance starts', () => {
  const app = new FakeElectronApp(true);
  const window = createWindow({ minimized: true });

  const acquired = acquireSingleInstanceLock({
    app,
    getMainWindow: () => window,
  });
  app.emit('second-instance');

  assert.equal(acquired, true);
  assert.equal(app.lockRequests, 1);
  assert.equal(app.quitCalls, 0);
  assert.deepEqual(window.calls, ['restore', 'focus']);
});

test('does nothing when a second instance starts before a primary window exists', () => {
  const app = new FakeElectronApp(true);
  let windowLookups = 0;

  const acquired = acquireSingleInstanceLock({
    app,
    getMainWindow: () => {
      windowLookups += 1;
      return null;
    },
  });

  assert.equal(acquired, true);
  assert.doesNotThrow(() => app.emit('second-instance'));
  assert.equal(windowLookups, 1);
});

test('focuses a primary window without restoring it when it is not minimized', () => {
  const app = new FakeElectronApp(true);
  const window = createWindow({ minimized: false });

  acquireSingleInstanceLock({
    app,
    getMainWindow: () => window,
  });
  app.emit('second-instance');

  assert.deepEqual(window.calls, ['focus']);
});
