const { createWriteStream, mkdirSync } = require('node:fs');
const { dirname } = require('node:path');
const { execFile } = require('node:child_process');
const { spawn } = require('node:child_process');

function createChildEnvironment(environment) {
  return {
    ...process.env,
    ...environment,
    ELECTRON_RUN_AS_NODE: '1',
  };
}

function startNodeProcess({
  entryPath,
  args = [],
  cwd,
  env,
  logPath,
  nodeExecutable = process.execPath,
  spawnImpl = spawn,
}) {
  mkdirSync(dirname(logPath), { recursive: true });
  const logStream = createWriteStream(logPath, { flags: 'a' });
  const child = spawnImpl(nodeExecutable, [entryPath, ...args], {
    cwd,
    env: createChildEnvironment(env),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  child.stdout?.pipe(logStream, { end: false });
  child.stderr?.pipe(logStream, { end: false });
  child.once('close', () => logStream.end());
  child.once('error', () => logStream.end());

  return child;
}

function runNodeScript(options) {
  return new Promise((resolve, reject) => {
    const child = startNodeProcess(options);
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Backend script exited with code ${code}`));
    });
  });
}

function stopNodeProcess(child, {
  platform = process.platform,
  execFileImpl = execFile,
} = {}) {
  if (!child || !child.pid || child.exitCode !== null) return Promise.resolve();

  if (platform !== 'win32') {
    child.kill('SIGTERM');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    execFileImpl('taskkill', ['/pid', String(child.pid), '/t', '/f'], (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

module.exports = {
  runNodeScript,
  startNodeProcess,
  stopNodeProcess,
};
