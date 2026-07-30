# Asan POS Manual-Docker Windows Installer Design

## Goal

Ship one Windows x64 NSIS installer, `Asan POS Setup-<version>.exe`, that
installs the DukanPOS frontend and the AsanPOS NestJS backend as one local
desktop application. PostgreSQL, Redis, and MinIO run as a separate, manually
started Docker Desktop Compose stack.

## Confirmed product decisions

- The target is one Windows PC per installation.
- Docker Desktop is a user-installed prerequisite. The installer and desktop
  application never install, start, stop, upgrade, or remove Docker Desktop.
- The operator manually starts the three local Docker services before using
  the POS application. The desktop application only verifies their readiness.
- The distribution includes a Compose template and creates an editable,
  persistent local Docker project on first launch.
- The distribution ships no real `.env`, credentials, Docker image archive,
  database dump, MinIO objects, or sample business data.
- The installer does not delete Docker containers, volumes, configuration, or
  business data during upgrade or uninstall.

## Why Compose, not a Dockerfile

The Electron application runs the compiled NestJS backend directly on the
Windows PC. PostgreSQL, Redis, and MinIO use their maintained container images
and are defined together in one `compose.yaml`; a Dockerfile is not required
for this topology.

## Installation and first-use flow

```text
1. Operator installs and starts Docker Desktop.
2. Operator runs Asan POS Setup.exe.
3. First app launch creates local configuration and Docker project files.
4. Operator completes one backend.env file.
5. Electron validates backend.env and derives compose.env.
6. Operator runs docker compose up -d from the local Docker project.
7. Operator starts Asan POS.
8. Electron checks services, runs pending migrations, launches the API, then
   displays the renderer.
```

The installed Electron program lives in the installer-selected program folder.
Mutable configuration, Compose files, and logs live under the current user's
local application-data directory:

```text
%LOCALAPPDATA%\Asan POS\
├─ backend.env
├─ docker\
│  ├─ compose.yaml
│  └─ compose.env
└─ logs\
   └─ backend.log
```

The first launch copies templates only when the destination is absent. It
never overwrites a completed local configuration or edited Compose file on an
application update.

## Configuration contract

`backend.env` is the single operator-owned source of truth. It contains both
the backend's local service connections and application-only secrets. It is
created from a bundled `backend.env.example`, is ignored by Git, and remains
outside the installed application package.

The desktop runtime validates the base local-service keys before it starts the
backend, then atomically writes `docker/compose.env` with only the values that
the three Docker containers need.

Required base keys are:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=asan_pos
DB_PASSWORD=CHANGE_ME
DB_NAME=asan_pos
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_URL=redis://127.0.0.1:6379
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_ACCESS_KEY=asanposminio
MINIO_SECRET_KEY=CHANGE_ME
MINIO_BUCKET=asan-pos
MINIO_BUCKET_NAME=asan-pos
MINIO_USE_SSL=false
JWT_SECRET=CHANGE_ME
```

Existing optional mail and AI settings remain in `backend.env` and are passed
only to the backend. They never enter `compose.env`.

The configuration adapter enforces these aliases from one canonical value:

- `MINIO_BUCKET` and `MINIO_BUCKET_NAME` receive the same bucket name.
- `REDIS_URL` is derived from `REDIS_HOST` and `REDIS_PORT` when absent.
- `REDIS_HOST` and `REDIS_PORT` are derived from a valid local `REDIS_URL`
  when absent.

The generated `compose.env` contains `POSTGRES_DB`, `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `POSTGRES_PORT`, `REDIS_PORT`, `MINIO_ROOT_USER`,
`MINIO_ROOT_PASSWORD`, `MINIO_API_PORT`, and `MINIO_CONSOLE_PORT`. It never
contains mail credentials, JWT secrets, or AI credentials.

## Docker project

The copied `compose.yaml` has the fixed Compose project name `asan-pos` and
three services:

| Service | Image | Host binding | Durable volume |
| --- | --- | --- | --- |
| PostgreSQL | `postgres:17.10-alpine` | `127.0.0.1:${POSTGRES_PORT}:5432` | `asan-pos-postgres` |
| Redis | `redis:7.4.10-alpine` | `127.0.0.1:${REDIS_PORT}:6379` | `asan-pos-redis` |
| MinIO | `minio/minio:RELEASE.2025-09-07T16-13-09Z-cpuv1` | `127.0.0.1:${MINIO_API_PORT}:9000`, `127.0.0.1:${MINIO_CONSOLE_PORT}:9001` | `asan-pos-minio` |

Each service has `restart: unless-stopped`. Redis uses append-only persistence.
All published ports bind only to loopback, so the database, cache, and object
store are not exposed to the local network.

After completing `backend.env`, the operator starts the stack with:

```powershell
cd "$env:LOCALAPPDATA\Asan POS\docker"
docker compose --env-file .\compose.env -f .\compose.yaml up -d
```

The first command pulls the pinned images and creates the named volumes. An
internet connection is required only for the first image pull unless those
images already exist in Docker Desktop.

## Desktop application architecture

`DukanPOS` is the Electron Builder project. The build stages:

```text
renderer/  DukanPOS Vite production output
backend/   AsanPOS compiled dist, production runtime dependencies,
           backend.env.example, and migration manifest
docker/    compose.yaml template
```

The backend stays outside Electron's ASAR archive so its Node entry points and
native modules can execute. Electron registers a secure, standard `asanpos`
protocol that serves the packaged renderer and falls back to `index.html` for
React BrowserRouter routes. The renderer has context isolation enabled, no
Node integration, and connects only to `http://127.0.0.1:3000`.

On normal application startup Electron:

1. Initializes or validates local files without printing secrets.
2. Performs TCP/HTTP readiness checks for PostgreSQL, Redis, and MinIO.
3. Runs the compiled Knex migration runner when the packaged migration-set ID
   differs from the completed local state.
4. Starts `dist/main.js` with Electron's Node mode, `ASANPOS_ENV_FILE`,
   `HOST=127.0.0.1`, and `PORT=3000`.
5. Polls `GET /health` until it returns `{ "status": "ok" }`.
6. Opens the POS window only after API readiness succeeds.

Closing the Electron program terminates its backend child process with a
Windows-safe process-tree shutdown. It deliberately leaves Docker containers
and volumes untouched.

## Failure behavior

| Condition | Required behavior |
| --- | --- |
| Docker Desktop missing or unavailable | Explain that Docker Desktop must be started; do not attempt an installation. |
| `backend.env` absent or incomplete | Show its local path and missing key names, never values. |
| Compose files absent | Recreate only missing templates and show the manual `docker compose up -d` command. |
| PostgreSQL, Redis, or MinIO unavailable | Name the unavailable service and show the Docker project path and command. |
| Migration failure | Do not open the POS UI or write a success marker; preserve Docker data and show the backend log path. |
| Backend readiness failure | Stop the backend child process, keep Docker running, and show the log path. |

## Packaging and release constraints

- The output is one Windows x64 NSIS installer, not a portable launcher.
- `electron-builder` packages the renderer and copies the staged backend and
  Docker template using `extraResources`.
- Production dependency staging excludes source, tests, `.env`, source maps,
  and development dependencies.
- `bcrypt` and `skia-canvas` must be rebuilt for Electron on a native Windows
  x64 runner before the installer is released.
- A Windows smoke test installs Docker Desktop, runs the Compose command,
  installs the `.exe`, completes configuration, verifies migrations and UI,
  restarts the app, upgrades it, and confirms Docker data survives.

## Acceptance criteria

1. A fresh Windows PC can follow the stated flow without a source checkout,
   npm, Nest CLI, or manually started backend process.
2. The installed app never includes or logs a real `.env` value.
3. Docker services remain manually controlled and persist independently of the
   Electron program.
4. Missing configuration or services produce actionable setup instructions.
5. Normal launch opens the POS UI only after the backend health endpoint is
   available.
6. Upgrades preserve configuration and Docker volumes while applying only
   pending database migrations.
