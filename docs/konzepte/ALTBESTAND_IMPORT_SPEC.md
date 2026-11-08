# Messprogramme: Altbestand übernehmen – Spec

**Stand:** 08.11.2026 · **Bezug:** [Messprogramm-Konzept](MESSPROGRAMME_KONZEPT.md) 5.5, ROADMAP Messprogramme Schritt 7

## 1. Ziel

Etwa 120 Messprogramme liegen auf dem Netzlaufwerk. Die Ordnerstruktur ist recht einheitlich, im Laufe der Jahre aber unterschiedlich gepflegt. Ein Helfer im MDS liest einen Ordner ein, schlägt je Programm vor, was wohin übernommen wird, und legt nach Bestätigung alles an. Danach verschiebt ein Skript die übernommenen Ordner ins Archiv.

Ohne Helfer heißt das je Programm: Bauteil, Mess-Arbeitsgang, Messprogramm, Einrichteblatt mit Fotos und Dokumente von Hand anlegen. Bei 120 Programmen sind das grob 20–30 Stunden.

**Entscheidungen des Nutzers (08.11.2026):**
- Helfer statt alles von Hand.
- Archivordner einstellbar, übernommene Ordner werden dorthin verschoben.
- Die Kunden gibt es schon im MDS, Bauteile kaum. Der Helfer legt sie also meist neu an.
- Die gestempelte Zeichnung wird Prüfzeichnung im Messprogramm. Sie ist für die Messmaschine gedacht und wird gelegentlich fürs FAI gebraucht, eine zweite Kopie entfällt.
- Der Index im Ordnernamen ist die Revision des Bauteils.
- Das Netzlaufwerk ist vom Arbeitsrechner (Windows) aus erreichbar.
- Die Bauteilnummer erzeugt das MDS wie im Formular, die Teilenummer aus dem Ordner kommt ins Feld „Kunden-Teilenummer“.
- Übernommene Messprogramme und Einrichteblätter werden direkt freigegeben, mit dem Grund „Erstimport Altbestand“ im Ablauf. Sie laufen ja schon in der Fertigung.

**Nicht Teil dieser Spec:**
- Messdaten (`02_Messdaten`) und alte Stände (`05_Alte Daten`), sie bleiben im Archiv
- NC-Programme
- Weg über den MDS-Agenten (Konzept 5.5): mehr Aufwand, setzt den Eingang (Schritt 5) voraus und lohnt sich für einen einmaligen Import nicht

## 2. Ordnerstruktur (Altbestand)

```
<Quellordner>\
  KD00000 FIRMA\                                  Kundenordner: Kundennummer, Leerzeichen, Name
    HG_TEIL-0001_[Rev_]Halter\                    Programmordner: Messmaschine _ Teilenr. _ [Rev.] _ Name
      01_Messprogramm HG_Index0\                  .prg, .cad, .pdf, .xlsx/.layout.xml, .jpg … (Unterordner möglich)
      02_Messdaten\
      03_Aufspannungs- und Teiledaten\
        01_Bilder der Aufspannsituation\
        02_Gestempelte Zeichnung\
        03_Arbeitsanweisung und Einrichtblatt\    meist ungenutzte Excel-Vorlage
        04_CAD-Modell\
      04_Taster kalibrieren\
      05_Alte Daten\
```

## 3. Zuordnung

| Quelle | Ziel im MDS |
|---|---|
| Kundenordner, Nummer bis zum ersten Leerzeichen | Kunde mit dieser Kundennummer |
| Programmordner, erstes Stück | Messmaschine: Kürzel → Maschine wird einmal je Durchlauf zugeordnet. Gibt es genau eine KMG-Maschine, ist sie vorbelegt |
| Programmordner, zweites Stück | Kunden-Teilenummer (siehe 4) |
| `Index…` im Namen von `01_Messprogramm` | Revision des Bauteils |
| Programmordner, Rest | Bezeichnung von Bauteil und Messprogramm. Eine Revision im Ordnernamen wird erkannt und mit dem Index abgeglichen |
| `01_Messprogramm`, oberste Ebene | Messprogramm 1.0.0: Upload-Bereich „Messprogramm“, `.xlsx` und `.layout.xml` in den Bereich „Excel-Vorlage“. Es gelten dieselben Regeln wie beim Upload von Hand |
| `01_Messprogramm`, Unterordner | nicht übernommen, wird aufgelistet |
| `04_Taster kalibrieren` | Bereich „Kalibrierprogramm“, nur die `.prg` |
| `…\01_Bilder der Aufspannsituation` | Fotos am Einrichteblatt des Mess-Arbeitsgangs |
| `…\02_Gestempelte Zeichnung` | PDF wird Prüfzeichnung im Messprogramm. Andere Formate kommen als Bauteil-Dokument „Zeichnung“ dazu, mit Hinweis |
| `…\04_CAD-Modell` | Bauteil-Dokument „CAD-Modell“, das erste wird Haupt-CAD |
| `…\03_Arbeitsanweisung und Einrichtblatt` | nicht übernommen, wird aufgelistet. Wo eine echte Anweisung drinsteckt, schreibt man sie von Hand ins Einrichteblatt |
| `02_Messdaten`, `05_Alte Daten`, unbekannte Ordner | nicht übernommen, wird aufgelistet |

**Erkennung über Stichwörter, nicht über die Nummer:** Die Nummer am Anfang (`01_`, `03_` …) zählt nicht. Ordner werden über Stichwörter erkannt (Messprogramm, Messdaten, Aufspann, Bilder, Zeichnung, CAD, Taster/Kalibr, Alte Daten, Arbeitsanweisung/Einricht), ohne Groß-/Kleinschreibung. So stört es nicht, wenn alte Programme anders nummeriert sind.

**Betriebsneutral:** Die Stichwörter sind betriebsspezifisch. Sie stehen als Tabelle in einem einzigen Modul (Import-Profil), nicht verstreut im Code. Eine Einstellungsseite dafür gibt es nicht, weil der Helfer einmalig gebraucht wird. Ein anderer Betrieb passt die Tabelle an oder lässt den Helfer weg. Alle anderen Funktionen hängen nicht davon ab.

## 4. Bauteil und Arbeitsgang

- **Bauteil finden:** Gesucht wird über Kunde + Kunden-Teilenummer + Revision. Die Kunden-Teilenummer ist im MDS nicht eindeutig. Mehrere Treffer: Der Nutzer wählt in der Zeile das Bauteil.
- **Bauteilnummer:** Bei einem neuen Bauteil erzeugt das MDS sie wie im Formular (Kundennummer-laufende Nummer). Der Helfer schickt dafür keine Bauteilnummer mit.
- **Neues Bauteil:** Kunde, Kunden-Teilenummer, Bezeichnung und Revision aus dem Ordner, Status Entwurf.
- **Nur andere Revisionen vorhanden:** Kein Bauteil wird geändert. Hinweis in der Zeile, der Nutzer entscheidet: neues Bauteil mit der Revision aus dem Ordner anlegen (vorbelegt, weil kaum Bauteile vorhanden sind), vorhandenes Bauteil nehmen oder Programm überspringen.
- **Mess-Arbeitsgang:** Am Bauteil wird ein Arbeitsgang mit der zugeordneten KMG-Maschine gesucht. Gibt es keinen, legt der Helfer einen an. Vorgaben je Durchlauf, vorbelegt mit den zuletzt benutzten Werten: OP-Nummer, Name, Arbeitsgang-Typ. Bereiche sind die Vorgaben des Typs plus Programme, Einrichteblatt und Dokumente.

## 5. Ablauf im Helfer

Neue Seite **„Altbestand übernehmen“** unter Messprogramme.

1. **Einlesen:** Ordner wählen oder hineinziehen, entweder einen Kundenordner oder den ganzen Quellordner. Der Browser liest nur die Dateiliste. Hochgeladen wird erst beim Übernehmen.
2. **Liste:** Eine Zeile je Programmordner mit:
   - Kunde, Kunden-Teilenummer, Revision, Bezeichnung, alle änderbar
   - Status: neu / Bauteil vorhanden / schon übernommen / Fehler
   - aufklappbar: welche Datei wohin geht und was nicht übernommen wird
   - Hinweise: Kunde fehlt, Revision im Namen weicht vom Index ab, keine `.prg`, mehrere `.prg`, Bauteil mit anderer Revision
3. **Übernehmen:** je Zeile oder für alle markierten. Je Programm in dieser Reihenfolge:
   1. Probelauf des Messprogramms ohne Anlegen. Fehler wie „keine `.prg`“ oder „Vorlagenname vergeben“ brechen hier ab, bevor etwas angelegt ist.
   2. Bauteil finden oder anlegen.
   3. Arbeitsgang finden oder anlegen.
   4. Messprogramm anlegen, falls am Arbeitsgang noch keins ist. Kommentar: „Erstimport aus Altbestand (Ordner …)“.
   5. Einrichteblatt finden oder anlegen, fehlende Fotos hochladen. Abgeglichen wird über den Dateinamen.
   6. Fehlende Bauteil-Dokumente hochladen, ebenfalls über den Dateinamen.
   7. Freigeben (wenn eingeschaltet, siehe unten): Messprogramm und Einrichteblatt, sofern sie noch nicht freigegeben sind.
4. **Ergebnis:** Je Zeile ✓ oder der Fehler. Liest man denselben Ordner noch einmal ein, erkennt der Helfer Übernommenes und macht beim fehlenden Schritt weiter.

**Freigabe nach dem Import:** Schalter „Direkt freigeben“, eingeschaltet. Es gibt ihn nur mit dem Recht `program.release`, ohne das Recht bleibt alles auf Entwurf. Der Helfer geht die regulären Schritte durch (Entwurf → In Prüfung → Geprüft → Freigegeben), jeweils mit dem Grund „Erstimport Altbestand“. So steht im Ablauf jedes Programms und Blatts, wer es wann übernommen hat. Und es klappt auch dann noch, wenn der Server später bei Programmen die Schritte prüft (ROADMAP „Offene Fixes“). Beim Einrichteblatt entsteht mit der Freigabe Stand 1, beim Messprogramm zeigt der Freigabe-Zeiger auf Version 1.0.0.

**Warum der Browser die Schritte nacheinander ausführt statt eine einzige Import-Schnittstelle:** Die vorhandenen Schnittstellen prüfen schon alles: Rechte, Dateiregeln, Programmnummer, Vorlagenname. Eine eigene Import-Schnittstelle müsste diese Logik aus vier Controllern nachbauen. Weil jeder Schritt erst nachsieht, ob es das Ergebnis schon gibt, hinterlässt ein Abbruch keinen kaputten Stand. Es fehlt dann höchstens etwas, und ein zweiter Durchlauf ergänzt es.

## 6. Archiv

- **Einstellungen im Helfer:** Quellordner und Archivordner als Windows-Pfad, z. B. `Z:\KMG\Programme` und `Z:\KMG\Archiv`. Beide werden im Browser gespeichert, denn der Helfer läuft nur am Arbeitsrechner. Eine Migration ist dafür nicht nötig.
- **Skript erzeugen:** Knopf „Archiv-Skript“. Erzeugt `altbestand-archiv.ps1` für alle Programme der Liste, die vollständig übernommen sind, also alle Schritte aus 5.3 mit ✓.
- **Das Skript** (UTF-8 mit BOM, damit Umlaute unter PowerShell 5.1 stimmen):
  - verschiebt `<Quelle>\<Kundenordner>\<Programmordner>` nach `<Archiv>\<Kundenordner>\` und legt den Kundenordner bei Bedarf an
  - überschreibt nie. Gibt es das Ziel schon, wird der Ordner übersprungen, mit Meldung
  - fehlt die Quelle oder ist eine Datei gesperrt: Meldung, weiter mit dem nächsten Ordner
  - mit `-Probe` zeigt es nur an, was es tun würde
  - schreibt ein Protokoll neben das Skript
  - Aufruf: `powershell -ExecutionPolicy Bypass -File altbestand-archiv.ps1 -Probe`, danach ohne `-Probe`
- **Auf derselben Freigabe** ist Verschieben nur Umbenennen, an den Dateien ändert sich nichts. Den leeren Kundenordner in der Quelle lässt das Skript stehen.

## 7. Rechte

Kein neues Recht. Der Helfer nutzt die Schnittstellen mit ihren Prüfungen. Gebraucht werden `part.create`, `setup_sheet.update` und `program.upload`. Die Seite erscheint nur, wenn der Benutzer alle drei hat. Für „Direkt freigeben“ kommt `program.release` dazu.

**Befund (08.11.2026):** Programm-Upload (`POST /api/programs`, `/api/programs/cmm`, neue Versionen) und Bauteil-Dokumente (Hochladen, Löschen) prüfen nur die Anmeldung, kein Recht. Das betrifft auch das Hochladen von Hand. Eingetragen unter ROADMAP „Offene Fixes“, nicht Teil dieser Spec.

## 8. Backend

Eine einzige Änderung: Der **Probelauf des Messprogramms** (`POST /api/programs/cmm?dry_run=true`) geht künftig auch ohne `operation_id`. Heute verlangt er einen vorhandenen Arbeitsgang, und dann müsste der Helfer erst anlegen und könnte danach erst prüfen. Ohne Arbeitsgang entfällt nur die Prüfung, die den Arbeitsgang braucht. Der Vorlagenname wird weiter geprüft.

Alles andere läuft über die vorhandenen Schnittstellen: Kunden und Bauteile suchen, Bauteil, Arbeitsgang, Messprogramm und Einrichteblatt anlegen, Fotos und Bauteil-Dokumente hochladen.

## 9. Umsetzung und Test

| PR | Inhalt | Test |
|---|---|---|
| A | Import-Profil und Ordner-Parser als reine Funktion, Seite mit Einlesen und Liste. Es wird nichts geschrieben | Unit-Tests mit anonymisierten Pfadlisten: Normalfall, ohne Revision im Namen, Revision weicht ab, Unterordner in `01`, fehlende `.prg`, unbekannte Ordner, anders nummerierte Ordner |
| B | Probelauf ohne Arbeitsgang (Backend), Übernehmen mit Wiederaufnahme und Freigabe | Integrationstest für den Probelauf; UI-Test gegen das Wegwerf-Backend: einlesen, übernehmen, Abbruch nach Schritt 3 nachstellen, zweiter Durchlauf ergänzt den Rest; Ablauf zeigt „Erstimport Altbestand“, Freigabe-Zeiger gesetzt, Einrichteblatt mit Stand 1; ohne `program.release` bleibt alles Entwurf |
| C | Archiv-Einstellungen, Skript erzeugen | Unit-Test des Skript-Texts: Pfade mit Leerzeichen und Umlauten, `-LiteralPath`, kein Überschreiben. Ausführen am Arbeitsrechner zuerst mit `-Probe` an einer Kopie |

Danach Probelauf durch den Nutzer an wenigen Programmen. Erst dann die übrigen.

## 10. Entschieden (08.11.2026)

1. **Bauteilnummer:** erzeugt wie im Formular, die Teilenummer aus dem Ordner kommt ins Feld „Kunden-Teilenummer“.
2. **Status nach dem Import:** direkt freigeben mit dem Grund „Erstimport Altbestand“ (Schalter, nur mit `program.release`).
