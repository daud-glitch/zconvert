using System.Windows;

namespace CloudConverter.Desktop.Services;

public static class ThemeService
{
    public const string Light = "light";
    public const string Dark = "dark";

    public static string Current { get; private set; } = Light;

    public static void Apply(string? theme)
    {
        var name = Normalize(theme);
        Current = name;

        var app = System.Windows.Application.Current;
        if (app?.Resources.MergedDictionaries is null) return;

        var uri = new Uri(
            name == Dark
                ? "Themes/Dark.xaml"
                : "Themes/Light.xaml",
            UriKind.Relative);

        try
        {
            var themeDict = new ResourceDictionary { Source = uri };

            // Replace existing Light/Dark dictionary (first merge), keep Shell.xaml
            ResourceDictionary? oldTheme = null;
            foreach (var d in app.Resources.MergedDictionaries)
            {
                var src = d.Source?.OriginalString ?? "";
                if (src.Contains("Light.xaml", StringComparison.OrdinalIgnoreCase)
                    || src.Contains("Dark.xaml", StringComparison.OrdinalIgnoreCase))
                {
                    oldTheme = d;
                    break;
                }
            }

            if (oldTheme is not null)
            {
                var index = app.Resources.MergedDictionaries.IndexOf(oldTheme);
                app.Resources.MergedDictionaries.RemoveAt(index);
                app.Resources.MergedDictionaries.Insert(index, themeDict);
            }
            else
            {
                app.Resources.MergedDictionaries.Insert(0, themeDict);
            }
        }
        catch
        {
            // keep current dictionary
        }
    }

    public static string Normalize(string? theme)
    {
        if (string.Equals(theme, Dark, StringComparison.OrdinalIgnoreCase))
            return Dark;
        return Light;
    }

    public static System.Drawing.Color WebViewBackground(string? theme)
    {
        return Normalize(theme) == Dark
            ? System.Drawing.Color.FromArgb(255, 0x0B, 0x0F, 0x14)
            : System.Drawing.Color.FromArgb(255, 0xF5, 0xF7, 0xFA);
    }
}
