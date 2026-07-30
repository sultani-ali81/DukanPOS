const assert = require('node:assert/strict');
const test = require('node:test');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const {
  copyBackendRuntime,
  createDesktopBuildEnvironment,
  createMigrationManifest,
} = require('../lib/staging.cjs');

test('creates a stable migration identity from compiled migration files', () => {
  const root = mkdtempSync(join(tmpdir(), 'asan-pos-manifest-'));
  const migrationsDirectory = join(root, 'migrations');
  mkdirSync(migrationsDirectory);
  writeFileSync(join(migrationsDirectory, '002_second.js'), 'module.exports = 2;\n');
  writeFileSync(join(migrationsDirectory, '001_first.js'), 'module.exports = 1;\n');
  writeFileSync(join(migrationsDirectory, '001_first.js.map'), '{}\n');

  const first = createMigrationManifest(migrationsDirectory);
  const second = createMigrationManifest(migrationsDirectory);

  assert.equal(first.migrationSetId, second.migrationSetId);
  assert.deepEqual(first.files, ['001_first.js', '002_second.js']);
});

test('forces the packaged renderer to use only the local backend API', () => {
  const environment = createDesktopBuildEnvironment({
    NODE_ENV: 'production',
    VITE_API_URL: 'https://remote.example.test',
  });

  assert.equal(environment.VITE_API_URL, 'http://127.0.0.1:3000');
  assert.equal(environment.NODE_ENV, 'production');
});

test('copies backend runtime files while excluding environment secrets and demo seeds', () => {
  const root = mkdtempSync(join(tmpdir(), 'asan-pos-stage-'));
  const sourceDirectory = join(root, 'source');
  const destinationDirectory = join(root, 'destination');
  mkdirSync(join(sourceDirectory, 'nested'), { recursive: true });
  mkdirSync(join(sourceDirectory, 'database', 'seeds'), { recursive: true });
  writeFileSync(join(sourceDirectory, '.env'), 'SECRET=value\n');
  writeFileSync(join(sourceDirectory, 'backend.env'), 'SECRET=value\n');
  writeFileSync(join(sourceDirectory, 'nested', '.env.production'), 'SECRET=value\n');
  writeFileSync(join(sourceDirectory, 'database', 'seeds', 'demo.js'), 'module.exports = {}\n');
  writeFileSync(join(sourceDirectory, 'main.js'), 'console.log(1)\n');
  writeFileSync(join(sourceDirectory, 'nested', 'module.js'), 'module.exports = {}\n');

  copyBackendRuntime({ sourceDirectory, destinationDirectory });

  assert.equal(existsSync(join(destinationDirectory, '.env')), false);
  assert.equal(existsSync(join(destinationDirectory, 'backend.env')), false);
  assert.equal(existsSync(join(destinationDirectory, 'nested', '.env.production')), false);
  assert.equal(existsSync(join(destinationDirectory, 'database', 'seeds', 'demo.js')), false);
  assert.equal(existsSync(join(destinationDirectory, 'main.js')), true);
  assert.equal(existsSync(join(destinationDirectory, 'nested', 'module.js')), true);
});
