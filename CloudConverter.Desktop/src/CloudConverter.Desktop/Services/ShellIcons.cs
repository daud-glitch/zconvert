using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Shapes;
using WpfColor = System.Windows.Media.Color;
using WpfOrientation = System.Windows.Controls.Orientation;
using HA = System.Windows.HorizontalAlignment;
using VA = System.Windows.VerticalAlignment;

namespace CloudConverter.Desktop.Services;

public static class ShellIcons
{
    public static UIElement Make(string kind, double size = 15)
    {
        var (stroke, fillA) = Palette(kind);
        return new Path
        {
            Data = Geometry.Parse(DataFor(kind)),
            Stretch = Stretch.Uniform,
            Width = size,
            Height = size,
            Stroke = new SolidColorBrush(stroke),
            StrokeThickness = Math.Max(1.15, size / 13),
            StrokeStartLineCap = PenLineCap.Round,
            StrokeEndLineCap = PenLineCap.Round,
            StrokeLineJoin = PenLineJoin.Round,
            Fill = new SolidColorBrush(WpfColor.FromArgb(fillA, stroke.R, stroke.G, stroke.B)),
            VerticalAlignment = VA.Center,
            HorizontalAlignment = HA.Center,
        };
    }

    public static FrameworkElement Row(string kind, string label, double iconSize = 15)
    {
        var (stroke, _) = Palette(kind);
        var bg = WpfColor.FromArgb(36, stroke.R, stroke.G, stroke.B);

        var sp = new StackPanel
        {
            Orientation = WpfOrientation.Horizontal,
            VerticalAlignment = VA.Center,
            HorizontalAlignment = HA.Left,
        };
        sp.Children.Add(new Border
        {
            Width = 28,
            Height = 28,
            MinWidth = 28,
            CornerRadius = new CornerRadius(8),
            Background = new SolidColorBrush(bg),
            Child = Make(kind, iconSize),
            Margin = new Thickness(0, 0, 10, 0),
            VerticalAlignment = VA.Center,
            HorizontalAlignment = HA.Left,
        });
        sp.Children.Add(new TextBlock
        {
            Text = label,
            FontSize = 12,
            FontWeight = FontWeights.SemiBold,
            VerticalAlignment = VA.Center,
            TextTrimming = TextTrimming.CharacterEllipsis,
            MaxWidth = 140,
        });
        return sp;
    }

    /// <summary>Distinct color per icon kind — bright accent stroke + soft fill.</summary>
    private static (WpfColor stroke, byte fillAlpha) Palette(string kind) => kind switch
    {
        "home" => (Rgb(16, 185, 129), 45),       // emerald
        "downloads" => (Rgb(59, 130, 246), 45),   // blue
        "star" => (Rgb(245, 158, 11), 50),        // amber
        "clock" => (Rgb(99, 102, 241), 45),       // indigo
        "user" => (Rgb(14, 165, 233), 45),         // sky
        "settings" => (Rgb(100, 116, 139), 40),   // slate
        "info" => (Rgb(6, 182, 212), 45),         // cyan
        "edit" => (Rgb(168, 85, 247), 45),        // purple
        "trash" => (Rgb(239, 68, 68), 40),        // red
        "bookmark" => (Rgb(236, 72, 153), 45),    // pink
        "history" => (Rgb(249, 115, 22), 45),     // orange
        "sun" => (Rgb(234, 179, 8), 50),          // yellow
        "moon" => (Rgb(129, 140, 248), 45),       // soft indigo
        "login" => (Rgb(16, 185, 129), 40),
        "file" => (Rgb(56, 189, 248), 40),
        "formats" => (Rgb(52, 211, 153), 40),
        "pdf" => (Rgb(248, 113, 113), 45),        // soft red
        "audio" => (Rgb(167, 139, 250), 45),      // violet
        "zip" => (Rgb(251, 146, 60), 45),
        "globe" => (Rgb(45, 212, 191), 40),       // teal
        "sync" => (Rgb(34, 197, 94), 45),         // green
        _ => (Rgb(16, 185, 129), 35),
    };

    private static WpfColor Rgb(byte r, byte g, byte b) => WpfColor.FromRgb(r, g, b);

    private static string DataFor(string kind) => kind switch
    {
        "home" => "M3,10.5 L12,3 L21,10.5 V20 A1,1 0 0 1 20,21 H14 V14 H10 V21 H4 A1,1 0 0 1 3,20 Z",
        "downloads" => "M12,3 V15 M7,11 L12,16 L17,11 M5,19 H19",
        "star" => "M12,2.5 L14.8,9 H22 L16.4,13.5 L18.6,20.5 L12,16 L5.4,20.5 L7.6,13.5 L2,9 H9.2 Z",
        "clock" => "M12,3 A9,9 0 1 1 11.99,3 M12,7 V12.5 L15.5,15",
        "user" => "M12,12 A4,4 0 1 0 11.99,12 M5,20 C5,16 8,14 12,14 C16,14 19,16 19,20",
        "settings" => "M12,8 A4,4 0 1 1 11.99,8 M3,12 H6 M18,12 H21 M12,3 V6 M12,18 V21",
        "info" => "M12,3 A9,9 0 1 1 11.99,3 M12,10 V17 M12,7 H12.01",
        "edit" => "M4,20 H20 M6,16 L16,6 L19,9 L9,19 L5,20 Z",
        "trash" => "M5,7 H19 M9,7 V5 H15 V7 M8,7 L8.5,19 H15.5 L16,7",
        "bookmark" => "M7,4 H17 V20 L12,16 L7,20 Z",
        "history" => "M4,12 A8,8 0 1 0 6,7 M4,4 V8 H8 M12,8 V13 L15,15",
        "sun" => "M12,7 A5,5 0 1 1 11.99,7 M12,2 V4 M12,20 V22 M4.2,4.2 L5.6,5.6 M18.4,18.4 L19.8,19.8 M2,12 H4 M20,12 H22",
        "moon" => "M16,3 A9,9 0 1 0 21,14 A7,7 0 0 1 16,3 Z",
        "login" => "M10,4 H5 V20 H10 M14,12 H3 M14,12 L10,8 M14,12 L10,16 M14,4 H19 V20 H14",
        "file" => "M7,3 H14 L18,7 V21 H7 Z M14,3 V7 H18",
        "formats" => "M5,5 H11 V11 H5 Z M13,5 H19 V11 H13 Z M5,13 H11 V19 H5 Z M13,13 H19 V19 H13 Z",
        "pdf" => "M6,3 H14 L18,7 V21 H6 Z M14,3 V7 H18",
        "audio" => "M9,14 V6 L18,4 V12 M6,16 A2.5,2.5 0 1 0 5.99,16 M15.5,14 A2.5,2.5 0 1 0 15.49,14",
        "zip" => "M6,4 H18 V20 H6 Z M10,4 V8 H14 V4",
        "globe" => "M12,3 A9,9 0 1 1 11.99,3 M3,12 H21",
        "sync" => "M4,12 A8,8 0 0 1 16,6 L14,8 M20,12 A8,8 0 0 1 8,18 L10,16 M16,6 V10 H12 M8,18 V14 H12",
        _ => "M4,4 H20 V20 H4 Z",
    };
}
