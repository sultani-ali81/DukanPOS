const { appendFileSync, mkdirSync } = require('node:fs');
const { dirname } = require('node:path');

const DOCKER_FAILURE_CODES = new Set([
  'docker-unavailable',
  'compose-unavailable',
  'compose-start-failed',
]);

const CONFIGURATION_FAILURE_CODES = new Set([
  'configuration-invalid',
  'compose-environment-mismatch',
]);

const DOCKER_FAILURE_INFO = {
  code: 'docker-startup-failed',
  category: 'docker',
  message: 'Docker Desktop must be installed and running. Open it, wait until it is ready, then reopen Asan POS.',
};

const CONFIGURATION_FAILURE_INFO = {
  code: 'configuration-invalid',
  category: 'configuration',
  message: 'The local POS configuration needs attention. Contact your POS administrator.',
};

const BACKEND_FAILURE_INFO = {
  code: 'backend-startup-failed',
  category: 'backend',
  message: 'The POS backend could not start.',
};

const DIAGNOSTIC_WRITE_FAILURE_MESSAGE =
  'Asan POS could not write a diagnostic log. Contact your POS administrator.';

function isLocalServicesTimeout(error) {
  return typeof error?.message === 'string'
    && error.message.startsWith('Timed out waiting for local services:');
}

function getStartupFailureInfo(error) {
  if (DOCKER_FAILURE_CODES.has(error?.code) || isLocalServicesTimeout(error)) {
    return DOCKER_FAILURE_INFO;
  }

  if (CONFIGURATION_FAILURE_CODES.has(error?.code)) {
    return CONFIGURATION_FAILURE_INFO;
  }

  return BACKEND_FAILURE_INFO;
}

function toIsoTimestamp(now) {
  const value = typeof now === 'function' ? now() : now;
  return new Date(value).toISOString();
}

function appendStartupDiagnostic({
  logPath,
  error,
  now = () => new Date(),
  appendFileSyncImpl = appendFileSync,
}) {
  const { code, category } = getStartupFailureInfo(error);
  const entry = `${toIsoTimestamp(now)} code=${code} category=${category}\n`;

  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSyncImpl(logPath, entry, { encoding: 'utf8', mode: 0o600 });
}

function tryAppendStartupDiagnostic(options) {
  try {
    appendStartupDiagnostic(options);
    return true;
  } catch {
    return false;
  }
}

function createStartupFailureDialog({
  error,
  paths,
  startupLogAvailable = false,
  backendLogAvailable = false,
}) {
  const failure = getStartupFailureInfo(error);
  const diagnosticDetail = startupLogAvailable
    ? `Startup log: ${paths.startupLogPath}`
    : DIAGNOSTIC_WRITE_FAILURE_MESSAGE;

  if (failure.category === 'docker') {
    return {
      type: 'error',
      title: 'Asan POS needs Docker Desktop',
      message: 'Asan POS could not start.',
      detail: `${failure.message}\n\n${diagnosticDetail}`,
      buttons: ['Quit'],
      defaultId: 0,
      cancelId: 0,
    };
  }

  if (failure.category === 'configuration') {
    return {
      type: 'error',
      title: 'Asan POS needs configuration help',
      message: 'Asan POS could not start.',
      detail: `${failure.message}\n\n${diagnosticDetail}`,
      buttons: ['Quit'],
      defaultId: 0,
      cancelId: 0,
    };
  }

  return {
    type: 'error',
    title: 'Asan POS could not start',
    message: failure.message,
    detail: [
      diagnosticDetail,
      backendLogAvailable ? `Backend log: ${paths.backendLogPath}` : null,
    ].filter(Boolean).join('\n\n'),
    buttons: ['Quit'],
    defaultId: 0,
    cancelId: 0,
  };
}

module.exports = {
  appendStartupDiagnostic,
  createStartupFailureDialog,
  getStartupFailureInfo,
  tryAppendStartupDiagnostic,
};
