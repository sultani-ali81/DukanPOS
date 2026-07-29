const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} = require('node:fs');
const { randomBytes } = require('node:crypto');
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
  'REDIS_PASSWORD',
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
    logDirectory: join(rootDirectory, 'logs'),
    backendLogPath: join(rootDirectory, 'logs', 'backend.log'),
  };
}

function ensureRuntimeFiles({
  resourcesDirectory,
  backendTemplatePath = resourcesDirectory && join(resourcesDirectory, 'backend.env.example'),
  composeTemplatePath = resourcesDirectory && join(resourcesDirectory, 'compose.yaml'),
  paths,
  randomBytesImpl,
}) {
  mkdirSync(paths.rootDirectory, { recursive: true });
  mkdirSync(paths.dockerDirectory, { recursive: true });
  mkdirSync(paths.logDirectory, { recursive: true });

  const createdBackendEnvironment = !existsSync(paths.backendEnvPath);
  if (createdBackendEnvironment) {
    writeBackendConfiguration(
      paths.backendEnvPath,
      createInitialBackendConfiguration(randomBytesImpl),
    );
  }

  const createdComposeFile = !existsSync(paths.composePath);
  if (createdComposeFile) {
    copyFileSync(composeTemplatePath, paths.composePath);
  }

  return { createdBackendEnvironment, createdComposeFile };
}

function createSecret(randomBytesImpl = randomBytes) {
  return randomBytesImpl(32).toString('hex');
}

function createInitialBackendConfiguration(randomBytesImpl) {
  const dbPassword = createSecret(randomBytesImpl);
  const redisPassword = createSecret(randomBytesImpl);
  const minioSecret = createSecret(randomBytesImpl);
  const jwtSecret = createSecret(randomBytesImpl);

  return {
    DB_HOST: '127.0.0.1', DB_PORT: '5432', DB_USER: 'asan_pos',
    DB_PASSWORD: dbPassword, DB_NAME: 'asan_pos',
    REDIS_HOST: '127.0.0.1', REDIS_PORT: '6379', REDIS_PASSWORD: redisPassword,
    REDIS_URL: `redis://:${encodeURIComponent(redisPassword)}@127.0.0.1:6379`,
    MINIO_ENDPOINT: '127.0.0.1', MINIO_PORT: '9000',
    MINIO_ACCESS_KEY: 'asanposminio', MINIO_SECRET_KEY: minioSecret,
    MINIO_BUCKET: 'asan-pos', MINIO_BUCKET_NAME: 'asan-pos', MINIO_USE_SSL: 'false',
    JWT_SECRET: jwtSecret,
  };
}

function writeBackendConfiguration(filePath, values) {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  const temporaryPath = `${filePath}.tmp`;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(temporaryPath, `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
  renameSync(temporaryPath, filePath);
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
  return value === '127.0.0.1';
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
  if (!isMissing(values.REDIS_PASSWORD) &&
      !isMissing(values.REDIS_HOST) &&
      !isMissing(values.REDIS_PORT)) {
    values.REDIS_URL = `redis://:${encodeURIComponent(values.REDIS_PASSWORD)}@${values.REDIS_HOST}:${values.REDIS_PORT}`;
  } else if (isMissing(values.REDIS_URL) &&
             !isMissing(values.REDIS_HOST) &&
             !isMissing(values.REDIS_PORT)) {
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
      missing.push(`${key} must be 127.0.0.1`);
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
    REDIS_PASSWORD: values.REDIS_PASSWORD,
    MINIO_ROOT_USER: values.MINIO_ACCESS_KEY,
    MINIO_ROOT_PASSWORD: values.MINIO_SECRET_KEY,
    MINIO_API_PORT: values.MINIO_PORT || '9000',
    MINIO_CONSOLE_PORT: values.MINIO_CONSOLE_PORT || '9001',
  };
}

function formatComposeEnvironmentValue(value) {
  const escapedValue = String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('$', () => '$$')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r')
    .replaceAll('\t', '\\t');
  return `"${escapedValue}"`;
}

function writeComposeEnvironment(filePath, values) {
  const lines = Object.entries(values).map(
    ([key, value]) => `${key}=${formatComposeEnvironmentValue(value)}`,
  );
  const temporaryPath = `${filePath}.tmp`;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(temporaryPath, `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
  renameSync(temporaryPath, filePath);
}

function ensureComposeEnvironment(filePath, values) {
  if (existsSync(filePath)) return false;
  writeComposeEnvironment(filePath, values);
  return true;
}

function parseDoubleQuotedComposeValue(value) {
  let parsed = '';

  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];
    const next = value[index + 1];

    if (current === '$' && next === '$') {
      parsed += '$';
      index += 1;
    } else if (current === '\\' && next) {
      const escapeSequences = { n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\' };
      parsed += escapeSequences[next] ?? next;
      index += 1;
    } else {
      parsed += current;
    }
  }

  return parsed;
}

function parseComposeEnvironment(content) {
  const values = {};

  for (const line of content.split(/\r?\n/)) {
    const separator = line.indexOf('=');
    if (separator <= 0 || line.trimStart().startsWith('#')) continue;

    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      values[key] = parseDoubleQuotedComposeValue(rawValue.slice(1, -1));
    } else if (rawValue.startsWith("'") && rawValue.endsWith("'")) {
      values[key] = rawValue.slice(1, -1).replaceAll("\\'", "'");
    } else {
      values[key] = rawValue;
    }
  }

  return values;
}

function getComposeEnvironmentMismatches(filePath, expectedValues) {
  let actualValues;
  try {
    actualValues = parseComposeEnvironment(readFileSync(filePath, 'utf8'));
  } catch {
    return Object.keys(expectedValues);
  }

  return Object.entries(expectedValues)
    .filter(([key, value]) => actualValues[key] !== String(value))
    .map(([key]) => key);
}

module.exports = {
  createInitialBackendConfiguration,
  createComposeEnvironment,
  createRuntimePaths,
  ensureComposeEnvironment,
  ensureRuntimeFiles,
  getComposeEnvironmentMismatches,
  normalizeBackendConfiguration,
  readBackendConfiguration,
  writeBackendConfiguration,
  writeComposeEnvironment,
};
