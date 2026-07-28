const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  protocol,
  shell,
} = require('electron');
const {
  createComposeEnvironment,
  createRuntimePaths,
  ensureComposeEnvironment,
  ensureRuntimeFiles,
  getComposeEnvironmentMismatches,
  normalizeBackendConfiguration,
  readBackendConfiguration,
} = require('./lib/configuration.cjs');
const {
  runNodeScript,
  startNodeProcess,
  stopNodeProcess,
} = require('./lib/backend-process.cjs');
const { assertLocalServices, waitForHealthyBackend } = require('./lib/readiness.cjs');
const { resolveRendererRequest } = require('./lib/renderer-protocol.cjs');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'asanpos',
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

let backendProcess;
let desktopPaths;
let quitInProgress = false;

class SetupRequiredError extends Error {}

function getProjectDirectory() {
  return join(__dirname, '..');
}

function getResourcePaths() {
  if (app.isPackaged) {
    return {
      rendererDirectory: join(process.resourcesPath, 'renderer'),
      backendDirectory: join(process.resourcesPath, 'backend'),
      backendTemplatePath: join(process.resourcesPath, 'backend', 'backend.env.example'),
      composeTemplatePath: join(process.resourcesPath, 'docker', 'compose.yaml'),
    };
  }

  const projectDirectory = getProjectDirectory();
  return {
    rendererDirectory: join(projectDirectory, '.stage', 'renderer'),
    backendDirectory: join(projectDirectory, '.stage', 'backend'),
    backendTemplatePath: join(projectDirectory, 'electron', 'resources', 'backend.env.example'),
    composeTemplatePath: join(projectDirectory, 'electron', 'resources', 'compose.yaml'),
  };
}

function readMigrationManifest(backendDirectory) {
  const manifestPath = join(backendDirectory, 'migration-manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error('The packaged backend migration manifest is missing.');
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!manifest.migrationSetId) {
    throw new Error('The packaged backend migration manifest is invalid.');
  }

  return manifest;
}

function getManualDockerCommand(paths) {
  return `cd "${paths.dockerDirectory}"\n` +
    'docker compose --env-file .\\compose.env -f .\\compose.yaml up -d';
}

async function startBackendRuntime({ paths, resources }) {
  ensureRuntimeFiles({
    backendTemplatePath: resources.backendTemplatePath,
    composeTemplatePath: resources.composeTemplatePath,
    paths,
  });

  const configuration = normalizeBackendConfiguration(
    readBackendConfiguration(paths.backendEnvPath),
  );
  if (configuration.missing.length > 0) {
    throw new SetupRequiredError(
      `Complete ${paths.backendEnvPath}. Missing: ${configuration.missing.join(', ')}`,
    );
  }

  const composeEnvironment = createComposeEnvironment(configuration.values);
  ensureComposeEnvironment(paths.composeEnvPath, composeEnvironment);
  const composeMismatches = getComposeEnvironmentMismatches(
    paths.composeEnvPath,
    composeEnvironment,
  );
  if (composeMismatches.length > 0) {
    throw new SetupRequiredError(
      `Update ${paths.composeEnvPath} to match backend.env. Fields: ${composeMismatches.join(', ')}`,
    );
  }

  const unavailableServices = await assertLocalServices({
    configuration: configuration.values,
  });
  if (unavailableServices.length > 0) {
    throw new SetupRequiredError(
      `${unavailableServices.join(', ')} is not ready. Start Docker Desktop, then run:\n\n${getManualDockerCommand(paths)}`,
    );
  }

  readMigrationManifest(resources.backendDirectory);
  await runNodeScript({
    entryPath: join(resources.backendDirectory, 'dist', 'database', 'run-migrations.js'),
    cwd: resources.backendDirectory,
    env: {
      ...configuration.values,
      ASANPOS_ENV_FILE: paths.backendEnvPath,
      NODE_ENV: 'production',
    },
    logPath: paths.backendLogPath,
  });

  backendProcess = startNodeProcess({
    entryPath: join(resources.backendDirectory, 'dist', 'main.js'),
    cwd: resources.backendDirectory,
    env: {
      ...configuration.values,
      ASANPOS_ENV_FILE: paths.backendEnvPath,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: '3000',
    },
    logPath: paths.backendLogPath,
  });

  await waitForHealthyBackend({ url: 'http://127.0.0.1:3000/health' });
}

function registerRendererProtocol(rendererDirectory) {
  protocol.handle('asanpos', async (request) => {
    try {
      const filePath = resolveRendererRequest({
        rendererDirectory,
        requestUrl: request.url,
      });
      return net.fetch(pathToFileURL(filePath).toString());
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, 'preload.cjs'),
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.once('ready-to-show', () => window.show());
  void window.loadURL('asanpos://app/index.html');
  return window;
}

async function showStartupFailure(error, paths) {
  const detail = error instanceof SetupRequiredError
    ? `${error.message}\n\nDocker setup folder: ${paths.dockerDirectory}`
    : `The POS backend could not start. Check the log:\n${paths.backendLogPath}`;
  const result = await dialog.showMessageBox({
    type: 'error',
    title: 'Asan POS needs setup',
    message: 'Asan POS could not start.',
    detail,
    buttons: ['Open setup folder', 'Quit'],
    defaultId: 0,
    cancelId: 1,
  });

  if (result.response === 0) await shell.openPath(paths.dockerDirectory);
}

async function bootstrap() {
  const resources = getResourcePaths();
  const localAppDataDirectory = process.env.LOCALAPPDATA || app.getPath('userData');
  desktopPaths = createRuntimePaths(localAppDataDirectory);
  registerRendererProtocol(resources.rendererDirectory);
  ipcMain.handle('asanpos:open-setup-folder', () => shell.openPath(desktopPaths.dockerDirectory));
  await startBackendRuntime({ paths: desktopPaths, resources });
  createWindow();
}

app.whenReady().then(async () => {
  try {
    await bootstrap();
  } catch (error) {
    const paths = desktopPaths || createRuntimePaths(process.env.LOCALAPPDATA || app.getPath('userData'));
    await stopNodeProcess(backendProcess).catch(() => {});
    await showStartupFailure(error, paths);
    quitInProgress = true;
    app.quit();
  }
});

app.on('window-all-closed', () => app.quit());

app.on('before-quit', (event) => {
  if (quitInProgress) return;
  event.preventDefault();
  quitInProgress = true;
  void stopNodeProcess(backendProcess)
    .catch(() => {})
    .finally(() => app.quit());
});
