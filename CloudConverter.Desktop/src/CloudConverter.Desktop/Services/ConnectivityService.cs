using System.Net.NetworkInformation;

namespace CloudConverter.Desktop.Services;

public static class ConnectivityService
{
    public static bool IsOnline()
    {
        try
        {
            return NetworkInterface.GetIsNetworkAvailable();
        }
        catch
        {
            return true; // optimistically allow WebView to try
        }
    }
}
