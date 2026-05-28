param(
  [string]$PostgresServiceName = "postgresql-x64-18",
  [int]$DbPort = 5433
)

$ErrorActionPreference = "Stop"

$localRunRoot = "C:\dev\financeiro_run"

function Write-Step([string]$message) {
  Write-Host "[dev-up] $message" -ForegroundColor Cyan
}

$projectRoot = Split-Path -Path $PSScriptRoot -Parent
$backendPath = Join-Path $localRunRoot "backend"
$frontendPath = $localRunRoot

Write-Step "Projeto: $projectRoot"

if (-not (Test-Path $projectRoot)) {
  throw "Pasta do projeto nao encontrada: $projectRoot"
}

Write-Step "Sincronizando copia local em $localRunRoot"
New-Item -Path $localRunRoot -ItemType Directory -Force | Out-Null

$localBuild = Join-Path $localRunRoot "build"
$localDotTool = Join-Path $localRunRoot ".dart_tool"
$localWindowsEphemeral = Join-Path $localRunRoot "windows\flutter\ephemeral"
$localLinuxEphemeral = Join-Path $localRunRoot "linux\flutter\ephemeral"
$localMacosEphemeral = Join-Path $localRunRoot "macos\Flutter\ephemeral"
$localIosEphemeral = Join-Path $localRunRoot "ios\Flutter\ephemeral"

Remove-Item -Path $localBuild -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path $localDotTool -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path $localWindowsEphemeral -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path $localLinuxEphemeral -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path $localMacosEphemeral -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path $localIosEphemeral -Recurse -Force -ErrorAction SilentlyContinue

robocopy $projectRoot $localRunRoot /MIR /XD build .dart_tool .git .idea .vscode node_modules /XF "*.lock" | Out-Null

if (-not (Test-Path $backendPath)) {
  throw "Pasta backend nao encontrada na copia local: $backendPath"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm nao encontrado no PATH. Instale Node.js e tente novamente."
}

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
  throw "flutter nao encontrado no PATH. Instale Flutter SDK e tente novamente."
}

try {
  $service = Get-Service -Name $PostgresServiceName -ErrorAction Stop
  if ($service.Status -ne "Running") {
    Write-Step "Iniciando servico do PostgreSQL: $PostgresServiceName"
    Start-Service -Name $PostgresServiceName -ErrorAction Stop
    Start-Sleep -Seconds 2
  } else {
    Write-Step "Servico PostgreSQL ja esta em execucao."
  }
} catch {
  Write-Warning "Nao foi possivel iniciar/validar o servico '$PostgresServiceName'. Continuando com teste de porta."
}

$dbOk = Test-NetConnection -ComputerName localhost -Port $DbPort -InformationLevel Quiet
if (-not $dbOk) {
  Write-Warning "PostgreSQL nao esta respondendo na porta $DbPort."
  Write-Warning "Verifique o pgAdmin/servico antes de usar o app."
} else {
  Write-Step "PostgreSQL respondendo em localhost:$DbPort"
}

$backendCommand = "Set-Location '$backendPath'; npm install; npx prisma migrate deploy; npm run dev"
$frontendCommand = "Set-Location '$frontendPath'; flutter pub get; flutter run -d chrome"

Write-Step "Abrindo terminal do backend..."
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $backendCommand | Out-Null

Write-Step "Abrindo terminal do frontend..."
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", $frontendCommand | Out-Null

Write-Step "Inicializacao disparada."
Write-Host "Backend: $backendPath" -ForegroundColor Green
Write-Host "Frontend: $frontendPath" -ForegroundColor Green
Write-Host "URL esperada: http://localhost:3333/api" -ForegroundColor Green
