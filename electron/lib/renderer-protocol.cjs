const { existsSync } = require('node:fs');
const { extname, isAbsolute, relative, resolve } = require('node:path');

function assertInsideRenderer(rendererDirectory, candidatePath) {
  const relativePath = relative(rendererDirectory, candidatePath);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('Requested renderer path is outside renderer directory');
  }
}

function resolveRendererRequest({ rendererDirectory, requestUrl }) {
  const request = new URL(requestUrl);
  if (request.protocol !== 'asanpos:' || request.hostname !== 'app') {
    throw new Error(`Unsupported renderer request: ${requestUrl}`);
  }

  const decodedPath = decodeURIComponent(request.pathname);
  if (decodedPath.includes('\0') || decodedPath.includes('\\')) {
    throw new Error('Requested renderer path is outside renderer directory');
  }

  const requestedPath = decodedPath.replace(/^\/+/, '');
  const candidatePath = resolve(rendererDirectory, requestedPath || 'index.html');
  assertInsideRenderer(rendererDirectory, candidatePath);

  if (requestedPath === '' || extname(requestedPath) === '') {
    return resolve(rendererDirectory, 'index.html');
  }

  if (!existsSync(candidatePath)) {
    throw new Error(`Packaged renderer asset does not exist: ${requestedPath}`);
  }

  return candidatePath;
}

module.exports = { resolveRendererRequest };
