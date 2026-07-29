# Release-review remediations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make automatic Windows setup safely recover known legacy placeholders, detect persisted credential drift, and always provide a sanitized startup diagnostic.

**Architecture:** Configuration helpers identify only the exact old unconfigured template and preserve all other configuration. The Electron-independent startup orchestrator raises typed configuration errors before Docker runs on credential drift. A focused failure helper writes safe static diagnostic categories before Electron shows an error dialog.

**Tech Stack:** Electron CommonJS helpers, Node built-in test runner, dotenv, Node fs/crypto, Vite/Vitest.

## Global Constraints

- Never delete or recreate Docker containers, volumes, `backend.env`, `compose.env`, or `compose.yaml` for a real existing installation.
- Replace only the exact prior `CHANGE_ME` template that Electron previously rejected before backend startup.
- Never write raw error messages, Docker stdout/stderr, command arguments, environment values, or secrets to a startup log or error dialog.
- Docker stack startup remains exactly `docker compose --env-file <compose.env> -f <compose.yaml> up -d --wait`.
- A persisted Compose mismatch must stop before Docker, migrations, or backend launch.
- Target Windows users do not receive manual credential-editing instructions.

---

### Task 1: Safely migrate legacy placeholders and reject persisted credential drift

**Files:**
- Modify: `electron/lib/configuration.cjs`
- Modify: `electron/lib/runtime-startup.cjs`
- Modify: `electron/main.cjs`
- Modify: `electron/test/configuration.test.cjs`
- Modify: `electron/test/runtime-startup.test.cjs`

**Interfaces:**
- Produces `isKnownLegacyPlaceholderConfiguration(values): boolean`.
- `ensureRuntimeFiles({ composeTemplatePath, paths, randomBytesImpl? })` returns `migratedLegacyBackendEnvironment: boolean` in addition to existing metadata.
- Produces `RuntimeConfigurationError`, with `code` `configuration-invalid` or `compose-environment-mismatch`.
- `startBackendRuntime({ paths, resources, dependencies })` consumes an injected `getComposeEnvironmentMismatches(filePath, expectedValues)` and rejects before `ensureDockerStack` when a persisted Compose environment disagrees.

- [ ] **Step 1: Write failing tests for exact legacy migration and edited-file preservation**

Add a fixture containing the exact former topology and all four placeholder secrets:

```js
const legacyTemplate = [
  'DB_HOST=127.0.0.1', 'DB_PORT=5432', 'DB_USER=asan_pos',
  'DB_PASSWORD=CHANGE_ME', 'DB_NAME=asan_pos',
  'REDIS_HOST=127.0.0.1', 'REDIS_PORT=6379',
  'REDIS_PASSWORD=CHANGE_ME',
  'REDIS_URL=redis://:CHANGE_ME@127.0.0.1:6379',
  'MINIO_ENDPOINT=127.0.0.1', 'MINIO_PORT=9000',
  'MINIO_ACCESS_KEY=asanposminio', 'MINIO_SECRET_KEY=CHANGE_ME',
  'MINIO_BUCKET=asan-pos', 'MINIO_BUCKET_NAME=asan-pos',
  'MINIO_USE_SSL=false', 'JWT_SECRET=CHANGE_ME', '',
].join('\n');
```

Write it to `paths.backendEnvPath`, call `ensureRuntimeFiles` with deterministic
random bytes, and assert `migratedLegacyBackendEnvironment === true`, no
`CHANGE_ME` remains, and generated values normalize with no missing keys. Add a
second test changing one required secret in that fixture and assert the exact
content remains unchanged and migration metadata is false.

- [ ] **Step 2: Write a failing startup-order test for Compose mismatch**

In `runtime-startup.test.cjs`, make injected
`getComposeEnvironmentMismatches` return `['POSTGRES_PASSWORD']`. Assert the
promise rejects with `code === 'compose-environment-mismatch'`, and the event
list ends after `compose-env` with no Docker, migration, or backend events.

- [ ] **Step 3: Run focused tests and observe failure**

Run:

```bash
node --test electron/test/configuration.test.cjs
node --test electron/test/runtime-startup.test.cjs
```

Expected: the migration metadata/helper and mismatch rejection do not yet
exist, so the new assertions fail.

- [ ] **Step 4: Implement the narrow migration and typed checks**

Parse an existing `backend.env` only to compare it to the exact legacy fixture.
Require all expected non-secret topology values plus all four `CHANGE_ME`
secrets and the legacy Redis URL; any deviation is operator configuration and
must be left untouched. Regenerate that exact legacy file atomically using the
existing first-run generator.

In `runtime-startup.cjs`, preserve the current `ensureComposeEnvironment`
behavior. When it reports an existing file, call
`getComposeEnvironmentMismatches(paths.composeEnvPath, composeEnvironment)`.
If the returned list is nonempty, throw:

```js
new RuntimeConfigurationError(
  'compose-environment-mismatch',
  `The saved Docker configuration does not match the POS configuration: ${mismatches.join(', ')}`,
)
```

Convert the existing missing-key validation to
`RuntimeConfigurationError('configuration-invalid', ...)`. Pass the mismatch
helper from Electron main. Do not surface these raw messages to users; Task 2
maps their codes to static wording.

- [ ] **Step 5: Run focused and full desktop tests**

Run:

```bash
node --test electron/test/configuration.test.cjs
node --test electron/test/runtime-startup.test.cjs
npm run test:desktop
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add electron/lib/configuration.cjs electron/lib/runtime-startup.cjs electron/main.cjs electron/test/configuration.test.cjs electron/test/runtime-startup.test.cjs
git commit -m "fix: recover legacy desktop configuration safely"
```

### Task 2: Write safe startup diagnostics before Electron shows a failure

**Files:**
- Create: `electron/lib/startup-failure.cjs`
- Modify: `electron/lib/configuration.cjs`
- Modify: `electron/main.cjs`
- Create: `electron/test/startup-failure.test.cjs`
- Modify: `README.md`

**Interfaces:**
- `createRuntimePaths()` includes `startupLogPath` at `%LOCALAPPDATA%\\Asan POS\\logs\\startup.log`.
- Produces `getStartupFailureInfo(error): { code: string, category: 'docker' | 'configuration' | 'backend', message: string }`.
- Produces `appendStartupDiagnostic({ logPath, error, now?, appendFileSyncImpl? }): void`.
- Produces `createStartupFailureDialog({ error, paths }): { title, message, detail }`.

- [ ] **Step 1: Write failing diagnostic tests**

Write tests using a temporary `startup.log` and an error whose message includes
`super-secret-value`. Assert the written log has a timestamp, a static failure
code, and no occurrence of `super-secret-value`. Assert Docker errors map to
static Docker Desktop recovery text and configuration errors map to static
"contact your POS administrator" text, both referencing `startupLogPath`.

- [ ] **Step 2: Run the focused test and observe failure**

Run:

```bash
node --test electron/test/startup-failure.test.cjs
```

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement static categories and log creation**

Create `startup-failure.cjs`. Map known Docker codes and local-service timeout
to static Docker text; map `configuration-invalid` and
`compose-environment-mismatch` to static configuration text; map everything
else to a generic backend text. Never interpolate `error.message`, `error.cause`,
or error stack into the output. Create the log directory and append one
newline-delimited diagnostic line with mode `0600`.

Add `startupLogPath` to runtime paths. In Electron's bootstrap catch block,
append the diagnostic before presenting the dialog. Replace inline dialog
detail construction with `createStartupFailureDialog` and remove any raw error
message interpolation. The generic backend dialog may mention both startup and
backend log paths.

Add one README sentence that first launch needs internet access for Docker to
pull PostgreSQL, Redis, and MinIO images unless they have been preloaded.

- [ ] **Step 4: Run focused, full, and build verification**

Run:

```bash
node --test electron/test/startup-failure.test.cjs
npm run test:all
npm run build
git diff --check
```

Expected: PASS, with only any existing Vite chunk-size warning allowed.

- [ ] **Step 5: Commit**

```bash
git add electron/lib/startup-failure.cjs electron/lib/configuration.cjs electron/main.cjs electron/test/startup-failure.test.cjs README.md
git commit -m "fix: provide safe desktop startup diagnostics"
```

### Task 3: Prevent duplicate Electron startup from racing first-run setup

**Files:**
- Create: `electron/lib/single-instance.cjs`
- Create: `electron/test/single-instance.test.cjs`
- Modify: `electron/main.cjs`

**Interfaces:**
- Produces `acquireSingleInstanceLock({ app, getMainWindow }): boolean`.
- `app` provides `requestSingleInstanceLock()`, `quit()`, and `on()`.
- When the lock is held, a `second-instance` event restores a minimized main
  window and focuses it; when no main window exists, it does nothing.

- [ ] **Step 1: Write failing unit tests for the single-instance boundary**

Create a fake Electron app that records `requestSingleInstanceLock`, `quit`,
and registered events. Test all three cases:

```js
assert.equal(acquireSingleInstanceLock({ app: deniedApp, getMainWindow: () => null }), false);
assert.equal(deniedApp.quitCalls, 1);

assert.equal(acquireSingleInstanceLock({ app: primaryApp, getMainWindow: () => window }), true);
primaryApp.emit('second-instance');
assert.deepEqual(window.calls, ['restore', 'focus']);

primaryApp.emit('second-instance'); // with getMainWindow returning null
```

The final case must not throw or create a new window.

- [ ] **Step 2: Run the focused test and observe failure**

Run:

```bash
node --test electron/test/single-instance.test.cjs
```

Expected: FAIL because `single-instance.cjs` does not exist.

- [ ] **Step 3: Implement and integrate before app readiness**

Implement the helper using `app.requestSingleInstanceLock()` once. On a denied
lock, call `app.quit()` and return false without registering the second-instance
listener. On the primary instance, register `second-instance`; if the supplied
window exists, call `restore()` only when `isMinimized()` is true, then call
`focus()`.

In `electron/main.cjs`, retain the created BrowserWindow in a module-level
`mainWindow`. Call the helper before `app.whenReady()` and register the
bootstrap/quit lifecycle only when the lock is acquired. Do not show a second
window or repeat configuration, Docker, migrations, or backend startup.

- [ ] **Step 4: Run focused and full verification**

Run:

```bash
node --test electron/test/single-instance.test.cjs
npm run test:all
npm run build
node --check electron/main.cjs
git diff --check
```

Expected: PASS, with only the existing Vite chunk-size warning allowed.

- [ ] **Step 5: Commit**

```bash
git add electron/lib/single-instance.cjs electron/test/single-instance.test.cjs electron/main.cjs
git commit -m "fix: prevent duplicate desktop startup"
```
