using System.IO;

namespace CloudConverter.Desktop;

public partial class App : System.Windows.Application
{
    public static Services.SettingsService Settings { get; } = new();
    public static Services.RecentDownloadsService RecentDownloads { get; } = new();
    public static string[] StartupFiles { get; private set; } = Array.Empty<string>();

    protected override async void OnStartup(System.Windows.StartupEventArgs e)
    {
        base.OnStartup(e);

        DispatcherUnhandledException += (_, args) =>
        {
            System.Windows.MessageBox.Show(
                args.Exception.Message + "\n\n" + args.Exception.InnerException?.Message,
                "Convertek",
                System.Windows.MessageBoxButton.OK,
                System.Windows.MessageBoxImage.Error);
            args.Handled = true;
        };

        ShutdownMode = System.Windows.ShutdownMode.OnExplicitShutdown;

        try
        {
            StartupFiles = (e.Args ?? Array.Empty<string>())
                .Where(a => !string.IsNullOrWhiteSpace(a) && File.Exists(a))
                .ToArray();

            var theme = Services.ThemeService.Normalize(Settings.Current.ShellTheme);
            Services.ThemeService.Apply(theme);

            try
            {
                var exe = Environment.ProcessPath;
                if (string.IsNullOrEmpty(exe))
                    exe = Path.Combine(AppContext.BaseDirectory, "CloudConverter.exe");
                if (!string.IsNullOrEmpty(exe) && File.Exists(exe))
                    Services.ShellIntegrationService.Register(exe);
            }
            catch { /* ignore registry */ }

            var splash = new SplashWindow(theme);
            splash.Show();

            await Task.Delay(3500).ConfigureAwait(true);

            MainWindow main;
            try
            {
                main = new MainWindow();
            }
            catch (Exception ex)
            {
                splash.Close();
                System.Windows.MessageBox.Show(
                    "Could not start the main window.\n\n" + ex.Message +
                    (ex.InnerException is null ? "" : "\n" + ex.InnerException.Message),
                    "Convertek",
                    System.Windows.MessageBoxButton.OK,
                    System.Windows.MessageBoxImage.Error);
                Shutdown(1);
                return;
            }

            MainWindow = main;
            main.Show();
            splash.Close();
            main.Activate();
            ShutdownMode = System.Windows.ShutdownMode.OnMainWindowClose;
        }
        catch (Exception ex)
        {
            System.Windows.MessageBox.Show(
                "Startup failed.\n\n" + ex.Message,
                "Convertek",
                System.Windows.MessageBoxButton.OK,
                System.Windows.MessageBoxImage.Error);
            Shutdown(1);
        }
    }
}
