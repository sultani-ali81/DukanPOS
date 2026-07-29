# Asan POS Automatic Local Stack Design

## Goal

Deliver a single Windows installer artifact that runs the React frontend and
NestJS backend locally, while automatically creating and starting the local
PostgreSQL, Redis, and MinIO Docker Compose stack. The Windows operator must
install Docker Desktop once, install Asan POS, and launch the application; no
terminal commands or environment-file editing are part of normal setup.

## Scope

- Electron generates persistent, random local service credentials on first
  launch.
- Electron writes `backend.env` and the derived Docker `compose.env` under
  `%LOCALAPPDATA%\\Asan POS`.
- Electron verifies Docker Desktop's CLI and daemon, then starts the stack
  with `docker compose ... up -d --wait`.
- Electron waits for PostgreSQL, Redis, and MinIO before applying migrations
  and starting the bundled backend.
- A GitHub Actions Windows runner builds the NSIS installer so development can
  remain on Ubuntu.
- The workflow uploads the installer as an artifact; the only project file to
  carry to Windows is that `.exe`.

## Non-goals

- Silently installing Docker Desktop, accepting its licence, enabling WSL, or
  rebooting Windows.
- Automatically deleting Docker containers, volumes, credentials, or business
  data.
- Containerizing the NestJS backend.
- Supporting a shared database across multiple Windows computers.
- Auto-updating Docker images or Compose definitions without an explicit
  release and migration policy.

## Runtime architecture

```text
Asan POS Setup.exe
  -> Electron application
     -> generated %LOCALAPPDATA%\\Asan POS\\backend.env
     -> generated %LOCALAPPDATA%\\Asan POS\\docker\\compose.env
     -> Docker Desktop: PostgreSQL + Redis + MinIO on 127.0.0.1
     -> bundled NestJS backend on 127.0.0.1:3000
     -> bundled React renderer
```

The app owns credentials only on first creation. Existing `backend.env`,
`compose.env`, `compose.yaml`, and Docker volumes are preserved on later app
launches and app upgrades. The backend connects only to the loopback host.

## Configuration contract

`backend.env` is created with the following fixed local topology:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=asan_pos
DB_PASSWORD=<random 64-character hexadecimal secret>
DB_NAME=asan_pos
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<random 64-character hexadecimal secret>
REDIS_URL=redis://:<URL-encoded Redis secret>@127.0.0.1:6379
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_ACCESS_KEY=asanposminio
MINIO_SECRET_KEY=<random 64-character hexadecimal secret>
MINIO_BUCKET=asan-pos
MINIO_BUCKET_NAME=asan-pos
MINIO_USE_SSL=false
JWT_SECRET=<random 64-character hexadecimal secret>
```

`compose.env` contains only PostgreSQL, Redis, and MinIO settings derived from
that file. It never receives JWT, mail, or AI keys. Values are written
atomically and with restrictive mode bits where the operating system honors
them.

## Docker lifecycle

On each launch, Electron:

1. runs `docker version` to confirm the daemon is available;
2. runs `docker compose version` to confirm Compose v2 is installed;
3. invokes `docker compose --env-file <compose.env> -f <compose.yaml> up -d --wait`;
4. polls PostgreSQL, Redis, and MinIO until all are reachable;
5. runs the bundled Knex migration runner;
6. starts the bundled NestJS process and waits for `/health`.

It never runs `docker compose down`, `down -v`, `rm`, or any command that
deletes business data. If Docker is absent or stopped, the app gives an
actionable retry/quit message. The operator only needs to install or start
Docker Desktop; no project configuration is exposed.

## Ubuntu-to-Windows delivery

Development and commits happen on Ubuntu. GitHub Actions uses `windows-latest`
to run the existing native Windows build script, including the Electron rebuild
for `bcrypt` and `skia-canvas`. The workflow checks out the DukanPOS commit and
an explicit AsanPOS ref, then uploads `Asan POS Setup-<version>.exe`.

The release operator downloads that artifact and copies only the `.exe` to the
Windows PC. Docker Desktop remains a separately installed prerequisite. For a
private AsanPOS repository, the DukanPOS repository needs an
`ASANPOS_REPOSITORY_TOKEN` Actions secret with read access to AsanPOS.

## Acceptance criteria

1. A fresh local app-data directory produces valid, non-placeholder
   `backend.env` and `compose.env` without user input.
2. Existing generated configuration is byte-for-byte preserved across later
   launches.
3. Docker command construction always uses the generated Compose file and env
   file; it never executes a destructive command.
4. Docker-unavailable and Compose-unavailable failures have stable,
   user-actionable messages.
5. The app starts services before attempting migrations or backend launch.
6. A GitHub Actions Windows job uploads the NSIS `.exe` artifact without the
   developer manually changing operating systems.
7. The existing Electron and frontend test suites remain green.
