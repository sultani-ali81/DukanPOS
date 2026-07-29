# Asan POS Windows Desktop Installer

This repository contains the DukanPOS React frontend and Electron desktop host.
The installer packages the compiled NestJS backend from `Munib03/AsanPOS`.
PostgreSQL, Redis, and MinIO run locally in Docker Desktop.

`Asan POS Setup-<version>.exe` is a real Windows x64 NSIS installer, not a
launcher. On first launch, the installed application creates local credentials,
starts its Docker Compose services, waits until they are ready, runs migrations,
starts the backend, and opens the POS UI. Docker Desktop itself must already be
installed and running; the application will not silently install or start it.

The application preserves its generated configuration and Docker volumes across
application upgrades and uninstalls. Business services are bound only to
`127.0.0.1`.

## Release on Ubuntu

Do all source and release work on Ubuntu. Do not copy the frontend repository,
backend repository, `node_modules`, Docker files, or environment files to the
Windows computer.

1. In Ubuntu, commit and push the DukanPOS changes.
2. In Ubuntu, commit and push the exact AsanPOS backend commit that must be in
   the installer. Copy its full 40-character commit SHA:

   ```bash
   git -C "../AsanPOS" rev-parse HEAD
   ```

3. If `Munib03/AsanPOS` is private, add an `ASANPOS_REPOSITORY_TOKEN` Actions
   secret in the DukanPOS GitHub repository. Use a fine-grained token with only
   **Contents: Read** access to the AsanPOS repository. A public AsanPOS
   repository does not need this secret.
4. In the DukanPOS GitHub repository, open **Actions** → **Build Windows
   installer** → **Run workflow**. Paste the full AsanPOS commit SHA into
   `asanpos_ref` and run it. GitHub builds on a hosted Windows machine, so no
   Windows build machine or Codex installation is needed.
5. When the run succeeds, download the artifact named
   `asan-pos-windows-installer`, extract it on Ubuntu, and copy only
   `Asan POS Setup-<version>.exe` to Windows (USB drive, local network, or
   another transfer method).

The workflow accepts only a full backend commit SHA, so each installer is tied
to an explicit backend version.

## Install on Windows

1. Install Docker Desktop once, choose its normal WSL 2/Linux-container setup,
   and open Docker Desktop. Accept its terms if prompted and wait until it says
   Docker is running.
2. Copy `Asan POS Setup-<version>.exe` to the Windows computer and run it.
3. Launch **Asan POS** from the Start menu or desktop shortcut. On its first
   successful launch it generates `backend.env` and Compose credentials under
   `%LOCALAPPDATA%\Asan POS`, starts PostgreSQL, Redis, and MinIO, then starts
   the backend automatically.

There is no npm, Python, source checkout, manual `backend.env` editing, Docker
Compose command, or separate backend installer on Windows. If Docker Desktop
is closed or unavailable, open it and launch Asan POS again.

## Local runtime data

The installed application owns these local files:

```text
%LOCALAPPDATA%\Asan POS\
├─ backend.env
├─ docker\
│  ├─ compose.yaml
│  └─ compose.env
└─ logs\backend.log
```

Keep this directory and Docker's named volumes when moving to a new version;
they contain local configuration and business data. Do not copy these files
between installations unless performing a deliberate backup/restore process.

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

`npm run start:desktop` stages the application and starts Electron. It needs
Docker Desktop running locally.

## Diagnostics

If the app cannot start, open:

```text
%LOCALAPPDATA%\Asan POS\logs\backend.log
```

The setup error dialog identifies Docker Desktop or backend startup problems.
