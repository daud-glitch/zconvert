using System.IO;
using System.Text.Json;
using CloudConverter.Desktop.Models;

namespace CloudConverter.Desktop.Services;

public sealed class RecentDownloadsService
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly string _filePath;
    private readonly List<RecentDownloadItem> _items = new();

    public IReadOnlyList<RecentDownloadItem> Items => _items;

    public RecentDownloadsService()
    {
        var dir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "CloudConverter");
        Directory.CreateDirectory(dir);
        _filePath = Path.Combine(dir, "recent-downloads.json");
        Load();
    }

    public void Load()
    {
        _items.Clear();
        try
        {
            if (!File.Exists(_filePath)) return;
            var list = JsonSerializer.Deserialize<List<RecentDownloadItem>>(
                File.ReadAllText(_filePath), JsonOpts);
            if (list is null) return;
            _items.AddRange(list.OrderByDescending(x => x.At).Take(20));
        }
        catch
        {
            // empty
        }
    }

    public void Add(string fullPath)
    {
        if (string.IsNullOrWhiteSpace(fullPath)) return;
        _items.RemoveAll(x =>
            string.Equals(x.Path, fullPath, StringComparison.OrdinalIgnoreCase));
        _items.Insert(0, new RecentDownloadItem
        {
            Path = fullPath,
            Name = Path.GetFileName(fullPath),
            At = DateTime.UtcNow,
        });
        while (_items.Count > 20) _items.RemoveAt(_items.Count - 1);
        Save();
    }

    public void Clear()
    {
        _items.Clear();
        Save();
    }

    private void Save()
    {
        try
        {
            File.WriteAllText(_filePath, JsonSerializer.Serialize(_items, JsonOpts));
        }
        catch
        {
            // ignore
        }
    }
}
