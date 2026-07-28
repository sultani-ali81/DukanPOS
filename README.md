# Asan POS Windows Desktop Installer

This repository contains the DukanPOS React frontend and the Electron Builder
desktop host. The sibling `../AsanPOS` repository supplies the compiled NestJS
backend. The Windows installer contains both application layers; PostgreSQL,
Redis, and MinIO remain a local Docker Desktop Compose stack.

## What the installer does

`Asan POS Setup-<version>.exe` is a Windows x64 NSIS installer. It installs
the desktop program, then the first application launch creates these
user-owned files:

```text
%LOCALAPPDATA%\Asan POS\
├─ backend.env
├─ docker\
│  ├─ compose.yaml
│  └─ compose.env
└─ logs\backend.log
```

The installer and app never package a real `.env`, start Docker Desktop, run
`docker compose up`, stop Docker containers, or remove Docker volumes. This
keeps business data under the operator's control.

## First-time Windows setup

1. Install Docker Desktop and start it.
2. Run `Asan POS Setup-<version>.exe`.
3. Launch Asan POS once. It creates `backend.env` and the Docker project, then
   explains that the template must be completed.
4. Edit `%LOCALAPPDATA%\Asan POS\backend.env`. At minimum, replace every
   `CHANGE_ME` value. Keep these values local and never commit or send the
   file:

   ```dotenv
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_USER=asan_pos
   DB_PASSWORD=your-postgres-password
   DB_NAME=asan_pos
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password
   REDIS_URL=redis://:your-redis-password@127.0.0.1:6379
   MINIO_ENDPOINT=127.0.0.1
   MINIO_PORT=9000
   MINIO_ACCESS_KEY=asanposminio
   MINIO_SECRET_KEY=your-minio-password
   MINIO_BUCKET=asan-pos
   MINIO_BUCKET_NAME=asan-pos
   MINIO_USE_SSL=false
   JWT_SECRET=your-long-random-jwt-secret
   ```

5. Launch Asan POS once more. It validates the file and creates the
   Docker-only `compose.env` file. It is preserved on later launches and app
   upgrades; if you deliberately change shared database, Redis, or MinIO credentials,
   update the matching value in `compose.env` before recreating the containers.
6. Start the services manually in PowerShell:

   ```powershell
   cd "$env:LOCALAPPDATA\Asan POS\docker"
   docker compose --env-file .\compose.env -f .\compose.yaml up -d
   ```

7. Launch Asan POS. It checks PostgreSQL, Redis, and MinIO, applies pending
   migrations, starts the backend at `127.0.0.1:3000`, waits for `/health`,
   and then opens the POS UI.

The Compose file uses named Docker volumes and loopback-only ports. Closing
Asan POS stops only its backend process; the Docker services and their data
remain running. Upgrading or uninstalling the application preserves the local
configuration and Docker volumes.

## Development checks

The projects must remain siblings, or set `ASANPOS_DIR` to the backend path.

```bash
cd DukanPOS
npm ci
cd ../AsanPOS
npm ci
cd ../DukanPOS
npm run test:all
npm run lint
npm run build
npm run stage:desktop
```

`npm run start:desktop` stages the application and starts Electron. It needs a
completed local configuration and manually started Docker services.

## Windows release build

Run this only on a native Windows x64 machine. The backend depends on native
modules (`bcrypt` and `skia-canvas`), so an installer built on Linux is not a
release artifact.

```powershell
cd DukanPOS
$env:ASANPOS_DIR = "C:\path\to\AsanPOS" # omit when it is ../AsanPOS
npm run release:win
```

The installer is written to `electron-dist`. Before distributing it, perform a
clean Windows test: install Docker Desktop, complete `backend.env`, start
Compose, install the `.exe`, create representative data, restart the app,
upgrade it, and verify that Docker data remains intact.

## Diagnostics

If the app cannot start, open:

```text
%LOCALAPPDATA%\Asan POS\logs\backend.log
```

The setup error dialog also shows the Docker project folder and the exact
manual Compose command.
