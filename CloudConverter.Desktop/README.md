# Convertek Desktop

Windows desktop shell for **[convertek.tech](https://www.convertek.tech)**.

Looks and feels like installed software (branded icon, custom chrome, tray, settings).  
The product UI loads **from the live website** via **WebView2**. Internet required.

## Requirements

- Windows 10/11
- [.NET 8 Desktop Runtime](https://dotnet.microsoft.com/download) (framework-dependent publish only; Setup.exe is self-contained)
- [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (usually with Edge)

## Quick install (this PC)

### Setup.exe (recommended)

```powershell
cd CloudConverter.Desktop
powershell -ExecutionPolicy Bypass -File .\scripts\build-installer.ps1
```

Output: `dist\installer\CloudConverter-Setup-1.1.0.exe`

- Double-click to install (or run with `/S` for silent)
- Installs to `%LocalAppData%\Programs\CloudConverter`
- Start Menu + Desktop shortcuts
- Uninstall from Apps & features

### Manual publish + user install

```powershell
cd CloudConverter.Desktop
powershell -ExecutionPolicy Bypass -File .\scripts\publish.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\install-user.ps1
```

Installs to `%LocalAppData%\Programs\CloudConverter`, Start Menu + Desktop shortcuts.

Self-contained (no separate .NET runtime on target):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publish.ps1 -Mode self-contained
powershell -ExecutionPolicy Bypass -File .\scripts\install-user.ps1
```

Uninstall: run `uninstall.ps1` in the install folder, or Apps & features.

## Dev build

```powershell
dotnet build src\CloudConverter.Desktop -c Release
dotnet run --project src\CloudConverter.Desktop -c Release
```

## Optional Inno Setup

If [Inno Setup 6+](https://jrsoftware.org/isinfo.php) is installed:

1. Publish self-contained: `.\scripts\publish.ps1 -Mode self-contained`
2. Compile `installer\CloudConverter.iss` with ISCC

## Features

| Feature | Notes |
|--------|--------|
| Branded icon + tray | Emerald “C” asset |
| Pro dark shell | Side rail + caption chrome |
| Live site inside app | WebView2 |
| Settings | Start URL/path, downloads, window, tray, startup |
| User install script | Shortcuts + uninstall |

Settings: `%AppData%\CloudConverter\settings.json`  
WebView profile: `%LocalAppData%\CloudConverter\WebView2`

## Architecture

```
CloudConverter.exe  →  WebView2  →  https://www.convertek.tech
```
