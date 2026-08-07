using System.Diagnostics;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;

namespace CloudConverter.Setup;

internal static class Program
{
    private const string AppName = "Convertek";
    private const string AppId = "CloudConverter.Desktop";
    private const string ExeName = "CloudConverter.exe";
    private const string Version = "1.2.0";

    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            var silent = args.Any(a =>
                a.Equals("/S", StringComparison.OrdinalIgnoreCase) ||
                a.Equals("/silent", StringComparison.OrdinalIgnoreCase) ||
                a.Equals("--silent", StringComparison.OrdinalIgnoreCase));

            var uninstall = args.Any(a =>
                a.Equals("/uninstall", StringComparison.OrdinalIgnoreCase) ||
                a.Equals("--uninstall", StringComparison.OrdinalIgnoreCase));

            var installDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs", "CloudConverter");

            if (uninstall)
            {
                return DoUninstall(installDir, silent);
            }

            if (!silent)
            {
                var r = MessageBox(
                    $"Install {AppName} {Version}?\n\n" +
                    $"Location:\n{installDir}\n\n" +
                    "No administrator rights required.\nInternet is needed when using the app.",
                    $"{AppName} Setup",
                    0x00000001 /* MB_OKCANCEL */ | 0x00000040 /* MB_ICONINFORMATION */);
                if (r != 1 /* IDOK */) return 1;
            }

            Console.WriteLine($"Installing {AppName} {Version}...");
            Directory.CreateDirectory(installDir);

            using (var zip = OpenPayload())
            {
                // Clear previous payload files carefully
                foreach (var file in Directory.EnumerateFiles(installDir, "*", SearchOption.AllDirectories))
                {
                    try { File.Delete(file); } catch { /* in use */ }
                }
                ZipFile.ExtractToDirectory(zip, installDir, overwriteFiles: true);
            }

            var exe = Path.Combine(installDir, ExeName);
            if (!File.Exists(exe))
                throw new InvalidOperationException($"Missing {ExeName} after extract.");

            var icon = Path.Combine(installDir, "Assets", "app.ico");
            if (!File.Exists(icon)) icon = exe;

            CreateShortcut(
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", $"{AppName}.lnk"),
                exe, installDir, icon, AppName);
            CreateShortcut(
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), $"{AppName}.lnk"),
                exe, installDir, icon, AppName);

            WriteUninstallHelper(installDir);
            RegisterUninstall(installDir, exe, icon);

            Console.WriteLine($"Installed to: {installDir}");

            if (!silent)
            {
                var launch = MessageBox(
                    $"{AppName} installed successfully.\n\nLaunch now?",
                    $"{AppName} Setup",
                    0x00000004 /* MB_YESNO */ | 0x00000040);
                if (launch == 6 /* IDYES */)
                {
                    Process.Start(new ProcessStartInfo(exe) { UseShellExecute = true, WorkingDirectory = installDir });
                }
            }

            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex);
            MessageBox(ex.Message, $"{AppName} Setup — Error", 0x00000010);
            return 2;
        }
    }

    private static Stream OpenPayload()
    {
        var asm = Assembly.GetExecutingAssembly();
        var name = asm.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("payload.zip", StringComparison.OrdinalIgnoreCase));
        if (name is null)
            throw new InvalidOperationException("Embedded payload.zip not found.");
        return asm.GetManifestResourceStream(name)
               ?? throw new InvalidOperationException("Cannot open payload stream.");
    }

    private static void WriteUninstallHelper(string installDir)
    {
        var setupCopy = Path.Combine(installDir, "CloudConverter-Uninstall.exe");
        try
        {
            File.Copy(Environment.ProcessPath!, setupCopy, overwrite: true);
        }
        catch
        {
            // ignore if locked
        }

        var ps = """
$dest = Join-Path $env:LOCALAPPDATA 'Programs\CloudConverter'
Remove-Item (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Convertek.lnk') -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Convertek.lnk') -Force -ErrorAction SilentlyContinue
Remove-Item 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\CloudConverter.Desktop' -Recurse -Force -ErrorAction SilentlyContinue
$u = Join-Path $dest 'CloudConverter-Uninstall.exe'
if (Test-Path $u) { Start-Process $u -ArgumentList '/uninstall','/S' -Wait }
else { Remove-Item $dest -Recurse -Force -ErrorAction SilentlyContinue }
Write-Host 'Convertek removed.'
""";
        File.WriteAllText(Path.Combine(installDir, "uninstall.ps1"), ps, Encoding.UTF8);
    }

    private static int DoUninstall(string installDir, bool silent)
    {
        if (!silent)
        {
            var r = MessageBox($"Uninstall {AppName}?", $"{AppName} Setup", 0x00000001 | 0x00000030);
            if (r != 1) return 1;
        }

        try
        {
            var start = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", $"{AppName}.lnk");
            var desk = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), $"{AppName}.lnk");
            if (File.Exists(start)) File.Delete(start);
            if (File.Exists(desk)) File.Delete(desk);
        }
        catch { /* ok */ }

        UnregisterUninstall();

        try
        {
            if (Directory.Exists(installDir))
                Directory.Delete(installDir, recursive: true);
        }
        catch
        {
            // delete what we can; common when setup is running from inside folder
            foreach (var f in Directory.EnumerateFiles(installDir, "*", SearchOption.AllDirectories))
            {
                try
                {
                    if (!f.EndsWith("CloudConverter-Uninstall.exe", StringComparison.OrdinalIgnoreCase)
                        && !f.Equals(Environment.ProcessPath, StringComparison.OrdinalIgnoreCase))
                        File.Delete(f);
                }
                catch { /* ignore */ }
            }
        }

        if (!silent)
            MessageBox($"{AppName} has been removed.", $"{AppName} Setup", 0x00000040);
        return 0;
    }

    private static void RegisterUninstall(string installDir, string exe, string icon)
    {
        var keyPath = $@"Software\Microsoft\Windows\CurrentVersion\Uninstall\{AppId}";
        using var key = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(keyPath)
                        ?? throw new InvalidOperationException("Cannot write uninstall registry.");
        key.SetValue("DisplayName", AppName);
        key.SetValue("DisplayVersion", Version);
        key.SetValue("Publisher", AppName);
        key.SetValue("InstallLocation", installDir);
        key.SetValue("DisplayIcon", icon);
        key.SetValue("ApplicationVersion", Version);
        key.SetValue("EstimatedSize", EstimateSizeKb(installDir), Microsoft.Win32.RegistryValueKind.DWord);
        key.SetValue("NoModify", 1, Microsoft.Win32.RegistryValueKind.DWord);
        key.SetValue("NoRepair", 1, Microsoft.Win32.RegistryValueKind.DWord);
        var uninstaller = Path.Combine(installDir, "CloudConverter-Uninstall.exe");
        if (!File.Exists(uninstaller)) uninstaller = Environment.ProcessPath!;
        key.SetValue("UninstallString", $"\"{uninstaller}\" /uninstall");
        key.SetValue("QuietUninstallString", $"\"{uninstaller}\" /uninstall /S");
        $        key.SetValue("URLInfoAbout", "https://www.convertek.tech");
    }

    private static void UnregisterUninstall()
    {
        try
        {
            Microsoft.Win32.Registry.CurrentUser.DeleteSubKeyTree(
                $@"Software\Microsoft\Windows\CurrentVersion\Uninstall\{AppId}",
                throwOnMissingSubKey: false);
        }
        catch { /* ok */ }
    }

    private static int EstimateSizeKb(string dir)
    {
        try
        {
            long bytes = Directory.EnumerateFiles(dir, "*", SearchOption.AllDirectories).Sum(f => new FileInfo(f).Length);
            return (int)Math.Max(1, bytes / 1024);
        }
        catch { return 50_000; }
    }

    private static void CreateShortcut(string shortcutPath, string target, string workDir, string icon, string description)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(shortcutPath)!);
        // Use WScript.Shell COM for .lnk
        var t = Type.GetTypeFromProgID("WScript.Shell")
                ?? throw new InvalidOperationException("WScript.Shell unavailable");
        dynamic shell = Activator.CreateInstance(t)!;
        var sc = shell.CreateShortcut(shortcutPath);
        sc.TargetPath = target;
        sc.WorkingDirectory = workDir;
        sc.IconLocation = $"{icon},0";
        sc.Description = description;
        sc.Save();
        Marshal.FinalReleaseComObject(sc);
        Marshal.FinalReleaseComObject(shell);
    }

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int MessageBox(IntPtr hWnd, string text, string caption, uint type);

    private static int MessageBox(string text, string caption, uint type) =>
        MessageBox(IntPtr.Zero, text, caption, type);
}
