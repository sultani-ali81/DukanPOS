$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
  throw 'The Windows installer must be built on a native Windows x64 host.'
}

$hostArchitecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
if ($hostArchitecture -ne 'X64') {
  throw "The Windows installer must be built on an x64 host. Detected: $hostArchitecture"
}

$nodeArchitecture = & node -p "process.arch"
if ($LASTEXITCODE -ne 0) {
  throw "Could not determine the Node.js architecture. Exit code: $LASTEXITCODE"
}
if ($nodeArchitecture.Trim() -ne 'x64') {
  throw "The Windows installer requires x64 Node.js. Detected: $nodeArchitecture"
}

function Invoke-Npm {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  & npm @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "npm $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
  }
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if ([string]::IsNullOrWhiteSpace($env:ASANPOS_DIR)) {
  $env:ASANPOS_DIR = Join-Path (Split-Path $projectRoot -Parent) 'AsanPOS'
}

if (-not (Test-Path (Join-Path $env:ASANPOS_DIR 'package.json'))) {
  throw "ASANPOS_DIR does not contain package.json: $env:ASANPOS_DIR"
}

Push-Location $projectRoot
try {
  Invoke-Npm -Arguments @('ci')

  Push-Location $env:ASANPOS_DIR
  try {
    Invoke-Npm -Arguments @('ci')
  }
  finally {
    Pop-Location
  }

  Invoke-Npm -Arguments @('run', 'package:win')
}
finally {
  Pop-Location
}
