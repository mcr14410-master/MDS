// TS_ToolExport – Werkzeuge aus dem aktiven TopSolid-CAM-Dokument auslesen (Erkundungsversion)
// Schreibt nach  <exe-Ordner>\ToolExport\<Dokument>\ :
//   tools.json  – alle Werkzeuge mit allen Parametern (Name, interner Name, Typ, Wert)
//   tools.txt   – dasselbe lesbar
//   <Werkzeug>.stp / .glb – Geometrie, falls der Export klappt (nur mit --geo)
// Aufruf: TS_ToolExport.exe [--geo] [--alle] [--nopause]
//   --geo   Geometrie exportieren (öffnet ggf. Werkzeugdokumente in TopSolid)
//   --alle  auch nicht verwendete Werkzeuge des Dokuments

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using TopSolid.Kernel.Automating;
using TopSolid.Cam.NC.Kernel.Automating;

internal static class Program
{
    private const string TopSolidBin = @"C:\Program Files\TopSolid\TopSolid 7.17\bin";
    private static StreamWriter log;

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
        if (Array.IndexOf(args, "--nopause") < 0) { Console.WriteLine("Taste drücken zum Beenden ..."); Console.ReadKey(); }
        return rc;
    }

    private static void P(string s) { Console.WriteLine(s); if (log != null) log.WriteLine(s); }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static int Ausfuehren(string[] args)
    {
        bool geo = args.Contains("--geo"), alle = args.Contains("--alle");
        TopSolidHost.Connect();
        if (!TopSolidHost.IsConnected) return Fehler("Keine Verbindung zu TopSolid.");
        TopSolidCamHost.Connect();
        if (!TopSolidCamHost.IsConnected) return Fehler("Keine Verbindung zu TopSolid'Cam.");
        try
        {
            DocumentId doc = TopSolidHost.Documents.EditedDocument;
            if (doc.IsEmpty) return Fehler("Kein Dokument in Bearbeitung.");
            string docName = TopSolidHost.Documents.GetName(doc);
            if (!TopSolidCamHost.Documents.IsCam(doc)) return Fehler("'" + docName + "' ist kein CAM-Dokument.");

            string outDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ToolExport", Sauber(docName));
            Directory.CreateDirectory(outDir);
            log = new StreamWriter(Path.Combine(outDir, "tools.txt"), false, new UTF8Encoding(true));
            P("Dokument: " + docName);
            P("Ausgabe : " + outDir);

            // Welche Bearbeitung nutzt welches Werkzeug?
            var opsByTool = new Dictionary<string, List<string>>();
            foreach (ElementId op in TopSolidCamHost.Operations.GetOperations(doc))
            {
                try
                {
                    ElementId t = TopSolidCamHost.Operations.GetTool(new ElementExId(op));
                    if (t.IsEmpty) continue;
                    string k = Key(t);
                    if (!opsByTool.ContainsKey(k)) opsByTool[k] = new List<string>();
                    opsByTool[k].Add(TopSolidCamHost.Operations.GetDescription(new ElementExId(op)));
                }
                catch { }
            }

            List<ElementId> tools = TopSolidCamHost.Documents.GetTools(doc, !alle);
            P("Werkzeuge: " + tools.Count + (alle ? " (alle)" : " (verwendet)"));
            int stepIx = geo ? FindeExporter("stp", "step") : -1;

            var json = new StringBuilder("{\n  \"document\": " + J(docName) + ",\n  \"exported\": " + J(DateTime.Now.ToString("s")) + ",\n  \"tools\": [\n");
            for (int ti = 0; ti < tools.Count; ti++)
            {
                ElementId tool = tools[ti];
                string name = Try(() => TopSolidHost.Elements.GetFriendlyName(tool));
                P("");
                P("=== " + name);
                json.Append("    {\n      \"name\": " + J(name) + ",\n");

                // PDM-Infos
                PdmObjectId pdm = default(PdmObjectId); bool hasPdm = false;
                try { pdm = TopSolidCamHost.Tools.GetPdmId(tool); hasPdm = true; } catch (Exception ex) { P("  PDM-Id: " + ex.Message); }
                if (hasPdm)
                {
                    string pn = Try(() => TopSolidHost.Pdm.GetName(pdm)), pnr = Try(() => TopSolidHost.Pdm.GetPartNumber(pdm)), pd = Try(() => TopSolidHost.Pdm.GetDescription(pdm));
                    P("  PDM: " + pn + " | Sachnr.: " + pnr + " | " + pd);
                    json.Append("      \"pdmName\": " + J(pn) + ", \"partNumber\": " + J(pnr) + ", \"description\": " + J(pd) + ",\n");
                }
                List<string> ops; opsByTool.TryGetValue(Key(tool), out ops);
                json.Append("      \"operations\": [" + string.Join(", ", (ops ?? new List<string>()).Select(J)) + "],\n");
                if (ops != null) P("  Bearbeitungen: " + string.Join("; ", ops));

                // Alle Parameter
                json.Append("      \"parameters\": [\n");
                var pars = new List<ParameterId>();
                try { pars = TopSolidCamHost.Tools.GetParameters(tool); } catch (Exception ex) { P("  Parameter: " + ex.Message); }
                for (int pi = 0; pi < pars.Count; pi++)
                {
                    ParameterId p = pars[pi];
                    string pnm = Try(() => TopSolidCamHost.Parameters.GetName(p));
                    string full = Try(() => TopSolidCamHost.Parameters.GetFullName(p));
                    string loc = Try(() => TopSolidCamHost.Parameters.GetLocalizedName(p));
                    string typ = Try(() => TopSolidCamHost.Parameters.GetType(p).ToString());
                    string val = Try(() => TopSolidCamHost.Parameters.ToInvariantStringValue(p));
                    string valLoc = Try(() => TopSolidCamHost.Parameters.ToStringValue(p));
                    P(string.Format("  {0,-40} {1,-28} {2,-8} {3}", full, loc, typ, valLoc));
                    json.Append("        {\"name\": " + J(pnm) + ", \"fullName\": " + J(full) + ", \"label\": " + J(loc) + ", \"type\": " + J(typ) + ", \"value\": " + J(val) + ", \"display\": " + J(valLoc) + "}" + (pi < pars.Count - 1 ? "," : "") + "\n");
                }
                json.Append("      ]");

                // Geometrie
                if (geo && hasPdm)
                {
                    string baseName = Sauber(name);
                    string geoInfo = ExportGeometrie(pdm, outDir, baseName, stepIx);
                    json.Append(",\n      \"geometry\": " + J(geoInfo));
                }
                json.Append("\n    }" + (ti < tools.Count - 1 ? "," : "") + "\n");
            }
            json.Append("  ]\n}\n");
            File.WriteAllText(Path.Combine(outDir, "tools.json"), json.ToString(), new UTF8Encoding(false));
            P("");
            P("Fertig: " + Path.Combine(outDir, "tools.json"));
            return 0;
        }
        finally
        {
            if (log != null) log.Dispose();
            if (TopSolidCamHost.IsConnected) TopSolidCamHost.Disconnect();
            if (TopSolidHost.IsConnected) TopSolidHost.Disconnect();
        }
    }

    // Exporter für eine Dateiendung suchen (und alle Exporter ins Protokoll schreiben)
    private static int FindeExporter(params string[] endungen)
    {
        int found = -1;
        P("Verfügbare Exporter:");
        for (int i = 0; i < TopSolidHost.Application.ExporterCount; i++)
        {
            try
            {
                string typ; string[] ext;
                TopSolidHost.Application.GetExporterFileType(i, out typ, out ext);
                P("  [" + i + "] " + typ + " (" + string.Join(",", ext ?? new string[0]) + ")" + (TopSolidHost.Application.IsExporterValid(i) ? "" : " – ungültig"));
                if (found < 0 && ext != null && ext.Any(x => endungen.Contains(x.TrimStart('.').ToLowerInvariant())) && TopSolidHost.Application.IsExporterValid(i)) found = i;
            }
            catch { }
        }
        P("STEP-Exporter: " + (found >= 0 ? "[" + found + "]" : "nicht gefunden"));
        return found;
    }

    private static string ExportGeometrie(PdmObjectId pdm, string outDir, string baseName, int stepIx)
    {
        var res = new List<string>();
        DocumentId tdoc;
        try { tdoc = TopSolidHost.Documents.GetDocument(pdm); }
        catch (Exception ex) { P("  Geometrie: Dokument nicht gefunden – " + ex.Message); return "kein Dokument"; }
        if (tdoc.IsEmpty) { P("  Geometrie: Dokument leer"); return "kein Dokument"; }

        // STEP
        if (stepIx >= 0)
        {
            string f = Path.Combine(outDir, baseName + ".stp");
            try
            {
                bool can = TopSolidHost.Documents.CanExport(stepIx, tdoc);
                if (!can) { try { TopSolidHost.Documents.Open(ref tdoc); } catch { } can = TopSolidHost.Documents.CanExport(stepIx, tdoc); }
                if (can) { TopSolidHost.Documents.Export(stepIx, tdoc, f); P("  STEP: " + f); res.Add("step:" + Path.GetFileName(f)); }
                else { P("  STEP: Export nicht möglich"); res.Add("step:nicht möglich"); }
            }
            catch (Exception ex) { P("  STEP-Fehler: " + ex.Message); res.Add("step:Fehler"); }
        }
        // glTF (inoffizielle Funktion, für den Viewer ideal)
        try
        {
            TopSolidHost.Documents.zExportToTopglTF(tdoc, outDir, baseName, true, false, false, false, false, false, Color.Black);
            P("  glTF: " + Path.Combine(outDir, baseName) + ".*");
            res.Add("gltf:" + baseName);
        }
        catch (Exception ex) { P("  glTF-Fehler: " + ex.Message); res.Add("gltf:Fehler"); }
        return string.Join(" ", res);
    }

    private static string Key(ElementId e) { try { return e.Id.ToString(); } catch { return e.GetHashCode().ToString(); } }
    private static string Try(Func<string> f) { try { return f() ?? ""; } catch (Exception ex) { return "<" + ex.GetType().Name + ">"; } }
    private static string Sauber(string s) { foreach (char c in Path.GetInvalidFileNameChars()) s = s.Replace(c, '_'); return s.Trim(); }
    private static string J(string s)
    {
        if (s == null) return "null";
        var b = new StringBuilder("\"");
        foreach (char c in s)
        {
            if (c == '"' || c == '\\') b.Append('\\').Append(c);
            else if (c == '\n') b.Append("\\n"); else if (c == '\r') b.Append("\\r"); else if (c == '\t') b.Append("\\t");
            else if (c < 32) b.Append("\\u").Append(((int)c).ToString("x4"));
            else b.Append(c);
        }
        return b.Append('"').ToString();
    }
    private static int Fehler(string t) { Console.ForegroundColor = ConsoleColor.Red; P("FEHLER: " + t); Console.ResetColor(); return 1; }
}
