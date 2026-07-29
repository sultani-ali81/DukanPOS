const assert = require('node:assert/strict');
const test = require('node:test');

const {
  isDockerServicesStartupFailure,
  startBackendRuntime,
} = require('../lib/runtime-startup.cjs');

const paths = {
  backendEnvPath: 'C:/Asan POS/backend.env',
  composeEnvPath: 'C:/Asan POS/docker/compose.env',
  composePath: 'C:/Asan POS/docker/compose.yaml',
  backendLogPath: 'C:/Asan POS/logs/backend.log',
};

const resources = {
  composeTemplatePath: 'C:/resources/compose.yaml',
  backendDirectory: 'C:/resources/backend',
};

const configuration = {
  values: { DB_HOST: '127.0.0.1', DB_PORT: '5432' },
  missing: [],
};

function createDependencies(events) {
  return {
    ensureRuntimeFiles: () => events.push('runtime-files'),
    readBackendConfiguration: () => {
      events.push('read-config');
      return configuration.values;
    },
    normalizeBackendConfiguration: () => {
      events.push('normalize-config');
      return configuration;
    },
    createComposeEnvironment: () => {
      events.push('compose-values');
      return { POSTGRES_PORT: '5432' };
    },
    ensureComposeEnvironment: () => events.push('compose-env'),
    ensureDockerStack: async () => events.push('docker-stack'),
    waitForLocalServices: async () => events.push('service-wait'),
    readMigrationManifest: () => events.push('migration-manifest'),
    runNodeScript: async () => events.push('migrations'),
    startNodeProcess: () => {
      events.push('backend-start');
      return { pid: 42 };
    },
    onBackendStarted: () => events.push('backend-tracked'),
    waitForHealthyBackend: async () => events.push('backend-health'),
  };
}

test('starts the generated local stack before migrations and backend launch', async () => {
  const events = [];

  const backendProcess = await startBackendRuntime({
    paths,
    resources,
    dependencies: createDependencies(events),
  });

  assert.deepEqual(events, [
    'runtime-files',
    'read-config',
    'normalize-config',
    'compose-values',
    'compose-env',
    'docker-stack',
    'service-wait',
    'migration-manifest',
    'migrations',
    'backend-start',
    'backend-tracked',
    'backend-health',
  ]);
  assert.deepEqual(backendProcess, { pid: 42 });
});

test('does not run migrations or launch the backend after Docker startup fails', async () => {
  const events = [];
  const dockerFailure = Object.assign(new Error('Docker is not running'), {
    code: 'docker-unavailable',
  });
  const dependencies = createDependencies(events);
  dependencies.ensureDockerStack = async () => {
    events.push('docker-stack');
    throw dockerFailure;
  };

  await assert.rejects(
    startBackendRuntime({ paths, resources, dependencies }),
    dockerFailure,
  );

  assert.deepEqual(events, [
    'runtime-files',
    'read-config',
    'normalize-config',
    'compose-values',
    'compose-env',
    'docker-stack',
  ]);
});

test('identifies Docker and local service readiness startup failures', () => {
  assert.equal(isDockerServicesStartupFailure({ code: 'docker-unavailable' }), true);
  assert.equal(
    isDockerServicesStartupFailure(new Error('Timed out waiting for local services: Redis')),
    true,
  );
  assert.equal(isDockerServicesStartupFailure(new Error('backend failed')), false);
});
