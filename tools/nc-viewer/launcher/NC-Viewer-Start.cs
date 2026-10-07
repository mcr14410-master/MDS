// NC-Viewer-Start – öffnet ein NC-Programm per Rechtsklick direkt im NC-Viewer
//   NC-Viewer-Start.exe <Datei> [<Datei> ...]  → Viewer mit diesen Dateien öffnen
//   NC-Viewer-Start.exe --install              → Rechtsklick-Eintrag „Öffnen mit NC-Viewer“ anlegen (nur aktueller Benutzer)
//   NC-Viewer-Start.exe --uninstall            → Eintrag wieder entfernen
// Die exe muss neben NC-Viewer.html liegen. Liegt neben dem Programm eine STEP-Datei, deren Name ein
// Anfang des Programmnamens ist (z. B. TEIL-0001.stp zu TEIL-0001-SN22.H), wird sie mitgeladen.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using Microsoft.Win32;

internal static class Program
{
    private static readonly string[] Endungen = { ".h", ".nc" };
    private const string Verb = "NCViewer";
    private const string Titel = "NC-Viewer";

    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            if (args.Length == 0) return Hilfe();
            if (args[0] == "--install") return Installieren();
            if (args[0] == "--uninstall") return Deinstallieren();
            return Oeffnen(args);
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, Titel, MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    private static string ExeDir { get { return AppDomain.CurrentDomain.BaseDirectory; } }

    private static int Oeffnen(string[] dateien)
    {
        string viewer = Path.Combine(ExeDir, "NC-Viewer.html");
        if (!File.Exists(viewer)) throw new Exception("NC-Viewer.html nicht gefunden neben\n" + ExeDir);

        // Dateien sammeln: Programme + passende STEP-Datei aus demselben Ordner
        var liste = new List<string>();
        foreach (string d in dateien)
        {
            if (!File.Exists(d)) continue;
            liste.Add(d);
            string step = SucheStep(d);
            if (step != null && !liste.Contains(step, StringComparer.OrdinalIgnoreCase)) liste.Add(step);
        }
        if (liste.Count == 0) throw new Exception("Datei nicht gefunden:\n" + string.Join("\n", dateien));

        // Viewer-Kopie mit eingebetteten Dateien in %TEMP% schreiben
        string tmp = Path.Combine(Path.GetTempPath(), "NC-Viewer");
        Directory.CreateDirectory(tmp);
        Aufraeumen(tmp);

        var sb = new StringBuilder("<script>window.NC_PRELOAD=[");
        for (int i = 0; i < liste.Count; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append("{\"name\":").Append(Js(Path.GetFileName(liste[i])))
              .Append(",\"b64\":\"").Append(Convert.ToBase64String(File.ReadAllBytes(liste[i]))).Append("\"}");
        }
        sb.Append("];</script>");

        string html = File.ReadAllText(viewer, Encoding.UTF8);
        int pos = html.IndexOf("<body>", StringComparison.OrdinalIgnoreCase);
        if (pos < 0) throw new Exception("NC-Viewer.html hat unerwartetes Format (kein <body>).");
        html = html.Insert(pos + 6, sb.ToString());

        string name = Sauber(Path.GetFileNameWithoutExtension(dateien[0]));
        string ziel = Path.Combine(tmp, name + "_" + DateTime.Now.ToString("HHmmss_fff") + ".html");
        File.WriteAllText(ziel, html, new UTF8Encoding(false));
        Process.Start(new ProcessStartInfo(ziel) { UseShellExecute = true });
        return 0;
    }

    // STEP neben dem Programm: gleicher Name oder Name ist Anfang des Programmnamens (längster Treffer)
    private static string SucheStep(string prog)
    {
        try
        {
            string dir = Path.GetDirectoryName(Path.GetFullPath(prog));
            string basis = Path.GetFileNameWithoutExtension(prog);
            return Directory.GetFiles(dir)
                .Where(f => { string e = Path.GetExtension(f).ToLowerInvariant(); return e == ".stp" || e == ".step"; })
                .Where(f => basis.StartsWith(Path.GetFileNameWithoutExtension(f), StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(f => Path.GetFileNameWithoutExtension(f).Length)
                .FirstOrDefault();
        }
        catch { return null; }
    }

    // Temporäre Viewer-Kopien älter als 1 Tag löschen
    private static void Aufraeumen(string tmp)
    {
        foreach (string f in Directory.GetFiles(tmp, "*.html"))
            try { if (File.GetLastWriteTime(f) < DateTime.Now.AddDays(-1)) File.Delete(f); } catch { }
    }

    private static int Installieren()
    {
        string exe = Path.Combine(ExeDir, Path.GetFileName(Application.ExecutablePath));
        foreach (string ext in Endungen)
        {
            using (RegistryKey k = Registry.CurrentUser.CreateSubKey(@"Software\Classes\SystemFileAssociations\" + ext + @"\shell\" + Verb))
            {
                k.SetValue("", "Öffnen mit NC-Viewer");
                k.SetValue("Icon", "\"" + exe + "\"");
                using (RegistryKey c = k.CreateSubKey("command"))
                    c.SetValue("", "\"" + exe + "\" \"%1\"");
            }
        }
        MessageBox.Show("Rechtsklick-Eintrag „Öffnen mit NC-Viewer“ ist eingerichtet für: " + string.Join(", ", Endungen) +
                        "\n\nViewer: " + Path.Combine(ExeDir, "NC-Viewer.html") +
                        "\n\nWird der Ordner verschoben, einfach nochmal installieren.", Titel, MessageBoxButtons.OK, MessageBoxIcon.Information);
        return 0;
    }

    private static int Deinstallieren()
    {
        foreach (string ext in Endungen)
            try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Classes\SystemFileAssociations\" + ext + @"\shell\" + Verb, false); } catch { }
        MessageBox.Show("Rechtsklick-Eintrag entfernt.", Titel, MessageBoxButtons.OK, MessageBoxIcon.Information);
        return 0;
    }

    private static int Hilfe()
    {
        MessageBox.Show("NC-Viewer-Start\n\n" +
            "Einrichten: „Rechtsklick-Eintrag einrichten.bat“ doppelklicken.\n" +
            "Danach: Rechtsklick auf eine .H- oder .NC-Datei → „Öffnen mit NC-Viewer“.\n\n" +
            "Bei Windows 10 steht der Eintrag direkt im Menü, bei Windows 11 unter „Weitere Optionen anzeigen“.",
            Titel, MessageBoxButtons.OK, MessageBoxIcon.Information);
        return 0;
    }

    private static string Js(string s)
    {
        var b = new StringBuilder("\"");
        foreach (char c in s)
        {
            if (c == '"' || c == '\\') b.Append('\\').Append(c);
            else if (c == '<') b.Append("\\u003c");
            else if (c < 32) b.Append("\\u").Append(((int)c).ToString("x4"));
            else b.Append(c);
        }
        return b.Append('"').ToString();
    }
    private static string Sauber(string s) { foreach (char c in Path.GetInvalidFileNameChars()) s = s.Replace(c, '_'); return s; }
}
