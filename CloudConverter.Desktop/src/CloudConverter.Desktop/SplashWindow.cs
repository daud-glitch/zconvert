using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Shapes;
using CloudConverter.Desktop.Services;
using WpfBrushes = System.Windows.Media.Brushes;
using WpfColor = System.Windows.Media.Color;
using HA = System.Windows.HorizontalAlignment;
using VA = System.Windows.VerticalAlignment;

namespace CloudConverter.Desktop;

public sealed class SplashWindow : Window
{
    public SplashWindow(string? theme = null)
    {
        var isDark = ThemeService.Normalize(theme) == ThemeService.Dark;

        Title = Branding.AppName;
        Width = 480;
        Height = 340;
        WindowStyle = WindowStyle.None;
        ResizeMode = ResizeMode.NoResize;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        ShowInTaskbar = false;
        Topmost = true;
        AllowsTransparency = true;
        Background = WpfBrushes.Transparent;

        var deep = isDark ? WpfColor.FromRgb(0x0B, 0x0F, 0x14) : WpfColor.FromRgb(0xF5, 0xF7, 0xFA);
        var mid = isDark ? WpfColor.FromRgb(0x12, 0x1A, 0x24) : WpfColor.FromRgb(0xFF, 0xFF, 0xFF);
        var soft = isDark ? WpfColor.FromRgb(0x0D, 0x1F, 0x1A) : WpfColor.FromRgb(0xEC, 0xFD, 0xF5);
        var text = isDark ? WpfColor.FromRgb(0xF3, 0xF6, 0xFA) : WpfColor.FromRgb(0x0F, 0x17, 0x2A);
        var muted = isDark ? WpfColor.FromRgb(0x93, 0xA0, 0xB4) : WpfColor.FromRgb(0x64, 0x74, 0x8B);
        var accent = WpfColor.FromRgb(0x10, 0xB9, 0x81);
        var trackBg = isDark ? WpfColor.FromRgb(0x1A, 0x22, 0x30) : WpfColor.FromRgb(0xE2, 0xE8, 0xF0);

        var root = new Border
        {
            CornerRadius = new CornerRadius(20),
            BorderThickness = new Thickness(1),
            BorderBrush = new SolidColorBrush(WpfColor.FromArgb(isDark ? (byte)80 : (byte)120, 16, 185, 129)),
            ClipToBounds = true,
            Effect = new System.Windows.Media.Effects.DropShadowEffect
            {
                BlurRadius = 32,
                ShadowDepth = 8,
                Opacity = isDark ? 0.55 : 0.22,
                Color = Colors.Black,
            },
        };

        var bg = new LinearGradientBrush
        {
            StartPoint = new System.Windows.Point(0, 0),
            EndPoint = new System.Windows.Point(1, 1),
        };
        bg.GradientStops.Add(new GradientStop(deep, 0));
        bg.GradientStops.Add(new GradientStop(mid, 0.5));
        bg.GradientStops.Add(new GradientStop(soft, 1));
        root.Background = bg;

        var canvas = new Grid();
        var orb = new Ellipse
        {
            Width = 240,
            Height = 240,
            HorizontalAlignment = HA.Center,
            VerticalAlignment = VA.Center,
            Opacity = isDark ? 0.35 : 0.22,
            Fill = new RadialGradientBrush(accent, WpfColor.FromArgb(0, 16, 185, 129)),
            Margin = new Thickness(0, -50, 0, 0),
        };
        canvas.Children.Add(orb);

        var content = new StackPanel
        {
            VerticalAlignment = VA.Center,
            HorizontalAlignment = HA.Center,
            Margin = new Thickness(28, 16, 28, 20),
        };

        var logo = new Border
        {
            Width = 68,
            Height = 68,
            CornerRadius = new CornerRadius(18),
            Background = new SolidColorBrush(accent),
            HorizontalAlignment = HA.Center,
            Margin = new Thickness(0, 0, 0, 14),
            Effect = new System.Windows.Media.Effects.DropShadowEffect
            {
                Color = accent,
                BlurRadius = 24,
                ShadowDepth = 0,
                Opacity = 0.5,
            },
        };
        logo.Child = new TextBlock
        {
            Text = "C",
            FontSize = 32,
            FontWeight = FontWeights.Bold,
            Foreground = new SolidColorBrush(WpfColor.FromRgb(0x04, 0x12, 0x0C)),
            HorizontalAlignment = HA.Center,
            VerticalAlignment = VA.Center,
        };
        content.Children.Add(logo);

        content.Children.Add(new TextBlock
        {
            Text = Branding.AppName,
            FontSize = 20,
            FontWeight = FontWeights.SemiBold,
            Foreground = new SolidColorBrush(text),
            HorizontalAlignment = HA.Center,
        });

        // Prominent site identity — official product URL
        var site = new TextBlock
        {
            Text = Branding.CanonicalHost,
            FontSize = 18,
            FontWeight = FontWeights.Bold,
            Foreground = new SolidColorBrush(accent),
            HorizontalAlignment = HA.Center,
            Margin = new Thickness(0, 10, 0, 2),
            Cursor = System.Windows.Input.Cursors.Hand,
            ToolTip = Branding.CanonicalSiteUrl,
        };
        site.MouseLeftButtonUp += (_, _) =>
        {
            try
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                {
                    FileName = Branding.CanonicalSiteUrl,
                    UseShellExecute = true,
                });
            }
            catch { /* ignore */ }
        };
        content.Children.Add(site);

        content.Children.Add(new TextBlock
        {
            Text = Branding.TaglinePrimary,
            FontSize = 12,
            FontWeight = FontWeights.SemiBold,
            Foreground = new SolidColorBrush(text),
            HorizontalAlignment = HA.Center,
            Margin = new Thickness(0, 8, 0, 0),
        });
        content.Children.Add(new TextBlock
        {
            Text = Branding.TaglineAction,
            FontSize = 11,
            Foreground = new SolidColorBrush(muted),
            HorizontalAlignment = HA.Center,
            Margin = new Thickness(0, 2, 0, 0),
        });
        content.Children.Add(new TextBlock
        {
            Text = $"Desktop v{AppVersion.Current} · {Branding.CanonicalHost}",
            FontSize = 11,
            Foreground = new SolidColorBrush(muted),
            HorizontalAlignment = HA.Center,
            Margin = new Thickness(0, 6, 0, 18),
        });

        var track = new Border
        {
            Width = 200,
            Height = 3,
            CornerRadius = new CornerRadius(2),
            Background = new SolidColorBrush(trackBg),
            ClipToBounds = true,
            HorizontalAlignment = HA.Center,
        };
        var bar = new Border
        {
            Width = 70,
            Height = 3,
            CornerRadius = new CornerRadius(2),
            HorizontalAlignment = HA.Left,
            Background = new LinearGradientBrush(
                WpfColor.FromRgb(0x10, 0xB9, 0x81),
                WpfColor.FromRgb(0x34, 0xD3, 0x99),
                0),
        };
        track.Child = bar;
        content.Children.Add(track);

        content.Children.Add(new TextBlock
        {
            Text = "Starting…",
            FontSize = 11,
            Foreground = new SolidColorBrush(muted),
            HorizontalAlignment = HA.Center,
            Margin = new Thickness(0, 14, 0, 0),
        });

        canvas.Children.Add(content);
        root.Child = canvas;
        Content = root;

        Loaded += (_, _) =>
        {
            var anim = new DoubleAnimation
            {
                From = -70,
                To = 200,
                Duration = TimeSpan.FromSeconds(1.15),
                RepeatBehavior = RepeatBehavior.Forever,
                EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseInOut },
            };
            bar.RenderTransform = new TranslateTransform();
            bar.RenderTransform.BeginAnimation(TranslateTransform.XProperty, anim);

            var pulse = new DoubleAnimation
            {
                From = isDark ? 0.25 : 0.16,
                To = isDark ? 0.5 : 0.32,
                Duration = TimeSpan.FromSeconds(1.4),
                AutoReverse = true,
                RepeatBehavior = RepeatBehavior.Forever,
            };
            orb.BeginAnimation(OpacityProperty, pulse);
        };
    }
}
