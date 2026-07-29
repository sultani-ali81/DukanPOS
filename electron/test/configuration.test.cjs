const assert = require('node:assert/strict');
const test = require('node:test');
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const {
  createComposeEnvironment,
  createRuntimePaths,
  ensureComposeEnvironment,
  ensureRuntimeFiles,
  getComposeEnvironmentMismatches,
  isKnownLegacyPlaceholderConfiguration,
  normalizeBackendConfiguration,
  readBackendConfiguration,
  writeComposeEnvironment,
} = require('../lib/configuration.cjs');

const legacyTemplate = [
  'DB_HOST=127.0.0.1', 'DB_PORT=5432', 'DB_USER=asan_pos',
  'DB_PASSWORD=CHANGE_ME', 'DB_NAME=asan_pos',
  'REDIS_HOST=127.0.0.1', 'REDIS_PORT=6379',
  'REDIS_PASSWORD=CHANGE_ME',
  'REDIS_URL=redis://:CHANGE_ME@127.0.0.1:6379',
  'MINIO_ENDPOINT=127.0.0.1', 'MINIO_PORT=9000',
  'MINIO_ACCESS_KEY=asanposminio', 'MINIO_SECRET_KEY=CHANGE_ME',
  'MINIO_BUCKET=asan-pos', 'MINIO_BUCKET_NAME=asan-pos',
  'MINIO_USE_SSL=false', 'JWT_SECRET=CHANGE_ME', '',
].join('\n');

function createResources(root) {
  const resourcesDirectory = join(root, 'resources');
  mkdirSync(resourcesDirectory, { recursive: true });
  writeFileSync(join(resourcesDirectory, 'compose.yaml'), 'name: asan-pos\n');
  return resourcesDirectory;
}

test('preserves an operator-edited backend environment while initializing Docker files', () => {
  const root = mkdtempSync(join(tmpdir(), 'asan-pos-config-'));
  const paths = createRuntimePaths(join(root, 'local-app-data'));
  const resourcesDirectory = createResources(root);

  ensureRuntimeFiles({ resourcesDirectory, paths });
  writeFileSync(paths.backendEnvPath, 'DB_HOST=custom-postgres\n');
  ensureRuntimeFiles({ resourcesDirectory, paths });

  assert.match(readFileSync(paths.backendEnvPath, 'utf8'), /DB_HOST=custom-postgres/);
  assert.equal(existsSync(paths.composePath), true);
});

test('creates a complete generated backend environment only once', () => {
  const root = mkdtempSync(join(tmpdir(), 'asan-pos-generated-config-'));
  const paths = createRuntimePaths(join(root, 'local-app-data'));
  const resourcesDirectory = createResources(root);
  const composeTemplatePath = join(resourcesDirectory, 'compose.yaml');
  const secrets = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64), 'd'.repeat(64)];
  const randomBytesImpl = () => Buffer.from(secrets.shift(), 'hex');

  const first = ensureRuntimeFiles({ composeTemplatePath, paths, randomBytesImpl });
  const firstContent = readFileSync(paths.backendEnvPath, 'utf8');

  assert.equal(first.createdBackendEnvironment, true);
  assert.match(firstContent, /DB_HOST=127.0.0.1/);
  assert.match(firstContent, /DB_PASSWORD=a{64}/);
  assert.doesNotMatch(firstContent, /CHANGE_ME/);

  const second = ensureRuntimeFiles({ composeTemplatePath, paths, randomBytesImpl });
  assert.equal(second.createdBackendEnvironment, false);
  assert.equal(readFileSync(paths.backendEnvPath, 'utf8'), firstContent);
});

test('migrates only the exact former placeholder backend environment', () => {
  const root = mkdtempSync(join(tmpdir(), 'asan-pos-legacy-config-'));
  const paths = createRuntimePaths(join(root, 'local-app-data'));
  const resourcesDirectory = createResources(root);
  const secrets = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64), 'd'.repeat(64)];
  const randomBytesImpl = () => Buffer.from(secrets.shift(), 'hex');
  mkdirSync(paths.rootDirectory, { recursive: true });
  writeFileSync(paths.backendEnvPath, legacyTemplate);

  assert.equal(
    isKnownLegacyPlaceholderConfiguration(readBackendConfiguration(paths.backendEnvPath)),
    true,
  );

  const result = ensureRuntimeFiles({
    composeTemplatePath: join(resourcesDirectory, 'compose.yaml'),
    paths,
    randomBytesImpl,
  });
  const content = readFileSync(paths.backendEnvPath, 'utf8');

  assert.equal(result.migratedLegacyBackendEnvironment, true);
  assert.doesNotMatch(content, /CHANGE_ME/);
  assert.deepEqual(normalizeBackendConfiguration(readBackendConfiguration(paths.backendEnvPath)).missing, []);
});

test('preserves an edited former placeholder backend environment', () => {
  const root = mkdtempSync(join(tmpdir(), 'asan-pos-edited-legacy-config-'));
  const paths = createRuntimePaths(join(root, 'local-app-data'));
  const resourcesDirectory = createResources(root);
  const operatorConfiguration = legacyTemplate.replace(
    'DB_PASSWORD=CHANGE_ME',
    'DB_PASSWORD=operator-managed',
  );
  mkdirSync(paths.rootDirectory, { recursive: true });
  writeFileSync(paths.backendEnvPath, operatorConfiguration);

  assert.equal(
    isKnownLegacyPlaceholderConfiguration(readBackendConfiguration(paths.backendEnvPath)),
    false,
  );

  const result = ensureRuntimeFiles({
    composeTemplatePath: join(resourcesDirectory, 'compose.yaml'),
    paths,
    randomBytesImpl: () => Buffer.alloc(32, 0xab),
  });

  assert.equal(result.migratedLegacyBackendEnvironment, false);
  assert.equal(readFileSync(paths.backendEnvPath, 'utf8'), operatorConfiguration);
});

test('normalizes Redis and MinIO aliases from one local configuration', () => {
  const result = normalizeBackendConfiguration({
    DB_HOST: '127.0.0.1',
    DB_PORT: '5432',
    DB_USER: 'asan_pos',
    DB_PASSWORD: 'db-secret',
    DB_NAME: 'asan_pos',
    REDIS_HOST: '127.0.0.1',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: 'redis:p@ss',
    MINIO_ENDPOINT: '127.0.0.1',
    MINIO_PORT: '9000',
    MINIO_ACCESS_KEY: 'minio-user',
    MINIO_SECRET_KEY: 'minio-secret',
    MINIO_BUCKET_NAME: 'asan-pos',
    MINIO_USE_SSL: 'false',
    JWT_SECRET: 'jwt-secret',
  });

  assert.deepEqual(result.missing, []);
  assert.equal(result.values.REDIS_URL, 'redis://:redis%3Ap%40ss@127.0.0.1:6379');
  assert.equal(result.values.MINIO_BUCKET, 'asan-pos');
  assert.equal(result.values.MINIO_BUCKET_NAME, 'asan-pos');
});

test('derives only Docker service values and excludes backend-only secrets', () => {
  const composeEnvironment = createComposeEnvironment({
    DB_NAME: 'asan_pos',
    DB_USER: 'asan_pos',
    DB_PASSWORD: 'db-secret',
    DB_PORT: '5432',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: 'redis-secret',
    MINIO_ACCESS_KEY: 'minio-user',
    MINIO_SECRET_KEY: 'minio-secret',
    MINIO_PORT: '9000',
    JWT_SECRET: 'jwt-secret',
    OPENAI_API_KEY: 'ai-secret',
  });

  assert.deepEqual(composeEnvironment, {
    POSTGRES_DB: 'asan_pos',
    POSTGRES_USER: 'asan_pos',
    POSTGRES_PASSWORD: 'db-secret',
    POSTGRES_PORT: '5432',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: 'redis-secret',
    MINIO_ROOT_USER: 'minio-user',
    MINIO_ROOT_PASSWORD: 'minio-secret',
    MINIO_API_PORT: '9000',
    MINIO_CONSOLE_PORT: '9001',
  });
});

test('rejects localhost aliases so every service uses the IPv4 loopback address', () => {
  const result = normalizeBackendConfiguration({
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_USER: 'asan_pos',
    DB_PASSWORD: 'db-secret',
    DB_NAME: 'asan_pos',
    REDIS_HOST: '127.0.0.1',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: 'redis-secret',
    MINIO_ENDPOINT: '127.0.0.1',
    MINIO_PORT: '9000',
    MINIO_ACCESS_KEY: 'minio-user',
    MINIO_SECRET_KEY: 'minio-secret',
    MINIO_BUCKET: 'asan-pos',
    JWT_SECRET: 'jwt-secret',
  });

  assert.deepEqual(result.missing, ['DB_HOST must be 127.0.0.1']);
});

test('writes Compose environment values as literal Docker env values', () => {
  const root = mkdtempSync(join(tmpdir(), 'asan-pos-compose-env-'));
  const composeEnvPath = join(root, 'compose.env');
  const password = `dollar$ hash# slash\\ apostrophe' quote" trailing\\`;

  writeComposeEnvironment(composeEnvPath, {
    POSTGRES_PASSWORD: password,
  });

  assert.equal(
    readFileSync(composeEnvPath, 'utf8'),
    `POSTGRES_PASSWORD="dollar$$ hash# slash\\\\ apostrophe' quote\\" trailing\\\\"\n`,
  );
  assert.deepEqual(
    getComposeEnvironmentMismatches(composeEnvPath, {
      POSTGRES_PASSWORD: password,
    }),
    [],
  );
});

test('creates Compose environment once and preserves operator edits', () => {
  const root = mkdtempSync(join(tmpdir(), 'asan-pos-compose-preserve-'));
  const composeEnvPath = join(root, 'docker', 'compose.env');

  assert.equal(
    ensureComposeEnvironment(composeEnvPath, { POSTGRES_DB: 'asan_pos' }),
    true,
  );
  writeFileSync(composeEnvPath, 'POSTGRES_DB=operator-managed\n');

  assert.equal(
    ensureComposeEnvironment(composeEnvPath, { POSTGRES_DB: 'new-value' }),
    false,
  );
  assert.equal(readFileSync(composeEnvPath, 'utf8'), 'POSTGRES_DB=operator-managed\n');
  assert.deepEqual(
    getComposeEnvironmentMismatches(composeEnvPath, { POSTGRES_DB: 'new-value' }),
    ['POSTGRES_DB'],
  );
});
