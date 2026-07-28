const assert = require('node:assert/strict');
const test = require('node:test');
const { mkdirSync, writeFileSync } = require('node:fs');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const { resolveRendererRequest } = require('../lib/renderer-protocol.cjs');

test('serves assets and falls back to index.html for React routes', () => {
  const rendererDirectory = mkdtempSync(join(tmpdir(), 'asan-pos-renderer-'));
  const assetDirectory = join(rendererDirectory, 'assets');
  mkdirSync(assetDirectory);
  writeFileSync(join(rendererDirectory, 'index.html'), '<html></html>');
  writeFileSync(join(assetDirectory, 'app.js'), 'console.log(1)');

  assert.equal(
    resolveRendererRequest({
      rendererDirectory,
      requestUrl: 'asanpos://app/assets/app.js',
    }),
    join(assetDirectory, 'app.js'),
  );
  assert.equal(
    resolveRendererRequest({
      rendererDirectory,
      requestUrl: 'asanpos://app/products/42',
    }),
    join(rendererDirectory, 'index.html'),
  );
});

test('rejects encoded traversal outside the renderer directory', () => {
  const rendererDirectory = mkdtempSync(join(tmpdir(), 'asan-pos-renderer-'));
  writeFileSync(join(rendererDirectory, 'index.html'), '<html></html>');

  assert.throws(
    () => resolveRendererRequest({
      rendererDirectory,
      requestUrl: 'asanpos://app/%2e%2e%2fsecret.txt',
    }),
    /outside renderer directory/,
  );
});
