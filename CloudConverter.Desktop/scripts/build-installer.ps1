#Requires -Version 5.1
<#
.SYNOPSIS
  Publish Desktop app and build CloudConverter-Setup-1.3.0.exe (embedded payload installer).
#>
param(
  [switch]$SkipPublish,
  [ValidateSet("self-contained", "framework")]
  [string]$Mode = "self-contained"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$publishDir = Join-Path $root "dist\CloudConverter"
$installerDir = Join-Path $root "dist\installer"
$bootstrap = Join-Path $root "installer\Bootstrap"
$payloadZip = Join-Path $bootstrap "payload.zip"
$version = "1.3.0"
$setupName = "CloudConverter-Setup-$version.exe"

function Get-DotNet {
  $candidates = @(
    (Join-Path $env:USERPROFILE ".dotnet\dotnet.exe"),
    "C:\Program Files\dotnet\dotnet.exe",
    "C:\Program Files (x86)\dotnet\dotnet.exe"
  )
  foreach ($c in $candidates) {
    if (-not (Test-Path $c)) { continue }
    $ver = & $c --version 2>$null
    if ($ver -and [version]$ver -ge [version]"8.0.0") { return $c }
  }
  foreach ($c in $candidates) {
    if (-not (Test-Path $c)) { continue }
    $ver = & $c --version 2>$null
    if ($ver -and [version]$ver -ge [version]"6.0.0") { return $c }
  }
  return "dotnet"
}

$dotnet = Get-DotNet
Write-Host "=== Convertek Setup builder ===" -ForegroundColor Cyan
Write-Host "dotnet: $dotnet"

if (-not $SkipPublish) {
  Write-Host "Publishing app ($Mode)..." -ForegroundColor Yellow
  & (Join-Path $root "scripts\publish.ps1") -Mode $Mode
  if ($LASTEXITCODE -ne 0 -and -not (Test-Path (Join-Path $publishDir "CloudConverter.exe"))) {
    throw "Publish failed"
  }
}

$exe = Join-Path $publishDir "CloudConverter.exe"
if (-not (Test-Path $exe)) { throw "Missing published app: $exe" }

Write-Host "Packing payload..." -ForegroundColor Yellow
if (Test-Path $payloadZip) { Remove-Item $payloadZip -Force }
Compress-Archive -Path (Join-Path $publishDir "*") -DestinationPath $payloadZip -CompressionLevel Optimal -Force
if (-not (Test-Path $payloadZip)) { throw "Failed to create payload.zip" }
Write-Host ("  payload: {0:N2} MB" -f ((Get-Item $payloadZip).Length / 1MB))

New-Item -ItemType Directory -Force -Path $installerDir | Out-Null
$setupOut = Join-Path $installerDir "setup-build"

Write-Host "Building Setup.exe..." -ForegroundColor Yellow
& $dotnet publish (Join-Path $bootstrap "CloudConverter.Setup.csproj") `
  -c Release `
  -r win-x64 `
  -o $setupOut `
  --self-contained true `
  /p:PublishSingleFile=true `
  /p:IncludeNativeLibrariesForSelfExtract=true `
  /p:DebugType=None `
  /p:DebugSymbols=false

if ($LASTEXITCODE -ne 0) {
  Write-Host "Self-contained setup failed - trying framework-dependent..." -ForegroundColor Yellow
  & $dotnet publish (Join-Path $bootstrap "CloudConverter.Setup.csproj") `
    -c Release `
    -r win-x64 `
    -o $setupOut `
    --self-contained false `
    /p:PublishSingleFile=true `
    /p:DebugType=None
  if ($LASTEXITCODE -ne 0) { throw "Setup publish failed" }
}

$built = Join-Path $setupOut "CloudConverter-Setup.exe"
if (-not (Test-Path $built)) {
  $hit = Get-ChildItem $setupOut -Filter "CloudConverter-Setup*.exe" | Select-Object -First 1
  if ($hit) { $built = $hit.FullName }
}
if (-not (Test-Path $built)) { throw "Setup exe not produced in $setupOut" }

$final = Join-Path $installerDir $setupName
Copy-Item $built $final -Force

$portable = Join-Path $installerDir "CloudConverter-Portable-$version-win-x64.zip"
Copy-Item $payloadZip $portable -Force

Write-Host ""
Write-Host "Installer ready:" -ForegroundColor Green
Write-Host "  $final"
Write-Host ("  Size: {0:N2} MB" -f ((Get-Item $final).Length / 1MB))
Write-Host "Portable zip:"
Write-Host "  $portable"
Write-Host ""
Write-Host "Install: double-click Setup (or /S silent)"
Write-Host "Remove: Apps and features, or CloudConverter-Uninstall.exe /uninstall"
