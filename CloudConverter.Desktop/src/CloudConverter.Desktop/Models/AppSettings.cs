using System.IO;
using System.Text.Json.Serialization;
using CloudConverter.Desktop.Services;

namespace CloudConverter.Desktop.Models;

public sealed class AppSettings
{
    public const string DefaultSiteUrl = Branding.CanonicalSiteUrl;

    public string SiteUrl { get; set; } = DefaultSiteUrl;
    public string StartPath { get; set; } = "/";

    public string DownloadFolder { get; set; } =
        Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            "Downloads",
            Branding.DefaultDownloadsFolderName);

    public bool StartMaximized { get; set; } = true;
    public bool RememberWindow { get; set; } = true;
    public double WindowWidth { get; set; } = 1280;
    public double WindowHeight { get; set; } = 820;
    public double WindowLeft { get; set; } = double.NaN;
    public double WindowTop { get; set; } = double.NaN;
    public bool MinimizeToTray { get; set; } = true;
    public bool LaunchOnWindowsStartup { get; set; }
    public string ShellTheme { get; set; } = "light";
    public bool CheckUpdatesOnStart { get; set; } = true;
    public string UpdateManifestUrl { get; set; } = UpdateCheckService.DefaultManifestUrl;

    /// <summary>Pinned converter tool ids from ConverterCatalog.</summary>
    public List<string> FavoriteToolIds { get; set; } = new()
    {
        "converter", "formats", "png", "pdf", "mp3", "zip",
    };

    [JsonIgnore]
    public string HomeUrl
    {
        get
        {
            var baseUrl = (SiteUrl ?? DefaultSiteUrl).TrimEnd('/');
            var path = string.IsNullOrWhiteSpace(StartPath) ? "/" : StartPath.Trim();
            if (!path.StartsWith('/')) path = "/" + path;
            return baseUrl + path;
        }
    }

    public string AbsoluteUrl(string relativePath)
    {
        var baseUrl = (SiteUrl ?? DefaultSiteUrl).TrimEnd('/');
        if (string.IsNullOrWhiteSpace(relativePath)) return baseUrl + "/";
        if (relativePath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            return relativePath;
        if (!relativePath.StartsWith('/')) relativePath = "/" + relativePath;
        return baseUrl + relativePath;
    }
}
