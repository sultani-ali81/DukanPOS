const assert = require('node:assert/strict');
const test = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

test('declares one x64 NSIS installer with staged external resources', () => {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'),
  );
  const target = packageJson.build.win.target[0];

  assert.equal(packageJson.version, '0.0.1');
  assert.equal(packageJson.main, 'electron/main.cjs');
  assert.equal(target.target, 'nsis');
  assert.deepEqual(target.arch, ['x64']);
  assert.deepEqual(
    packageJson.build.extraResources.map(({ to }) => to),
    ['renderer', 'backend', 'backend/node_modules', 'docker'],
  );
  assert.equal(
    packageJson.build.extraResources.find(({ to }) => to === 'backend/node_modules').from,
    '.stage/backend/node_modules',
  );
  assert.equal(packageJson.build.nsis.deleteAppDataOnUninstall, false);
  assert.ok(
    packageJson.build.files.includes('electron/lib/**'),
    'packages the Electron library helpers, including Docker startup support',
  );
  assert.match(packageJson.scripts['package:win'], /electron-rebuild.*--arch x64/);
});
