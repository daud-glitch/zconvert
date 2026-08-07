using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Shell;

namespace CloudConverter.Desktop.Services;

/// <summary>
/// Borderless WPF windows oversize the monitor when maximized, which clips
/// the right edge (website vertical scrollbar). Lock max size to the work area.
/// </summary>
public static class MaximizeFix
{
    private const int WM_GETMINMAXINFO = 0x0024;
    private const uint MONITOR_DEFAULTTONEAREST = 0x00000002;

    public static void Attach(Window window)
    {
        window.SourceInitialized += (_, _) =>
        {
            var hwnd = new WindowInteropHelper(window).Handle;
            if (hwnd == IntPtr.Zero) return;
            var source = HwndSource.FromHwnd(hwnd);
            source?.AddHook(WndProc);
        };

        window.StateChanged += (_, _) => ApplyChromeForState(window);
        ApplyChromeForState(window);
    }

    private static void ApplyChromeForState(Window window)
    {
        var chrome = WindowChrome.GetWindowChrome(window);
        if (chrome is null) return;

        if (window.WindowState == WindowState.Maximized)
        {
            // No resize grip bleed when maximized — keeps content fully in view
            chrome.ResizeBorderThickness = new Thickness(0);
            chrome.CaptionHeight = 48;
        }
        else
        {
            chrome.ResizeBorderThickness = new Thickness(6);
            chrome.CaptionHeight = 48;
        }
    }

    private static IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == WM_GETMINMAXINFO)
        {
            WmGetMinMaxInfo(hwnd, lParam);
            handled = true;
        }
        return IntPtr.Zero;
    }

    private static void WmGetMinMaxInfo(IntPtr hwnd, IntPtr lParam)
    {
        var mmi = Marshal.PtrToStructure<MINMAXINFO>(lParam);
        var monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        if (monitor != IntPtr.Zero)
        {
            var monitorInfo = new MONITORINFO();
            monitorInfo.cbSize = Marshal.SizeOf<MONITORINFO>();
            if (GetMonitorInfo(monitor, ref monitorInfo))
            {
                var rcWork = monitorInfo.rcWork;
                var rcMonitor = monitorInfo.rcMonitor;

                mmi.ptMaxPosition.X = Math.Abs(rcWork.Left - rcMonitor.Left);
                mmi.ptMaxPosition.Y = Math.Abs(rcWork.Top - rcMonitor.Top);
                mmi.ptMaxSize.X = Math.Abs(rcWork.Right - rcWork.Left);
                mmi.ptMaxSize.Y = Math.Abs(rcWork.Bottom - rcWork.Top);
                mmi.ptMaxTrackSize.X = mmi.ptMaxSize.X;
                mmi.ptMaxTrackSize.Y = mmi.ptMaxSize.Y;
            }
        }

        Marshal.StructureToPtr(mmi, lParam, true);
    }

    [DllImport("user32.dll")]
    private static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT
    {
        public int X;
        public int Y;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MINMAXINFO
    {
        public POINT ptReserved;
        public POINT ptMaxSize;
        public POINT ptMaxPosition;
        public POINT ptMinTrackSize;
        public POINT ptMaxTrackSize;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    private struct MONITORINFO
    {
        public int cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public int dwFlags;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
