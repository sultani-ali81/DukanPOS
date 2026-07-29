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
  normalizeBackendConfiguration,
  readBackendConfiguration,
} = require('./lib/configuration.cjs');
const {
  runNodeScript,
  startNodeProcess,
  stopNodeProcess,
} = require('./lib/backend-process.cjs');
const { ensureDockerStack } = require('./lib/docker-runtime.cjs');
const { waitForHealthyBackend, waitForLocalServices } = require('./lib/readiness.cjs');
const { resolveRendererRequest } = require('./lib/renderer-protocol.cjs');
const {
  isDockerServicesStartupFailure,
  startBackendRuntime: startBackendRuntimeImpl,
} = require('./lib/runtime-startup.cjs');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'asanpos',
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

let backendProcess;
let desktopPaths;
let quitInProgress = false;

function getProjectDirectory() {
  return join(__dirname, '..');
}

function getResourcePaths() {
  if (app.isPackaged) {
    return {
      rendererDirectory: join(process.resourcesPath, 'renderer'),
      backendDirectory: join(process.resourcesPath, 'backend'),
      composeTemplatePath: join(process.resourcesPath, 'docker', 'compose.yaml'),
    };
  }

  const projectDirectory = getProjectDirectory();
  return {
    rendererDirectory: join(projectDirectory, '.stage', 'renderer'),
    backendDirectory: join(projectDirectory, '.stage', 'backend'),
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

async function startBackendRuntime({ paths, resources }) {
  await startBackendRuntimeImpl({
    paths,
    resources,
    dependencies: {
      ensureRuntimeFiles,
      readBackendConfiguration,
      normalizeBackendConfiguration,
      createComposeEnvironment,
      ensureComposeEnvironment,
      ensureDockerStack,
      waitForLocalServices,
      readMigrationManifest,
      runNodeScript,
      startNodeProcess,
      onBackendStarted: (process) => { backendProcess = process; },
      waitForHealthyBackend,
    },
  });
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
  const detail = isDockerServicesStartupFailure(error)
    ? `${error.message}\n\nDocker Desktop must be installed, running, and ready. Reopen Asan POS after it is ready.\n\nLog: ${paths.backendLogPath}`
    : `The POS backend could not start. Check the log:\n${paths.backendLogPath}`;
  await dialog.showMessageBox({
    type: 'error',
    title: 'Asan POS needs setup',
    message: 'Asan POS could not start.',
    detail,
    buttons: ['Quit'],
    defaultId: 0,
    cancelId: 0,
  });
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
