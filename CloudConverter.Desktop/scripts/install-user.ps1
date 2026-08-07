#Requires -Version 5.1
param([switch]$NoDesktopShortcut)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "scripts\publish.ps1"))) {
  $root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
}
$src = Join-Path $root "dist\CloudConverter"
if (-not (Test-Path (Join-Path $src "CloudConverter.exe"))) {
  Write-Host "No publish output found. Running publish first..." -ForegroundColor Yellow
  & (Join-Path $root "scripts\publish.ps1")
}

$dest = Join-Path $env:LOCALAPPDATA "Programs\CloudConverter"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item -Path (Join-Path $src "*") -Destination $dest -Recurse -Force

$exe = Join-Path $dest "CloudConverter.exe"
$icon = Join-Path $dest "Assets\app.ico"
if (-not (Test-Path $icon)) { $icon = $exe }

$shell = New-Object -ComObject WScript.Shell
$startMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Convertek.lnk"
$sc = $shell.CreateShortcut($startMenu)
$sc.TargetPath = $exe
$sc.WorkingDirectory = $dest
$sc.IconLocation = "$icon,0"
$sc.Description = "Convertek Desktop"
$sc.Save()

if (-not $NoDesktopShortcut) {
  $desktop = Join-Path ([Environment]::GetFolderPath("Desktop")) "Convertek.lnk"
  $sc2 = $shell.CreateShortcut($desktop)
  $sc2.TargetPath = $exe
  $sc2.WorkingDirectory = $dest
  $sc2.IconLocation = "$icon,0"
  $sc2.Description = "Convertek Desktop"
  $sc2.Save()
}

# Open with / context menu (HKCU)
$progId = "CloudConverter.Desktop.1"
$cmd = "`"$exe`" `"%1`""
New-Item -Path "HKCU:\Software\Classes\$progId" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\$progId" -Name "(default)" -Value "Convertek file"
New-Item -Path "HKCU:\Software\Classes\$progId\DefaultIcon" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\$progId\DefaultIcon" -Name "(default)" -Value "`"$icon`",0"
New-Item -Path "HKCU:\Software\Classes\$progId\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\$progId\shell\open\command" -Name "(default)" -Value $cmd
New-Item -Path "HKCU:\Software\Classes\*\shell\CloudConverterOpen" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\*\shell\CloudConverterOpen" -Name "(default)" -Value "Open with Convertek"
Set-ItemProperty -Path "HKCU:\Software\Classes\*\shell\CloudConverterOpen" -Name "Icon" -Value "`"$icon`",0"
New-Item -Path "HKCU:\Software\Classes\*\shell\CloudConverterOpen\command" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\*\shell\CloudConverterOpen\command" -Name "(default)" -Value $cmd
$exts = @(".png",".jpg",".jpeg",".webp",".gif",".pdf",".docx",".mp3",".wav",".zip",".mp4")
foreach ($ext in $exts) {
  $p = "HKCU:\Software\Classes\$ext\OpenWithProgids"
  New-Item -Path $p -Force | Out-Null
  New-ItemProperty -Path $p -Name $progId -PropertyType None -Value ([byte[]]@()) -Force | Out-Null
}

$uninst = @"
`$dest = Join-Path `$env:LOCALAPPDATA 'Programs\CloudConverter'
`$start = Join-Path `$env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Convertek.lnk'
`$desk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Convertek.lnk'
Remove-Item `$start -Force -ErrorAction SilentlyContinue
Remove-Item `$desk -Force -ErrorAction SilentlyContinue
Remove-Item 'HKCU:\Software\Classes\CloudConverter.Desktop.1' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item 'HKCU:\Software\Classes\*\shell\CloudConverterOpen' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item `$dest -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'Convertek removed.'
"@
Set-Content -Path (Join-Path $dest "uninstall.ps1") -Value $uninst -Encoding UTF8

Write-Host ""
Write-Host "Installed → $dest" -ForegroundColor Green
Write-Host "Start Menu + Open with Convertek registered"
if (-not $NoDesktopShortcut) { Write-Host "Desktop shortcut created." }
Write-Host "Uninstall: $dest\uninstall.ps1"
