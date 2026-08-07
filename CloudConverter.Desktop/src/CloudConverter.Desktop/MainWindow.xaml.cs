using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Threading;
using CloudConverter.Desktop.Models;
using CloudConverter.Desktop.Services;
using Microsoft.Web.WebView2.Core;
using Drawing = System.Drawing;
using Forms = System.Windows.Forms;
using WpfMessageBox = System.Windows.MessageBox;
using WpfButton = System.Windows.Controls.Button;
using WpfCheckBox = System.Windows.Controls.CheckBox;
using WpfBrush = System.Windows.Media.Brush;
using WpfOrientation = System.Windows.Controls.Orientation;
using HA = System.Windows.HorizontalAlignment;

namespace CloudConverter.Desktop;

public partial class MainWindow : Window
{
    private readonly SettingsService _settings = App.Settings;
    private readonly RecentDownloadsService _recent = App.RecentDownloads;
    private Forms.NotifyIcon? _tray;
    private Drawing.Icon? _trayIconOwned;
    private bool _forceClose;
    private bool _webReady;
    private DispatcherTimer? _netTimer;
    private DispatcherTimer? _toastTimer;
    private string? _lastDownloadPath;
    private string? _pendingOpenFile;
    private DownloadToastWindow? _downloadToast;
    private WindowState _stateBeforeMinimize = WindowState.Maximized;
    private bool _isHidingToTray;
    private bool _registerOpenWith = true;
    private bool? _isLoggedIn;
    private string? _accountLabel;
    private bool _shellUiBound;

    public MainWindow()
    {
        InitializeComponent();
        MaximizeFix.Attach(this);
        ThemeService.Apply(_settings.Current.ShellTheme);
        ApplyBranding();
        ApplyShellChrome();
        ApplyWindowPlacement();
        BindSidebarIcons();
        LoadSettingsUi();
        RefreshFavoritesUi();
        RefreshRecentUi();
        UpdateThemeToggleUi();
        UpdateAccountUi();
        InitTray();

        if (App.StartupFiles.Length > 0)
            _pendingOpenFile = App.StartupFiles[0];
    }

    /// <summary>Normal (restored) size, always centered on the work area.</summary>
    private void ApplyCenteredRestoredBounds()
    {
        var work = SystemParameters.WorkArea;
        var w = Math.Min(1280, Math.Max(MinWidth, work.Width * 0.86));
        var h = Math.Min(820, Math.Max(MinHeight, work.Height * 0.86));
        Width = w;
        Height = h;
        Left = work.Left + (work.Width - w) / 2;
        Top = work.Top + (work.Height - h) / 2;
        if (Left < work.Left) Left = work.Left;
        if (Top < work.Top) Top = work.Top;
    }

    private void ApplyWindowPlacement()
    {
        // Restored geometry is always centered — never use off-screen remembered Top
        ApplyCenteredRestoredBounds();
        WindowStartupLocation = WindowStartupLocation.Manual;

        // Open maximized by default
        WindowState = WindowState.Maximized;
        _settings.Current.StartMaximized = true;
    }

    private void ApplyBranding()
    {
        try
        {
            using var icon = Branding.LoadAppIcon();
            Icon = System.Windows.Interop.Imaging.CreateBitmapSourceFromHIcon(
                icon.Handle,
                Int32Rect.Empty,
                System.Windows.Media.Imaging.BitmapSizeOptions.FromWidthAndHeight(32, 32));
        }
        catch
        {
            // keep default
        }

        var bmp = Branding.LoadAppIconBitmap();
        if (bmp is not null)
        {
            BrandIcon.Source = bmp;
            BrandIcon.Visibility = Visibility.Visible;
            BrandLetter.Visibility = Visibility.Collapsed;
        }
    }

    private async void Window_Loaded(object sender, RoutedEventArgs e)
    {
        UpdateMaxIcon();
        StartNetWatch();
        if (TxtAboutVersion is not null)
            TxtAboutVersion.Text = $"Desktop version {AppVersion.Current} · WebView2 shell";
        await InitWebAsync();
        if (_settings.Current.CheckUpdatesOnStart)
            _ = CheckUpdatesAsync(silent: true);
        ApplyPendingFileBanner();
    }

    private void BindSidebarIcons()
    {
        if (_shellUiBound) return;
        _shellUiBound = true;
        NavHome.Content = ShellIcons.Row("home", "Home");
        BtnNavDownloads.Content = ShellIcons.Row("downloads", "Downloads");
        BtnEditFavorites.Content = ShellIcons.Row("edit", "Edit favorites");
        BtnClearRecent.Content = ShellIcons.Row("trash", "Clear recent");
        NavAbout.Content = ShellIcons.Row("info", "About");
        NavSettings.Content = ShellIcons.Row("settings", "Settings");
        BtnThemeLight.Content = ThemeToggleContent("sun", "Light");
        BtnThemeDark.Content = ThemeToggleContent("moon", "Dark");
        BtnTopSync.Content = ThemeToggleContent("sync", "Sync");
        UpdateTopSyncUi();
    }

    private static FrameworkElement ThemeToggleContent(string kind, string label)
    {
        var sp = new StackPanel
        {
            Orientation = WpfOrientation.Horizontal,
            VerticalAlignment = VerticalAlignment.Center,
        };
        sp.Children.Add(ShellIcons.Make(kind, 12));
        sp.Children.Add(new TextBlock
        {
            Text = label,
            FontSize = 11,
            FontWeight = FontWeights.SemiBold,
            Margin = new Thickness(6, 0, 0, 0),
            VerticalAlignment = VerticalAlignment.Center,
        });
        return sp;
    }

    private void LoadSettingsUi()
    {
        var s = _settings.Current;
        if (TxtSiteUrl is not null)
            TxtSiteUrl.Text = Branding.CanonicalSiteUrl;
        TxtDownloadFolder.Text = s.DownloadFolder;
        ChkRemember.IsChecked = s.RememberWindow;
        ChkTray.IsChecked = s.MinimizeToTray;
        ChkStartup.IsChecked = s.LaunchOnWindowsStartup;
        ChkUpdates.IsChecked = s.CheckUpdatesOnStart;
        ChkOpenWith.IsChecked = _registerOpenWith;
        BuildFavoritePickers();
        UpdateThemeToggleUi();
    }

    private void UpdateThemeToggleUi()
    {
        var light = ThemeService.Normalize(_settings.Current.ShellTheme) == ThemeService.Light;
        if (BtnThemeLight is not null) BtnThemeLight.Tag = light ? "active" : null;
        if (BtnThemeDark is not null) BtnThemeDark.Tag = light ? null : "active";
    }

    private void UpdateTopSyncUi()
    {
        if (BtnTopSync is null) return;
        if (_accountSyncing)
        {
            BtnTopSync.IsEnabled = false;
            BtnTopSync.Content = ThemeToggleContent("sync", "…");
            BtnTopSync.ToolTip = "Syncing…";
        }
        else if (_isLoggedIn == true)
        {
            BtnTopSync.IsEnabled = true;
            BtnTopSync.Content = ThemeToggleContent("user", "Account");
            BtnTopSync.ToolTip = string.IsNullOrWhiteSpace(_accountLabel)
                ? "Account synced — open profile"
                : $"Synced: {_accountLabel}";
            BtnTopSync.Tag = "active";
        }
        else
        {
            BtnTopSync.IsEnabled = true;
            BtnTopSync.Content = ThemeToggleContent("sync", "Sync");
            BtnTopSync.ToolTip = "Sync account from website";
            BtnTopSync.Tag = null;
        }
    }

    private void BtnThemeLight_Click(object sender, RoutedEventArgs e)
    {
        ApplyThemeBoth(ThemeService.Light);
        TxtStatus.Text = "Light theme · app + website";
    }

    private void BtnThemeDark_Click(object sender, RoutedEventArgs e)
    {
        ApplyThemeBoth(ThemeService.Dark);
        TxtStatus.Text = "Dark theme · app + website";
    }

    private void ApplyThemeBoth(string theme)
    {
        _settings.Current.ShellTheme = theme;
        _settings.Save();
        ApplyShellChrome();
        UpdateThemeToggleUi();
        _ = SyncWebsiteThemeAsync();
    }

    /// <summary>Match website localStorage + html dark class to shell Light/Dark.</summary>
    private async Task SyncWebsiteThemeAsync()
    {
        if (!_webReady || WebView.CoreWebView2 is null) return;
        var dark = ThemeService.Normalize(_settings.Current.ShellTheme) == ThemeService.Dark;
        var theme = dark ? "dark" : "light";
        try
        {
            var script = $@"
(function(){{
  try {{
    var theme = {System.Text.Json.JsonSerializer.Serialize(theme)};
    var dark = theme === 'dark';
    localStorage.setItem('theme', theme);
    localStorage.setItem('cc-desktop-theme', theme);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    window.dispatchEvent(new CustomEvent('convertek-theme', {{ detail: {{ theme: theme }} }}));
    try {{
      window.dispatchEvent(new StorageEvent('storage', {{
        key: 'theme',
        newValue: theme,
        url: location.href
      }}));
    }} catch (_) {{}}
    return theme;
  }} catch (e) {{ return 'err'; }}
}})();";
            await WebView.CoreWebView2.ExecuteScriptAsync(script);
        }
        catch
        {
            // page not ready
        }
    }

    private bool _accountSyncing;

    private void UpdateAccountUi()
    {
        // Account card removed — only title-bar Sync reflects session state
        UpdateTopSyncUi();
    }

    private async void BtnTopSync_Click(object sender, RoutedEventArgs e)
    {
        if (_accountSyncing) return;
        if (_isLoggedIn == true)
        {
            OpenSiteView("profile");
            return;
        }
        await SyncAccountFromWebsiteAsync(openLoginIfNeeded: true, openProfileIfOk: false);
    }

    /// <summary>
    /// Refresh session from website cookies in this WebView.
    /// If not logged in → login page. Returns whether signed in.
    /// </summary>
    private async Task<bool> EnsureAccountSessionAsync()
    {
        if (_isLoggedIn == true) return true;
        return await SyncAccountFromWebsiteAsync(openLoginIfNeeded: true, openProfileIfOk: false);
    }

    /// <summary>
    /// Ask the live website for the current user (same cookies as the app WebView).
    /// If session exists → mark synced; else optionally open /login (no modal popup).
    /// </summary>
    private async Task<bool> SyncAccountFromWebsiteAsync(bool openLoginIfNeeded, bool openProfileIfOk)
    {
        if (!ConnectivityService.IsOnline())
        {
            ShowOffline(true);
            TxtStatus.Text = "Offline — cannot sync account";
            return false;
        }

        _accountSyncing = true;
        UpdateAccountUi();
        TxtStatus.Text = "Syncing account from website…";

        try
        {
            if (!_webReady || WebView.CoreWebView2 is null)
            {
                await InitWebAsync();
                if (!_webReady || WebView.CoreWebView2 is null)
                {
                    TxtStatus.Text = "Could not open website for sync";
                    return false;
                }
                await Task.Delay(800);
            }

            ShowWebPanel();
            NavHome.IsChecked = true;
            ShowOffline(false);
            await SyncWebsiteThemeAsync();

            var home = _settings.Current.HomeUrl.TrimEnd('/');
            var source = WebView.CoreWebView2.Source ?? "";
            if (string.IsNullOrWhiteSpace(source)
                || !source.StartsWith(home, StringComparison.OrdinalIgnoreCase)
                || source.Contains("chrome-error", StringComparison.OrdinalIgnoreCase))
            {
                ShowLoading(true, "Connecting to website…");
                var tcs = new TaskCompletionSource<bool>();
                void Handler(object? s, CoreWebView2NavigationCompletedEventArgs args)
                {
                    WebView.CoreWebView2.NavigationCompleted -= Handler;
                    tcs.TrySetResult(args.IsSuccess);
                }
                WebView.CoreWebView2.NavigationCompleted += Handler;
                WebView.CoreWebView2.Navigate(home + "/");
                var completed = await Task.WhenAny(tcs.Task, Task.Delay(20000));
                ShowLoading(false);
                if (completed != tcs.Task || !await tcs.Task)
                {
                    TxtStatus.Text = "Could not reach website for sync";
                    if (openLoginIfNeeded)
                        ShowOffline(true);
                    return false;
                }
                await SyncWebsiteThemeAsync();
            }

            var ok = await RefreshAccountAsync(force: true);

            if (ok)
            {
                TxtStatus.Text = string.IsNullOrWhiteSpace(_accountLabel)
                    ? "Account synced from website"
                    : $"Synced: {_accountLabel}";
                if (openProfileIfOk)
                    OpenSiteView("profile");
                return true;
            }

            TxtStatus.Text = "Not signed in — opening login";
            if (openLoginIfNeeded)
                NavigatePath("/login");
            return false;
        }
        finally
        {
            _accountSyncing = false;
            UpdateAccountUi();
        }
    }

    private void OpenSiteView(string view)
    {
        ShowWebPanel();
        NavHome.IsChecked = true;
        if (!_webReady || WebView.CoreWebView2 is null)
        {
            _ = InitWebAsyncThenView(view);
            return;
        }
        if (!ConnectivityService.IsOnline())
        {
            ShowOffline(true);
            return;
        }

        ShowOffline(false);
        // SPA views: bookmarks / history / profile live on the homepage shell
        var home = _settings.Current.HomeUrl.TrimEnd('/');
        var uri = WebView.CoreWebView2.Source ?? "";
        var onHome = uri.StartsWith(home, StringComparison.OrdinalIgnoreCase)
                     && !uri.Contains("/login", StringComparison.OrdinalIgnoreCase);

        if (onHome)
            _ = SwitchSiteViewAsync(view);
        else
        {
            ShowLoading(true, "Opening…");
            WebView.CoreWebView2.Navigate(home + "/");
            _pendingSiteView = view;
        }
    }

    private string? _pendingSiteView;

    private async Task InitWebAsyncThenView(string view)
    {
        _pendingSiteView = view;
        await InitWebAsync();
    }

    private async Task SwitchSiteViewWhenReadyAsync(string view)
    {
        // Give React a moment to mount home shell
        await Task.Delay(600);
        await SwitchSiteViewAsync(view);
    }

    private async Task SwitchSiteViewAsync(string view)
    {
        if (WebView.CoreWebView2 is null) return;
        try
        {
            // Click nav labels used on the website shell
            var needle = view.ToLowerInvariant() switch
            {
                "bookmarks" => "Bookmarks",
                "history" => "History",
                "profile" => "Profile",
                _ => null,
            };
            if (needle is null) return;

            var script = $@"
(function(){{
  const want = {System.Text.Json.JsonSerializer.Serialize(needle)};
  const nodes = Array.from(document.querySelectorAll('button,a,[role=button]'));
  const el = nodes.find(n => (n.textContent || '').trim().includes(want));
  if (el) {{ el.click(); return 'ok'; }}
  // keyboard shortcuts used by the site: 3=history 4=bookmarks
  const key = want === 'History' ? '3' : want === 'Bookmarks' ? '4' : null;
  if (key) {{
    window.dispatchEvent(new KeyboardEvent('keydown', {{ key, bubbles: true }}));
    return 'key';
  }}
  return 'miss';
}})();";
            await WebView.CoreWebView2.ExecuteScriptAsync(script);
        }
        catch
        {
            // ignore
        }
    }

    /// <returns>true when website session has a signed-in user</returns>
    private async Task<bool> RefreshAccountAsync(bool force = false)
    {
        if (!_webReady || WebView.CoreWebView2 is null) return false;
        if (!ConnectivityService.IsOnline()) return false;

        try
        {
            var meUrl = _settings.Current.AbsoluteUrl("/api/auth/me");
            var script = $@"
(async function () {{
  try {{
    const r = await fetch({System.Text.Json.JsonSerializer.Serialize(meUrl)}, {{
      credentials: 'include',
      cache: 'no-store'
    }});
    const j = await r.json();
    if (j && j.user) {{
      return JSON.stringify({{
        ok: true,
        name: j.user.name || j.user.email || 'User',
        email: j.user.email || ''
      }});
    }}
    return JSON.stringify({{ ok: false }});
  }} catch (e) {{
    return JSON.stringify({{ ok: false }});
  }}
}})();";
            var raw = await WebView.CoreWebView2.ExecuteScriptAsync(script);
            var decoded = System.Text.Json.JsonSerializer.Deserialize<string>(raw);
            if (string.IsNullOrWhiteSpace(decoded) || decoded == "null")
            {
                _isLoggedIn = false;
                _accountLabel = null;
            }
            else
            {
                using var doc = System.Text.Json.JsonDocument.Parse(decoded);
                var ok = doc.RootElement.TryGetProperty("ok", out var okEl) && okEl.GetBoolean();
                _isLoggedIn = ok;
                if (ok)
                {
                    var name = doc.RootElement.TryGetProperty("name", out var n) ? n.GetString() : null;
                    var email = doc.RootElement.TryGetProperty("email", out var em) ? em.GetString() : null;
                    _accountLabel = !string.IsNullOrWhiteSpace(name) ? name : email;
                }
                else
                {
                    _accountLabel = null;
                }
            }
        }
        catch
        {
            if (force)
            {
                _isLoggedIn = false;
                _accountLabel = null;
            }
        }

        await Dispatcher.InvokeAsync(UpdateAccountUi);
        return _isLoggedIn == true;
    }

    private void ApplyShellChrome()
    {
        var theme = ThemeService.Normalize(_settings.Current.ShellTheme);
        ThemeService.Apply(theme);
        try
        {
            WebView.DefaultBackgroundColor = ThemeService.WebViewBackground(theme);
        }
        catch
        {
            // WebView may not be ready
        }
    }

    private void InitTray()
    {
        _trayIconOwned = Branding.LoadAppIcon();
        _tray = new Forms.NotifyIcon
        {
            Text = Branding.AppName,
            Visible = true,
            Icon = _trayIconOwned,
        };
        _tray.DoubleClick += (_, _) => RestoreFromTray();
        var menu = new Forms.ContextMenuStrip();
        menu.Items.Add("Open Convertek", null, (_, _) => RestoreFromTray());
        menu.Items.Add("Home", null, (_, _) =>
        {
            RestoreFromTray();
            NavigateHome();
        });
        menu.Items.Add("Quit", null, (_, _) =>
        {
            _forceClose = true;
            Close();
        });
        _tray.ContextMenuStrip = menu;
    }

    private int _offlineTicks;
    private bool _userNavigating;

    private void StartNetWatch()
    {
        _netTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(4) };
        _netTimer.Tick += (_, _) => UpdateOnlineBadge();
        _netTimer.Start();
        UpdateOnlineBadge();
    }

    /// <summary>
    /// Badge only by default. Offline full-screen only after stable disconnect (not mid-load).
    /// </summary>
    private void UpdateOnlineBadge()
    {
        var online = ConnectivityService.IsOnline();
        if (online)
        {
            _offlineTicks = 0;
            DotOnline.Fill = (System.Windows.Media.Brush)FindResource("BrushAccent");
            TxtOnline.Text = "Online";
            if (OverlayOffline.Visibility == Visibility.Visible && !_webReady)
                _ = InitWebAsync();
        }
        else
        {
            _offlineTicks++;
            DotOnline.Fill = (System.Windows.Media.Brush)FindResource("BrushDanger");
            TxtOnline.Text = "Offline";
            // Require 2 timer ticks (~8s) and no active load — avoid blink on nav
            if (_offlineTicks >= 2 && !_userNavigating && OverlayLoading.Visibility != Visibility.Visible)
                ShowOffline(true);
        }
    }

    private async Task InitWebAsync()
    {
        try
        {
            if (_webReady && WebView.CoreWebView2 is not null)
                return;

            if (!ConnectivityService.IsOnline())
            {
                ShowOffline(true);
                return;
            }

            ShowLoading(true, "Preparing secure browser…");
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                Branding.AppDataFolderName,
                "WebView2");
            Directory.CreateDirectory(userData);

            var env = await CoreWebView2Environment.CreateAsync(userDataFolder: userData);
            await WebView.EnsureCoreWebView2Async(env);
            WebView.DefaultBackgroundColor = ThemeService.WebViewBackground(_settings.Current.ShellTheme);

            var core = WebView.CoreWebView2
                ?? throw new InvalidOperationException("WebView2 core is not available.");
            core.Settings.AreDefaultContextMenusEnabled = true;
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.IsZoomControlEnabled = true;
            core.Settings.AreBrowserAcceleratorKeysEnabled = true;

            // Early theme: before React hydrates, prefer desktop shell choice
            var shellTheme = ThemeService.Normalize(_settings.Current.ShellTheme);
            await core.AddScriptToExecuteOnDocumentCreatedAsync($@"
(function(){{
  try {{
    var forced = localStorage.getItem('cc-desktop-theme') || {System.Text.Json.JsonSerializer.Serialize(shellTheme)};
    if (forced === 'dark' || forced === 'light') {{
      localStorage.setItem('theme', forced);
      var dark = forced === 'dark';
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    }}
  }} catch (e) {{}}
}})();");

            core.DocumentTitleChanged += (_, _) =>
            {
                Dispatcher.Invoke(() =>
                {
                    var title = core.DocumentTitle;
                    TxtPageTitle.Text = string.IsNullOrWhiteSpace(title) ? "Convertek" : title;
                    Title = string.IsNullOrWhiteSpace(title) ? "Convertek" : $"{title} — Convertek";
                });
            };

            core.NavigationStarting += (_, args) =>
            {
                // Keep app on official Convertek host (apex → www; block accidental legacy domain linger)
                try
                {
                    if (Uri.TryCreate(args.Uri, UriKind.Absolute, out var navUri)
                        && (navUri.Scheme == Uri.UriSchemeHttp || navUri.Scheme == Uri.UriSchemeHttps))
                    {
                        var host = navUri.Host.Trim().ToLowerInvariant();
                        if (host is "convertek.tech"
                            or "cloudconveter.tech"
                            or "www.cloudconveter.tech"
                            or "cloudconverter.tech"
                            or "www.cloudconverter.tech"
                            || host.EndsWith(".cloudconveter.tech", StringComparison.Ordinal)
                            || host.EndsWith(".cloudconverter.tech", StringComparison.Ordinal))
                        {
                            args.Cancel = true;
                            var path = navUri.PathAndQuery;
                            if (string.IsNullOrEmpty(path)) path = "/";
                            core.Navigate(Branding.CanonicalSiteUrl.TrimEnd('/') + path + navUri.Fragment);
                            return;
                        }
                    }
                }
                catch
                {
                    // continue with normal navigation UI
                }

                Dispatcher.Invoke(() =>
                {
                    // Always prefer loading first — never flash offline while a page is opening
                    _userNavigating = true;
                    ShowOffline(false);
                    if (_webReady) ShowLoading(true, "Loading…");
                    TxtStatus.Text = $"Loading {args.Uri}";
                    UpdateNavButtons();
                });
            };

            core.NavigationCompleted += (_, args) =>
            {
                Dispatcher.Invoke(() =>
                {
                    _userNavigating = false;
                    ShowLoading(false);

                    if (args.IsSuccess)
                    {
                        ShowOffline(false);
                        TxtStatus.Text = "Ready";
                        _ = RefreshAccountAsync();
                        _ = SyncWebsiteThemeAsync();
                        if (!string.IsNullOrEmpty(_pendingSiteView))
                        {
                            var view = _pendingSiteView;
                            _pendingSiteView = null;
                            _ = SwitchSiteViewWhenReadyAsync(view!);
                        }
                    }
                    else if (!ConnectivityService.IsOnline())
                    {
                        // Real offline only after failed nav + no network
                        TxtStatus.Text = "Offline — check your internet connection";
                        ShowOffline(true);
                    }
                    else
                    {
                        // Online but page failed — keep web shell visible, hint status
                        ShowOffline(false);
                        TxtStatus.Text = "Page could not load — try Reload";
                    }
                    UpdateNavButtons();
                });
            };

            core.NewWindowRequested += (_, args) =>
            {
                // Keep navigation in the app shell when possible
                args.Handled = true;
                if (!string.IsNullOrEmpty(args.Uri))
                    core.Navigate(args.Uri);
            };

            core.DownloadStarting += (_, args) =>
            {
                try
                {
                    var folder = _settings.Current.DownloadFolder;
                    Directory.CreateDirectory(folder);

                    var suggested = args.ResultFilePath;
                    if (string.IsNullOrWhiteSpace(suggested))
                        suggested = "download.bin";

                    var fileName = BrandDownloadFileName(Path.GetFileName(suggested));
                    var fullPath = Path.Combine(folder, fileName);
                    fullPath = EnsureUniquePath(fullPath);

                    args.ResultFilePath = fullPath;
                    args.Handled = true;

                    var op = args.DownloadOperation;
                    Dispatcher.Invoke(() =>
                    {
                        TxtStatus.Text = $"Downloading {Path.GetFileName(fullPath)}…";
                    });

                    op.StateChanged += (_, _) =>
                    {
                        try
                        {
                            if (op.State == CoreWebView2DownloadState.Completed)
                            {
                                var path = op.ResultFilePath;
                                Dispatcher.Invoke(() =>
                                {
                                    if (!string.IsNullOrWhiteSpace(path))
                                    {
                                        _recent.Add(path);
                                        RefreshRecentUi();
                                    }
                                    NotifyDownloadComplete(path);
                                });
                            }
                            else if (op.State == CoreWebView2DownloadState.Interrupted)
                            {
                                Dispatcher.Invoke(() =>
                                {
                                    ToastDownloadHideInternal();
                                    TxtStatus.Text = "Download interrupted";
                                });
                            }
                        }
                        catch
                        {
                            // ignore download state race
                        }
                    };
                }
                catch
                {
                    // default download behavior
                }
            };

            _webReady = true;
            NavigateHome();
        }
        catch (Exception ex)
        {
            ShowLoading(false);
            ShowOffline(true);
            TxtStatus.Text = "WebView2 failed to start.";
            TxtLoadingHint.Text = ex.Message;
            WpfMessageBox.Show(
                "WebView2 Runtime is required.\n\nInstall “Microsoft Edge WebView2 Runtime” from Microsoft, then reopen the app.\n\n" + ex.Message,
                "Convertek",
                MessageBoxButton.OK,
                MessageBoxImage.Warning);
        }
    }

    private static string EnsureUniquePath(string path)
    {
        if (!File.Exists(path)) return path;
        var dir = Path.GetDirectoryName(path) ?? "";
        var name = Path.GetFileNameWithoutExtension(path);
        var ext = Path.GetExtension(path);
        for (var i = 1; i < 1000; i++)
        {
            var candidate = Path.Combine(dir, $"{name} ({i}){ext}");
            if (!File.Exists(candidate)) return candidate;
        }
        return Path.Combine(dir, $"{name}-{DateTime.Now:yyyyMMddHHmmss}{ext}");
    }

    /// <summary>Prefix converted downloads with convertek.tech- when missing.</summary>
    private static string BrandDownloadFileName(string fileName)
    {
        var brand = Branding.DownloadBrandPrefix;
        if (string.IsNullOrWhiteSpace(fileName)) return $"{brand}-download.bin";
        if (fileName.StartsWith(brand, StringComparison.OrdinalIgnoreCase)
            || fileName.Contains("cloudconverter", StringComparison.OrdinalIgnoreCase)
            || fileName.Contains("convertek", StringComparison.OrdinalIgnoreCase))
            return fileName;
        return $"{brand}-{fileName}";
    }

    private void NotifyDownloadComplete(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            TxtStatus.Text = "Download finished";
            return;
        }

        _lastDownloadPath = path;
        TxtStatus.Text = "File downloaded";

        // Floating topmost window (WebView2 covers in-window WPF layers)
        try
        {
            _downloadToast?.Close();
        }
        catch
        {
            // ignore
        }

        _downloadToast = new DownloadToastWindow(
            path,
            OpenLastDownloadFolder,
            OpenLastDownloadFile);
        _downloadToast.Closed += (_, _) =>
        {
            if (ReferenceEquals(_downloadToast, null) == false)
                _downloadToast = null;
        };
        _downloadToast.PlaceNear(this);
        _downloadToast.Show();

        try
        {
            if (_tray is not null)
            {
                _tray.BalloonTipTitle = "File downloaded";
                _tray.BalloonTipText = path;
                _tray.ShowBalloonTip(3500);
            }
        }
        catch
        {
            // tray optional
        }

        _toastTimer?.Stop();
        _toastTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(16) };
        _toastTimer.Tick += (_, _) =>
        {
            _toastTimer.Stop();
            ToastDownloadHideInternal();
        };
        _toastTimer.Start();
    }

    private void ToastDownloadHideInternal()
    {
        try
        {
            _downloadToast?.Close();
        }
        catch
        {
            // ignore
        }
        _downloadToast = null;
    }

    private void BtnToastDismiss_Click(object sender, RoutedEventArgs e)
    {
        _toastTimer?.Stop();
        ToastDownloadHideInternal();
    }

    private void BtnToastOpenFolder_Click(object sender, RoutedEventArgs e) => OpenLastDownloadFolder();

    private void BtnToastOpenFile_Click(object sender, RoutedEventArgs e) => OpenLastDownloadFile();

    private void OpenLastDownloadFolder()
    {
        try
        {
            var path = _lastDownloadPath;
            if (string.IsNullOrEmpty(path) || !File.Exists(path))
            {
                var folder = _settings.Current.DownloadFolder;
                Directory.CreateDirectory(folder);
                Process.Start(new ProcessStartInfo { FileName = folder, UseShellExecute = true });
                return;
            }

            Process.Start(new ProcessStartInfo
            {
                FileName = "explorer.exe",
                Arguments = $"/select,\"{path}\"",
                UseShellExecute = true,
            });
        }
        catch (Exception ex)
        {
            WpfMessageBox.Show(ex.Message, "Convertek", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void OpenLastDownloadFile()
    {
        try
        {
            var path = _lastDownloadPath;
            if (string.IsNullOrEmpty(path) || !File.Exists(path))
            {
                WpfMessageBox.Show("File not found.", "Convertek", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            Process.Start(new ProcessStartInfo
            {
                FileName = path,
                UseShellExecute = true,
            });
        }
        catch (Exception ex)
        {
            WpfMessageBox.Show(ex.Message, "Convertek", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void NavigateHome()
    {
        if (!_webReady || WebView.CoreWebView2 is null)
        {
            _ = InitWebAsync();
            return;
        }

        if (!ConnectivityService.IsOnline())
        {
            ShowOffline(true);
            return;
        }

        ShowOffline(false);
        ShowLoading(true, $"Connecting to {Branding.CanonicalHost}…");
        WebView.CoreWebView2.Navigate(_settings.Current.HomeUrl);
        NavHome.IsChecked = true;
        ShowWebPanel();
    }

    private void UpdateNavButtons()
    {
        try
        {
            BtnBack.IsEnabled = WebView.CoreWebView2?.CanGoBack == true;
            BtnForward.IsEnabled = WebView.CoreWebView2?.CanGoForward == true;
        }
        catch
        {
            BtnBack.IsEnabled = false;
            BtnForward.IsEnabled = false;
        }
    }

    private void ShowLoading(bool show, string? hint = null)
    {
        OverlayLoading.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
        if (!string.IsNullOrEmpty(hint))
            TxtLoadingHint.Text = hint;
    }

    private void ShowOffline(bool show)
    {
        OverlayOffline.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
        try
        {
            if (show)
                WebView.Visibility = Visibility.Collapsed;
            else
                WebView.Visibility = Visibility.Visible;
        }
        catch { /* ignore */ }
        if (show)
            ShowLoading(false);
        try
        {
            var online = ConnectivityService.IsOnline();
            DotOnline.Fill = online
                ? (System.Windows.Media.Brush)FindResource("BrushAccent")
                : (System.Windows.Media.Brush)FindResource("BrushDanger");
            TxtOnline.Text = online ? "Online" : "Offline";
        }
        catch { /* ignore */ }
    }

    private void ShowWebPanel()
    {
        PanelWeb.Visibility = Visibility.Visible;
        PanelSettings.Visibility = Visibility.Collapsed;
        PanelAbout.Visibility = Visibility.Collapsed;
    }

    private void ShowSettingsPanel()
    {
        LoadSettingsUi();
        PanelWeb.Visibility = Visibility.Collapsed;
        PanelSettings.Visibility = Visibility.Visible;
        PanelAbout.Visibility = Visibility.Collapsed;
        TxtPageTitle.Text = "Desktop settings";
        TxtSettingsStatus.Visibility = Visibility.Collapsed;
    }

    private void ShowAboutPanel()
    {
        PanelWeb.Visibility = Visibility.Collapsed;
        PanelSettings.Visibility = Visibility.Collapsed;
        PanelAbout.Visibility = Visibility.Visible;
        TxtPageTitle.Text = "About";
        if (TxtAboutVersion is not null)
            TxtAboutVersion.Text = $"Desktop version {AppVersion.Current} · WebView2 shell for www.convertek.tech";
    }

    private void NavHome_Checked(object sender, RoutedEventArgs e)
    {
        if (!IsLoaded) return;
        ShowWebPanel();
        NavigateHome();
    }

    private void NavSettings_Checked(object sender, RoutedEventArgs e)
    {
        if (!IsLoaded) return;
        ShowSettingsPanel();
    }

    private void NavAbout_Checked(object sender, RoutedEventArgs e)
    {
        if (!IsLoaded) return;
        ShowAboutPanel();
    }

    private void BtnEditFavorites_Click(object sender, RoutedEventArgs e)
    {
        NavSettings.IsChecked = true;
        ShowSettingsPanel();
        SectionFavorites.BringIntoView();
    }

    private void RefreshFavoritesUi()
    {
        ListFavorites.Items.Clear();
        var ids = _settings.Current.FavoriteToolIds ?? new List<string>();
        foreach (var id in ids)
        {
            var tool = ConverterCatalog.Find(id);
            if (tool is null) continue;
            var btn = new WpfButton
            {
                Content = ShellIcons.Row(IconKindForTool(tool.Id), tool.Title),
                Style = (Style)FindResource("NavSideButton"),
                Tag = tool,
                HorizontalContentAlignment = HA.Left,
                ToolTip = tool.Path,
            };
            btn.Click += (_, _) => NavigateTool(tool);
            ListFavorites.Items.Add(btn);
        }
        if (ListFavorites.Items.Count == 0)
        {
            ListFavorites.Items.Add(new TextBlock
            {
                Text = "No favorites pinned",
                FontSize = 11,
                Foreground = (WpfBrush)FindResource("BrushMuted"),
                Margin = new Thickness(10, 2, 8, 2),
            });
        }
    }

    private void BuildFavoritePickers()
    {
        ListFavoritePickers.Items.Clear();
        var selected = new HashSet<string>(
            _settings.Current.FavoriteToolIds ?? new List<string>(),
            StringComparer.OrdinalIgnoreCase);

        foreach (var tool in ConverterCatalog.All)
        {
            var row = new WpfCheckBox
            {
                Content = $"{tool.Title}  ({tool.Path})",
                Tag = tool.Id,
                IsChecked = selected.Contains(tool.Id),
                Style = (Style)FindResource("ShellCheckBox"),
                Margin = new Thickness(0, 2, 0, 2),
            };
            ListFavoritePickers.Items.Add(row);
        }
    }

    private void SaveFavoritePickersToSettings()
    {
        var list = new List<string>();
        foreach (var item in ListFavoritePickers.Items)
        {
            if (item is WpfCheckBox cb && cb.IsChecked == true && cb.Tag is string id)
                list.Add(id);
        }
        _settings.Current.FavoriteToolIds = list;
    }

    private void RefreshRecentUi()
    {
        ListRecent.Items.Clear();
        var items = _recent.Items.Take(8).ToList();
        if (items.Count == 0)
        {
            ListRecent.Items.Add(new TextBlock
            {
                Text = "No downloads yet",
                FontSize = 11,
                Foreground = (WpfBrush)FindResource("BrushMuted"),
                Margin = new Thickness(10, 2, 8, 2),
            });
            return;
        }

        foreach (var item in items)
        {
            var btn = new WpfButton
            {
                Content = ShellIcons.Row("file", item.Name.Length > 22 ? item.Name[..20] + "…" : item.Name),
                Style = (Style)FindResource("NavSideButton"),
                Tag = item.Path,
                HorizontalContentAlignment = HA.Left,
                ToolTip = item.Path,
            };
            btn.Click += (_, _) =>
            {
                var p = item.Path;
                if (File.Exists(p))
                {
                    try
                    {
                        Process.Start(new ProcessStartInfo
                        {
                            FileName = "explorer.exe",
                            Arguments = $"/select,\"{p}\"",
                            UseShellExecute = true,
                        });
                    }
                    catch (Exception ex)
                    {
                        WpfMessageBox.Show(ex.Message, "Convertek", MessageBoxButton.OK, MessageBoxImage.Error);
                    }
                }
                else
                {
                    WpfMessageBox.Show("File no longer exists.", "Convertek", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            };
            ListRecent.Items.Add(btn);
        }
    }

    private void BtnClearRecent_Click(object sender, RoutedEventArgs e)
    {
        _recent.Clear();
        RefreshRecentUi();
        TxtStatus.Text = "Recent downloads cleared";
    }

    private static string IconKindForTool(string id) => id switch
    {
        "converter" => "home",
        "formats" => "formats",
        "png" or "jpg" or "webp" => "file",
        "pdf" or "docx" => "pdf",
        "mp3" or "wav" => "audio",
        "zip" => "zip",
        "contact" => "globe",
        _ => "star",
    };

    private void NavigateTool(ConverterTool tool)
    {
        NavigatePath(tool.Path);
    }

    private void NavigatePath(string relativePath)
    {
        ShowWebPanel();
        NavHome.IsChecked = true;
        if (!_webReady || WebView.CoreWebView2 is null)
        {
            _ = InitWebAsync();
            return;
        }
        if (!ConnectivityService.IsOnline())
        {
            ShowOffline(true);
            return;
        }
        ShowOffline(false);
        ShowLoading(true, "Loading…");
        WebView.CoreWebView2.Navigate(_settings.Current.AbsoluteUrl(relativePath));
    }

    private void ApplyPendingFileBanner()
    {
        if (string.IsNullOrEmpty(_pendingOpenFile) || !File.Exists(_pendingOpenFile))
        {
            BannerPendingFile.Visibility = Visibility.Collapsed;
            return;
        }
        TxtPendingFile.Text = _pendingOpenFile;
        BannerPendingFile.Visibility = Visibility.Visible;
        TxtStatus.Text = "Opened via Open with Convertek";
    }

    private void BtnPendingFolder_Click(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrEmpty(_pendingOpenFile)) return;
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "explorer.exe",
                Arguments = $"/select,\"{_pendingOpenFile}\"",
                UseShellExecute = true,
            });
        }
        catch (Exception ex)
        {
            WpfMessageBox.Show(ex.Message, "Convertek", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void BtnPendingDismiss_Click(object sender, RoutedEventArgs e)
    {
        BannerPendingFile.Visibility = Visibility.Collapsed;
        _pendingOpenFile = null;
    }

    private void BtnOpenWebsite_Click(object sender, RoutedEventArgs e)
        => NavigatePath("/");

    private void BtnContact_Click(object sender, RoutedEventArgs e)
        => NavigatePath("/contact");

    private void BtnPrivacy_Click(object sender, RoutedEventArgs e)
        => NavigatePath("/privacy");

    private void BtnTerms_Click(object sender, RoutedEventArgs e)
        => NavigatePath("/terms");

    private void BtnFormats_Click(object sender, RoutedEventArgs e)
        => NavigatePath("/conversions");

    private void BtnReportBug_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var subject = Uri.EscapeDataString($"Desktop bug report v{AppVersion.Current}");
            var body = Uri.EscapeDataString(
                $"App: Convertek Desktop {AppVersion.Current}\n" +
                $"OS: {Environment.OSVersion}\n" +
                $"Theme: {_settings.Current.ShellTheme}\n\n" +
                "What happened:\n\nSteps to reproduce:\n");
            // Prefer in-app contact form with context
            NavigatePath("/contact");
            Process.Start(new ProcessStartInfo
            {
                FileName = $"mailto:{Branding.SupportEmail}?subject={subject}&body={body}",
                UseShellExecute = true,
            });
        }
        catch
        {
            NavigatePath("/contact");
        }
    }

    private async void BtnCheckUpdates_Click(object sender, RoutedEventArgs e)
        => await CheckUpdatesAsync(silent: false);

    private async Task CheckUpdatesAsync(bool silent)
    {
        try
        {
            TxtStatus.Text = silent ? TxtStatus.Text : "Checking for updates…";
            var info = await UpdateCheckService.CheckAsync(_settings.Current.UpdateManifestUrl);
            if (info is null)
            {
                if (!silent)
                    WpfMessageBox.Show(
                        "Could not reach the update server. You may already be up to date, or check internet.",
                        "Convertek", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            if (UpdateCheckService.IsNewer(info.Version, AppVersion.Current))
            {
                var msg = $"A newer desktop build is available: {info.Version}\n\nCurrent: {AppVersion.Current}\n\n{info.Notes}";
                var r = WpfMessageBox.Show(msg + "\n\nOpen download page?", "Update available",
                    MessageBoxButton.YesNo, MessageBoxImage.Information);
                if (r == MessageBoxResult.Yes)
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = string.IsNullOrWhiteSpace(info.Url)
                            ? AppSettings.DefaultSiteUrl
                            : info.Url,
                        UseShellExecute = true,
                    });
                }
            }
            else if (!silent)
            {
                WpfMessageBox.Show(
                    $"You are on the latest version ({AppVersion.Current}).",
                    "Convertek", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            else
            {
                TxtStatusRight.Text = $"v{AppVersion.Current} · up to date";
            }
        }
        catch
        {
            if (!silent)
                WpfMessageBox.Show("Update check failed.", "Convertek", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
    }

    private void BtnBack_Click(object sender, RoutedEventArgs e)
    {
        if (WebView.CoreWebView2?.CanGoBack == true)
            WebView.CoreWebView2.GoBack();
    }

    private void BtnForward_Click(object sender, RoutedEventArgs e)
    {
        if (WebView.CoreWebView2?.CanGoForward == true)
            WebView.CoreWebView2.GoForward();
    }

    private void BtnReload_Click(object sender, RoutedEventArgs e)
    {
        if (WebView.CoreWebView2 is not null)
            WebView.CoreWebView2.Reload();
        else
            _ = InitWebAsync();
    }

    private void BtnHome_Click(object sender, RoutedEventArgs e) => NavigateHome();

    private void BtnRetry_Click(object sender, RoutedEventArgs e) => NavigateHome();

    private void BtnMin_Click(object sender, RoutedEventArgs e)
    {
        // Capture good restore bounds before minimize so the window won't snap off-screen
        if (WindowState == WindowState.Maximized)
        {
            // preparing restore rect for OS
            ApplyCenteredRestoredBounds();
        }
        WindowState = WindowState.Minimized;
    }

    private void BtnMax_Click(object sender, RoutedEventArgs e)
    {
        if (WindowState == WindowState.Maximized)
        {
            ApplyCenteredRestoredBounds();
            WindowState = WindowState.Normal;
            // Re-apply after state change (WPF may overwrite Left/Top)
            Dispatcher.BeginInvoke(new Action(() =>
            {
                ApplyCenteredRestoredBounds();
                UpdateMaxIcon();
            }));
        }
        else
        {
            ApplyCenteredRestoredBounds();
            WindowState = WindowState.Maximized;
            UpdateMaxIcon();
        }
    }

    private void BtnClose_Click(object sender, RoutedEventArgs e) => Close();

    private void UpdateMaxIcon()
    {
        if (MaxIcon is null) return;
        MaxIcon.Data = WindowState == WindowState.Maximized
            ? System.Windows.Media.Geometry.Parse("M2,0 H10 V8 H8 V10 H0 V2 H2 Z M2,2 V8 H8 V2 Z")
            : System.Windows.Media.Geometry.Parse("M0,0 H10 V10 H0 Z");
    }

    private void Window_StateChanged(object? sender, EventArgs e)
    {
        UpdateMaxIcon();
        if (RootBorder is not null)
            RootBorder.BorderThickness = WindowState == WindowState.Maximized
                ? new Thickness(0)
                : new Thickness(1);

        // Un-maximize / restore → keep window centered (fixes jump to top)
        if (WindowState == WindowState.Normal && !_isHidingToTray)
        {
            Dispatcher.BeginInvoke(new Action(ApplyCenteredRestoredBounds));
        }

        // Minimize stays on the taskbar (not tray) so position is stable
    }

    private void Window_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        if (!_forceClose && _settings.Current.MinimizeToTray)
        {
            e.Cancel = true;
            HideToTray();
            return;
        }

        ToastDownloadHideInternal();
        PersistWindow();
        if (_tray is not null)
        {
            _tray.Visible = false;
            _tray.Dispose();
            _tray = null;
        }
        _trayIconOwned?.Dispose();
        _trayIconOwned = null;
        _netTimer?.Stop();
        _toastTimer?.Stop();
    }

    private void HideToTray()
    {
        _isHidingToTray = true;
        _stateBeforeMinimize = WindowState;
        ToastDownloadHideInternal();
        // Stabilize restore bounds then hide
        if (WindowState == WindowState.Maximized)
        {
            WindowState = WindowState.Normal;
            ApplyCenteredRestoredBounds();
        }
        ShowInTaskbar = false;
        Hide();
        if (_tray is not null)
        {
            _tray.BalloonTipTitle = "Convertek";
            _tray.BalloonTipText = "Still running in the tray. Double-click to open.";
            _tray.ShowBalloonTip(1800);
        }
    }

    private void RestoreFromTray()
    {
        _isHidingToTray = false;
        ShowInTaskbar = true;
        Show();
        ApplyCenteredRestoredBounds();
        WindowState = WindowState.Maximized;
        Activate();
        UpdateMaxIcon();
    }

    private void NavDownloads_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var folder = _settings.Current.DownloadFolder;
            Directory.CreateDirectory(folder);
            Process.Start(new ProcessStartInfo
            {
                FileName = folder,
                UseShellExecute = true,
            });
            TxtStatus.Text = $"Downloads · {folder}";
        }
        catch (Exception ex)
        {
            WpfMessageBox.Show(ex.Message, "Convertek", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void PersistWindow()
    {
        var s = _settings.Current;
        s.StartMaximized = true;
        // Always store centered geometry for next restore (avoid drifting to top edge)
        ApplyCenteredRestoredBounds();
        s.WindowWidth = Width;
        s.WindowHeight = Height;
        s.WindowLeft = Left;
        s.WindowTop = Top;
        _settings.Save();
    }

    private void BtnBrowseDownload_Click(object sender, RoutedEventArgs e)
    {
        using var dlg = new Forms.FolderBrowserDialog
        {
            Description = "Choose default download folder",
            UseDescriptionForTitle = true,
            SelectedPath = TxtDownloadFolder.Text,
        };
        if (dlg.ShowDialog() == Forms.DialogResult.OK)
            TxtDownloadFolder.Text = dlg.SelectedPath;
    }

    private void BtnOpenDownloads_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            Directory.CreateDirectory(TxtDownloadFolder.Text);
            Process.Start(new ProcessStartInfo
            {
                FileName = TxtDownloadFolder.Text,
                UseShellExecute = true,
            });
        }
        catch (Exception ex)
        {
            WpfMessageBox.Show(ex.Message, "Convertek", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void BtnSaveSettings_Click(object sender, RoutedEventArgs e)
    {
        var s = _settings.Current;
        // Official product host only — ignore legacy saved site URLs
        s.SiteUrl = Branding.CanonicalSiteUrl;
        s.UpdateManifestUrl = UpdateCheckService.DefaultManifestUrl;
        s.DownloadFolder = string.IsNullOrWhiteSpace(TxtDownloadFolder.Text)
            ? s.DownloadFolder
            : TxtDownloadFolder.Text.Trim();
        s.StartMaximized = true;
        s.RememberWindow = ChkRemember.IsChecked == true;
        s.MinimizeToTray = ChkTray.IsChecked == true;
        s.LaunchOnWindowsStartup = ChkStartup.IsChecked == true;
        s.CheckUpdatesOnStart = ChkUpdates.IsChecked == true;
        // Theme controlled from title bar Light/Dark (not saved here to avoid stale radio)
        SaveFavoritePickersToSettings();
        _settings.Save();
        if (TxtSiteUrl is not null)
            TxtSiteUrl.Text = Branding.CanonicalSiteUrl;
        ApplyShellChrome();
        UpdateThemeToggleUi();
        RefreshFavoritesUi();

        _registerOpenWith = ChkOpenWith.IsChecked == true;
        try
        {
            var exe = Environment.ProcessPath;
            if (_registerOpenWith && !string.IsNullOrEmpty(exe))
                ShellIntegrationService.Register(exe);
            else
                ShellIntegrationService.Unregister();
        }
        catch { /* ignore */ }

        TxtSettingsStatus.Text = "Settings saved.";
        TxtSettingsStatus.Visibility = Visibility.Visible;
        TxtStatus.Text = "Settings saved";
    }

    protected override void OnPreviewKeyDown(System.Windows.Input.KeyEventArgs e)
    {
        if (e.Key == Key.F5)
        {
            BtnReload_Click(this, new RoutedEventArgs());
            e.Handled = true;
        }
        else if (e.Key == Key.BrowserBack || (e.Key == Key.Left && Keyboard.Modifiers == ModifierKeys.Alt))
        {
            BtnBack_Click(this, new RoutedEventArgs());
            e.Handled = true;
        }
        else if (e.Key == Key.BrowserForward || (e.Key == Key.Right && Keyboard.Modifiers == ModifierKeys.Alt))
        {
            BtnForward_Click(this, new RoutedEventArgs());
            e.Handled = true;
        }
        base.OnPreviewKeyDown(e);
    }
}
