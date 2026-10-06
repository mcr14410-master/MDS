// TS_LibExport – Erkundungslauf über die TopSolid-Werkzeugbibliotheken (nur lesend)
// Schreibt nach  <exe-Ordner>\LibExport\probe_<Zeit>\ :
//   projekte.txt              – alle Bibliotheksprojekte
//   <Bibliothek>_baum.txt     – Ordnerbaum mit Dokumentanzahl und Dokumentnamen
//   <Bibliothek>_dokumente.csv – alle Dokumente mit PDM-Stammdaten (Hersteller, Bestellnr. …)
//   <Bibliothek>_proben.txt   – Stichproben: Eigenschaften, Parameter, Familien-Katalog, Referenzen, CAM-Werkzeugdaten
//   protokoll.txt             – Konsolenausgabe
// Aufruf: TS_LibExport.exe [--lib "Name"]... [--proben N] [--max M] [--nopause]
//         TS_LibExport.exe --export [--glb] [--step]   → vollständiger Export (components.json, tools.json), siehe Export.cs
//   --lib     Bibliotheksname (mehrfach möglich), Standard: aus TS_LibExport.ini bzw. FIRMA-Bibliotheken
//   --proben  Stichproben je Ordner (Standard 1)
//   --max     maximal Stichproben je Bibliothek (Standard 40)

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using TopSolid.Kernel.Automating;
using TopSolid.Cam.NC.Kernel.Automating;
using ParameterType = TopSolid.Kernel.Automating.ParameterType;
using ParameterId = TopSolid.Cam.NC.Kernel.Automating.ParameterId;

internal static partial class Program
{
    private const string TopSolidBin = @"C:\Program Files\TopSolid\TopSolid 7.17\bin";
    private static StreamWriter log;
    private static bool camOk;

    private static int Main(string[] args)
    {
        AppDomain.CurrentDomain.AssemblyResolve += (s, e) =>
        {
            string pfad = Path.Combine(TopSolidBin, new AssemblyName(e.Name).Name + ".dll");
            return File.Exists(pfad) ? Assembly.LoadFrom(pfad) : null;
        };
        int rc;
        try { rc = Ausfuehren(args); }
        catch (Exception ex) { rc = Fehler(ex.ToString()); }
        if (log != null) log.Dispose();
        if (Array.IndexOf(args, "--nopause") < 0) { Console.WriteLine("Taste drücken zum Beenden ..."); Console.ReadKey(); }
        return rc;
    }

    private static void P(string s) { Console.WriteLine(s); if (log != null) { log.WriteLine(s); log.Flush(); } }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static int Ausfuehren(string[] args)
    {
        // Argumente / ini
        var libs = new List<string>();
        int proben = 1, max = 40;
        for (int i = 0; i < args.Length; i++)
        {
            if (args[i] == "--lib" && i + 1 < args.Length) libs.Add(args[++i]);
            else if (args[i] == "--proben" && i + 1 < args.Length) proben = int.Parse(args[++i]);
            else if (args[i] == "--max" && i + 1 < args.Length) max = int.Parse(args[++i]);
        }
        string ini = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "TS_LibExport.ini");
        if (libs.Count == 0 && File.Exists(ini))
            foreach (string z in File.ReadAllLines(ini, Encoding.UTF8))
            {
                string t = z.Trim();
                if (t.StartsWith("Bibliothek", StringComparison.OrdinalIgnoreCase) && t.Contains("="))
                { string v = t.Substring(t.IndexOf('=') + 1).Trim(); if (v.Length > 0) libs.Add(v); }
                else if (t.StartsWith("Proben", StringComparison.OrdinalIgnoreCase) && t.Contains("=")) int.TryParse(t.Substring(t.IndexOf('=') + 1).Trim(), out proben);
                else if (t.StartsWith("MaxProben", StringComparison.OrdinalIgnoreCase) && t.Contains("=")) int.TryParse(t.Substring(t.IndexOf('=') + 1).Trim(), out max);
            }
        if (libs.Count == 0) libs.AddRange(new[] { "FIRMA Werkzeugkomponenten", "FIRMA Werkzeuge" });

        bool export = args.Contains("--export"), glb = args.Contains("--glb"), step = args.Contains("--step");
        string outDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "LibExport", (export ? "export_" : "probe_") + DateTime.Now.ToString("yyyyMMdd_HHmmss"));
        Directory.CreateDirectory(outDir);
        log = new StreamWriter(Path.Combine(outDir, "protokoll.txt"), false, new UTF8Encoding(true));

        TopSolidHost.Connect();
        if (!TopSolidHost.IsConnected) return Fehler("Keine Verbindung zu TopSolid.");
        try { TopSolidCamHost.Connect(); camOk = TopSolidCamHost.IsConnected; } catch { camOk = false; }
        P("TopSolid verbunden" + (camOk ? " (inkl. Cam)" : " (ohne Cam)") + ". Ausgabe: " + outDir);

        try
        {
            // Offene Dokumente merken, damit wir nur selbst geöffnete wieder schließen
            var offenVorher = new HashSet<string>();
            try { foreach (DocumentId d in TopSolidHost.Documents.GetOpenDocuments()) offenVorher.Add(d.PdmDocumentId); } catch { }

            if (export) return Export(libs, outDir, glb, step);

            // 1) Alle Bibliotheksprojekte
            var sbP = new StringBuilder();
            List<PdmObjectId> alle = TopSolidHost.Pdm.GetProjects(false, true);
            foreach (PdmObjectId p in alle) sbP.AppendLine(T(() => TopSolidHost.Pdm.GetName(p)) + "\t" + p.Id);
            File.WriteAllText(Path.Combine(outDir, "projekte.txt"), sbP.ToString(), new UTF8Encoding(true));
            P("Bibliotheksprojekte: " + alle.Count + " (siehe projekte.txt)");

            foreach (string lib in libs)
            {
                P("");
                P("##### " + lib);
                PdmObjectId proj = alle.FirstOrDefault(p => string.Equals(T(() => TopSolidHost.Pdm.GetName(p)), lib, StringComparison.OrdinalIgnoreCase));
                if (proj.IsEmpty)
                {
                    try { proj = TopSolidHost.Pdm.SearchProjectByName(lib).FirstOrDefault(); } catch { }
                }
                if (proj.IsEmpty) { P("  nicht gefunden – Namen in projekte.txt prüfen"); continue; }

                string tag = Sauber(lib);
                var baum = new StringBuilder();
                var csv = new StringBuilder("Ordner;Name;Typ;Endung;Hersteller;Herstellernr;Sachnummer;Zusatznummer;Beschreibung;Kommentar;PdmId\r\n");
                var probenListe = new List<KeyValuePair<string, PdmObjectId>>();
                var endungen = new Dictionary<string, int>();
                int nDocs = 0, nFolders = 0;

                Lauf(proj, "", 0, baum, csv, probenListe, endungen, proben, ref nDocs, ref nFolders);

                File.WriteAllText(Path.Combine(outDir, tag + "_baum.txt"), baum.ToString(), new UTF8Encoding(true));
                File.WriteAllText(Path.Combine(outDir, tag + "_dokumente.csv"), csv.ToString(), new UTF8Encoding(true));
                P("  Ordner: " + nFolders + ", Dokumente: " + nDocs);
                foreach (var kv in endungen.OrderByDescending(k => k.Value)) P("    " + kv.Key + ": " + kv.Value);

                // 2) Stichproben
                var sb = new StringBuilder();
                int n = 0;
                foreach (var kv in probenListe)
                {
                    if (n++ >= max) break;
                    P("  Probe " + n + ": " + kv.Key);
                    Probe(kv.Key, kv.Value, sb, offenVorher);
                }
                File.WriteAllText(Path.Combine(outDir, tag + "_proben.txt"), sb.ToString(), new UTF8Encoding(true));
            }
            P("");
            P("Fertig: " + outDir);
            return 0;
        }
        finally
        {
            if (camOk && TopSolidCamHost.IsConnected) TopSolidCamHost.Disconnect();
            if (TopSolidHost.IsConnected) TopSolidHost.Disconnect();
        }
    }

    // Rekursiver Lauf durch den Ordnerbaum
    private static void Lauf(PdmObjectId owner, string pfad, int tiefe, StringBuilder baum, StringBuilder csv,
                             List<KeyValuePair<string, PdmObjectId>> probenListe, Dictionary<string, int> endungen, int proben,
                             ref int nDocs, ref int nFolders)
    {
        List<PdmObjectId> folders = null, docs = null;
        try { TopSolidHost.Pdm.GetConstituents(owner, out folders, out docs); }
        catch (Exception ex) { baum.AppendLine(new string(' ', tiefe * 2) + "<Fehler: " + ex.Message + ">"); return; }
        folders = folders ?? new List<PdmObjectId>(); docs = docs ?? new List<PdmObjectId>();

        int genommen = 0;
        foreach (PdmObjectId d in docs)
        {
            nDocs++;
            string ext = "";
            string typ = T(() => { string e; var t = TopSolidHost.Pdm.GetType(d, out e); ext = e ?? ""; return t.ToString(); });
            string key = ext.Length > 0 ? ext : typ;
            endungen[key] = (endungen.ContainsKey(key) ? endungen[key] : 0) + 1;
            string name = T(() => TopSolidHost.Pdm.GetName(d));
            baum.AppendLine(new string(' ', tiefe * 2 + 2) + "- " + name + "  [" + ext + "]");
            csv.AppendLine(string.Join(";", new[] {
                pfad, name, typ, ext,
                T(() => TopSolidHost.Pdm.GetManufacturer(d)),
                T(() => TopSolidHost.Pdm.GetManufacturerPartNumber(d)),
                T(() => TopSolidHost.Pdm.GetPartNumber(d)),
                T(() => TopSolidHost.Pdm.GetComplementaryPartNumber(d)),
                T(() => TopSolidHost.Pdm.GetDescription(d)),
                T(() => TopSolidHost.Pdm.GetComment(d)),
                d.Id }.Select(Csv)));
            if (genommen < proben && typ == "TopSolidDocument") { probenListe.Add(new KeyValuePair<string, PdmObjectId>(pfad + "/" + name, d)); genommen++; }
        }
        foreach (PdmObjectId f in folders)
        {
            nFolders++;
            string fn = T(() => TopSolidHost.Pdm.GetName(f));
            baum.AppendLine(new string(' ', tiefe * 2) + "[" + fn + "]");
            Lauf(f, pfad + "/" + fn, tiefe + 1, baum, csv, probenListe, endungen, proben, ref nDocs, ref nFolders);
        }
    }

    // Eine Stichprobe komplett ausgeben
    private static void Probe(string titel, PdmObjectId pdm, StringBuilder sb, HashSet<string> offenVorher)
    {
        sb.AppendLine("==================================================================");
        sb.AppendLine(titel);
        sb.AppendLine("PDM-Id: " + pdm.Id);
        DocumentId doc;
        try { doc = TopSolidHost.Documents.GetDocument(pdm); }
        catch (Exception ex) { sb.AppendLine("  GetDocument: " + ex.Message); return; }
        if (doc.IsEmpty) { sb.AppendLine("  Dokument leer"); return; }
        bool selbstGeoeffnet = false;

        sb.AppendLine("Typ: " + T(() => TopSolidHost.Documents.GetTypeFullName(doc)));
        sb.AppendLine("Virtuell: " + T(() => TopSolidHost.Documents.IsVirtualDocument(doc).ToString()));

        // Parameter – falls nicht geladen, einmal öffnen
        List<ElementId> pars = null;
        try { pars = TopSolidHost.Parameters.GetParameters(doc); }
        catch (Exception ex)
        {
            sb.AppendLine("  Parameter ohne Öffnen: " + ex.Message + " → öffne");
            try { TopSolidHost.Documents.Open(ref doc); selbstGeoeffnet = !offenVorher.Contains(doc.PdmDocumentId); pars = TopSolidHost.Parameters.GetParameters(doc); }
            catch (Exception ex2) { sb.AppendLine("  Parameter: " + ex2.Message); }
        }

        try
        {
            // Dokument-Eigenschaften
            sb.AppendLine("--- Eigenschaften");
            try
            {
                foreach (string pn in TopSolidHost.Documents.GetProperties(doc))
                    sb.AppendLine(string.Format("  {0,-70} {1,-28} {2}", pn, T(() => TopSolidHost.Documents.GetPropertyLocalizedName(doc, pn)), PropWert(doc, pn)));
            }
            catch (Exception ex) { sb.AppendLine("  " + ex.Message); }

            // Parameter
            sb.AppendLine("--- Parameter (" + (pars == null ? "?" : pars.Count.ToString()) + ")");
            if (pars != null)
                foreach (ElementId p in pars)
                    sb.AppendLine(string.Format("  {0,-30} {1,-40} {2,-12} {3}",
                        T(() => TopSolidHost.Elements.GetName(p)), T(() => TopSolidHost.Elements.GetFriendlyName(p)),
                        T(() => TopSolidHost.Parameters.GetParameterType(p).ToString()), ParWert(p)));

            // Familie / Katalog
            bool fam = false;
            try { fam = TopSolidHost.Families.IsFamily(doc); } catch { }
            sb.AppendLine("--- Familie: " + fam);
            if (fam)
            {
                try
                {
                    List<string> codes = TopSolidHost.Families.GetCodes(doc);
                    List<ElementId> cols = TopSolidHost.Families.GetCatalogColumnParameters(doc);
                    sb.AppendLine("  Codes: " + codes.Count + " | Spalten: " + string.Join(", ", cols.Select(c => T(() => TopSolidHost.Elements.GetFriendlyName(c)))));
                    foreach (string code in codes.Take(5))
                    {
                        ElementId row = TopSolidHost.Families.GetCatalogRow(doc, code);
                        var werte = cols.Select(c => T(() => Zelle(row, c)));
                        sb.AppendLine("  [" + code + "] " + string.Join(" | ", werte));
                    }
                }
                catch (Exception ex) { sb.AppendLine("  Katalog: " + ex.Message); }
            }

            // Referenzierte Dokumente (Baugruppe → Komponenten/Aufnahme)
            sb.AppendLine("--- Referenzierte Dokumente");
            try
            {
                foreach (DocumentId r in TopSolidHost.Documents.GetReferencedDocuments(doc, true))
                {
                    PdmObjectId rp = default(PdmObjectId);
                    try { rp = TopSolidHost.Documents.GetPdmObject(r); } catch { }
                    sb.AppendLine("  " + T(() => TopSolidHost.Documents.GetName(r)) + "  | " + T(() => TopSolidHost.Documents.GetTypeFullName(r))
                        + (rp.IsEmpty ? "" : "  | Herst.: " + T(() => TopSolidHost.Pdm.GetManufacturer(rp)) + " " + T(() => TopSolidHost.Pdm.GetManufacturerPartNumber(rp)) + "  | " + rp.Id));
                }
            }
            catch (Exception ex) { sb.AppendLine("  " + ex.Message); }

            // CAM-Werkzeugelemente (für Werkzeug-Baugruppen: T-Nummer, Ausspannlänge …)
            if (camOk)
            {
                try
                {
                    var tools = TopSolidHost.Elements.GetElements(doc).Where(e => { try { return TopSolidCamHost.Tools.IsTool(e); } catch { return false; } }).ToList();
                    sb.AppendLine("--- CAM-Werkzeugelemente: " + tools.Count);
                    foreach (ElementId t in tools.Take(2))
                    {
                        sb.AppendLine("  * " + T(() => TopSolidHost.Elements.GetFriendlyName(t)));
                        foreach (ParameterId cp in TopSolidCamHost.Tools.GetParameters(t))
                        {
                            string full = T(() => TopSolidCamHost.Parameters.GetFullName(cp)).Replace("$TopSolid.Cam.NC.Kernel.DB.Tools.Entities.Tool.", "~");
                            string val = T(() => TopSolidCamHost.Parameters.ToStringValue(cp));
                            if (val.Length > 0 && val != "0mm" && val != "0°" && val != "0") sb.AppendLine(string.Format("    {0,-55} {1}", full, val));
                        }
                    }
                }
                catch (Exception ex) { sb.AppendLine("--- CAM: " + ex.Message); }
            }
        }
        finally
        {
            if (selbstGeoeffnet) { try { TopSolidHost.Documents.Close(doc, false, false); } catch { } }
        }
    }

    private static string PropWert(DocumentId doc, string pn)
    {
        try
        {
            switch (TopSolidHost.Documents.GetPropertyType(doc, pn))
            {
                case PropertyType.Real:
                    UnitType ut; string sym; TopSolidHost.Documents.GetPropertyRealUnit(doc, pn, out ut, out sym);
                    return TopSolidHost.Documents.GetPropertyRealValue(doc, pn).ToString("R", System.Globalization.CultureInfo.InvariantCulture) + " (SI, Anzeige " + sym + ")";
                case PropertyType.Integer: return TopSolidHost.Documents.GetPropertyIntegerValue(doc, pn).ToString();
                case PropertyType.Boolean: return TopSolidHost.Documents.GetPropertyBooleanValue(doc, pn).ToString();
                case PropertyType.DateTime: return TopSolidHost.Documents.GetPropertyDateTimeValue(doc, pn).ToString("s");
                case PropertyType.Text: return TopSolidHost.Documents.GetPropertyTextValue(doc, pn);
                default: return "<" + TopSolidHost.Documents.GetPropertyType(doc, pn) + "> " + T(() => TopSolidHost.Documents.GetPropertyTextValue(doc, pn));
            }
        }
        catch (Exception ex) { return "<" + ex.GetType().Name + ">"; }
    }

    private static string ParWert(ElementId p)
    {
        try
        {
            switch (TopSolidHost.Parameters.GetParameterType(p))
            {
                case ParameterType.Real:
                    UnitType ut; string sym; TopSolidHost.Parameters.GetRealUnit(p, out ut, out sym);
                    return TopSolidHost.Parameters.GetRealValue(p).ToString("R", System.Globalization.CultureInfo.InvariantCulture) + " (SI, " + ut + "/" + sym + ")";
                case ParameterType.Integer: return TopSolidHost.Parameters.GetIntegerValue(p).ToString();
                case ParameterType.Boolean: return TopSolidHost.Parameters.GetBooleanValue(p).ToString();
                case ParameterType.Text: return TopSolidHost.Parameters.GetTextValue(p);
                case ParameterType.DateTime: return TopSolidHost.Parameters.GetDateTimeValue(p).ToString("s");
                case ParameterType.Code: return TopSolidHost.Parameters.GetCodeValue(p);
                case ParameterType.Enumeration: return TopSolidHost.Parameters.GetEnumerationText(p);
                case ParameterType.UserEnumeration: return TopSolidHost.Parameters.GetUserEnumerationText(p);
                case ParameterType.Family: return TopSolidHost.Documents.GetName(TopSolidHost.Parameters.GetFamilyValue(p));
                default: return "";
            }
        }
        catch (Exception ex) { return "<" + ex.GetType().Name + ">"; }
    }

    private static string Zelle(ElementId row, ElementId col)
    {
        switch (TopSolidHost.Parameters.GetParameterType(col))
        {
            case ParameterType.Real: return TopSolidHost.Families.GetCatalogCellRealValue(row, col).ToString("R", System.Globalization.CultureInfo.InvariantCulture);
            case ParameterType.Integer: return TopSolidHost.Families.GetCatalogCellIntegerValue(row, col).ToString();
            case ParameterType.Boolean: return TopSolidHost.Families.GetCatalogCellBooleanValue(row, col).ToString();
            case ParameterType.Text: return TopSolidHost.Families.GetCatalogCellTextValue(row, col);
            case ParameterType.Code: return TopSolidHost.Families.GetCatalogCellCodeValue(row, col);
            case ParameterType.Enumeration: return TopSolidHost.Families.GetCatalogCellEnumerationValue(row, col).ToString();
            default: return "?";
        }
    }

    private static string T(Func<string> f) { try { return f() ?? ""; } catch (Exception ex) { return "<" + ex.GetType().Name + ">"; } }
    private static string Csv(string s) { s = s ?? ""; return (s.Contains(";") || s.Contains("\"") || s.Contains("\n")) ? "\"" + s.Replace("\"", "\"\"") + "\"" : s; }
    private static string Sauber(string s) { foreach (char c in Path.GetInvalidFileNameChars()) s = s.Replace(c, '_'); return s.Trim(); }
    private static int Fehler(string t) { Console.ForegroundColor = ConsoleColor.Red; P("FEHLER: " + t); Console.ResetColor(); return 1; }
}
