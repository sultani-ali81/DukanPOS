const { execFile } = require('node:child_process');

class DockerRuntimeError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = 'DockerRuntimeError';
    this.code = code;
  }
}

function execute(command, args, execFileImpl) {
  return new Promise((resolve, reject) => {
    execFileImpl(command, args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function ensureDockerStack({
  composeEnvPath,
  composePath,
  execFileImpl = execFile,
}) {
  try {
    await execute('docker', ['version'], execFileImpl);
  } catch (error) {
    throw new DockerRuntimeError(
      'docker-unavailable',
      'Docker Desktop is unavailable. Install it and make sure it is running.',
      error,
    );
  }

  try {
    await execute('docker', ['compose', 'version'], execFileImpl);
  } catch (error) {
    throw new DockerRuntimeError(
      'compose-unavailable',
      'Docker Compose is unavailable. Update or restart Docker Desktop.',
      error,
    );
  }

  try {
    await execute(
      'docker',
      ['compose', '--env-file', composeEnvPath, '-f', composePath, 'up', '-d', '--wait'],
      execFileImpl,
    );
  } catch (error) {
    throw new DockerRuntimeError(
      'compose-start-failed',
      'Docker could not start the local POS services. Check that Docker Desktop is running.',
      error,
    );
  }
}

module.exports = {
  DockerRuntimeError,
  ensureDockerStack,
  execute,
};
