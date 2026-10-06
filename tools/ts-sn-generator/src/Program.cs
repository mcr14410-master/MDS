// TS_SN_Generator – Seriennummer-Gravur durchschalten und je Nummer G-Code ausgeben
// Kompiliert gegen TopSolid 7.17. Der Dateiname kommt aus dem Dokument (Parameter
// "Dateinamen Programme", z. B. ="TEIL-0001-"&Gravur2) – das Tool übernimmt ihn nur.
//
// Einstellungen stehen in TS_SN_Generator.ini neben der exe (Text, Start, Ende, ...).
// Optional per Aufruf überschreibbar (alle Argumente optional):
//   TsSerienGcode.exe <Parameter> <Präfix> <Von> <Bis> <Zielordner> [--test]
//   TsSerienGcode.exe Gravur2 SN 23 30 "Z:\NC\MASCHINE\_NEU_"
//
// --test    : nur die erste Nummer ausgeben, Log anzeigen, dann Ende.
// --nopause : am Ende nicht auf Tastendruck warten.

using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Runtime.CompilerServices;
using TopSolid.Kernel.Automating;
using TopSolid.Cam.NC.Kernel.Automating;

internal static class Program
{
    // TopSolid-DLLs zur Laufzeit direkt aus der Installation laden
    private const string TopSolidBin = @"C:\Program Files\TopSolid\TopSolid 7.17\bin";

    private static int Main(string[] args)
    {
        AppDomain.CurrentDomain.AssemblyResolve += (s, e) =>
        {
            string pfad = Path.Combine(TopSolidBin, new AssemblyName(e.Name).Name + ".dll");
            return File.Exists(pfad) ? Assembly.LoadFrom(pfad) : null;
        };
        int rc = Ausfuehren(args);
        if (Array.IndexOf(args, "--nopause") < 0)
        {
            Console.WriteLine("Taste drücken zum Beenden ...");
            Console.ReadKey();
        }
        return rc;
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static int Ausfuehren(string[] args)
    {
        // Einstellungen: erst Config-Datei, Aufrufparameter überschreiben sie
        Dictionary<string, string> cfg = LeseConfig();
        string paramName   = Arg(args, 0, Cfg(cfg, "Parameter", "Gravur2"));
        string praefix     = Arg(args, 1, Cfg(cfg, "Text", "SN"));
        string vonText     = Arg(args, 2, Cfg(cfg, "Start", ""));
        string bisText     = Arg(args, 3, Cfg(cfg, "Ende", ""));
        string zielordner  = Arg(args, 4, Cfg(cfg, "Zielordner", ""));   // leer = nur PP-Ausgabeordner
        bool testlauf      = Array.IndexOf(args, "--test") >= 0 || IstJa(Cfg(cfg, "Testlauf", "nein"));
        int stellen;
        if (!int.TryParse(Cfg(cfg, "Stellen", "2"), out stellen) || stellen < 1) stellen = 2;

        int von, bis;
        if (!int.TryParse(vonText, out von) || !int.TryParse(bisText, out bis))
            return Fehler("Start/Ende fehlen oder sind keine Zahlen (Start='" + vonText + "', Ende='" + bisText
                          + "'). Bitte in " + ConfigPfad + " eintragen.");
        if (bis < von) return Fehler("Ende (" + bis + ") ist kleiner als Start (" + von + ").");

        bool ohnePause = Array.IndexOf(args, "--nopause") >= 0;
        List<NamensVorlage> vorlagen = null;
        DocumentId doc = DocumentId.Empty;
        // Ordner, in denen nach schon vorhandenen Nummern gesucht wird (Zielordner + PP-Ausgabeordner)
        var bekannteOrdner = new List<string>();
        if (!string.IsNullOrWhiteSpace(zielordner)) bekannteOrdner.Add(zielordner);
        try
        {
            // --- Verbindung zum laufenden TopSolid ---------------------------
            TopSolidHost.Connect();
            if (!TopSolidHost.IsConnected) return Fehler("Keine Verbindung zu TopSolid.");
            TopSolidCamHost.Connect();
            if (!TopSolidCamHost.IsConnected) return Fehler("Keine Verbindung zu TopSolid'Cam.");

            doc = TopSolidHost.Documents.EditedDocument;
            if (doc.IsEmpty) return Fehler("Kein Dokument in Bearbeitung.");
            if (!TopSolidCamHost.Documents.IsCam(doc))
                return Fehler("Das aktive Dokument '" + TopSolidHost.Documents.GetName(doc) + "' ist kein CAM-Dokument.");

            ElementId param = SucheParameter(doc, paramName);
            if (param.IsEmpty) return Fehler("Parameter '" + paramName + "' im Dokument '"
                                             + TopSolidHost.Documents.GetName(doc) + "' nicht gefunden.");
            string aktuellerWert = TopSolidHost.Parameters.GetTextValue(param);

            string pp = "";
            try { pp = TopSolidCamHost.NCPostProcessor.GetNCPostProcessorId(doc); } catch { }

            // --- Zusammenfassung + Bestätigung -------------------------------
            Console.WriteLine("Dokument   : " + TopSolidHost.Documents.GetName(doc));
            Console.WriteLine("Postproz.  : " + (string.IsNullOrEmpty(pp) ? "(im Dokument eingestellt)" : pp));
            Console.WriteLine("Parameter  : " + paramName + " = " + aktuellerWert);

            string vorlagenFehler;
            vorlagen = ErmittleNamensVorlagen(doc, paramName, aktuellerWert, out vorlagenFehler);
            if (vorlagen == null) return Fehler(vorlagenFehler);

            Console.WriteLine("Nummern    : " + praefix + von.ToString("D" + stellen) + " ... "
                              + praefix + bis.ToString("D" + stellen) + "  (" + (bis - von + 1) + " Programme)"
                              + (testlauf ? "   [TESTLAUF: nur erste Nummer]" : ""));
            Console.WriteLine("Zielordner : " + (bekannteOrdner.Count > 0 ? zielordner : "(nur PP-Ausgabeordner)"));
            if (!ohnePause)
            {
                Console.Write("Starten? [J/n] ");
                string antwort = (Console.ReadLine() ?? "").Trim().ToLowerInvariant();
                if (antwort == "n" || antwort == "nein") { vorlagen = null; Console.WriteLine("Abgebrochen."); return 0; }
            }

            if (bekannteOrdner.Count > 0) Directory.CreateDirectory(zielordner);

            for (int i = von; i <= bis; i++)
            {
                string sn = praefix + i.ToString("D" + stellen);
                // Gibt es schon ein Programm mit dieser Nummer im Zielordner? -> überspringen
                string vorhanden = SucheVorhandene(bekannteOrdner, sn);
                if (vorhanden != null)
                {
                    Console.WriteLine(sn + ": " + vorhanden + " existiert schon – übersprungen.");
                    continue;
                }

                // --- 1. Parameter setzen (in Modifikations-Klammer) -----------
                if (!TopSolidHost.Application.StartModification("Gravur " + sn, false))
                    return Fehler("StartModification fehlgeschlagen.");
                try
                {
                    TopSolidHost.Documents.EnsureIsDirty(ref doc);
                    param = SucheParameter(doc, paramName);   // DocumentId kann sich geändert haben
                    TopSolidHost.Parameters.SetTextValue(param, sn);
                    // --- 2. Neu rechnen: erledigt EndModification(.., inUpdates: true)
                    TopSolidHost.Application.EndModification(true, true);
                }
                catch
                {
                    TopSolidHost.Application.EndModification(false, false);
                    throw;
                }

                // --- 2b. Bearbeitungen neu rechnen (entspricht Strg+U) ----------
                int veraltet = AktualisiereBearbeitungen(doc);
                if (veraltet > 0)
                    return Fehler(sn + ": " + veraltet + " Bearbeitung(en) nach dem Aktualisieren immer noch nicht aktuell – "
                                  + "kein G-Code ausgegeben, damit keine falsche Gravur rausgeht.");

                // --- 2c. Programm-Dateinamen neu auswerten lassen ----------------
                string fehlerName = SetzeDateinamen(doc, vorlagen, sn);
                if (fehlerName != null) return Fehler(sn + ": " + fehlerName + " – kein G-Code ausgegeben.");

                // --- 3. G-Code mit dem im Dokument eingestellten PP ------------
                List<string> log;
                List<string> dateien = TopSolidCamHost.NCPostProcessor.GenerateNCCodesWithOptions(
                    doc, string.Empty, new List<KeyValue>(), out log);

                if (testlauf || dateien == null || dateien.Count == 0)
                    foreach (string zeile in log ?? new List<string>()) Console.WriteLine("   PP: " + zeile);

                if (dateien == null || dateien.Count == 0)
                    return Fehler(sn + ": PP hat keine Datei geliefert.");
                // --- 4. Prüfen und ggf. in den Zielordner kopieren (Name kommt vom PP)
                foreach (string quelle in dateien)
                {
                    if (Path.GetFileName(quelle).IndexOf(sn, StringComparison.Ordinal) < 0)
                        return Fehler(sn + ": PP hat unter falschem Namen gespeichert: " + quelle
                                      + " – bitte diese Datei prüfen/löschen!");
                    string ppOrdner = Path.GetDirectoryName(quelle);
                    if (!bekannteOrdner.Exists(o => string.Equals(Path.GetFullPath(o).TrimEnd('\\'),
                            Path.GetFullPath(ppOrdner).TrimEnd('\\'), StringComparison.OrdinalIgnoreCase)))
                        bekannteOrdner.Add(ppOrdner);

                    string ziel = quelle;
                    if (!string.IsNullOrWhiteSpace(zielordner))
                    {
                        ziel = Path.Combine(zielordner, Path.GetFileName(quelle));
                        if (!string.Equals(Path.GetFullPath(quelle), Path.GetFullPath(ziel), StringComparison.OrdinalIgnoreCase))
                            File.Copy(quelle, ziel, true);
                    }
                    Console.WriteLine(sn + ": " + ziel + (ziel == quelle ? "" : "  (PP-Ausgabe: " + quelle + ")"));

                    // Kontrolle: steht die Seriennummer wirklich in der Datei?
                    if (File.ReadAllText(ziel).IndexOf(sn, StringComparison.Ordinal) < 0)
                        Console.WriteLine("   WARNUNG: '" + sn + "' kommt im Programm nicht vor!");
                }

                if (testlauf) { Console.WriteLine("Testlauf beendet."); break; }
            }

            Console.WriteLine("Fertig. Dokument ist NICHT gespeichert.");
            return 0;
        }
        catch (Exception ex)
        {
            return Fehler(ex.ToString());
        }
        finally
        {
            if (TopSolidHost.IsConnected) StelleFormelWiederHer(doc, vorlagen);
            if (TopSolidCamHost.IsConnected) TopSolidCamHost.Disconnect();
            if (TopSolidHost.IsConnected) TopSolidHost.Disconnect();
        }
    }

    // Veraltete Bearbeitungen neu rechnen. Rückgabe: Anzahl, die danach noch veraltet sind.
    private static int AktualisiereBearbeitungen(DocumentId doc)
    {
        List<ElementId> ops = TopSolidCamHost.Operations.GetOperations(doc);
        if (ops == null || ops.Count == 0) return 0;

        int vorher = ZaehleVeraltete(ops);
        Console.WriteLine("   Bearbeitungen: " + ops.Count + ", davon veraltet: " + vorher);
        if (vorher == 0) return 0;

        int nachher = vorher;
        {
            // Nur die veralteten Bearbeitungen einzeln neu rechnen.
            // (RefreshOperations über alles hat nicht gewirkt und die Szenario-Meldung ausgelöst.)
            foreach (ElementId op in ops)
            {
                if (TopSolidCamHost.Operations.IsUpToDate(new ElementExId(op))) continue;
                Console.WriteLine("   rechne neu: " + TopSolidCamHost.Operations.GetDescription(new ElementExId(op)));
                try
                {
                    if (!TopSolidHost.Application.StartModification("Bearbeitung ausführen", false)) continue;
                    try
                    {
                        TopSolidCamHost.Operations.Execute(op);
                        TopSolidHost.Application.EndModification(true, true);
                    }
                    catch { TopSolidHost.Application.EndModification(false, false); throw; }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("   " + TopSolidCamHost.Operations.GetDescription(new ElementExId(op)) + ": " + ex.Message);
                    continue;
                }
            }
            nachher = ZaehleVeraltete(ops);
        }
        Console.WriteLine("   Nach Aktualisierung veraltet: " + nachher);
        return nachher;
    }

    // Der Programm-Dateiname ist eine Formel (z. B. ="TEIL-0001-"&Gravur2), die TopSolid nach
    // einer Parameteränderung per API nicht neu auswertet (auch Neusetzen der Formel hilft nicht).
    // Lösung: vor dem Lauf Formel aus aktuellem Namen + Parameterwert ableiten, pro Nummer den
    // Namen als festen Text setzen, am Ende die Formel wiederherstellen.
    private sealed class NamensVorlage
    {
        public ElementId Programm;
        public string Vor, Nach, Formel;
    }

    private static List<NamensVorlage> ErmittleNamensVorlagen(DocumentId doc, string paramName, string aktuellerWert, out string fehler)
    {
        fehler = null;
        var liste = new List<NamensVorlage>();
        List<ElementId> progs = TopSolidCamHost.Programs.GetPrograms(doc);
        if (progs == null || progs.Count == 0) { fehler = "kein CAM-Programm gefunden"; return null; }
        foreach (ElementId prog in progs)
        {
            string name = TopSolidCamHost.Programs.GetFileName(prog) ?? "";
            int pos = string.IsNullOrEmpty(aktuellerWert) ? -1 : name.LastIndexOf(aktuellerWert, StringComparison.Ordinal);
            if (pos < 0)
            {
                fehler = "Programm-Dateiname '" + name + "' enthält den aktuellen Wert '" + aktuellerWert
                       + "' nicht. Bitte einmal von Hand G-Code generieren (dann stimmt der Name) und neu starten.";
                return null;
            }
            var v = new NamensVorlage { Programm = prog, Vor = name.Substring(0, pos), Nach = name.Substring(pos + aktuellerWert.Length) };
            v.Formel = (v.Vor.Length > 0 ? "\"" + v.Vor + "\"&" : "") + paramName + (v.Nach.Length > 0 ? "&\"" + v.Nach + "\"" : "");
            Console.WriteLine("Programm-Dateiname: " + name + "   (Formel: =" + v.Formel + ")");
            liste.Add(v);
        }
        return liste;
    }

    private static string SetzeDateinamen(DocumentId doc, List<NamensVorlage> vorlagen, string sn)
    {
        if (!TopSolidHost.Application.StartModification("Dateiname " + sn, false))
            return "StartModification für Dateiname fehlgeschlagen";
        try
        {
            TopSolidHost.Documents.EnsureIsDirty(ref doc);
            foreach (var v in vorlagen)
                TopSolidCamHost.Programs.SetFileName(v.Programm, new SmartText(v.Vor + sn + v.Nach));
            TopSolidHost.Application.EndModification(true, true);
        }
        catch { TopSolidHost.Application.EndModification(false, false); throw; }

        foreach (var v in vorlagen)
        {
            string name = TopSolidCamHost.Programs.GetFileName(v.Programm) ?? "";
            Console.WriteLine("   Dateiname: " + name);
            if (!name.Contains(sn)) return "Dateiname ist '" + name + "' statt '" + v.Vor + sn + v.Nach + "'";
        }
        return null;
    }

    private static void StelleFormelWiederHer(DocumentId doc, List<NamensVorlage> vorlagen)
    {
        if (vorlagen == null || vorlagen.Count == 0) return;
        try
        {
            if (!TopSolidHost.Application.StartModification("Dateiname-Formel wiederherstellen", false)) return;
            try
            {
                TopSolidHost.Documents.EnsureIsDirty(ref doc);
                foreach (var v in vorlagen)
                    TopSolidCamHost.Programs.SetFileName(v.Programm,
                        new SmartText(SmartTextType.Formula, "", ElementId.Empty, ItemLabel.Empty, v.Formel));
                TopSolidHost.Application.EndModification(true, true);
                Console.WriteLine("Dateiname-Formel wiederhergestellt: =" + vorlagen[0].Formel);
            }
            catch { TopSolidHost.Application.EndModification(false, false); throw; }
        }
        catch (Exception ex)
        {
            Console.WriteLine("WARNUNG: Formel konnte nicht wiederhergestellt werden (" + ex.Message
                              + "). Bitte im G-Code-Dialog Dateiname wieder auf =" + vorlagen[0].Formel + " setzen.");
        }
    }

    private static int ZaehleVeraltete(List<ElementId> ops)
    {
        int n = 0;
        foreach (ElementId op in ops)
            if (!TopSolidCamHost.Operations.IsUpToDate(new ElementExId(op))) n++;
        return n;
    }

    // Erst über den internen Namen, sonst über den Anzeigenamen im Parameter-Ordner
    private static ElementId SucheParameter(DocumentId doc, string name)
    {
        ElementId id = TopSolidHost.Elements.SearchByName(doc, name);
        if (!id.IsEmpty) return id;
        foreach (ElementId p in TopSolidHost.Parameters.GetParameters(doc))
            if (string.Equals(TopSolidHost.Elements.GetFriendlyName(p), name, StringComparison.OrdinalIgnoreCase))
                return p;
        return ElementId.Empty;
    }

    private static string SucheVorhandene(List<string> ordner, string sn)
    {
        foreach (string o in ordner)
        {
            if (!Directory.Exists(o)) continue;
            string[] f = Directory.GetFiles(o, "*" + sn + ".*");
            if (f.Length > 0) return f[0];
        }
        return null;
    }

    private static string ConfigPfad =>
        Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "TS_SN_Generator.ini");

    // Einfaches Format:  Schlüssel = Wert   (Zeilen mit ; oder # sind Kommentare)
    private static Dictionary<string, string> LeseConfig()
    {
        var d = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!File.Exists(ConfigPfad)) return d;
        foreach (string roh in File.ReadAllLines(ConfigPfad))
        {
            string z = roh.Trim();
            if (z.Length == 0 || z.StartsWith(";") || z.StartsWith("#") || z.StartsWith("[")) continue;
            int i = z.IndexOf('=');
            if (i <= 0) continue;
            string wert = z.Substring(i + 1).Trim().Trim('"');
            d[z.Substring(0, i).Trim()] = wert;
        }
        return d;
    }

    private static string Cfg(Dictionary<string, string> d, string key, string standard)
    {
        string v;
        return d.TryGetValue(key, out v) && v.Length > 0 ? v : standard;
    }

    private static bool IstJa(string v)
    {
        v = (v ?? "").Trim().ToLowerInvariant();
        return v == "ja" || v == "j" || v == "1" || v == "true" || v == "yes";
    }

    private static string Arg(string[] a, int i, string standard)
        => a.Length > i && !a[i].StartsWith("--") ? a[i] : standard;

    private static int Fehler(string text)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine("FEHLER: " + text);
        Console.ResetColor();
        return 1;
    }
}
