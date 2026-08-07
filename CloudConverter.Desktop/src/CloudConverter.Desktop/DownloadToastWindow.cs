using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Effects;
using WpfButton = System.Windows.Controls.Button;
using WpfBrushes = System.Windows.Media.Brushes;
using WpfColor = System.Windows.Media.Color;
using WpfCursors = System.Windows.Input.Cursors;
using WpfOrientation = System.Windows.Controls.Orientation;
using WpfSize = System.Windows.Size;

namespace CloudConverter.Desktop;

/// <summary>
/// Separate topmost window so the toast stays above WebView2 (airspace).
/// </summary>
public sealed class DownloadToastWindow : Window
{
    public DownloadToastWindow(string path, Action openFolder, Action openFile)
    {
        Title = "Download complete";
        WindowStyle = WindowStyle.None;
        AllowsTransparency = true;
        Background = WpfBrushes.Transparent;
        ShowInTaskbar = false;
        ResizeMode = ResizeMode.NoResize;
        SizeToContent = SizeToContent.WidthAndHeight;
        Topmost = true;
        ShowActivated = false;

        var card = new Border
        {
            Background = new SolidColorBrush(WpfColor.FromRgb(0x1A, 0x22, 0x30)),
            BorderBrush = new SolidColorBrush(WpfColor.FromRgb(0x10, 0xB9, 0x81)),
            BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(14),
            Padding = new Thickness(18, 16, 18, 16),
            MaxWidth = 440,
            Effect = new DropShadowEffect
            {
                BlurRadius = 28,
                ShadowDepth = 6,
                Opacity = 0.55,
                Color = Colors.Black,
            },
        };

        var stack = new StackPanel();
        stack.Children.Add(new TextBlock
        {
            Text = "File downloaded",
            FontWeight = FontWeights.SemiBold,
            FontSize = 15,
            Foreground = new SolidColorBrush(WpfColor.FromRgb(0xF3, 0xF6, 0xFA)),
            Margin = new Thickness(0, 0, 0, 6),
        });

        stack.Children.Add(new TextBlock
        {
            Text = path,
            FontSize = 12,
            Foreground = new SolidColorBrush(WpfColor.FromRgb(0x93, 0xA0, 0xB4)),
            TextWrapping = TextWrapping.Wrap,
            Margin = new Thickness(0, 0, 0, 14),
        });

        var buttons = new StackPanel
        {
            Orientation = WpfOrientation.Horizontal,
            HorizontalAlignment = System.Windows.HorizontalAlignment.Right,
        };

        buttons.Children.Add(MakeButton("Open folder", false, () =>
        {
            openFolder();
            Close();
        }));
        buttons.Children.Add(MakeButton("Open file", true, () =>
        {
            openFile();
            Close();
        }));
        buttons.Children.Add(MakeButton("OK", false, Close));
        stack.Children.Add(buttons);

        card.Child = stack;
        Content = card;

        MouseLeftButtonDown += (_, e) =>
        {
            if (e.ButtonState == MouseButtonState.Pressed)
            {
                try { DragMove(); } catch { /* ignore */ }
            }
        };
    }

    private static WpfButton MakeButton(string label, bool primary, Action click)
    {
        var btn = new WpfButton
        {
            Content = label,
            Padding = new Thickness(12, 8, 12, 8),
            Margin = new Thickness(8, 0, 0, 0),
            Cursor = WpfCursors.Hand,
            BorderThickness = new Thickness(0),
            FontWeight = FontWeights.SemiBold,
            Foreground = primary
                ? new SolidColorBrush(WpfColor.FromRgb(0x04, 0x12, 0x0C))
                : new SolidColorBrush(WpfColor.FromRgb(0xF3, 0xF6, 0xFA)),
            Background = primary
                ? new SolidColorBrush(WpfColor.FromRgb(0x10, 0xB9, 0x81))
                : new SolidColorBrush(WpfColor.FromRgb(0x12, 0x18, 0x20)),
        };

        var template = new ControlTemplate(typeof(WpfButton));
        var borderFactory = new FrameworkElementFactory(typeof(Border));
        borderFactory.SetValue(Border.BackgroundProperty, new TemplateBindingExtension(BackgroundProperty));
        borderFactory.SetValue(Border.CornerRadiusProperty, new CornerRadius(10));
        borderFactory.SetValue(Border.PaddingProperty, new TemplateBindingExtension(PaddingProperty));
        var content = new FrameworkElementFactory(typeof(ContentPresenter));
        content.SetValue(ContentPresenter.HorizontalAlignmentProperty, System.Windows.HorizontalAlignment.Center);
        content.SetValue(ContentPresenter.VerticalAlignmentProperty, System.Windows.VerticalAlignment.Center);
        borderFactory.AppendChild(content);
        template.VisualTree = borderFactory;
        btn.Template = template;

        btn.Click += (_, _) => click();
        return btn;
    }

    public void PlaceNear(Window owner)
    {
        Owner = owner;
        Measure(new WpfSize(double.PositiveInfinity, double.PositiveInfinity));
        var w = DesiredSize.Width > 0 ? DesiredSize.Width : 400;
        var h = DesiredSize.Height > 0 ? DesiredSize.Height : 140;

        double left;
        double top;
        if (owner.WindowState == WindowState.Maximized)
        {
            var work = SystemParameters.WorkArea;
            left = work.Right - w - 28;
            top = work.Bottom - h - 28;
        }
        else
        {
            left = owner.Left + owner.ActualWidth - w - 28;
            top = owner.Top + owner.ActualHeight - h - 48;
        }

        Left = Math.Max(0, left);
        Top = Math.Max(0, top);
    }
}
