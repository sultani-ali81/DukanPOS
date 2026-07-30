const assert = require('node:assert/strict');
const test = require('node:test');
const { mkdtempSync, readFileSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const {
  runNodeScript,
  stopNodeProcess,
} = require('../lib/backend-process.cjs');

test('runs a migration-style Node script with the selected backend environment', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'asan-pos-child-'));
  const entryPath = join(directory, 'child.cjs');
  const resultPath = join(directory, 'result.txt');
  const logPath = join(directory, 'backend.log');
  writeFileSync(
    entryPath,
    "require('node:fs').writeFileSync(process.argv[2], `${process.env.ASANPOS_ENV_FILE}|${process.env.ELECTRON_RUN_AS_NODE}`);",
  );

  await runNodeScript({
    entryPath,
    cwd: directory,
    env: { ASANPOS_ENV_FILE: 'C:/Asan POS/backend.env' },
    logPath,
    args: [resultPath],
    nodeExecutable: process.execPath,
  });

  assert.equal(readFileSync(resultPath, 'utf8'), 'C:/Asan POS/backend.env|1');
});

test('uses taskkill for a live Windows backend process tree', async () => {
  const calls = [];
  await stopNodeProcess({ pid: 321, exitCode: null }, {
    platform: 'win32',
    execFileImpl(command, args, callback) {
      calls.push([command, args]);
      callback(null);
    },
  });

  assert.deepEqual(calls, [['taskkill', ['/pid', '321', '/t', '/f']]]);
});
