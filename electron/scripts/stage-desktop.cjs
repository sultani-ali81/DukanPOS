const { execFileSync } = require('node:child_process');
const {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} = require('node:fs');
const { dirname, join, resolve } = require('node:path');
const {
  copyBackendRuntime,
  createDesktopBuildEnvironment,
  createMigrationManifest,
} = require('../lib/staging.cjs');

const projectDirectory = resolve(__dirname, '..', '..');
const backendDirectory = resolve(process.env.ASANPOS_DIR || join(projectDirectory, '..', 'AsanPOS'));
const stageDirectory = join(projectDirectory, '.stage');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runNpm(directory, argumentsList, environment = process.env) {
  execFileSync(npmCommand, argumentsList, {
    cwd: directory,
    env: environment,
    stdio: 'inherit',
  });
}

function requireFile(path) {
  if (!existsSync(path)) throw new Error(`Required build output is missing: ${path}`);
}

function copyTemplate(sourcePath, destinationPath) {
  mkdirSync(dirname(destinationPath), { recursive: true });
  copyFileSync(sourcePath, destinationPath);
}

function stageDesktop() {
  runNpm(
    projectDirectory,
    ['run', 'build'],
    createDesktopBuildEnvironment(process.env),
  );
  runNpm(backendDirectory, ['run', 'build']);

  const rendererOutput = join(projectDirectory, 'dist');
  const backendOutput = join(backendDirectory, 'dist');
  const migrationsDirectory = join(backendOutput, 'database', 'migrations');
  requireFile(join(rendererOutput, 'index.html'));
  requireFile(join(backendOutput, 'main.js'));
  requireFile(migrationsDirectory);

  rmSync(stageDirectory, { recursive: true, force: true });
  const stageRenderer = join(stageDirectory, 'renderer');
  const stageBackend = join(stageDirectory, 'backend');
  const stageDocker = join(stageDirectory, 'docker');

  copyBackendRuntime({ sourceDirectory: rendererOutput, destinationDirectory: stageRenderer });
  copyBackendRuntime({ sourceDirectory: backendOutput, destinationDirectory: join(stageBackend, 'dist') });
  copyTemplate(join(backendDirectory, 'package.json'), join(stageBackend, 'package.json'));
  copyTemplate(join(backendDirectory, 'package-lock.json'), join(stageBackend, 'package-lock.json'));
  copyTemplate(
    join(projectDirectory, 'electron', 'resources', 'backend.env.example'),
    join(stageBackend, 'backend.env.example'),
  );
  copyTemplate(
    join(projectDirectory, 'electron', 'resources', 'compose.yaml'),
    join(stageDocker, 'compose.yaml'),
  );

  writeFileSync(
    join(stageBackend, 'migration-manifest.json'),
    `${JSON.stringify(createMigrationManifest(migrationsDirectory), null, 2)}\n`,
    'utf8',
  );

  runNpm(stageBackend, ['ci', '--omit=dev']);
}

stageDesktop();
