using System.Diagnostics;
using System.Drawing;
using System.Net.Http;
using System.Windows.Forms;

namespace CrazyBotLauncher;

internal sealed class TrayContext : ApplicationContext
{
    private readonly NotifyIcon _tray;
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(2) };
    private Process? _bot;
    private bool _closing;
    private bool _suppressRestart;
    private bool _browserOpened;

    private string AppDir => AppContext.BaseDirectory;
    private string ConfigDir => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
        "Crazy Bot"
    );

    public TrayContext()
    {
        Directory.CreateDirectory(ConfigDir);

        var menu = new ContextMenuStrip();
        menu.Items.Add("Dashboard öffnen", null, (_, _) => OpenDashboard());
        menu.Items.Add("Bot neu starten", null, async (_, _) => await RestartBotAsync());
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Crazy Bot beenden", null, (_, _) => ExitBot());

        _tray = new NotifyIcon
        {
            Text = "Crazy Bot Testversion",
            Icon = SystemIcons.Application,
            Visible = true,
            ContextMenuStrip = menu
        };
        _tray.DoubleClick += (_, _) => OpenDashboard();

        StartBot();

        _tray.BalloonTipTitle = "Crazy Bot";
        _tray.BalloonTipText = "Crazy Bot wird gestartet. Das Dashboard öffnet sich automatisch.";
        _tray.ShowBalloonTip(2500);
    }

    private void StartBot()
    {
        if (_closing) return;

        var node = Path.Combine(AppDir, "runtime", "node.exe");
        var entry = Path.Combine(AppDir, "dist", "src", "index.js");

        if (!File.Exists(node) || !File.Exists(entry))
        {
            MessageBox.Show(
                "Crazy Bot konnte nicht gestartet werden, weil Programmdateien fehlen. Bitte die Testversion erneut installieren.",
                "Crazy Bot",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
            ExitBot();
            return;
        }

        var psi = new ProcessStartInfo
        {
            FileName = node,
            WorkingDirectory = AppDir,
            UseShellExecute = false,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden
        };
        psi.ArgumentList.Add(entry);
        psi.Environment["CRAZY_BOT_CONFIG_DIR"] = ConfigDir;

        _bot = new Process { StartInfo = psi, EnableRaisingEvents = true };
        _bot.Exited += async (_, _) =>
        {
            if (_closing || _suppressRestart) return;

            int exitCode = -1;
            try { exitCode = _bot?.ExitCode ?? -1; } catch { }

            await Task.Delay(exitCode == 42 ? 500 : 3000);

            if (!_closing && !_suppressRestart)
                StartBot();
        };

        try
        {
            _bot.Start();
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "Crazy Bot konnte nicht gestartet werden:\n\n" + ex.Message,
                "Crazy Bot",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
            ExitBot();
            return;
        }

        if (!_browserOpened)
        {
            _browserOpened = true;
            _ = Task.Run(OpenDashboardWhenReadyAsync);
        }
    }

    private async Task OpenDashboardWhenReadyAsync()
    {
        for (var i = 0; i < 60 && !_closing; i++)
        {
            try
            {
                using var response = await _http.GetAsync("http://127.0.0.1:3210/api/status");
                if (response.IsSuccessStatusCode)
                {
                    OpenDashboard();
                    return;
                }
            }
            catch { }

            await Task.Delay(500);
        }

        if (!_closing)
        {
            _tray.BalloonTipTitle = "Crazy Bot";
            _tray.BalloonTipText = "Das Dashboard konnte nicht automatisch erreicht werden. Rechtsklick auf das Tray-Symbol für weitere Optionen.";
            _tray.ShowBalloonTip(5000);
        }
    }

    private static void OpenDashboard()
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "http://127.0.0.1:3210",
                UseShellExecute = true
            });
        }
        catch { }
    }

    private async Task RestartBotAsync()
    {
        _suppressRestart = true;
        try
        {
            if (_bot is { HasExited: false })
            {
                _bot.Kill(entireProcessTree: true);
                await _bot.WaitForExitAsync();
            }
        }
        catch { }
        finally
        {
            _bot?.Dispose();
            _bot = null;
            _suppressRestart = false;
        }

        StartBot();
    }

    private void ExitBot()
    {
        if (_closing) return;
        _closing = true;
        _suppressRestart = true;

        try
        {
            if (_bot is { HasExited: false })
                _bot.Kill(entireProcessTree: true);
        }
        catch { }

        _bot?.Dispose();
        _http.Dispose();
        _tray.Visible = false;
        _tray.Dispose();
        ExitThread();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing && !_closing)
            ExitBot();
        base.Dispose(disposing);
    }
}

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new TrayContext());
    }
}
