using System.IO;
using System.Text.Json;
using CloudConverter.Desktop.Models;
using Microsoft.Win32;

namespace CloudConverter.Desktop.Services;

public sealed class SettingsService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly string _filePath;

    public AppSettings Current { get; private set; } = new();

    public SettingsService()
    {
        var dir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "CloudConverter");
        Directory.CreateDirectory(dir);
        _filePath = Path.Combine(dir, "settings.json");
        Load();
    }

    public void Load()
    {
        try
        {
            if (!File.Exists(_filePath))
            {
                Current = new AppSettings();
                EnsureDownloadFolder();
                Save();
                return;
            }

            var json = File.ReadAllText(_filePath);
            Current = JsonSerializer.Deserialize<AppSettings>(json, JsonOptions) ?? new AppSettings();
            EnsureDownloadFolder();
        }
        catch
        {
            Current = new AppSettings();
            EnsureDownloadFolder();
        }
    }

    public void Save()
    {
        try
        {
            EnsureDownloadFolder();
            var json = JsonSerializer.Serialize(Current, JsonOptions);
            File.WriteAllText(_filePath, json);
            ApplyWindowsStartup(Current.LaunchOnWindowsStartup);
        }
        catch
        {
            // keep running with in-memory settings
        }
    }

    private void EnsureDownloadFolder()
    {
        if (string.IsNullOrWhiteSpace(Current.DownloadFolder))
        {
            Current.DownloadFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Downloads",
                "CloudConverter");
        }

        try
        {
            Directory.CreateDirectory(Current.DownloadFolder);
        }
        catch
        {
            // ignore
        }
    }

    private static void ApplyWindowsStartup(bool enable)
    {
        try
        {
            const string keyPath = @"Software\Microsoft\Windows\CurrentVersion\Run";
            using var key = Registry.CurrentUser.OpenSubKey(keyPath, writable: true);
            if (key is null) return;

            const string valueName = "CloudConverter";
            if (enable)
            {
                var exe = Environment.ProcessPath;
                if (!string.IsNullOrEmpty(exe))
                    key.SetValue(valueName, $"\"{exe}\"");
            }
            else if (key.GetValue(valueName) is not null)
            {
                key.DeleteValue(valueName, throwOnMissingValue: false);
            }
        }
        catch
        {
            // non-critical
        }
    }
}
