# Session 8. November 2026 – Workflow-Durchlauf, Revision als Pflichtfeld, Release 2.22.0

**PRs:** #324 bis #329 · Arbeit auf dem Dev-Server `homepi`, Deploy auf rpi01 durch den Nutzer

Fortsetzung von [Session 7./8.11.](SESSION-2026-11-08-einrichteblatt-freigabe-2.21.md). Der Nutzer hat einen Arbeitsablauf durchgespielt (Bauteil, Arbeitsgang, Messprogramm) und alles notiert, was auffiel. Je Punkt wurde entschieden: sofort ändern oder notieren.

---

## Erledigt

| PR | Inhalt |
|---|---|
| #324 | ROADMAP-Wünsche: Fotos am Einrichteblatt mit Beschriftung und Beschreibung, Übersicht „Was wartet auf Prüfung/Freigabe“ |
| #325 | Befund Bauteil-Revision wird ungewollt „A“ |
| #326 | Bauteil: Revision ohne Vorbelegung als Pflichtfeld (ohne Index „-“) |
| #327 | Befunde aus dem Durchlauf: Dokumentvorschau, gleicher OP-Code, Anzahl Arbeitsgänge, PC-DMIS-Vorschaubild, Kartenraster, ROADMAP Einrichteblatt je Maschinentyp |
| #328 | Release 2.22.0 |
| #329 | Release 2.22.0 als erledigt |

**Release 2.22.0** läuft seit 08.11. auf rpi01, keine Migration, Prüfpunkte grün.

## Entscheidungen des Nutzers

- **Revision:** Pflichtfeld ohne Vorbelegung, Teile ohne Index bekommen „-“
- **Gleicher OP-Code:** Hinweis statt Sperre
- **PC-DMIS-Vorschaubild:** `.jpg` mit dem Namen der `.prg` wird Begleitdatei. Ob andere Formate gehen und ob PC-DMIS eine eigene Funktion dafür hat, wird später geprüft (Messprogramm-Konzept Abschnitt 10)
- **Für später notiert (ROADMAP Phase 9):** Einrichteblatt je Maschinentyp, Foto-Beschriftung und -Beschreibung, Übersicht „Was wartet auf Prüfung/Freigabe“

## Befunde

- **OP-Code-Sperre war ein Überbleibsel:** Der Constraint fiel schon mit Migration `1737000072000`, der Controller prüfte trotzdem weiter
- **Bauteil-Dokumente hatten keine Ansicht im Browser,** nur Download. Neu: `/view`, Pfad auf den Ordner der Bauteil-Dokumente begrenzt
- **Kartenraster** richtete sich nach der Fensterbreite statt nach dem Platz im Arbeitsgang

## Lehren

- **Sammeln, dann bündeln:** Der Nutzer schreibt beim Durchspielen alles auf, ich ordne jeden Punkt ein (Ursache im Code, Vorschlag) und bündle das Umgesetzte in einen PR. Das gibt einen Release statt fünf
- **Gemeinsame Komponente statt Kopie:** Die Dokumentvorschau ist eine gemeinsame Komponente (`components/common/DocumentPreview`). Kunden, Vorrichtungen und Spannmittel können sie später übernehmen

## Nächste Sitzung

1. Workflow-Durchlauf fortsetzen, Befunde wie gehabt sammeln
2. Probelauf Erstimport (Messprogramme Schritt 7): Befunde auswerten, Konzept 5.5 anpassen
3. rpi01: Nacht-Backups nach dem SD-Tausch prüfen (falls noch offen), in ein paar Tagen `tune2fs`, Rettungsordner aufräumen, monatliches SD-Image
