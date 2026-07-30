# Asan POS Windows Electron + Docker Desktop Distribution Design

## Goal

Deliver one Windows x64 installer, `Asan POS Setup-<version>.exe`, for a
single-PC POS installation. The installer packages the DukanPOS React frontend
and the AsanPOS NestJS backend. At runtime, Electron starts and supervises the
backend and starts the local PostgreSQL, Redis, and MinIO Docker Compose stack.

The target PC has internet access during its first setup. Docker Desktop is an
external prerequisite: the app detects whether it is installed and running,
then gives the operator actionable setup instructions when it is not. The app
does not install Docker Desktop itself.

## Confirmed decisions

- This is a single-PC first release, not a multi-cashier or cloud deployment.
- Docker Desktop provides PostgreSQL, Redis, and MinIO.
- Electron automatically runs `docker compose up -d` when Docker is available.
- On first use, the app creates the local database and runs the backend's
  compiled migrations. Later launches reuse the same database.
- The operator distributes a complete backend `.env` file beside the installer.
- The installer imports that file once into app data and preserves it on upgrades.
- The PC may use the internet for Docker image pulls and email configuration.

## Scope and boundaries

### In scope

- An Electron Builder NSIS installer in the DukanPOS repository.
- Packaging DukanPOS production assets and the compiled AsanPOS runtime.
- A bundled Compose definition for PostgreSQL, Redis, and MinIO.
- Docker detection, automatic Compose startup, service health checks, migration
  execution, backend readiness checks, and actionable Windows error screens.
- Migration-safe upgrades that preserve configuration and Docker volumes.

### Out of scope

- Installing or upgrading Docker Desktop automatically.
- Bundling PostgreSQL, Redis, or MinIO as native Windows services.
- Multi-PC data sharing, cloud synchronization, or remote database access.
- Automatic demo-data seeding. A first installation creates an empty database.
- Deleting business data when the Electron application is uninstalled.

## Architecture

```text
Asan POS Setup.exe
└─ Asan POS.exe (Electron)
   ├─ renderer/                  DukanPOS Vite production build
   ├─ backend/                   compiled AsanPOS + production dependencies
   └─ docker-compose.yml         local-service definition

%APPDATA%\Asan POS\
├─ backend.env                   imported operator configuration, preserved verbatim
├─ compose.env                   minimal Compose-only derived configuration
└─ logs\                         launcher and backend logs

Electron
  ├─ docker compose up -d
  │  ├─ PostgreSQL volume: durable POS database
  │  ├─ Redis volume: durable Redis state where applicable
  │  └─ MinIO volume: durable object storage
  ├─ compiled migration runner
  ├─ bundled NestJS API at 127.0.0.1:3000
  └─ DukanPOS renderer at the privileged asanpos://app origin
```

Electron is the process owner of the bundled backend, but it does not shut down
the Docker stack when the desktop window exits. Keeping containers and volumes
alive preserves data and makes the next startup faster. All local service ports
are bound to loopback only.

The Electron main process registers a privileged `asanpos://app` protocol before
app readiness. It resolves `/assets/*` to packaged renderer assets and returns
the renderer `index.html` for application routes. This preserves the frontend's
existing browser routing and root-relative Vite asset paths without relying on
unrestricted `file://` navigation.

## Project layout

The desktop distribution project lives in `DukanPOS` so it is versioned with
the frontend rather than created as an untracked third repository. The build
uses the sibling `../AsanPOS` repository as an input.

```text
DukanPOS/
├─ electron/
│  ├─ main.cjs                   Electron startup orchestration
│  ├─ preload.cjs                narrow renderer-to-main bridge
│  ├─ lib/
│  │  ├─ configuration.cjs       import, validate, normalize configuration
│  │  ├─ docker.cjs              Docker/Compose commands and health checks
│  │  └─ backend.cjs             migration and API child-process control
│  ├─ services/docker-compose.yml
│  └─ scripts/stage-desktop.cjs  deterministic frontend/backend staging
├─ package.json                  Electron Builder and release commands
└─ docs/superpowers/specs/       cross-project distribution design
```

`stage-desktop.cjs` builds the Vite renderer and AsanPOS backend, then stages
the renderer, backend `dist`, compiled migrations, and production-only backend
modules as Electron Builder `extraResources`. The backend must remain outside
the application ASAR so Electron can execute it. Native backend dependencies
such as `bcrypt` and `skia-canvas` are rebuilt on native Windows x64 for the
target Electron ABI before the NSIS package is created.

## Docker Compose contract

The bundled Compose file defines exactly three named services: PostgreSQL,
Redis, and MinIO. Their image tags are explicitly pinned in the release
configuration; no service uses a floating `latest` tag.

- PostgreSQL initializes `DB_NAME`, `DB_USER`, and `DB_PASSWORD` from derived
  Compose configuration and persists its data in a named volume.
- Redis is available only to the local backend and persists only if the selected
  Redis configuration requires it. Its generated local password is required by
  both the Compose service and backend connection settings.
- MinIO uses the configured access key and secret, creates/uses the configured
  bucket through the backend, and persists objects in a named volume.
- Published service ports bind to `127.0.0.1`, never all network interfaces.
- Docker Compose uses a fixed project name so its containers and volumes do not
  collide with unrelated local projects.

The first `docker compose up -d` may pull the pinned images from the internet.
Electron shows progress while images are downloading and reports a readable
network error if the pull cannot complete.

## Configuration and secrets

The installer expects an `.env` sibling beside `Asan POS Setup.exe`. Its NSIS
custom installation step resolves that sibling from the installer directory and
imports it on a fresh installation, before the installed application launches.

1. The installer checks for the sibling `.env` without logging any value.
2. On a fresh installation, it copies that file into the current user's
   `%APPDATA%\\Asan POS` directory as `backend.env` without changing it.
3. Electron parses and validates that persistent file, then writes a separate,
   minimal derived `compose.env` containing only values needed by Compose. It
   generates a local Redis password once and preserves it in that file. Mail and
   OpenAI credentials never enter the Compose environment.
4. On every later start or upgrade, the existing app-data configuration wins.
   A new sibling `.env` never silently replaces it.

If the sibling `.env` is absent during a fresh installation, the installer
explains the required adjacent file and does not launch the POS application.
If the persistent configuration is later missing or invalid, the application
shows its exact app-data path and a Retry action. It does not start containers
or migrations.

For this local-only deployment, configuration validation requires `DB_HOST` to
be `127.0.0.1` or `localhost`. This prevents an accidental migration of a
remote database. The configuration adapter supplies the local Redis values
needed by both current backend styles (`REDIS_HOST`/`REDIS_PORT` and
`REDIS_URL`) and maps `MINIO_BUCKET_NAME` in the supplied file to the
`MINIO_BUCKET` name used by the backend. It also normalizes whitespace around
assignment operators so the current `.env` format remains accepted.

The full backend environment, including mail and API credentials, is passed
only to the backend child process, with the local Redis and MinIO aliases
overlaid in memory. Logs redact values and never print the environment. The
configuration file stays outside the installer and ASAR.

## Startup and database lifecycle

1. Electron resolves installed resources, `%APPDATA%` paths, and log paths.
2. It imports or validates the persistent local configuration.
3. It runs `docker info` and `docker compose version`.
4. If Docker is unavailable, it displays a setup screen with Docker Desktop
   instructions and Retry; it does not attempt a silent Docker installation.
5. It runs `docker compose --env-file compose.env up -d` using the bundled
   Compose definition.
6. It waits for PostgreSQL, Redis, and MinIO health checks to succeed.
7. It invokes AsanPOS's compiled migration runner. PostgreSQL creates the empty
   configured database before this step, and Knex's migration table ensures
   `migrate.latest()` applies only pending migrations on later launches.
8. It starts the bundled NestJS backend with `ELECTRON_RUN_AS_NODE=1`,
   `ASANPOS_ENV_FILE`, `HOST=127.0.0.1`, and `PORT=3000`.
9. It polls `GET http://127.0.0.1:3000/health`.
10. Only after that endpoint is ready does it load the DukanPOS renderer.

Knex's migration table is the source of truth for individual migrations. Failed
migrations do not delete data; they are reported and retried after the
underlying issue is resolved.

On normal Electron exit, the app terminates the backend process tree using a
Windows-safe strategy. It leaves the Compose stack and volumes running. On a
release update, it preserves both app-data configuration and Docker volumes,
then runs only pending migrations.

## User-facing failure behavior

| Condition | Required behavior |
| --- | --- |
| Docker Desktop missing or stopped | Explain the prerequisite, link to setup instructions, and offer Retry. |
| Docker image pull fails | Show network/download failure, preserve configuration and data, and offer Retry. |
| A container is unhealthy | Name the failed service, show relevant non-secret Compose logs, and offer Retry. |
| `.env` missing or invalid | Show the expected sibling path or missing key names, never secret values. |
| Migration fails | Do not start the API/UI, preserve volumes, show the log location, and permit retry after repair. |
| Backend fails readiness | Do not open the POS UI; show the backend log path and retry option. |

The primary diagnostic location is `%APPDATA%\\Asan POS\\logs`. The startup
screen must explain failures in operator language rather than exposing a raw
stack trace as the only signal.

## Security and data safety

- The shipped installer contains no existing `.env` file, credentials, database
  dump, MinIO objects, or demo data.
- Business data resides in Docker volumes, not in Program Files or the ASAR.
- Uninstall keeps Docker volumes by default. A deliberate data-removal command
  is a separate, explicitly confirmed administrative operation.
- The API, database, Redis, and MinIO use loopback network bindings.
- Production builds use Electron context isolation, a minimal preload bridge,
  and no Node integration in renderer content.
- The release process code-signs the Windows installer before distribution.

## Verification and acceptance criteria

Automated coverage includes:

- `.env` parsing, validation, normalization, redaction, and upgrade-preservation
  behavior;
- Compose command generation, Docker detection, health waiting, and error
  classification;
- idempotent migration execution and no data-loss behavior on failure;
- backend launch, health polling, logging, and Windows-safe shutdown helpers;
- deterministic resource staging that contains the renderer, compiled backend,
  production dependencies, migration runner, and Compose file but no `.env`.

Windows release smoke test on a clean x64 PC:

1. Install Docker Desktop and start it.
2. Place the operator `.env` next to `Asan POS Setup.exe`.
3. Install and launch the application.
4. Confirm images download, containers become healthy, the empty database is
   created, migrations run, and the POS UI loads.
5. Create representative POS data, close the app, then launch it again.
6. Confirm the data remains and the migration runner finds no pending migration
   when unchanged.
7. Upgrade to a build with a new migration and confirm data is preserved while
   only the new migration runs.
8. Uninstall the application and confirm Docker volumes/business data remain.

## Required backend alignment

AsanPOS already has a loopback startup path, `/health`, environment-file loading,
and a compiled migration runner. The implementation must additionally ensure
that the runtime configuration adapter covers both existing Redis configuration
forms, includes the generated Redis password for queue connections, and covers
the MinIO bucket-name mismatch described above. Demo-data seeding is not
invoked by the installer or first-launch path.

This design supersedes the earlier backend packaging assumption that Electron
does not manage Docker containers: for this chosen single-PC release, Electron
explicitly starts and verifies the Compose stack but never installs Docker
Desktop or destroys local volumes.
