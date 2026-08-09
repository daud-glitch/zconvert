using System.Reflection;

namespace CloudConverter.Desktop.Services;

public static class AppVersion
{
    public static string Current
    {
        get
        {
            var v = Assembly.GetExecutingAssembly().GetName().Version;
            return v is null ? "1.3.0" : $"{v.Major}.{v.Minor}.{v.Build}";
        }
    }
}
