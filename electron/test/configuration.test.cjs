const assert = require('node:assert/strict');
const test = require('node:test');
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const {
  createComposeEnvironment,
  createRuntimePaths,
  ensureRuntimeFiles,
  normalizeBackendConfiguration,
} = require('../lib/configuration.cjs');

function createResources(root) {
  const resourcesDirectory = join(root, 'resources');
  mkdirSync(resourcesDirectory, { recursive: true });
  writeFileSync(
    join(resourcesDirectory, 'backend.env.example'),
    'DB_HOST=127.0.0.1\nDB_PASSWORD=CHANGE_ME\n',
  );
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

test('normalizes Redis and MinIO aliases from one local configuration', () => {
  const result = normalizeBackendConfiguration({
    DB_HOST: '127.0.0.1',
    DB_PORT: '5432',
    DB_USER: 'asan_pos',
    DB_PASSWORD: 'db-secret',
    DB_NAME: 'asan_pos',
    REDIS_HOST: '127.0.0.1',
    REDIS_PORT: '6379',
    MINIO_ENDPOINT: '127.0.0.1',
    MINIO_PORT: '9000',
    MINIO_ACCESS_KEY: 'minio-user',
    MINIO_SECRET_KEY: 'minio-secret',
    MINIO_BUCKET_NAME: 'asan-pos',
    MINIO_USE_SSL: 'false',
    JWT_SECRET: 'jwt-secret',
  });

  assert.deepEqual(result.missing, []);
  assert.equal(result.values.REDIS_URL, 'redis://127.0.0.1:6379');
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
    MINIO_ROOT_USER: 'minio-user',
    MINIO_ROOT_PASSWORD: 'minio-secret',
    MINIO_API_PORT: '9000',
    MINIO_CONSOLE_PORT: '9001',
  });
});
