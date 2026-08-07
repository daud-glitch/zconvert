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
            Branding.AppDataFolderName);
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
                ApplyDomainDefaults(forceSave: true);
                return;
            }

            var json = File.ReadAllText(_filePath);
            Current = JsonSerializer.Deserialize<AppSettings>(json, JsonOptions) ?? new AppSettings();
            ApplyDomainDefaults(forceSave: false);
        }
        catch
        {
            Current = new AppSettings();
            ApplyDomainDefaults(forceSave: true);
        }
    }

    public void Save()
    {
        try
        {
            EnsureDownloadFolder();
            var site = Current.SiteUrl;
            Branding.EnsureCanonicalSiteUrl(ref site);
            Current.SiteUrl = site!;
            Current.UpdateManifestUrl = UpdateCheckService.DefaultManifestUrl;
            var json = JsonSerializer.Serialize(Current, JsonOptions);
            File.WriteAllText(_filePath, json);
            ApplyWindowsStartup(Current.LaunchOnWindowsStartup);
        }
        catch
        {
            // keep running with in-memory settings
        }
    }

    /// <summary>Lock desktop shell to official www.convertek.tech after domain rebrand.</summary>
    private void ApplyDomainDefaults(bool forceSave)
    {
        var changed = false;

        var site = Current.SiteUrl;
        if (Branding.EnsureCanonicalSiteUrl(ref site))
        {
            Current.SiteUrl = site!;
            changed = true;
        }

        if (string.IsNullOrWhiteSpace(Current.UpdateManifestUrl) ||
            !Current.UpdateManifestUrl.Contains("convertek.tech", StringComparison.OrdinalIgnoreCase))
        {
            Current.UpdateManifestUrl = UpdateCheckService.DefaultManifestUrl;
            changed = true;
        }

        // Migrate old default download folder name CloudConverter → Convertek
        if (!string.IsNullOrWhiteSpace(Current.DownloadFolder)
            && (Current.DownloadFolder.EndsWith(
                    Path.DirectorySeparatorChar + "CloudConverter",
                    StringComparison.OrdinalIgnoreCase)
                || Current.DownloadFolder.EndsWith(
                    Path.AltDirectorySeparatorChar + "CloudConverter",
                    StringComparison.OrdinalIgnoreCase)))
        {
            var parent = Path.GetDirectoryName(Current.DownloadFolder);
            if (!string.IsNullOrEmpty(parent))
            {
                Current.DownloadFolder = Path.Combine(parent, Branding.DefaultDownloadsFolderName);
                changed = true;
            }
        }

        EnsureDownloadFolder();

        if (forceSave || changed)
            Save();
    }

    private void EnsureDownloadFolder()
    {
        if (string.IsNullOrWhiteSpace(Current.DownloadFolder))
        {
            Current.DownloadFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Downloads",
                Branding.DefaultDownloadsFolderName);
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

            // Prefer Convertek key; clean legacy name when writing
            const string valueName = "Convertek";
            const string legacyName = "CloudConverter";
            if (enable)
            {
                var exe = Environment.ProcessPath;
                if (!string.IsNullOrEmpty(exe))
                {
                    key.SetValue(valueName, $"\"{exe}\"");
                    key.DeleteValue(legacyName, throwOnMissingValue: false);
                }
            }
            else
            {
                if (key.GetValue(valueName) is not null)
                    key.DeleteValue(valueName, throwOnMissingValue: false);
                if (key.GetValue(legacyName) is not null)
                    key.DeleteValue(legacyName, throwOnMissingValue: false);
            }
        }
        catch
        {
            // non-critical
        }
    }
}
