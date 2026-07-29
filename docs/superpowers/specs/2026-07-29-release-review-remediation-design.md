# Release-review remediation design

## Purpose

Close the three release blockers found in the final review without changing
the POS topology or risking local business data.

## Decisions

### Safe legacy first-run migration

The previous installer created a known `backend.env` template containing four
required `CHANGE_ME` secrets. Electron rejected that template before the
backend could start, so it represents an unconfigured installation rather than
valid business data. On startup, the desktop host will replace only that exact
known template with generated local credentials. Any configuration in which a
required secret, host, port, database name, or Redis URL differs from the
known template remains untouched.

The migration never deletes Docker volumes, containers, or runtime files. A
missing Compose environment is generated normally after migration. An existing
Compose environment is never rewritten automatically.

### Detect, do not overwrite, divergent Docker credentials

`compose.env` is the persisted credential source used to start PostgreSQL,
Redis, and MinIO. When it already exists, Electron derives the expected values
from `backend.env` and compares them before Docker starts. A mismatch stops
startup with a typed configuration error. This prevents an opaque authentication
failure and avoids unsafe credential rewrites against existing Docker volumes.

### Sanitized startup diagnostics

Startup can fail before the backend child has created `backend.log`. The app
will maintain `%LOCALAPPDATA%\\Asan POS\\logs\\startup.log` for a short,
sanitized startup category and static explanation. It never records raw error
messages, command output, environment values, or error causes. The error dialog
uses static, actionable wording and always references the startup log; backend
failures may additionally reference `backend.log`.

## User-facing behavior

* A fresh install and the exact old untouched placeholder install complete
  automatically once Docker Desktop is running.
* A real existing configuration remains unchanged.
* A mismatched existing Docker configuration tells the operator to contact the
  POS administrator rather than asking them to edit credentials on Windows.
* First-run Docker/configuration failures have a real log file before the
  dialog points at it.

## Verification

Unit tests cover exact legacy-template migration, preservation of an edited
configuration, Compose mismatch rejection before Docker, static/sanitized
diagnostic logging, and user-facing recovery details. The full frontend and
desktop test suites plus the frontend production build remain required. A
hosted Windows GitHub Actions build and clean-VM installation remain external
release gates.
