# Session 5./6. November 2026 – Programmnummern Stufe 1, Ablauf je Version, Release 2.20.0, SD-Karte rpi01

**PRs:** MDS #296 – #311, Tag `v2.20.0` · Arbeit auf dem Dev-Server `homepi`, Deploy auf dem Pi und Mess-PC durch den Nutzer

Nach dem Abschluss von 2.19.2 haben wir die offenen Fragen zu den Programmnummern entschieden (Nutzer hat die Vorschläge S1–S7 angenommen, bewertet am Ergebnis), die Spec geschrieben und Stufe 1 umgesetzt. Dazu kamen drei Wünsche aus dem Ausprobieren: `.p2x` mit „nicht übernehmen“, Programm-Name als Kartenüberschrift und der Ablauf je Version in der Versionshistorie. Alles ging als 2.20.0 raus. Beim Deploy fiel auf, dass die SD-Karte von rpi01 kaputtgeht; der Deploy ist grün, der Kartentausch ist vorbereitet.

---

## Erledigt

| PR | Inhalt |
|---|---|
| #296, #297, #301 | Release 2.19.2 erledigt, Versionshistorie und Mess-PC-Prüfpunkte (Agent 1.1.2, Kalibrierprogramm aus dem ZIP) grün |
| #298, #299, #300 | **Programmnummern:** offene Fragen entschieden, [Spec Stufe 1](../konzepte/PROGRAMMNUMMERN_STUFE1_SPEC.md) (S1–S7), kein Altbestand in Produktion |
| #302 | **Stufe 1 Backend:** Zähler `part_program_counters` (Migration `1737000126000`), `<Bauteilnummer>-<n>` / `-M<n>`, Vergabe in der Anlage-Transaktion, Varianten, Eindeutigkeit ohne Groß/klein, Sperre ab erster Freigabe, `GET /suggest-number` |
| #303, #305 | **Stufe 1 Formulare:** Feld Programmnummer (Vorschlag, Schloss nach Freigabe, Hinweis > 24 Zeichen), Nummer auf den Karten. #303 landete gestapelt im Backend-Branch, #305 brachte es nach master |
| #304 | Idee Stufe 2: Programm-Name im Ausgabeordner |
| #306 | **Messprogramme:** `.p2x` (alter Excel-Export) als Begleitdatei; hochgeladene Begleitdateien „nicht übernehmen“ |
| #307 | Programmkarten: Programm-Name oben, Dateiname darunter |
| #308 | **Ablauf je Version:** `workflow_history.revision_id` (Migration `1737000127000`, Altbestand über die Zeit, Umrechnung Berlin/UTC), `released_by/at` werden befüllt, aufklappbarer „Ablauf“ in der Versionshistorie |
| #309 | **Release 2.20.0**, Tag `v2.20.0` |
| #310, #311 | [Anleitung Pi neu aufsetzen](../PI-NEU-AUFSETZEN.md) inkl. Task-App und Kiosk |

## Befunde

- **SD-Karte rpi01:** `docker compose` stürzte beim Deploy mit einem Go-Laufzeitfehler ab, `dpkg -V` zeigte rund 20 beschädigte Dateien, `tune2fs` 95 Lesefehler (`EFSBADCRC`) seit 06.11. 16:53. Nach Neuinstallation von `docker-ce-cli` und `containerd.io` lief der Deploy grün. Phase A der Anleitung (Rettung, `.env` geprüft, Dumps) ist erledigt
- **Zeitzonen im Programm-Modul:** Messprogramme schreiben Berliner Zeit, NC-Programme und Statusprotokoll UTC (ROADMAP „Offene Fixes“)
- **Task-App ohne Nacht-Backup** (ROADMAP)
- **Kiosk:** Chromium wird im LXDE-Autostart zweimal gestartet (Zeile „optional: Kiosk“ mit `/` und `kiosk.sh` mit `?abteilung=fraesen`) – beim Tausch klären
- Frühere Nebenbefunde: Variante anlegen „NC-Programme kopieren“ kaputt, Audit-Log ohne alte Werte (ROADMAP)

## Lehren

- Keine gestapelten PRs mehr: Merge des Basis-PRs leitet den Kind-PR nicht auf master um
- Nutzer bewertet am Ergebnis: technische Details selbst entscheiden, Klickweg und Screenshots zeigen
- Branch-Wechsel auf homepi ändert, was der Dev-Server zeigt

## Nächste Sitzung

1. **SD-Karte rpi01 tauschen** (Phase B–D der Anleitung): Bookworm Legacy 64-bit mit Desktop, X11 + Autologin, Kiosk aus der Rettung
2. Prüfpunkte 2.20.0 im MDS (Programmnummer vorbelegt, `.p2x`, Uhrzeiten im Ablauf), dann Release-Checkliste „Erledigt“
3. Danach: Erstimport vom Netzlaufwerk (Messprogramme Schritt 7), Task-App-Backup
