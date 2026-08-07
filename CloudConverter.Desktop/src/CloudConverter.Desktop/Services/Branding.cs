using System.IO;
using System.Windows.Media.Imaging;
using Drawing = System.Drawing;

namespace CloudConverter.Desktop.Services;

public static class Branding
{
    public const string AppName = "Convertek";
    public const string CanonicalHost = "www.convertek.tech";
    public const string CanonicalSiteUrl = "https://www.convertek.tech";
    public const string SupportEmail = "support@convertek.tech";
    public const string DownloadBrandPrefix = "convertek.tech";
    /// <summary>Windows AppData / LocalAppData product folder (stable for upgrades).</summary>
    public const string AppDataFolderName = "CloudConverter";
    public const string DefaultDownloadsFolderName = "Convertek";

    public static Drawing.Icon LoadAppIcon()
    {
        try
        {
            foreach (var path in IconPaths())
            {
                if (File.Exists(path))
                    return new Drawing.Icon(path);
            }
        }
        catch
        {
            // fall through
        }

        return (Drawing.Icon)Drawing.SystemIcons.Application.Clone();
    }

    public static BitmapImage? LoadAppIconBitmap()
    {
        foreach (var name in new[] { "app.png", "app.ico" })
        {
            try
            {
                var path = Path.Combine(AppContext.BaseDirectory, "Assets", name);
                if (!File.Exists(path)) continue;
                var bi = new BitmapImage();
                bi.BeginInit();
                bi.UriSource = new Uri(path, UriKind.Absolute);
                bi.CacheOption = BitmapCacheOption.OnLoad;
                bi.EndInit();
                bi.Freeze();
                return bi;
            }
            catch
            {
                // try next
            }
        }

        return null;
    }

    /// <summary>
    /// Rewrite legacy product domains to https://www.convertek.tech.
    /// Returns true if the URL was changed. Leaves localhost / *.local alone for dev.
    /// </summary>
    public static bool EnsureCanonicalSiteUrl(ref string? siteUrl)
    {
        var raw = (siteUrl ?? "").Trim();
        if (string.IsNullOrEmpty(raw)
            || !Uri.TryCreate(raw, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            siteUrl = CanonicalSiteUrl;
            return true;
        }

        var host = uri.Host.Trim().ToLowerInvariant();

        // Dev overrides
        if (host is "localhost" or "127.0.0.1" or "[::1]"
            || host.EndsWith(".local", StringComparison.Ordinal)
            || host.EndsWith(".localhost", StringComparison.Ordinal))
        {
            return false;
        }

        // Already correct
        if (host.Equals(CanonicalHost, StringComparison.OrdinalIgnoreCase)
            && uri.Scheme == Uri.UriSchemeHttps)
        {
            // Normalize trailing junk / force exact origin
            var normalized = CanonicalSiteUrl;
            if (!string.Equals(raw.TrimEnd('/'), normalized, StringComparison.OrdinalIgnoreCase))
            {
                siteUrl = normalized;
                return true;
            }
            return false;
        }

        // Apex, legacy domains, heroku → official www
        siteUrl = CanonicalSiteUrl;
        return true;
    }

    private static IEnumerable<string> IconPaths()
    {
        var baseDir = AppContext.BaseDirectory;
        yield return Path.Combine(baseDir, "Assets", "app.ico");
        yield return Path.Combine(baseDir, "app.ico");
    }
}
