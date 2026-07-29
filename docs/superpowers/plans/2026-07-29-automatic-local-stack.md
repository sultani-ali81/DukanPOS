# Automatic Local Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the installed Asan POS application automatically generate local credentials and start its Docker service stack, while producing its Windows NSIS installer through GitHub Actions.

**Architecture:** Electron remains the local process supervisor. A configuration module writes first-run secrets once, a Docker runtime module invokes only non-destructive Compose commands, and the existing readiness module waits for the host-bound services before backend startup. GitHub Actions uses a hosted Windows runner to build the existing installer from explicitly selected frontend and backend revisions.

**Tech Stack:** Electron 43, Node.js CommonJS runtime helpers, Docker Compose v2, Node built-in test runner, Vite/Vitest, GitHub Actions, electron-builder NSIS.

## Global Constraints

- The operator installs Docker Desktop separately; application code must not install Docker Desktop, accept its licence, change WSL, or reboot Windows.
- The backend stays an Electron child process on `127.0.0.1:3000`; only PostgreSQL, Redis, and MinIO run in Docker.
- Docker service addresses in generated backend configuration are exactly `127.0.0.1`.
- Generate 32 random bytes as lowercase hexadecimal for each persisted secret; never log a secret.
- Existing `backend.env`, `compose.env`, `compose.yaml`, and Docker volumes are preserved; never execute `down`, `down -v`, `rm`, or `prune`.
- The first-run Compose command is exactly `docker compose --env-file <compose.env> -f <compose.yaml> up -d --wait`.
- The Windows artifact build uses a hosted Windows runner and a caller-supplied AsanPOS Git ref; no Ubuntu-produced `.exe` is treated as a release artifact.
- Tests are written and observed failing before each production behavior change.

---

## File structure

- `electron/lib/configuration.cjs`: creates and preserves the private first-run backend configuration and derives Compose environment values.
- `electron/lib/docker-runtime.cjs`: wraps Docker CLI/Compose invocations with a testable dependency boundary and stable failures.
- `electron/lib/readiness.cjs`: polls local service reachability after Compose returns.
- `electron/main.cjs`: coordinates configuration, Docker, service readiness, migrations, backend launch, and user-facing retry/quit failures.
- `electron/test/configuration.test.cjs`: specifies secret generation and preservation behavior.
- `electron/test/docker-runtime.test.cjs`: specifies command order, arguments, and Docker failure behavior.
- `electron/test/readiness.test.cjs`: specifies service polling behavior.
- `electron/test/package-config.test.cjs`: asserts packaged resources include the runtime helpers.
- `.github/workflows/build-windows-installer.yml`: runs the native Windows packaging pipeline and uploads the `.exe`.
- `README.md`: contains the Ubuntu development and Windows delivery procedure only.

### Task 1: Generate private first-run runtime configuration

**Files:**
- Modify: `electron/lib/configuration.cjs`
- Modify: `electron/test/configuration.test.cjs`

**Interfaces:**
- Produces `createInitialBackendConfiguration(randomBytesImpl): Record<string, string>`.
- Produces `writeBackendConfiguration(filePath, values): void`.
- Changes `ensureRuntimeFiles({ composeTemplatePath, paths, randomBytesImpl? })` to return `{ createdBackendEnvironment: boolean, createdComposeFile: boolean }`.

- [ ] **Step 1: Write failing tests for deterministic generated credentials**

```js
test('creates a complete generated backend environment only once', () => {
  const secrets = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64), 'd'.repeat(64)];
  const randomBytesImpl = () => Buffer.from(secrets.shift(), 'hex');
  const first = ensureRuntimeFiles({ composeTemplatePath, paths, randomBytesImpl });
  const firstContent = readFileSync(paths.backendEnvPath, 'utf8');

  assert.equal(first.createdBackendEnvironment, true);
  assert.match(firstContent, /DB_HOST=127.0.0.1/);
  assert.match(firstContent, /DB_PASSWORD=a{64}/);
  assert.doesNotMatch(firstContent, /CHANGE_ME/);

  const second = ensureRuntimeFiles({ composeTemplatePath, paths, randomBytesImpl });
  assert.equal(second.createdBackendEnvironment, false);
  assert.equal(readFileSync(paths.backendEnvPath, 'utf8'), firstContent);
});
```

- [ ] **Step 2: Run the focused test and verify it fails because the API does not exist**

Run: `node --test electron/test/configuration.test.cjs`

Expected: FAIL because `ensureRuntimeFiles` copies `backend.env.example` and does not return generation metadata.

- [ ] **Step 3: Implement the minimal generated configuration API**

```js
function createSecret(randomBytesImpl = randomBytes) {
  return randomBytesImpl(32).toString('hex');
}

function createInitialBackendConfiguration(randomBytesImpl) {
  const dbPassword = createSecret(randomBytesImpl);
  const redisPassword = createSecret(randomBytesImpl);
  const minioSecret = createSecret(randomBytesImpl);
  const jwtSecret = createSecret(randomBytesImpl);
  return {
    DB_HOST: '127.0.0.1', DB_PORT: '5432', DB_USER: 'asan_pos',
    DB_PASSWORD: dbPassword, DB_NAME: 'asan_pos',
    REDIS_HOST: '127.0.0.1', REDIS_PORT: '6379', REDIS_PASSWORD: redisPassword,
    REDIS_URL: `redis://:${encodeURIComponent(redisPassword)}@127.0.0.1:6379`,
    MINIO_ENDPOINT: '127.0.0.1', MINIO_PORT: '9000',
    MINIO_ACCESS_KEY: 'asanposminio', MINIO_SECRET_KEY: minioSecret,
    MINIO_BUCKET: 'asan-pos', MINIO_BUCKET_NAME: 'asan-pos', MINIO_USE_SSL: 'false',
    JWT_SECRET: jwtSecret,
  };
}
```

Write the file atomically through a `*.tmp` sibling and `renameSync`; preserve an existing file without reading, rewriting, or logging it. Copy `compose.yaml` only when absent.

- [ ] **Step 4: Run configuration tests and the complete desktop test suite**

Run: `node --test electron/test/configuration.test.cjs && npm run test:desktop`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/lib/configuration.cjs electron/test/configuration.test.cjs
git commit -m "feat: generate local runtime configuration"
```

### Task 2: Add a safe Docker Compose runtime controller

**Files:**
- Create: `electron/lib/docker-runtime.cjs`
- Create: `electron/test/docker-runtime.test.cjs`

**Interfaces:**
- Produces `ensureDockerStack({ composeEnvPath, composePath, execFileImpl? }): Promise<void>`.
- `execFileImpl(command, args, options, callback)` follows Node `child_process.execFile` callback semantics.
- Rejects with `DockerRuntimeError` whose `code` is one of `docker-unavailable`, `compose-unavailable`, or `compose-start-failed`.

- [ ] **Step 1: Write failing tests for the non-destructive command sequence**

```js
test('checks Docker and starts the generated Compose stack', async () => {
  const calls = [];
  await ensureDockerStack({
    composeEnvPath: 'C:/Asan POS/docker/compose.env',
    composePath: 'C:/Asan POS/docker/compose.yaml',
    execFileImpl(command, args, _options, callback) {
      calls.push([command, args]);
      callback(null, '', '');
    },
  });

  assert.deepEqual(calls, [
    ['docker', ['version']],
    ['docker', ['compose', 'version']],
    ['docker', ['compose', '--env-file', 'C:/Asan POS/docker/compose.env', '-f', 'C:/Asan POS/docker/compose.yaml', 'up', '-d', '--wait']],
  ]);
});
```

Add separate tests asserting stable error codes when each command returns an error, and an assertion that no command includes `down`, `rm`, `prune`, or `-v`.

- [ ] **Step 2: Run the focused test and verify it fails because the module is absent**

Run: `node --test electron/test/docker-runtime.test.cjs`

Expected: FAIL with `Cannot find module '../lib/docker-runtime.cjs'`.

- [ ] **Step 3: Implement the promise-based command wrapper and `ensureDockerStack`**

```js
function execute(command, args, execFileImpl) {
  return new Promise((resolve, reject) => {
    execFileImpl(command, args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) reject(Object.assign(error, { stdout, stderr }));
      else resolve({ stdout, stderr });
    });
  });
}
```

Run `docker version`, `docker compose version`, then the exact `up -d --wait` argument list. Map each failure to a `DockerRuntimeError` without including credentials or full environment-file content in the message.

- [ ] **Step 4: Run Docker runtime tests and all desktop tests**

Run: `node --test electron/test/docker-runtime.test.cjs && npm run test:desktop`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/lib/docker-runtime.cjs electron/test/docker-runtime.test.cjs
git commit -m "feat: start local Docker services automatically"
```

### Task 3: Wait for services and integrate automatic startup

**Files:**
- Modify: `electron/lib/readiness.cjs`
- Modify: `electron/test/readiness.test.cjs`
- Modify: `electron/main.cjs`

**Interfaces:**
- Produces `waitForLocalServices({ configuration, timeoutMs?, intervalMs?, assertLocalServicesImpl?, sleep?, now? }): Promise<void>`.
- Consumes `ensureDockerStack({ composeEnvPath, composePath })` from `docker-runtime.cjs`.
- `startBackendRuntime({ paths, resources })` calls generated configuration, Docker startup, service polling, migrations, then backend startup in that order.

- [ ] **Step 1: Write a failing service-polling test**

```js
test('waits until all local Docker services are reachable', async () => {
  let attempts = 0;
  await waitForLocalServices({
    configuration: localConfiguration,
    timeoutMs: 100,
    intervalMs: 0,
    assertLocalServicesImpl: async () => (++attempts === 1 ? ['MinIO'] : []),
    sleep: async () => {},
    now: (() => { let value = 0; return () => (value += 10); })(),
  });
  assert.equal(attempts, 2);
});
```

Add a timeout test asserting the thrown message lists only the last unavailable service names.

- [ ] **Step 2: Run the focused test and verify it fails because `waitForLocalServices` is absent**

Run: `node --test electron/test/readiness.test.cjs`

Expected: FAIL with `waitForLocalServices is not a function`.

- [ ] **Step 3: Implement polling and integrate it in Electron startup**

Implement polling with a 120-second default timeout and 500-millisecond interval. In `startBackendRuntime`, call:

```js
ensureRuntimeFiles({ composeTemplatePath: resources.composeTemplatePath, paths });
const configuration = normalizeBackendConfiguration(readBackendConfiguration(paths.backendEnvPath));
const composeEnvironment = createComposeEnvironment(configuration.values);
ensureComposeEnvironment(paths.composeEnvPath, composeEnvironment);
await ensureDockerStack({ composeEnvPath: paths.composeEnvPath, composePath: paths.composePath });
await waitForLocalServices({ configuration: configuration.values });
```

Replace the manual Compose command in the setup error with a message explaining that Docker Desktop must be installed and running. Do not open the configuration folder as the primary recovery action.

- [ ] **Step 4: Run focused and full desktop tests**

Run: `node --test electron/test/readiness.test.cjs && npm run test:desktop`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/lib/readiness.cjs electron/test/readiness.test.cjs electron/main.cjs
git commit -m "feat: bootstrap Docker services on app startup"
```

### Task 4: Create a hosted Windows installer build

**Files:**
- Create: `.github/workflows/build-windows-installer.yml`
- Modify: `README.md`

**Interfaces:**
- Workflow input `asanpos_ref` is a required Git ref in `Munib03/AsanPOS`.
- Workflow secret `ASANPOS_REPOSITORY_TOKEN` grants read access to the backend repository when it is private.
- Workflow artifact name is `asan-pos-windows-installer` and contains `Asan POS Setup-<version>.exe`.

- [ ] **Step 1: Write a failing package-level test that the installer helper is packaged**

Add an assertion in `electron/test/package-config.test.cjs` that `package.json#build.files` includes `electron/lib/**`; retain the existing expectation after adding `docker-runtime.cjs`.

- [ ] **Step 2: Run the focused package configuration test and verify its current expectation fails if needed**

Run: `node --test electron/test/package-config.test.cjs`

Expected: PASS only after the test expresses the already-required package rule; if it already passes, record that `electron/lib/**` covers the new helper and continue without production package changes.

- [ ] **Step 3: Create the manual GitHub Actions workflow**

Use `windows-latest`, `actions/checkout@v4`, `actions/setup-node@v4` with Node `24`, and `actions/upload-artifact@v4`. Check out DukanPOS to `app` and AsanPOS to `backend`; set `ASANPOS_DIR` to `${{ github.workspace }}\\backend`; run `npm run release:win` from `app`; upload `app/electron-dist/*.exe` with `if-no-files-found: error`.

- [ ] **Step 4: Update README with exact Ubuntu-to-Windows delivery steps**

Document: commit/push DukanPOS and a chosen AsanPOS ref; add `ASANPOS_REPOSITORY_TOKEN` when needed; run the workflow manually; download the `asan-pos-windows-installer` artifact; copy only its `.exe` to Windows; separately install Docker Desktop; launch Asan POS and let it configure/start the local stack automatically.

- [ ] **Step 5: Run static workflow and project checks**

Run: `npm run test:desktop && npm test && npm run build`

Expected: PASS. Validate workflow YAML with an available YAML parser if one is installed; otherwise review indentation and GitHub Actions expressions manually.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/build-windows-installer.yml README.md electron/test/package-config.test.cjs
git commit -m "ci: build Windows installer artifact"
```

### Task 5: Release safety verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Documents the exact Windows transfer artifact and excludes all source files, `.env` files, Docker volumes, and `node_modules` from the operator handoff.

- [ ] **Step 1: Add a release checklist testable by a Windows VM**

Document these exact checks: install Docker Desktop; install the generated `.exe`; launch Asan POS without editing a file; verify Compose services; create a sale and attachment; close/reopen app; restart Docker Desktop; confirm data remains; uninstall/reinstall app; confirm data remains.

- [ ] **Step 2: Run documentation-adjacent test suite**

Run: `npm run test:all`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: describe automatic Windows delivery"
```
