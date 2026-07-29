const { join } = require('node:path');

class RuntimeConfigurationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RuntimeConfigurationError';
    this.code = code;
  }
}

function isDockerServicesStartupFailure(error) {
  return ['docker-unavailable', 'compose-unavailable', 'compose-start-failed'].includes(error?.code)
    || /^Timed out waiting for local services:/.test(error?.message || '');
}

async function startBackendRuntime({ paths, resources, dependencies }) {
  const {
    ensureRuntimeFiles,
    readBackendConfiguration,
    normalizeBackendConfiguration,
    createComposeEnvironment,
    ensureComposeEnvironment,
    getComposeEnvironmentMismatches,
    ensureDockerStack,
    waitForLocalServices,
    readMigrationManifest,
    runNodeScript,
    startNodeProcess,
    onBackendStarted,
    waitForHealthyBackend,
  } = dependencies;

  ensureRuntimeFiles({
    composeTemplatePath: resources.composeTemplatePath,
    paths,
  });

  const configuration = normalizeBackendConfiguration(
    readBackendConfiguration(paths.backendEnvPath),
  );
  if (configuration.missing.length > 0) {
    throw new RuntimeConfigurationError(
      'configuration-invalid',
      `The local POS configuration is invalid: ${configuration.missing.join(', ')}`,
    );
  }

  const composeEnvironment = createComposeEnvironment(configuration.values);
  const createdComposeEnvironment = ensureComposeEnvironment(
    paths.composeEnvPath,
    composeEnvironment,
  );
  if (!createdComposeEnvironment) {
    const mismatches = getComposeEnvironmentMismatches(
      paths.composeEnvPath,
      composeEnvironment,
    );
    if (mismatches.length > 0) {
      throw new RuntimeConfigurationError(
        'compose-environment-mismatch',
        `The saved Docker configuration does not match the POS configuration: ${mismatches.join(', ')}`,
      );
    }
  }
  await ensureDockerStack({
    composeEnvPath: paths.composeEnvPath,
    composePath: paths.composePath,
  });
  await waitForLocalServices({ configuration: configuration.values });

  readMigrationManifest(resources.backendDirectory);
  const backendEnvironment = {
    ...configuration.values,
    ASANPOS_ENV_FILE: paths.backendEnvPath,
    NODE_ENV: 'production',
  };
  await runNodeScript({
    entryPath: join(resources.backendDirectory, 'dist', 'database', 'run-migrations.js'),
    cwd: resources.backendDirectory,
    env: backendEnvironment,
    logPath: paths.backendLogPath,
  });

  const backendProcess = startNodeProcess({
    entryPath: join(resources.backendDirectory, 'dist', 'main.js'),
    cwd: resources.backendDirectory,
    env: {
      ...backendEnvironment,
      HOST: '127.0.0.1',
      PORT: '3000',
    },
    logPath: paths.backendLogPath,
  });

  onBackendStarted?.(backendProcess);
  await waitForHealthyBackend({ url: 'http://127.0.0.1:3000/health' });
  return backendProcess;
}

module.exports = {
  isDockerServicesStartupFailure,
  RuntimeConfigurationError,
  startBackendRuntime,
};
