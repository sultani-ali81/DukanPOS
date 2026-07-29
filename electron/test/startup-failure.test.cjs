const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, statSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const test = require('node:test');

const {
  createStartupFailureDialog,
  getStartupFailureInfo,
  tryAppendStartupDiagnostic,
} = require('../lib/startup-failure.cjs');
const { createRuntimePaths } = require('../lib/configuration.cjs');

const paths = {
  startupLogPath: 'C:/Users/Operator/AppData/Local/Asan POS/logs/startup.log',
  backendLogPath: 'C:/Users/Operator/AppData/Local/Asan POS/logs/backend.log',
};

function createSecretBearingError({ code, message = 'super-secret-value' } = {}) {
  const error = Object.assign(new Error(message), {
    code,
    cause: new Error('cause-secret-value'),
  });
  error.stack = 'stack-secret-value';
  return error;
}

function dialogText(dialog) {
  return [dialog.title, dialog.message, dialog.detail].join('\n');
}

function assertDialogDoesNotExposeErrorDetails(dialog) {
  const text = dialogText(dialog);
  assert.doesNotMatch(text, /super-secret-value/);
  assert.doesNotMatch(text, /cause-secret-value/);
  assert.doesNotMatch(text, /stack-secret-value/);
}

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
  const error = createSecretBearingError({
    code: 'docker-unavailable',
  });

  const diagnosticWasWritten = tryAppendStartupDiagnostic({
    logPath,
    error,
    now: () => new Date('2026-07-29T12:34:56.000Z'),
  });

  const content = readFileSync(logPath, 'utf8');
  assert.equal(diagnosticWasWritten, true);
  assert.match(content, /2026-07-29T12:34:56\.000Z/);
  assert.match(content, /docker-startup-failed/);
  assert.match(content, /\n$/);
  assert.doesNotMatch(content, /super-secret-value/);
  assert.doesNotMatch(content, /cause-secret-value/);
  assert.doesNotMatch(content, /stack-secret-value/);
  assert.equal(statSync(logPath).mode & 0o777, 0o600);
});

test('maps Docker startup errors to static recovery text and the startup log', () => {
  const error = createSecretBearingError({
    code: 'compose-start-failed',
  });

  const info = getStartupFailureInfo(error);
  const dialog = createStartupFailureDialog({
    error,
    paths,
    startupLogAvailable: true,
  });

  assert.deepEqual(info, {
    code: 'docker-startup-failed',
    category: 'docker',
    message: 'Docker Desktop must be installed and running. Open it, wait until it is ready, then reopen Asan POS.',
  });
  assert.match(dialog.detail, /Docker Desktop must be installed and running/);
  assert.match(dialog.detail, new RegExp(paths.startupLogPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assertDialogDoesNotExposeErrorDetails(dialog);
});

test('maps configuration errors to administrator recovery text and the startup log', () => {
  const error = createSecretBearingError({
    code: 'configuration-invalid',
  });

  const info = getStartupFailureInfo(error);
  const dialog = createStartupFailureDialog({
    error,
    paths,
    startupLogAvailable: true,
  });

  assert.deepEqual(info, {
    code: 'configuration-invalid',
    category: 'configuration',
    message: 'The local POS configuration needs attention. Contact your POS administrator.',
  });
  assert.match(dialog.detail, /Contact your POS administrator/);
  assert.match(dialog.detail, new RegExp(paths.startupLogPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assertDialogDoesNotExposeErrorDetails(dialog);
});

test('maps saved Compose credential mismatches to static configuration recovery text', () => {
  const error = createSecretBearingError({
    code: 'compose-environment-mismatch',
  });

  const dialog = createStartupFailureDialog({
    error,
    paths,
    startupLogAvailable: true,
  });

  assert.match(dialog.detail, /Contact your POS administrator/);
  assert.match(dialog.detail, /startup\.log/);
  assertDialogDoesNotExposeErrorDetails(dialog);
});

test('maps local service timeouts to static Docker recovery text', () => {
  const error = createSecretBearingError({
    message: 'Timed out waiting for local services: Redis super-secret-value',
  });

  const info = getStartupFailureInfo(error);
  const dialog = createStartupFailureDialog({
    error,
    paths,
    startupLogAvailable: true,
  });

  assert.equal(info.category, 'docker');
  assert.match(dialog.detail, /Docker Desktop must be installed and running/);
  assertDialogDoesNotExposeErrorDetails(dialog);
});

test('maps unexpected startup failures to a static backend dialog with both logs', () => {
  const error = createSecretBearingError();

  const dialog = createStartupFailureDialog({
    error,
    paths,
    startupLogAvailable: true,
    backendLogAvailable: true,
  });

  assert.equal(dialog.message, 'The POS backend could not start.');
  assert.match(dialog.detail, /startup\.log/);
  assert.match(dialog.detail, /backend\.log/);
  assertDialogDoesNotExposeErrorDetails(dialog);
});

test('does not promise a startup log when appending the diagnostic fails', () => {
  const error = createSecretBearingError({ code: 'compose-start-failed' });
  const root = mkdtempSync(join(tmpdir(), 'asan-pos-unavailable-startup-log-'));
  const startupLogAvailable = tryAppendStartupDiagnostic({
    logPath: join(root, 'logs', 'startup.log'),
    error,
    appendFileSyncImpl: () => {
      throw Object.assign(new Error('disk failure'), { code: 'EACCES' });
    },
  });
  const dialog = createStartupFailureDialog({
    error,
    paths,
    startupLogAvailable,
  });

  assert.equal(startupLogAvailable, false);
  assert.match(
    dialog.detail,
    /Asan POS could not write a diagnostic log\. Contact your POS administrator\./,
  );
  assert.equal(dialogText(dialog).includes(paths.startupLogPath), false);
  assertDialogDoesNotExposeErrorDetails(dialog);
});

test('lists only logs that are known to exist for backend failures', () => {
  const error = createSecretBearingError();
  const startupOnlyDialog = createStartupFailureDialog({
    error,
    paths,
    startupLogAvailable: true,
    backendLogAvailable: false,
  });
  const backendOnlyDialog = createStartupFailureDialog({
    error,
    paths,
    startupLogAvailable: false,
    backendLogAvailable: true,
  });

  assert.equal(dialogText(startupOnlyDialog).includes(paths.startupLogPath), true);
  assert.equal(dialogText(startupOnlyDialog).includes(paths.backendLogPath), false);
  assert.equal(dialogText(backendOnlyDialog).includes(paths.startupLogPath), false);
  assert.equal(dialogText(backendOnlyDialog).includes(paths.backendLogPath), true);
  assertDialogDoesNotExposeErrorDetails(startupOnlyDialog);
  assertDialogDoesNotExposeErrorDetails(backendOnlyDialog);
});
