const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} = require('node:fs');
const { dirname, join } = require('node:path');
const dotenv = require('dotenv');

const REQUIRED_KEYS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'REDIS_HOST',
  'REDIS_PORT',
  'MINIO_ENDPOINT',
  'MINIO_PORT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_BUCKET',
  'JWT_SECRET',
];

function createRuntimePaths(localAppDataDirectory) {
  const rootDirectory = join(localAppDataDirectory, 'Asan POS');
  const dockerDirectory = join(rootDirectory, 'docker');

  return {
    rootDirectory,
    dockerDirectory,
    backendEnvPath: join(rootDirectory, 'backend.env'),
    composePath: join(dockerDirectory, 'compose.yaml'),
    composeEnvPath: join(dockerDirectory, 'compose.env'),
    migrationStatePath: join(rootDirectory, 'migration-state.json'),
    logDirectory: join(rootDirectory, 'logs'),
    backendLogPath: join(rootDirectory, 'logs', 'backend.log'),
  };
}

function ensureRuntimeFiles({
  resourcesDirectory,
  backendTemplatePath = resourcesDirectory && join(resourcesDirectory, 'backend.env.example'),
  composeTemplatePath = resourcesDirectory && join(resourcesDirectory, 'compose.yaml'),
  paths,
}) {
  mkdirSync(paths.rootDirectory, { recursive: true });
  mkdirSync(paths.dockerDirectory, { recursive: true });
  mkdirSync(paths.logDirectory, { recursive: true });

  if (!existsSync(paths.backendEnvPath)) {
    copyFileSync(backendTemplatePath, paths.backendEnvPath);
  }

  if (!existsSync(paths.composePath)) {
    copyFileSync(composeTemplatePath, paths.composePath);
  }
}

function readBackendConfiguration(configPath) {
  return dotenv.parse(readFileSync(configPath));
}

function trimValues(values) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, String(value).trim()]),
  );
}

function isMissing(value) {
  return !value || value.trim() === '' || value.trim() === 'CHANGE_ME';
}

function isLoopbackHost(value) {
  return value === '127.0.0.1' || value === 'localhost';
}

function parseRedisUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'redis:' || !url.hostname || !url.port) return null;
    return { host: url.hostname, port: url.port };
  } catch {
    return null;
  }
}

function normalizeBackendConfiguration(input) {
  const values = trimValues(input);
  const redis = parseRedisUrl(values.REDIS_URL);

  if (isMissing(values.REDIS_HOST) && redis) values.REDIS_HOST = redis.host;
  if (isMissing(values.REDIS_PORT) && redis) values.REDIS_PORT = redis.port;
  if (isMissing(values.REDIS_URL) && !isMissing(values.REDIS_HOST) && !isMissing(values.REDIS_PORT)) {
    values.REDIS_URL = `redis://${values.REDIS_HOST}:${values.REDIS_PORT}`;
  }

  const bucket = values.MINIO_BUCKET || values.MINIO_BUCKET_NAME;
  if (bucket) {
    values.MINIO_BUCKET = bucket;
    values.MINIO_BUCKET_NAME = bucket;
  }

  const missing = REQUIRED_KEYS.filter((key) => isMissing(values[key]));

  for (const key of ['DB_HOST', 'REDIS_HOST', 'MINIO_ENDPOINT']) {
    if (!isMissing(values[key]) && !isLoopbackHost(values[key])) {
      missing.push(`${key} must be 127.0.0.1 or localhost`);
    }
  }

  return { values, missing };
}

function createComposeEnvironment(values) {
  return {
    POSTGRES_DB: values.DB_NAME,
    POSTGRES_USER: values.DB_USER,
    POSTGRES_PASSWORD: values.DB_PASSWORD,
    POSTGRES_PORT: values.DB_PORT,
    REDIS_PORT: values.REDIS_PORT,
    MINIO_ROOT_USER: values.MINIO_ACCESS_KEY,
    MINIO_ROOT_PASSWORD: values.MINIO_SECRET_KEY,
    MINIO_API_PORT: values.MINIO_PORT || '9000',
    MINIO_CONSOLE_PORT: values.MINIO_CONSOLE_PORT || '9001',
  };
}

function writeComposeEnvironment(filePath, values) {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  const temporaryPath = `${filePath}.tmp`;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(temporaryPath, `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
  renameSync(temporaryPath, filePath);
}

module.exports = {
  createComposeEnvironment,
  createRuntimePaths,
  ensureRuntimeFiles,
  normalizeBackendConfiguration,
  readBackendConfiguration,
  writeComposeEnvironment,
};
