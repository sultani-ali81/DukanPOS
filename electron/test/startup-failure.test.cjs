const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, statSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const test = require('node:test');

const {
  appendStartupDiagnostic,
  createStartupFailureDialog,
  getStartupFailureInfo,
} = require('../lib/startup-failure.cjs');
const { createRuntimePaths } = require('../lib/configuration.cjs');

const paths = {
  startupLogPath: 'C:/Users/Operator/AppData/Local/Asan POS/logs/startup.log',
  backendLogPath: 'C:/Users/Operator/AppData/Local/Asan POS/logs/backend.log',
};

test('allocates a separate startup diagnostic log path', () => {
  const localAppDataDirectory = join('C:', 'Users', 'Operator', 'AppData', 'Local');
  const runtimePaths = createRuntimePaths(localAppDataDirectory);

  assert.equal(
    runtimePaths.startupLogPath,
    join(localAppDataDirectory, 'Asan POS', 'logs', 'startup.log'),
  );
});

test('writes a stable diagnostic without secret-bearing startup error details', () => {
  const root = mkdtempSync(join(tmpdir(), 'asan-pos-startup-log-'));
  const logPath = join(root, 'logs', 'startup.log');
  const error = Object.assign(new Error('Docker returned super-secret-value'), {
    code: 'docker-unavailable',
    cause: new Error('also-super-secret-value'),
  });

  appendStartupDiagnostic({
    logPath,
    error,
    now: () => new Date('2026-07-29T12:34:56.000Z'),
  });

  const content = readFileSync(logPath, 'utf8');
  assert.match(content, /2026-07-29T12:34:56\.000Z/);
  assert.match(content, /docker-startup-failed/);
  assert.match(content, /\n$/);
  assert.doesNotMatch(content, /super-secret-value/);
  assert.equal(statSync(logPath).mode & 0o777, 0o600);
});

test('maps Docker startup errors to static recovery text and the startup log', () => {
  const error = Object.assign(new Error('super-secret-value'), {
    code: 'compose-start-failed',
  });

  const info = getStartupFailureInfo(error);
  const dialog = createStartupFailureDialog({ error, paths });

  assert.deepEqual(info, {
    code: 'docker-startup-failed',
    category: 'docker',
    message: 'Docker Desktop must be installed and running. Open it, wait until it is ready, then reopen Asan POS.',
  });
  assert.match(dialog.detail, /Docker Desktop must be installed and running/);
  assert.match(dialog.detail, new RegExp(paths.startupLogPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(dialog.detail, /super-secret-value/);
});

test('maps configuration errors to administrator recovery text and the startup log', () => {
  const error = Object.assign(new Error('super-secret-value'), {
    code: 'configuration-invalid',
  });

  const info = getStartupFailureInfo(error);
  const dialog = createStartupFailureDialog({ error, paths });

  assert.deepEqual(info, {
    code: 'configuration-invalid',
    category: 'configuration',
    message: 'The local POS configuration needs attention. Contact your POS administrator.',
  });
  assert.match(dialog.detail, /Contact your POS administrator/);
  assert.match(dialog.detail, new RegExp(paths.startupLogPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(dialog.detail, /super-secret-value/);
});

test('maps saved Compose credential mismatches to static configuration recovery text', () => {
  const error = Object.assign(new Error('super-secret-value'), {
    code: 'compose-environment-mismatch',
  });

  const dialog = createStartupFailureDialog({ error, paths });

  assert.match(dialog.detail, /Contact your POS administrator/);
  assert.match(dialog.detail, /startup\.log/);
  assert.doesNotMatch(dialog.detail, /super-secret-value/);
});

test('maps local service timeouts to static Docker recovery text', () => {
  const error = new Error('Timed out waiting for local services: Redis super-secret-value');

  const info = getStartupFailureInfo(error);
  const dialog = createStartupFailureDialog({ error, paths });

  assert.equal(info.category, 'docker');
  assert.match(dialog.detail, /Docker Desktop must be installed and running/);
  assert.doesNotMatch(dialog.detail, /super-secret-value/);
});

test('maps unexpected startup failures to a static backend dialog with both logs', () => {
  const error = new Error('super-secret-value');

  const dialog = createStartupFailureDialog({ error, paths });

  assert.equal(dialog.message, 'The POS backend could not start.');
  assert.match(dialog.detail, /startup\.log/);
  assert.match(dialog.detail, /backend\.log/);
  assert.doesNotMatch(dialog.detail, /super-secret-value/);
});
