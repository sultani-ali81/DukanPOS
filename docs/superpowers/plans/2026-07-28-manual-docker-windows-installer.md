# Asan POS Manual-Docker Windows Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one Windows x64 NSIS installer that packages DukanPOS and AsanPOS while leaving PostgreSQL, Redis, and MinIO as an operator-managed Docker Compose stack.

**Architecture:** DukanPOS becomes the Electron Builder host. Electron stages the Vite renderer and the compiled AsanPOS backend as external resources, creates a persistent local configuration and Compose project on first launch, checks manually started Docker services, migrates and starts the local API, then serves the renderer through a secure custom protocol.

**Tech Stack:** Electron, Electron Builder/NSIS, Node.js built-in test runner, `dotenv`, Vite/React, NestJS, Knex, Docker Compose, PowerShell.

## Global Constraints

- Target Windows x64 only; a release `.exe` must be built and smoke-tested on native Windows x64 because `bcrypt` and `skia-canvas` are native modules.
- Do not package, copy, print, commit, or stage a real `.env`, database dump, MinIO object, Docker volume, mail credential, JWT secret, or AI credential.
- Docker Desktop and the Compose stack remain operator-controlled: Electron must not run `docker compose up`, `stop`, `down`, `pull`, or `rm`.
- Initialize local files only if absent; never overwrite `%LOCALAPPDATA%\Asan POS\backend.env`, `docker\compose.env`, or `docker\compose.yaml` on app updates.
- Bind PostgreSQL, Redis, MinIO, and the packaged API to `127.0.0.1` only.
- Keep the backend outside ASAR and run it with Electron's Node mode; stop only that child process when Electron exits.
- Use exact Compose image tags: `postgres:17.10-alpine`, `redis:7.4.10-alpine`, and `minio/minio:RELEASE.2025-09-07T16-13-09Z-cpuv1`.
- Use `MINIO_BUCKET` and `MINIO_BUCKET_NAME` with the same normalized value; provide both Redis environment styles (`REDIS_URL` and `REDIS_HOST`/`REDIS_PORT`).

---

## File Structure

- `electron/resources/backend.env.example` — safe, editable source template for persistent backend configuration.
- `electron/resources/compose.yaml` — fixed three-service Docker Compose template with named volumes and loopback ports.
- `electron/lib/configuration.cjs` — pure local-path, env parsing, validation, normalization, template copying, and atomic Compose-env writing.
- `electron/lib/readiness.cjs` — pure TCP/HTTP readiness probes for manually started local services and API polling.
- `electron/lib/backend-process.cjs` — Node-mode migration/API child creation, logging, and Windows-safe process-tree cleanup.
- `electron/lib/renderer-protocol.cjs` — pure safe renderer path resolution for the `asanpos://` protocol.
- `electron/main.cjs` — Electron-only startup orchestration, setup/error dialogs, window creation, protocol registration, and backend shutdown.
- `electron/preload.cjs` — narrow, immutable renderer bridge without Node integration.
- `electron/lib/staging.cjs` — pure staging manifest and copy filters.
- `electron/scripts/stage-desktop.cjs` — builds/stages frontend, compiled backend, production backend dependencies, templates, and manifest.
- `electron/scripts/build-windows.ps1` — native-Windows package command including backend native-module rebuild.
- `electron/test/*.test.cjs` — Node built-in unit tests for all helpers without launching Electron, Docker, or a database.
- `package.json` — Electron scripts, dependencies, and Electron Builder NSIS/resource configuration.
- `.gitignore` — excludes transient `.stage`, Electron release output, and local configuration.
- `README.md` — operator installation, Docker startup, update, and Windows release steps.

## Task 1: Add deterministic local configuration and Compose templates

**Files:**
- Create: `electron/resources/backend.env.example`
- Create: `electron/resources/compose.yaml`
- Create: `electron/lib/configuration.cjs`
- Create: `electron/test/configuration.test.cjs`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces `createRuntimePaths(localAppData)`, `ensureRuntimeFiles(options)`, `readBackendConfiguration(configPath)`, `normalizeBackendConfiguration(values)`, `createComposeEnvironment(values)`, and `writeComposeEnvironment(path, values)` from `electron/lib/configuration.cjs`.
- `main.cjs` consumes these functions before checking dependencies; no helper logs a secret value.

- [ ] **Step 1: Write failing configuration tests**

```js
test('creates templates once and preserves an edited backend environment', () => {
  const root = mkdtempSync(join(tmpdir(), 'asan-pos-config-'));
  const resources = makeResourceTemplates(root);
  const paths = createRuntimePaths(join(root, 'local'));

  ensureRuntimeFiles({ resourcesDirectory: resources, paths });
  writeFileSync(paths.backendEnvPath, 'DB_HOST=custom-host\n');
  ensureRuntimeFiles({ resourcesDirectory: resources, paths });

  assert.match(readFileSync(paths.backendEnvPath, 'utf8'), /custom-host/);
  assert.equal(existsSync(paths.composePath), true);
});

test('normalizes one local Redis and MinIO configuration into both backend aliases', () => {
  const result = normalizeBackendConfiguration({
    DB_HOST: '127.0.0.1', DB_PORT: '5432', DB_USER: 'asan_pos',
    DB_PASSWORD: 'db-secret', DB_NAME: 'asan_pos',
    REDIS_HOST: '127.0.0.1', REDIS_PORT: '6379',
    MINIO_ENDPOINT: '127.0.0.1', MINIO_PORT: '9000',
    MINIO_ACCESS_KEY: 'minio-user', MINIO_SECRET_KEY: 'minio-secret',
    MINIO_BUCKET_NAME: 'asan-pos', MINIO_USE_SSL: 'false', JWT_SECRET: 'jwt-secret',
  });

  assert.equal(result.values.REDIS_URL, 'redis://127.0.0.1:6379');
  assert.equal(result.values.MINIO_BUCKET, 'asan-pos');
  assert.deepEqual(result.missing, []);
});

test('derives Compose-only fields without backend-only secrets', () => {
  const values = createComposeEnvironment({
    DB_NAME: 'asan_pos', DB_USER: 'asan_pos', DB_PASSWORD: 'db-secret',
    DB_PORT: '5432', REDIS_PORT: '6379', MINIO_ACCESS_KEY: 'minio-user',
    MINIO_SECRET_KEY: 'minio-secret', JWT_SECRET: 'jwt-secret', OPENAI_API_KEY: 'api-key',
  });

  assert.deepEqual(values, {
    POSTGRES_DB: 'asan_pos', POSTGRES_USER: 'asan_pos', POSTGRES_PASSWORD: 'db-secret',
    POSTGRES_PORT: '5432', REDIS_PORT: '6379', MINIO_ROOT_USER: 'minio-user',
    MINIO_ROOT_PASSWORD: 'minio-secret', MINIO_API_PORT: '9000', MINIO_CONSOLE_PORT: '9001',
  });
});
```

- [ ] **Step 2: Verify the tests fail for the missing module**

Run: `node --test electron/test/configuration.test.cjs`

Expected: FAIL with `Cannot find module '../lib/configuration.cjs'`.

- [ ] **Step 3: Add safe templates and minimal pure configuration helpers**

Create `backend.env.example` with the exact base keys from the design and
`CHANGE_ME` only for `DB_PASSWORD`, `MINIO_SECRET_KEY`, and `JWT_SECRET`.
Include optional mail and AI keys as commented documentation, never values.

Create `compose.yaml` with `name: asan-pos`, the three exact images, named
volumes, `restart: unless-stopped`, Redis append-only mode, and only loopback
port mappings. Reference only `${POSTGRES_*}`, `${REDIS_PORT}`, and
`${MINIO_*}` variables present in `compose.env`.

Implement configuration helpers with Node built-ins plus `dotenv`:

```js
const REQUIRED_KEYS = [
  'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
  'REDIS_HOST', 'REDIS_PORT', 'MINIO_ENDPOINT', 'MINIO_PORT',
  'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_BUCKET', 'JWT_SECRET',
];

function isMissing(value) {
  return !value || value.trim() === '' || value.trim() === 'CHANGE_ME';
}
```

Use a temporary sibling file and `renameSync` to atomically write
`compose.env`. Copy resource templates only when the destination does not
exist. Validate `DB_HOST`, `REDIS_HOST`, and `MINIO_ENDPOINT` as
`127.0.0.1` or `localhost`.

- [ ] **Step 4: Add runtime dependencies and exclusions**

Add `dotenv` as a production dependency. Add `.stage/`, `release/`, and
`electron-dist/` to `.gitignore`; do not add `.env.example` to ignore rules.

- [ ] **Step 5: Run focused configuration tests**

Run: `node --test electron/test/configuration.test.cjs`

Expected: PASS with all template-preservation, normalization, and Compose-env
assertions green.

- [ ] **Step 6: Commit the configuration unit**

```bash
git add electron/resources electron/lib/configuration.cjs electron/test/configuration.test.cjs package.json package-lock.json .gitignore
git commit -m "feat: add local Docker configuration templates"
```

## Task 2: Add service readiness and backend child-process primitives

**Files:**
- Create: `electron/lib/readiness.cjs`
- Create: `electron/lib/backend-process.cjs`
- Create: `electron/test/readiness.test.cjs`
- Create: `electron/test/backend-process.test.cjs`

**Interfaces:**
- Produces `probeTcp`, `probeHttp`, `assertLocalServices`, and `waitForHealthyBackend` from `readiness.cjs`.
- Produces `runNodeScript`, `startNodeProcess`, and `stopNodeProcess` from `backend-process.cjs`.
- `main.cjs` consumes all functions; tests inject transport, fetch, spawn, and command implementations.

- [ ] **Step 1: Write failing readiness and process tests**

```js
test('reports only unavailable local services', async () => {
  const unavailable = await assertLocalServices({
    probeTcpImpl: async ({ name }) => name !== 'Redis',
    probeHttpImpl: async () => true,
  });
  assert.deepEqual(unavailable, ['Redis']);
});

test('retries backend readiness until health is returned', async () => {
  let calls = 0;
  await waitForHealthyBackend({
    url: 'http://127.0.0.1:3000/health', timeoutMs: 100, intervalMs: 0,
    fetchImpl: async () => (++calls === 1
      ? { ok: false, json: async () => ({}) }
      : { ok: true, json: async () => ({ status: 'ok' }) }),
    sleep: async () => {}, now: (() => { let n = 0; return () => n += 10; })(),
  });
  assert.equal(calls, 2);
});

test('uses taskkill for a live Windows child tree', async () => {
  const calls = [];
  await stopNodeProcess({ pid: 321, exitCode: null }, {
    platform: 'win32',
    execFileImpl(command, args, callback) { calls.push([command, args]); callback(null); },
  });
  assert.deepEqual(calls, [['taskkill', ['/pid', '321', '/t', '/f']]]);
});
```

- [ ] **Step 2: Verify the tests fail for absent helper modules**

Run: `node --test electron/test/readiness.test.cjs electron/test/backend-process.test.cjs`

Expected: FAIL with missing-module errors.

- [ ] **Step 3: Implement deterministic probes and child control**

`probeTcp` must resolve true only after a `net.connect` succeeds before its
deadline. `probeHttp` must accept a 2xx MinIO health endpoint response.
`assertLocalServices` checks PostgreSQL `127.0.0.1:5432`, Redis
`127.0.0.1:6379`, and `http://127.0.0.1:9000/minio/health/live`, returning
the human service names that fail.

`runNodeScript` and `startNodeProcess` use `process.execPath` with
`ELECTRON_RUN_AS_NODE=1`, append stdout/stderr to the supplied log file, and
pass normalized `backend.env` values in the child environment. `runNodeScript`
rejects nonzero exits. `stopNodeProcess` uses `taskkill /pid <pid> /t /f` on
Windows and `SIGTERM` elsewhere, while treating missing/exited children as a
no-op.

- [ ] **Step 4: Run focused helper tests**

Run: `node --test electron/test/readiness.test.cjs electron/test/backend-process.test.cjs`

Expected: PASS without Electron, Docker, or a database.

- [ ] **Step 5: Commit the runtime helper unit**

```bash
git add electron/lib/readiness.cjs electron/lib/backend-process.cjs electron/test/readiness.test.cjs electron/test/backend-process.test.cjs
git commit -m "feat: add desktop service and backend lifecycle helpers"
```

## Task 3: Add safe renderer protocol and Electron startup orchestration

**Files:**
- Create: `electron/lib/renderer-protocol.cjs`
- Create: `electron/main.cjs`
- Create: `electron/preload.cjs`
- Create: `electron/test/renderer-protocol.test.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces `resolveRendererRequest({ rendererDirectory, requestUrl })` from `renderer-protocol.cjs`.
- `main.cjs` invokes configuration, readiness, migration, child process, and protocol helpers in that order.
- `preload.cjs` exposes only `window.asanPos.openSetupFolder()` via `contextBridge`.

- [ ] **Step 1: Write a failing protocol path-safety test**

```js
test('falls back to index.html for React routes and rejects traversal', () => {
  const root = '/tmp/renderer';
  assert.equal(
    resolveRendererRequest({ rendererDirectory: root, requestUrl: 'asanpos://app/products/42' }),
    join(root, 'index.html'),
  );
  assert.throws(
    () => resolveRendererRequest({ rendererDirectory: root, requestUrl: 'asanpos://app/../../secret' }),
    /outside renderer directory/,
  );
});
```

- [ ] **Step 2: Verify it fails because the resolver is missing**

Run: `node --test electron/test/renderer-protocol.test.cjs`

Expected: FAIL with a missing-module error.

- [ ] **Step 3: Implement the resolver and thin Electron main process**

Register `asanpos` with `standard` and `secure` privileges before `app.ready`,
then use `protocol.handle` to serve only files below the staged renderer root.
Serve existing assets directly and return `index.html` for extensionless routes.

At startup set the local user-data path, initialize local templates, validate
the configuration, write `compose.env`, run manual-service readiness checks,
run `dist/database/run-migrations.js` only for a new migration manifest ID,
start `dist/main.js`, wait for `/health`, and then load
`asanpos://app/index.html`. Use setup dialogs with the exact Docker folder and
manual `docker compose` command for all expected prerequisite failures.

Create windows with `contextIsolation: true`, `nodeIntegration: false`,
`sandbox: true`, and the preload file. On `before-quit`, prevent the first
quit, stop the backend child, then call `app.quit()` once cleanup completes.

- [ ] **Step 4: Run all pure Electron helper tests**

Run: `node --test electron/test/configuration.test.cjs electron/test/readiness.test.cjs electron/test/backend-process.test.cjs electron/test/renderer-protocol.test.cjs`

Expected: PASS without opening Electron.

- [ ] **Step 5: Commit the Electron orchestration unit**

```bash
git add electron/main.cjs electron/preload.cjs electron/lib/renderer-protocol.cjs electron/test/renderer-protocol.test.cjs package.json
git commit -m "feat: add secure Electron startup orchestration"
```

## Task 4: Stage production resources without secrets

**Files:**
- Create: `electron/lib/staging.cjs`
- Create: `electron/scripts/stage-desktop.cjs`
- Create: `electron/test/staging.test.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces `createMigrationManifest(migrationsDirectory)` and `copyBackendRuntime(options)` from `staging.cjs`.
- The stage script accepts `ASANPOS_DIR`; when absent it resolves the sibling `../AsanPOS` repository.
- Electron Builder consumes `.stage/renderer`, `.stage/backend`, and `.stage/docker` as `extraResources`.

- [ ] **Step 1: Write failing staging tests**

```js
test('creates a stable migration manifest and excludes a real environment file', () => {
  const root = mkdtempSync(join(tmpdir(), 'asan-pos-stage-'));
  const migrations = join(root, 'migrations');
  mkdirSync(migrations);
  writeFileSync(join(migrations, '001_init.js'), 'module.exports = {}');
  const first = createMigrationManifest(migrations);
  const second = createMigrationManifest(migrations);
  assert.equal(first.migrationSetId, second.migrationSetId);

  const source = join(root, 'source'); const destination = join(root, 'destination');
  mkdirSync(source); writeFileSync(join(source, '.env'), 'SECRET=value');
  writeFileSync(join(source, 'main.js'), 'console.log(1)');
  copyBackendRuntime({ sourceDirectory: source, destinationDirectory: destination });
  assert.equal(existsSync(join(destination, '.env')), false);
  assert.equal(existsSync(join(destination, 'main.js')), true);
});
```

- [ ] **Step 2: Verify staging tests fail**

Run: `node --test electron/test/staging.test.cjs`

Expected: FAIL with missing `staging.cjs` exports.

- [ ] **Step 3: Implement clean resource staging**

The stage script must run `npm run build` in DukanPOS and AsanPOS, create a
fresh `.stage` directory, copy the Vite `dist` output to `.stage/renderer`,
copy AsanPOS `dist`, `package.json`, `package-lock.json`, and a production
dependency tree to `.stage/backend`, copy only the safe templates to their
resource destinations, and write `migration-manifest.json` based on compiled
JavaScript migrations. It must explicitly exclude `.env`, `.git`, source
TypeScript, tests, coverage, and source maps.

- [ ] **Step 4: Run staging tests and inspect staged file policy**

Run: `node --test electron/test/staging.test.cjs && npm run stage:desktop && test ! -e .stage/backend/.env && test -f .stage/backend/dist/main.js && test -f .stage/renderer/index.html`

Expected: PASS; the stage contains runtime resources and no `.env`.

- [ ] **Step 5: Commit the staging unit**

```bash
git add electron/lib/staging.cjs electron/scripts/stage-desktop.cjs electron/test/staging.test.cjs package.json .gitignore
git commit -m "feat: stage frontend and backend for desktop packaging"
```

## Task 5: Configure NSIS packaging and the native-Windows release command

**Files:**
- Create: `electron/scripts/build-windows.ps1`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Produces `npm run package:win`, which stages resources, rebuilds the staged backend native modules for Electron, and invokes Electron Builder's x64 NSIS target.
- `build-windows.ps1` is the supported release entry point and fails immediately when run outside Windows.

- [ ] **Step 1: Write a failing package-config assertion**

```js
test('declares one x64 NSIS target and external staged resources', () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  assert.equal(packageJson.build.win.target[0].target, 'nsis');
  assert.deepEqual(packageJson.build.win.target[0].arch, ['x64']);
  assert.deepEqual(packageJson.build.extraResources.map((entry) => entry.to), ['renderer', 'backend', 'docker']);
});
```

- [ ] **Step 2: Verify the package-config assertion fails**

Run: `node --test electron/test/package-config.test.cjs`

Expected: FAIL because Electron Builder metadata does not exist.

- [ ] **Step 3: Add Electron Builder and Windows build metadata**

Set `main` to `electron/main.cjs`. Add `electron`, `electron-builder`, and
`@electron/rebuild` as development dependencies, and `dotenv` as a production
dependency. Add these scripts:

```json
{
  "stage:desktop": "node electron/scripts/stage-desktop.cjs",
  "test:desktop": "node --test electron/test",
  "package:win": "npm run stage:desktop && electron-builder --win nsis --x64",
  "release:win": "powershell -ExecutionPolicy Bypass -File electron/scripts/build-windows.ps1"
}
```

Configure `build` with product name `Asan POS`, artifact name
`Asan POS Setup-${version}.${ext}`, `asar: true`, an x64 `nsis` target,
portable false, and explicit `extraResources` entries for `.stage/renderer`,
`.stage/backend`, and `.stage/docker`.

In `build-windows.ps1`, verify `$IsWindows`, run `npm ci`, run
`npm run stage:desktop`, run `npx electron-rebuild -f -w bcrypt -w skia-canvas
--module-dir .stage/backend`, then run `npx electron-builder --win nsis --x64`.
The script must not invoke Docker or copy `.env`.

- [ ] **Step 4: Document exact operator and release commands**

Replace the Vite template README with the first-time Docker Desktop,
`backend.env`, `docker compose up -d`, normal launch, upgrade, log location,
and native-Windows release procedures. Include the fact that the app does not
manage Docker's lifecycle.

- [ ] **Step 5: Run all automated checks available on the development host**

Run: `npm test && npm run lint && npm run build && npm run test:desktop && npm run stage:desktop`

Expected: PASS. Do not call `package:win` on Linux as evidence of a releasable
Windows installer; run `npm run release:win` on a native Windows x64 host.

- [ ] **Step 6: Commit the Windows package configuration**

```bash
git add electron/scripts/build-windows.ps1 electron/test/package-config.test.cjs package.json package-lock.json README.md
git commit -m "feat: add Windows NSIS installer build"
```

## Task 6: Verify the release contract on Windows

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes the installer produced by Task 5 and the persistent local Docker project created on first launch.
- Produces a recorded Windows acceptance result before any public installer release.

- [ ] **Step 1: Follow the fresh-PC smoke test**

1. Install and start Docker Desktop on Windows x64.
2. Run `Asan POS Setup-<version>.exe`.
3. Launch Asan POS once to create `%LOCALAPPDATA%\Asan POS` files.
4. Fill `backend.env` with local database, MinIO, and JWT secrets.
5. Run `docker compose --env-file .\compose.env -f .\compose.yaml up -d` in the generated Docker folder.
6. Relaunch Asan POS and verify UI, `/health`, PostgreSQL, Redis, and MinIO.
7. Create representative POS data, close and reopen the application, and verify data remains.
8. Upgrade the installer, verify configuration/volumes remain, and check that only pending migrations run.
9. Uninstall the application and verify Docker volumes/business data remain.

- [ ] **Step 2: Record the smoke-test result in the release notes**

Document the Windows version, Docker Desktop version, image digests, installer
SHA-256, and pass/fail outcome. Do not include credentials, customer data, or
environment-file contents.
