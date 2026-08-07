using Microsoft.Win32;

namespace CloudConverter.Desktop.Services;

/// <summary>
/// User-level "Open with Convertek" shell command + common file associations.
/// </summary>
public static class ShellIntegrationService
{
    private const string AppProgId = "CloudConverter.Desktop.1";
    private const string MenuName = "Open with Convertek";

    private static readonly string[] Extensions =
    {
        ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg", ".tiff",
        ".pdf", ".docx", ".doc", ".txt", ".csv",
        ".mp3", ".wav", ".ogg", ".flac", ".m4a",
        ".mp4", ".mkv", ".webm",
        ".zip", ".rar", ".7z", ".tar", ".gz",
    };

    public static void Register(string exePath)
    {
        if (string.IsNullOrWhiteSpace(exePath) || !System.IO.File.Exists(exePath))
            return;

        try
        {
            var cmd = $"\"{exePath}\" \"%1\"";
            var icon = exePath;

            // ProgID
            using (var prog = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{AppProgId}"))
            {
                prog?.SetValue("", "Convertek file");
                prog?.CreateSubKey("DefaultIcon")?.SetValue("", $"\"{icon}\",0");
                prog?.CreateSubKey(@"shell\open\command")?.SetValue("", cmd);
            }

            // All-files context menu
            using (var all = Registry.CurrentUser.CreateSubKey(@"Software\Classes\*\shell\CloudConverterOpen"))
            {
                all?.SetValue("", MenuName);
                all?.SetValue("Icon", $"\"{icon}\",0");
                all?.CreateSubKey("command")?.SetValue("", cmd);
            }

            foreach (var ext in Extensions)
            {
                using var key = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{ext}\OpenWithProgids");
                key?.SetValue(AppProgId, new byte[0], RegistryValueKind.None);
            }

            // App Paths
            using var appPaths = Registry.CurrentUser.CreateSubKey(
                $@"Software\Microsoft\Windows\CurrentVersion\App Paths\CloudConverter.exe");
            appPaths?.SetValue("", exePath);
            appPaths?.SetValue("Path", System.IO.Path.GetDirectoryName(exePath) ?? "");
        }
        catch
        {
            // non-critical
        }
    }

    public static void Unregister()
    {
        try
        {
            Registry.CurrentUser.DeleteSubKeyTree($@"Software\Classes\{AppProgId}", throwOnMissingSubKey: false);
            Registry.CurrentUser.DeleteSubKeyTree(@"Software\Classes\*\shell\CloudConverterOpen", throwOnMissingSubKey: false);
            foreach (var ext in Extensions)
            {
                using var key = Registry.CurrentUser.OpenSubKey(
                    $@"Software\Classes\{ext}\OpenWithProgids", writable: true);
                key?.DeleteValue(AppProgId, throwOnMissingValue: false);
            }
            Registry.CurrentUser.DeleteSubKeyTree(
                @"Software\Microsoft\Windows\CurrentVersion\App Paths\CloudConverter.exe",
                throwOnMissingSubKey: false);
        }
        catch
        {
            // ignore
        }
    }
}
