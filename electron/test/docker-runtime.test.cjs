const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DockerRuntimeError,
  ensureDockerStack,
} = require('../lib/docker-runtime.cjs');

function successfulExecFile(calls) {
  return (command, args, _options, callback) => {
    calls.push([command, args]);
    callback(null, '', '');
  };
}

test('checks Docker and starts the generated Compose stack', async () => {
  const calls = [];

  await ensureDockerStack({
    composeEnvPath: 'C:/Asan POS/docker/compose.env',
    composePath: 'C:/Asan POS/docker/compose.yaml',
    execFileImpl: successfulExecFile(calls),
  });

  assert.deepEqual(calls, [
    ['docker', ['version']],
    ['docker', ['compose', 'version']],
    ['docker', ['compose', '--env-file', 'C:/Asan POS/docker/compose.env', '-f', 'C:/Asan POS/docker/compose.yaml', 'up', '-d', '--wait']],
  ]);
});

test('reports Docker Desktop availability with a stable error code', async () => {
  await assert.rejects(
    ensureDockerStack({
      composeEnvPath: 'C:/Asan POS/docker/compose.env',
      composePath: 'C:/Asan POS/docker/compose.yaml',
      execFileImpl: (_command, _args, _options, callback) => callback(new Error('not found'), '', ''),
    }),
    (error) => error instanceof DockerRuntimeError && error.code === 'docker-unavailable',
  );
});

test('reports Docker Compose availability with a stable error code', async () => {
  let callCount = 0;

  await assert.rejects(
    ensureDockerStack({
      composeEnvPath: 'C:/Asan POS/docker/compose.env',
      composePath: 'C:/Asan POS/docker/compose.yaml',
      execFileImpl: (_command, _args, _options, callback) => {
        callCount += 1;
        callback(callCount === 1 ? null : new Error('compose missing'), '', '');
      },
    }),
    (error) => error instanceof DockerRuntimeError && error.code === 'compose-unavailable',
  );
});

test('reports Compose startup failures with a stable error code', async () => {
  let callCount = 0;

  await assert.rejects(
    ensureDockerStack({
      composeEnvPath: 'C:/Asan POS/docker/compose.env',
      composePath: 'C:/Asan POS/docker/compose.yaml',
      execFileImpl: (_command, _args, _options, callback) => {
        callCount += 1;
        callback(callCount === 3 ? new Error('startup failed') : null, '', '');
      },
    }),
    (error) => error instanceof DockerRuntimeError && error.code === 'compose-start-failed',
  );
});

test('uses no destructive Docker command', async () => {
  const calls = [];

  await ensureDockerStack({
    composeEnvPath: 'C:/Asan POS/docker/compose.env',
    composePath: 'C:/Asan POS/docker/compose.yaml',
    execFileImpl: successfulExecFile(calls),
  });

  const commandText = calls.flat().join(' ').toLowerCase();
  for (const forbiddenArgument of [' down', ' rm', ' prune', ' -v']) {
    assert.equal(commandText.includes(forbiddenArgument), false);
  }
});
