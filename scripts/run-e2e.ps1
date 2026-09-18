param(
  [string]$BackendPort = "8000",
  [string]$FrontendPort = "5173",
  [string]$E2eDatabase = "dolphin_ecommerce_e2e",
  [string]$AdminEmail = "admin.dev@dolphin.local"
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

if (-not $env:DOLPHIN_ADMIN_PASSWORD) {
  throw "Set DOLPHIN_ADMIN_PASSWORD in your shell before running E2E tests."
}

function Test-PortInUse([int]$Port) {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Get-FreePort([int]$PreferredPort) {
  $port = $PreferredPort
  while (Test-PortInUse $port) {
    $port += 1
  }
  return $port
}

$BackendPort = [string](Get-FreePort ([int]$BackendPort))
$FrontendPort = [string](Get-FreePort ([int]$FrontendPort))

$Frontend = Split-Path -Parent $PSScriptRoot
$Root = Split-Path -Parent $Frontend
$Backend = Join-Path $Root "backend"
$Python = Join-Path $Backend "venv\Scripts\python.exe"
$MediaRoot = Join-Path $Backend "media_e2e"
$ResolvedBackend = [System.IO.Path]::GetFullPath($Backend)
$ResolvedMediaRoot = [System.IO.Path]::GetFullPath($MediaRoot)

if (-not (Test-Path $Backend)) {
  throw "Backend directory not found: $Backend"
}

if (-not $ResolvedMediaRoot.StartsWith($ResolvedBackend, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to use media root outside backend workspace: $ResolvedMediaRoot"
}

$env:DB_NAME = $E2eDatabase
$env:MEDIA_ROOT = $MediaRoot
$env:DEVELOPER_EMAIL = $AdminEmail
$env:DEVELOPER_PASSWORD = $env:DOLPHIN_ADMIN_PASSWORD
$env:DOLPHIN_ADMIN_EMAIL = $AdminEmail
$env:DOLPHIN_API_BASE_URL = "http://127.0.0.1:$BackendPort"
$env:DOLPHIN_FRONTEND_BASE_URL = "http://127.0.0.1:$FrontendPort"
$env:VITE_API_BASE_URL = "http://127.0.0.1:$BackendPort"
$env:CORS_ALLOWED_ORIGINS = "http://127.0.0.1:$FrontendPort,http://localhost:$FrontendPort"
$env:DRF_AUTH_RATE = "200/minute"

$backendProcess = $null
$viteProcess = $null
$exitCode = 1
$InitialServerPids = @(
  Get-NetTCPConnection -LocalPort ([int]$BackendPort), ([int]$FrontendPort) -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
)

New-Item -ItemType Directory -Force -Path $MediaRoot | Out-Null

try {
  Push-Location $Backend
  try {
    & $Python -c "from decouple import config; import MySQLdb; name='$E2eDatabase'; assert name.endswith('_e2e'), name; con=MySQLdb.connect(host=config('DB_HOST'), port=int(config('DB_PORT')), user=config('DB_USER', default=''), passwd=config('DB_PASSWORD', default=''), charset='utf8mb4'); cur=con.cursor(); cur.execute('CREATE DATABASE IF NOT EXISTS `{}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'.format(name.replace('``','````'))); con.close()"
    & $Python manage.py migrate --noinput
    & $Python manage.py flush --noinput
    & $Python manage.py seed_store --reset-demo
    & $Python manage.py create_developer --update-password

    $backendProcess = Start-Process -FilePath $Python -ArgumentList @("manage.py", "runserver", "127.0.0.1:$BackendPort", "--noreload") -WorkingDirectory $Backend -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 3
  } finally {
    Pop-Location
  }

  Push-Location $Frontend
  try {
    $viteProcess = Start-Process -FilePath "npm" -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", $FrontendPort) -WorkingDirectory $Frontend -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 3
    & npx playwright test
    $exitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }
} finally {
  if ($viteProcess -and -not $viteProcess.HasExited) {
    Stop-Process -Id $viteProcess.Id -Force
  }
  if ($backendProcess -and -not $backendProcess.HasExited) {
    Stop-Process -Id $backendProcess.Id -Force
  }
  $remainingServerPids = @(
    Get-NetTCPConnection -LocalPort ([int]$BackendPort), ([int]$FrontendPort) -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique |
      Where-Object { $InitialServerPids -notcontains $_ }
  )
  foreach ($processId in $remainingServerPids) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }

  Push-Location $Backend
  try {
    & $Python manage.py flush --noinput
    if (Test-Path $MediaRoot) {
      $ExistingMediaRoot = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $MediaRoot).Path)
      if (-not $ExistingMediaRoot.StartsWith($ResolvedBackend, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove media root outside backend workspace: $ExistingMediaRoot"
      }
      Remove-Item -LiteralPath $ExistingMediaRoot -Recurse -Force
    }
  } finally {
    Pop-Location
  }
}

exit $exitCode
