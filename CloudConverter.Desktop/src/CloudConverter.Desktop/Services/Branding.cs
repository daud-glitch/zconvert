using System.IO;
using System.Windows.Media.Imaging;
using Drawing = System.Drawing;

namespace CloudConverter.Desktop.Services;

public static class Branding
{
    public const string AppName = "Convertek";

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
        // Prefer PNG for WPF Image control
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

    private static IEnumerable<string> IconPaths()
    {
        var baseDir = AppContext.BaseDirectory;
        yield return Path.Combine(baseDir, "Assets", "app.ico");
        yield return Path.Combine(baseDir, "app.ico");
    }
}
