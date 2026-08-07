#Requires -Version 5.1
<#
.SYNOPSIS
  Publish Convertek Desktop (Release, win-x64).
#>
param(
  [ValidateSet("framework", "self-contained")]
  [string]$Mode = "framework"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "src\CloudConverter.Desktop\CloudConverter.Desktop.csproj"))) {
  $root = $PSScriptRoot
  if (-not (Test-Path (Join-Path $root "src\CloudConverter.Desktop\CloudConverter.Desktop.csproj"))) {
    throw "Cannot find project root from $PSScriptRoot"
  }
}
$proj = Join-Path $root "src\CloudConverter.Desktop\CloudConverter.Desktop.csproj"
$out  = Join-Path $root "dist\CloudConverter"

# Prefer modern SDK if PATH is stuck on 2.x / 3.x
$dotnet = "dotnet"
$candidates = @(
  (Join-Path $env:USERPROFILE ".dotnet\dotnet.exe"),
  "C:\Program Files\dotnet\dotnet.exe",
  "C:\Program Files (x86)\dotnet\dotnet.exe"
)
foreach ($c in $candidates) {
  if (-not (Test-Path $c)) { continue }
  $ver = & $c --version 2>$null
  if ($ver -and [version]$ver -ge [version]"6.0.0") {
    $dotnet = $c
    break
  }
}

Write-Host "Using: $dotnet" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $out | Out-Null

$args = @(
  "publish", $proj,
  "-c", "Release",
  "-r", "win-x64",
  "-o", $out,
  "/p:PublishSingleFile=true",
  "/p:IncludeNativeLibrariesForSelfExtract=true",
  "/p:DebugType=None",
  "/p:DebugSymbols=false"
)

if ($Mode -eq "self-contained") {
  $args += @("--self-contained", "true", "/p:PublishTrimmed=false")
} else {
  $args += @("--self-contained", "false")
}

& $dotnet @args
if ($LASTEXITCODE -ne 0) { throw "publish failed" }

# Ensure icon beside exe
$assetsSrc = Join-Path $root "src\CloudConverter.Desktop\Assets"
$assetsDst = Join-Path $out "Assets"
New-Item -ItemType Directory -Force -Path $assetsDst | Out-Null
Copy-Item (Join-Path $assetsSrc "*") $assetsDst -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Published → $out" -ForegroundColor Green
Write-Host "Run: $out\CloudConverter.exe"
Write-Host "Install shortcuts: .\scripts\install-user.ps1"
