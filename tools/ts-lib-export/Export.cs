// TS_LibExport – vollständiger Export der Werkzeugbibliotheken für den MDS-Import (Schema mds-tool-import/1)
// Bibliothek 1 (ini: erste Zeile Bibliothek=) = Werkzeugkomponenten → components.json
// Bibliothek 2 (ini: zweite Zeile Bibliothek=) = Werkzeuge (Baugruppen mit T-Nummer) → tools.json
// Werte: Längen in mm, Winkel in °, alles andere wie in TopSolid.

using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using TopSolid.Kernel.Automating;
using ParameterType = TopSolid.Kernel.Automating.ParameterType;

internal static partial class Program
{
    private const string PropClass = "$TopSolid.Cam.NC.Tool.TX.MachiningComponents.ClassificationKey";

    private class DocInfo { public PdmObjectId Pdm; public string Folder; public string Ext; public string Lib; }

    private static int Export(List<string> libs, string outDir, bool glb, bool step)
    {
        var t0 = DateTime.Now;
        List<PdmObjectId> alle = TopSolidHost.Pdm.GetProjects(false, true);
        Func<string, PdmObjectId> find = name =>
            alle.FirstOrDefault(x => string.Equals(T(() => TopSolidHost.Pdm.GetName(x)), name, StringComparison.OrdinalIgnoreCase));

        // Alle Bibliotheken einsammeln. Je Dokument entscheidet der Inhalt:
        //   .TopAsm mit T-Nummer (Zusatzteilenummer oder Name „T123 …“) = Werkzeug, alles andere = Komponente
        var compDocs = new List<DocInfo>(); var toolDocs = new List<DocInfo>();
        foreach (string lib in libs)
        {
            PdmObjectId pl = find(lib);
            if (pl.IsEmpty) { P("Bibliothek nicht gefunden: " + lib); continue; }
            var docs = new List<DocInfo>(); Sammle(pl, "", docs);
            int nc = 0, nt = 0;
            foreach (var x in docs)
            {
                x.Lib = lib;
                if (x.Ext == ".TopAsm" && IstWerkzeug(x.Pdm)) { toolDocs.Add(x); nt++; }
                else if (x.Ext == ".TopPrt" || x.Ext == ".TopAsm") { compDocs.Add(x); nc++; }
            }
            P(lib + ": " + docs.Count + " Dokumente → " + nc + " Komponenten, " + nt + " Werkzeuge" + (IstSonder(lib) ? " (Sonderwerkzeuge)" : ""));
        }

        // ---------- Komponenten ----------
        var comps = new Dictionary<string, Dictionary<string, object>>();   // key = PDM-Id
        int i = 0, fehlerC = 0;
        foreach (DocInfo d in compDocs)
        {
            if (++i % 100 == 0) P("  Komponenten ... " + i + "/" + compDocs.Count);
            try { comps[d.Pdm.Id] = Komponente(d); }
            catch (Exception ex) { fehlerC++; P("  Fehler " + d.Lib + d.Folder + " / " + T(() => TopSolidHost.Pdm.GetName(d.Pdm)) + ": " + ex.Message); }
        }
        P("Komponenten gelesen: " + comps.Count + ", Fehler: " + fehlerC);

        // ---------- Werkzeuge ----------
        string modelDir = Path.Combine(outDir, "models");
        if (glb || step) Directory.CreateDirectory(modelDir);
        int stepIx = step ? FindeExporter("stp", "step") : -1;
        var tools = new List<Dictionary<string, object>>();
        var fremd = new Dictionary<string, Dictionary<string, object>>();   // referenzierte Teile außerhalb der exportierten Bibliotheken
        i = 0; int fehlerT = 0;
        foreach (DocInfo d in toolDocs)
        {
            if (++i % 100 == 0) P("  Werkzeuge ... " + i + "/" + toolDocs.Count);
            try { tools.Add(Werkzeug(d, comps, fremd, glb, stepIx, modelDir)); }
            catch (Exception ex) { fehlerT++; P("  Fehler " + d.Lib + d.Folder + " / " + T(() => TopSolidHost.Pdm.GetName(d.Pdm)) + ": " + ex.Message); }
        }
        P("Werkzeuge gelesen: " + tools.Count + ", Fehler: " + fehlerT + ", Teile außerhalb der Bibliotheken: " + fremd.Count);

        // ---------- Schreiben ----------
        var head = new Dictionary<string, object> {
            { "schema", "mds-tool-import/1" }, { "source", "topsolid" },
            { "exportedAt", DateTime.Now.ToString("s") }, { "units", "Längen mm, Winkel °" } };
        var cj = new Dictionary<string, object>(head) { { "libraries", libs }, { "components", comps.Values.Concat(fremd.Values).ToList() } };
        var tj = new Dictionary<string, object>(head) { { "libraries", libs }, { "tools", tools } };
        File.WriteAllText(Path.Combine(outDir, "components.json"), Json(cj), new UTF8Encoding(false));
        File.WriteAllText(Path.Combine(outDir, "tools.json"), Json(tj), new UTF8Encoding(false));

        // CSV-Übersichten zum Durchsehen in Excel
        var cc = new StringBuilder("Bibliothek;Art;Ordner;Name;Hersteller;Bestellnr;Klasse;D;OAL;LU;APMX;LPR;LPR_MIN;LPR_MAX;DMM;Z;Schneidstoff;IKZ;Schnittstelle;A;PDM-Id\r\n");
        foreach (var c in comps.Values.Concat(fremd.Values))
        {
            Func<string, string> g = k => c.ContainsKey(k) ? Str(c[k]) : "";
            Func<string, string> pr = k => { var pp = c["params"] as Dictionary<string, object>; return pp != null && pp.ContainsKey(k) ? Str(pp[k]) : ""; };
            cc.AppendLine(string.Join(";", new[] { g("library"), g("kind"), g("folder"), g("name"), g("manufacturer"), g("partNumber"), g("classification"),
                g("diameter"), g("overallLength"), g("usableLength"), g("cuttingLength"), pr("LPR"), pr("LPR_MIN"), pr("LPR_MAX"),
                g("shankDiameter"), g("flutes"), g("material"), g("coolantThrough"), g("interface"), g("holderLength"), g("externalRef") }.Select(Csv)));
        }
        File.WriteAllText(Path.Combine(outDir, "components.csv"), cc.ToString(), new UTF8Encoding(true));
        var tc = new StringBuilder("Bibliothek;T-Nr;Name;Ordner;Klasse;Schneide;Schneide Herst.;Schneide Nr.;Aufnahme;Aufnahme Herst.;Aufnahme Nr.;Ausspann (LPR);min;max;Ausladung;Hinweise;PDM-Id\r\n");
        foreach (var t in tools)
        {
            Func<string, string> g = k => t.ContainsKey(k) ? Str(t[k]) : "";
            var cu = t["cutter"] as Dictionary<string, object>; var ho = t["holder"] as Dictionary<string, object>;
            Func<Dictionary<string, object>, string, string> gg = (o, k) => o != null && o.ContainsKey(k) ? Str(o[k]) : "";
            tc.AppendLine(string.Join(";", new[] { g("library"), g("tNumber"), g("name"), g("folder"), g("classification"),
                gg(cu, "name"), gg(cu, "manufacturer"), gg(cu, "partNumber"), gg(ho, "name"), gg(ho, "manufacturer"), gg(ho, "partNumber"),
                g("stickOut"), g("stickOutMin"), g("stickOutMax"), g("gaugeLength"), string.Join(" | ", (List<object>)t["warnings"]), g("externalRef") }.Select(Csv)));
        }
        File.WriteAllText(Path.Combine(outDir, "tools.csv"), tc.ToString(), new UTF8Encoding(true));

        P("");
        P("Fertig in " + (DateTime.Now - t0).TotalSeconds.ToString("0") + " s: " + outDir);
        return 0;
    }

    // Alle Dokumente einer Bibliothek rekursiv einsammeln
    private static void Sammle(PdmObjectId owner, string pfad, List<DocInfo> res)
    {
        List<PdmObjectId> folders, docs;
        TopSolidHost.Pdm.GetConstituents(owner, out folders, out docs);
        foreach (PdmObjectId d in docs ?? new List<PdmObjectId>())
        {
            string ext = "";
            try { string e; if (TopSolidHost.Pdm.GetType(d, out e) != PdmObjectType.TopSolidDocument) continue; ext = e ?? ""; } catch { continue; }
            res.Add(new DocInfo { Pdm = d, Folder = pfad, Ext = ext });
        }
        foreach (PdmObjectId f in folders ?? new List<PdmObjectId>())
            Sammle(f, pfad + "/" + T(() => TopSolidHost.Pdm.GetName(f)), res);
    }

    private static Dictionary<string, object> PdmBasis(PdmObjectId pdm, string folder)
    {
        string man = Leer(T(() => TopSolidHost.Pdm.GetManufacturer(pdm)));
        return new Dictionary<string, object> {
            { "externalRef", pdm.Id }, { "folder", folder },
            { "name", T(() => TopSolidHost.Pdm.GetName(pdm)) },
            { "description", Leer(T(() => TopSolidHost.Pdm.GetDescription(pdm))) },
            { "comment", Leer(T(() => TopSolidHost.Pdm.GetComment(pdm))) },
            { "manufacturer", man },
            { "manufacturerKey", man == null ? null : HerstKey(man) },
            { "partNumber", Leer(T(() => TopSolidHost.Pdm.GetManufacturerPartNumber(pdm))) },
            { "erpPartNumber", Leer(T(() => TopSolidHost.Pdm.GetComplementaryPartNumber(pdm))) } };
    }

    private static Dictionary<string, object> Komponente(DocInfo d)
    {
        var c = PdmBasis(d.Pdm, d.Folder);
        c["ext"] = d.Ext;
        c["library"] = d.Lib;
        c["special"] = d.Lib != null && IstSonder(d.Lib);
        DocumentId doc = TopSolidHost.Documents.GetDocument(d.Pdm);
        string cls = T(() => TopSolidHost.Documents.GetPropertyTextValue(doc, PropClass));
        c["classificationKey"] = Leer(cls);
        c["classification"] = KurzKlasse(cls);

        var pars = Parameter(doc);
        c["params"] = pars;
        Func<string[], object> p = keys => { foreach (string k in keys) if (pars.ContainsKey(k)) return pars[k]; return null; };

        bool hatD = pars.ContainsKey("DC") || pars.ContainsKey("DC1") || pars.ContainsKey("DC1N") || pars.ContainsKey("D");
        bool holder = d.Folder.StartsWith("/Aufnahmen", StringComparison.OrdinalIgnoreCase) || d.Folder.IndexOf("Verlängerung", StringComparison.OrdinalIgnoreCase) >= 0
                      || pars.ContainsKey("HSK") || pars.ContainsKey("HSK_D1") || (pars.ContainsKey("LBD1") && !hatD)
                      || cls.IndexOf("Shank", StringComparison.OrdinalIgnoreCase) >= 0 || cls.IndexOf("Holder", StringComparison.OrdinalIgnoreCase) >= 0;
        c["kind"] = holder ? "holder" : "cutter";
        object dia = p(new[] { "DC", "DC1", "DC1N", "D" });
        c["diameterSource"] = dia != null ? "param" : null;
        if (dia == null && !holder)
        {   // Fallback: Ø aus dem Namen („… D52R5 …“, „D20 …“)
            var mm = System.Text.RegularExpressions.Regex.Match((string)c["name"], @"(?:^|\s)D(\d+(?:[,.]\d+)?)");
            double dd;
            if (mm.Success && double.TryParse(mm.Groups[1].Value.Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out dd)) { dia = dd; c["diameterSource"] = "name"; }
        }
        c["diameter"] = dia;
        c["overallLength"] = p(new[] { "OAL" });
        c["usableLength"] = p(new[] { "LU" });
        c["cuttingLength"] = p(new[] { "APMX" });
        c["shankDiameter"] = p(new[] { "DMM" });
        c["neckDiameter"] = p(new[] { "DFS" });
        c["cornerRadius"] = p(new[] { "RE" });
        c["tipAngle"] = p(new[] { "SIG1", "SIG" });
        c["flutes"] = p(new[] { "ZEFP", "ZEPF" });
        c["material"] = p(new[] { "TCM", "Cutting Tool Material" });
        c["coolantThrough"] = p(new[] { "CNSC" });
        c["leftHand"] = p(new[] { "HAND" });
        c["protrusion"] = pars.ContainsKey("LPR") ? new Dictionary<string, object> { { "default", pars["LPR"] }, { "min", p(new[] { "LPR_MIN" }) }, { "max", p(new[] { "LPR_MAX" }) } } : null;
        if (holder)
        {
            c["interface"] = p(new[] { "Size", "HSK" });
            c["holderLength"] = p(new[] { "LBD1" });
            c["bodyDiameter"] = p(new[] { "BD1" });
        }
        return c;
    }

    private static Dictionary<string, object> Werkzeug(DocInfo d, Dictionary<string, Dictionary<string, object>> comps,
        Dictionary<string, Dictionary<string, object>> fremd, bool glb, int stepIx, string modelDir)
    {
        var t = PdmBasis(d.Pdm, d.Folder);
        var warn = new List<object>();
        string tn = (string)t["erpPartNumber"];
        var m = System.Text.RegularExpressions.Regex.Match((string)t["name"], @"^T(\d+)\b");
        string tName = m.Success ? m.Groups[1].Value : null;
        if (tn == null && tName != null) { warn.Add("keine Zusatzteilenummer, T aus Name"); tn = tName; }
        else if (tn != null && tName != null && tn != tName) warn.Add("T im Namen (" + tName + ") ≠ Zusatzteilenummer (" + tn + ")");
        t["tNumber"] = tn;
        t.Remove("erpPartNumber");

        DocumentId doc = TopSolidHost.Documents.GetDocument(d.Pdm);
        string cls = T(() => TopSolidHost.Documents.GetPropertyTextValue(doc, PropClass));
        t["classificationKey"] = Leer(cls);
        t["classification"] = KurzKlasse(cls);

        // Bestandteile (Schneide, Aufnahme)
        var parts = new List<Dictionary<string, object>>();
        foreach (DocumentId r in TopSolidHost.Documents.GetReferencedDocuments(doc, true))
        {
            string typ = T(() => TopSolidHost.Documents.GetTypeFullName(r));
            if (typ.Contains("Function") || !(typ.EndsWith("PartDocument") || typ.EndsWith("AssemblyDocument"))) continue;
            PdmObjectId rp = TopSolidHost.Documents.GetPdmObject(r);
            Dictionary<string, object> c;
            if (!comps.TryGetValue(rp.Id, out c) && !fremd.TryGetValue(rp.Id, out c))
            {
                try { c = Komponente(new DocInfo { Pdm = rp, Folder = "(extern) " + T(() => TopSolidHost.Pdm.GetName(TopSolidHost.Pdm.GetProject(rp))), Ext = "" }); }
                catch { c = PdmBasis(rp, "(extern)"); c["kind"] = "cutter"; }
                fremd[rp.Id] = c;
                warn.Add("Teil außerhalb der Komponentenbibliothek: " + c["name"]);
            }
            parts.Add(c);
        }
        var holders = parts.Where(x => (string)x["kind"] == "holder").ToList();
        var holder = holders.FirstOrDefault(x => x.ContainsKey("interface") && x["interface"] != null) ?? holders.FirstOrDefault();
        if (holders.Count > 1) warn.Add("mehrteilige Aufnahme (" + string.Join(" + ", holders.Select(x => x["name"])) + ")");
        var cutters = parts.Where(x => (string)x["kind"] != "holder").ToList();
        var cutter = cutters.FirstOrDefault(x => x.ContainsKey("protrusion") && x["protrusion"] != null) ?? cutters.FirstOrDefault();
        Func<Dictionary<string, object>, object> kurz = x => x == null ? null : new Dictionary<string, object> {
            { "externalRef", x["externalRef"] }, { "name", x["name"] }, { "manufacturer", x["manufacturer"] }, { "partNumber", x["partNumber"] } };
        t["cutter"] = kurz(cutter);
        t["holder"] = kurz(holder);
        t["otherParts"] = parts.Where(x => x != cutter && x != holder).Select(kurz).ToList();
        t["diameter"] = cutter != null && cutter.ContainsKey("diameter") ? cutter["diameter"] : null;
        if (holder == null) warn.Add("keine Aufnahme erkannt");
        if (cutter == null) warn.Add("keine Schneide erkannt");
        if (parts.Count > 2) warn.Add(parts.Count + " Bestandteile");

        // Ausspannlänge = LPR der Schneide, Ausladung = A der Aufnahme + LPR
        var prot = cutter != null && cutter.ContainsKey("protrusion") ? cutter["protrusion"] as Dictionary<string, object> : null;
        t["stickOut"] = prot != null ? prot["default"] : null;
        t["stickOutMin"] = prot != null ? prot["min"] : null;
        t["stickOutMax"] = prot != null ? prot["max"] : null;
        object a = holder != null && holder.ContainsKey("holderLength") ? holder["holderLength"] : null;
        t["gaugeLength"] = (holders.Count == 1 && a is double && prot != null && prot["default"] is double) ? (object)Math.Round((double)a + (double)prot["default"], 4) : null;
        t["library"] = d.Lib;
        t["special"] = IstSonder(d.Lib);
        if (prot == null) warn.Add("keine Ausspannlänge (LPR)");

        // Modelle
        string baseName = Sauber((tn ?? "ohneT") + "_" + t["name"]);
        var models = new Dictionary<string, object>();
        if (glb)
        {
            try { TopSolidHost.Documents.zExportToTopglTF(doc, modelDir, baseName, true, false, false, false, false, false, TopSolid.Kernel.Automating.Color.Black); models["glb"] = "models/" + baseName + ".glb"; }
            catch (Exception ex) { warn.Add("glb: " + ex.Message); }
        }
        if (stepIx >= 0)
        {
            try { TopSolidHost.Documents.Export(stepIx, doc, Path.Combine(modelDir, baseName + ".stp")); models["step"] = "models/" + baseName + ".stp"; }
            catch (Exception ex) { warn.Add("step: " + ex.Message); }
        }
        t["models"] = models;
        t["warnings"] = warn;
        return t;
    }

    // Parameter eines Dokuments (ohne Systemparameter), Längen → mm, Winkel → °
    private static Dictionary<string, object> Parameter(DocumentId doc)
    {
        var res = new Dictionary<string, object>();
        foreach (ElementId p in TopSolidHost.Parameters.GetParameters(doc))
        {
            string name = T(() => TopSolidHost.Elements.GetName(p));
            if (name.Length == 0 || name.StartsWith("$") || name.StartsWith("<")) continue;
            try
            {
                object v = null;
                switch (TopSolidHost.Parameters.GetParameterType(p))
                {
                    case ParameterType.Real:
                        UnitType ut; string sym; TopSolidHost.Parameters.GetRealUnit(p, out ut, out sym);
                        double x = TopSolidHost.Parameters.GetRealValue(p);
                        if (ut == UnitType.Length) x *= 1000.0; else if (ut == UnitType.Angle) x *= 180.0 / Math.PI;
                        v = Math.Round(x, 4); break;
                    case ParameterType.Integer: v = TopSolidHost.Parameters.GetIntegerValue(p); break;
                    case ParameterType.Boolean: v = TopSolidHost.Parameters.GetBooleanValue(p); break;
                    case ParameterType.Text: v = TopSolidHost.Parameters.GetTextValue(p); break;
                    case ParameterType.Code: v = TopSolidHost.Parameters.GetCodeValue(p); break;
                    case ParameterType.Enumeration: v = TopSolidHost.Parameters.GetEnumerationText(p); break;
                    case ParameterType.UserEnumeration: v = TopSolidHost.Parameters.GetUserEnumerationText(p); break;
                    default: continue;
                }
                res[name] = v;
            }
            catch { }
        }
        return res;
    }

    private static bool IstSonder(string lib) { return lib != null && lib.IndexOf("Sonder", StringComparison.OrdinalIgnoreCase) >= 0; }
    private static bool IstWerkzeug(PdmObjectId pdm)
    {
        if (Leer(T(() => TopSolidHost.Pdm.GetComplementaryPartNumber(pdm))) != null) return true;
        return System.Text.RegularExpressions.Regex.IsMatch(T(() => TopSolidHost.Pdm.GetName(pdm)), @"^T\d+\b");
    }

    private static string KurzKlasse(string key)
    {
        if (string.IsNullOrEmpty(key) || key.StartsWith("<")) return null;
        var s = key.Split('.'); return s.Length >= 2 ? s[s.Length - 2] + "." + s[s.Length - 1] : key;
    }
    private static string Leer(string s) { s = (s ?? "").Trim(); return (s.Length == 0 || s.StartsWith("<") || s == "-" || s == "0") ? null : s; }
    private static string HerstKey(string s)
    {
        s = s.ToLowerInvariant().Replace("ü", "ue").Replace("ö", "oe").Replace("ä", "ae").Replace("ß", "ss");
        return new string(s.Where(char.IsLetterOrDigit).ToArray());
    }
    private static string Str(object o)
    {
        if (o == null) return "";
        if (o is double) return ((double)o).ToString("0.####", CultureInfo.GetCultureInfo("de-DE"));
        if (o is bool) return (bool)o ? "ja" : "nein";
        return o.ToString();
    }

    // Minimaler JSON-Serializer
    private static string Json(object o) { var sb = new StringBuilder(); Js(o, sb, 0); sb.Append('\n'); return sb.ToString(); }
    private static void Js(object o, StringBuilder sb, int ind)
    {
        string pad = new string(' ', ind * 2), pad2 = new string(' ', (ind + 1) * 2);
        if (o == null) sb.Append("null");
        else if (o is string) sb.Append(J((string)o));
        else if (o is bool) sb.Append((bool)o ? "true" : "false");
        else if (o is double) sb.Append(((double)o).ToString("R", CultureInfo.InvariantCulture));
        else if (o is int) sb.Append(((int)o).ToString(CultureInfo.InvariantCulture));
        else if (o is IDictionary)
        {
            var d = (IDictionary)o;
            if (d.Count == 0) { sb.Append("{}"); return; }
            bool flach = ind >= 3;
            sb.Append(flach ? "{" : "{\n"); int n = 0;
            foreach (DictionaryEntry e in d)
            {
                if (n++ > 0) sb.Append(flach ? ", " : ",\n");
                if (!flach) sb.Append(pad2);
                sb.Append(J(e.Key.ToString())).Append(": "); Js(e.Value, sb, ind + 1);
            }
            sb.Append(flach ? "}" : "\n" + pad + "}");
        }
        else if (o is IEnumerable)
        {
            var l = ((IEnumerable)o).Cast<object>().ToList();
            if (l.Count == 0) { sb.Append("[]"); return; }
            bool einfach = l.All(x => !(x is IDictionary));
            sb.Append(einfach ? "[" : "[\n");
            for (int k = 0; k < l.Count; k++)
            {
                if (k > 0) sb.Append(einfach ? ", " : ",\n");
                if (!einfach) sb.Append(pad2);
                Js(l[k], sb, ind + 1);
            }
            sb.Append(einfach ? "]" : "\n" + pad + "]");
        }
        else sb.Append(J(o.ToString()));
    }
    private static string J(string s)
    {
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

    private static int FindeExporter(params string[] endungen)
    {
        for (int i = 0; i < TopSolidHost.Application.ExporterCount; i++)
        {
            try
            {
                string typ; string[] ext;
                TopSolidHost.Application.GetExporterFileType(i, out typ, out ext);
                if (ext != null && ext.Any(x => endungen.Contains(x.TrimStart('.').ToLowerInvariant())) && TopSolidHost.Application.IsExporterValid(i)) return i;
            }
            catch { }
        }
        P("STEP-Exporter nicht gefunden");
        return -1;
    }
}
