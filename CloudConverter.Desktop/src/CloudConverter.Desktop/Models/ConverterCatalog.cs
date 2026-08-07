namespace CloudConverter.Desktop.Models;

public sealed class ConverterTool
{
    public ConverterTool(string id, string title, string path, string shortLabel)
    {
        Id = id;
        Title = title;
        Path = path;
        ShortLabel = shortLabel;
    }

    public string Id { get; }
    public string Title { get; }
    /// <summary>Site-relative path, e.g. /conversions/png</summary>
    public string Path { get; }
    public string ShortLabel { get; }
}

public static class ConverterCatalog
{
    public static IReadOnlyList<ConverterTool> All { get; } = new List<ConverterTool>
    {
        new("converter", "Converter", "/", "CV"),
        new("formats", "All formats", "/conversions", "FM"),
        new("png", "PNG convert", "/conversions/png", "PG"),
        new("jpg", "JPG convert", "/conversions/jpg", "JG"),
        new("webp", "WebP convert", "/conversions/webp", "WP"),
        new("pdf", "PDF tools", "/conversions/pdf", "PD"),
        new("mp3", "MP3 audio", "/conversions/mp3", "MP"),
        new("wav", "WAV audio", "/conversions/wav", "WV"),
        new("zip", "ZIP archive", "/conversions/zip", "ZP"),
        new("docx", "DOCX docs", "/conversions/docx", "DX"),
        new("contact", "Contact", "/contact", "CT"),
    };

    public static ConverterTool? Find(string id) =>
        All.FirstOrDefault(t => string.Equals(t.Id, id, StringComparison.OrdinalIgnoreCase));
}

public sealed class RecentDownloadItem
{
    public string Path { get; set; } = "";
    public string Name { get; set; } = "";
    public DateTime At { get; set; } = DateTime.UtcNow;
}
