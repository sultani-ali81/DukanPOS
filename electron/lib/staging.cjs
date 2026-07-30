const { createHash } = require('node:crypto');
const {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} = require('node:fs');
const { extname, join, relative } = require('node:path');

const DESKTOP_API_URL = 'http://127.0.0.1:3000';

function createDesktopBuildEnvironment(environment) {
  return {
    ...environment,
    VITE_API_URL: DESKTOP_API_URL,
  };
}

function shouldExclude(name) {
  return name === '.env' || name.startsWith('.env.') || name === 'backend.env' ||
    name === '.git' ||
    name === 'node_modules' ||
    name === 'seeds' ||
    name.endsWith('.map') ||
    name.endsWith('.d.ts') ||
    name.endsWith('.ts') ||
    name.endsWith('.spec.js') ||
    name.endsWith('.test.js');
}

function copyBackendRuntime({ sourceDirectory, destinationDirectory }) {
  mkdirSync(destinationDirectory, { recursive: true });

  for (const name of readdirSync(sourceDirectory)) {
    if (shouldExclude(name)) continue;
    const sourcePath = join(sourceDirectory, name);
    const destinationPath = join(destinationDirectory, name);
    const stat = statSync(sourcePath);

    if (stat.isDirectory()) {
      copyBackendRuntime({ sourceDirectory: sourcePath, destinationDirectory: destinationPath });
    } else if (stat.isFile()) {
      copyFileSync(sourcePath, destinationPath);
    }
  }
}

function listCompiledMigrations(directory, rootDirectory = directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const filePath = join(directory, entry.name);
      if (entry.isDirectory()) return listCompiledMigrations(filePath, rootDirectory);
      if (!entry.isFile() || extname(entry.name) !== '.js') return [];
      return [relative(rootDirectory, filePath).replaceAll('\\', '/')];
    })
    .sort();
}

function createMigrationManifest(migrationsDirectory) {
  const files = listCompiledMigrations(migrationsDirectory);
  const hash = createHash('sha256');

  for (const file of files) {
    hash.update(file);
    hash.update('\0');
    hash.update(readFileSync(join(migrationsDirectory, file)));
    hash.update('\0');
  }

  return {
    migrationSetId: hash.digest('hex'),
    files,
  };
}

module.exports = {
  copyBackendRuntime,
  createDesktopBuildEnvironment,
  createMigrationManifest,
};
