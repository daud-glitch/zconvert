using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CloudConverter.Desktop.Services;

public sealed class UpdateInfo
{
    [JsonPropertyName("version")]
    public string Version { get; set; } = "";

    [JsonPropertyName("url")]
    public string Url { get; set; } = "https://www.convertek.tech";

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
}

public static class UpdateCheckService
{
    public const string DefaultManifestUrl =
        "https://www.convertek.tech/desktop/version.json";

    private static readonly HttpClient Http = new()
    {
        Timeout = TimeSpan.FromSeconds(8),
    };

    public static async Task<UpdateInfo?> CheckAsync(string? manifestUrl = null)
    {
        try
        {
            var url = string.IsNullOrWhiteSpace(manifestUrl)
                ? DefaultManifestUrl
                : manifestUrl;
            var json = await Http.GetStringAsync(url).ConfigureAwait(false);
            var info = JsonSerializer.Deserialize<UpdateInfo>(json);
            if (info is null || string.IsNullOrWhiteSpace(info.Version))
                return null;
            return info;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>True if remote is newer than local (simple dotted numeric compare).</summary>
    public static bool IsNewer(string remote, string local)
    {
        try
        {
            var r = Parse(remote);
            var l = Parse(local);
            for (var i = 0; i < 3; i++)
            {
                if (r[i] > l[i]) return true;
                if (r[i] < l[i]) return false;
            }
            return false;
        }
        catch
        {
            return !string.Equals(remote?.Trim(), local?.Trim(), StringComparison.OrdinalIgnoreCase);
        }
    }

    private static int[] Parse(string v)
    {
        var parts = (v ?? "0").Trim().TrimStart('v', 'V').Split('.');
        var n = new int[3];
        for (var i = 0; i < 3 && i < parts.Length; i++)
            int.TryParse(parts[i], out n[i]);
        return n;
    }
}
