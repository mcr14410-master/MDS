# Handy-Test aller Seiten (28.10.2026)

Stand v2.14.2 auf dem Dev-System, per Playwright im Pixel-6a-Format (412 px breit, Touch). Für jede der 52 Seiten (Routen aus `App.jsx`, Detailseiten mit der ersten vorhandenen ID) wurde gemessen:
- Ist die Seite breiter als der Bildschirm (seitliches Wackeln)?
- Welche Elemente ragen über den rechten Rand?
- Welche Bereiche sind abgeschnitten oder nur innen seitlich scrollbar?

Dazu kommt je Seite ein Screenshot. Das Dev-System hat nur Testdaten mit kurzen Namen; mit echten Daten wird es eher schlechter.

**Ergebnis:** 27 von 52 Seiten sind breiter als der Bildschirm. Die Kopfzeile ist auf fast allen Seiten verrutscht.

---

## 1. Kopfzeile – alle Seiten

- **Breadcrumbs werden nicht gekürzt:** Sie laufen unter QR-Symbol und Suchfeld („Werkzeu▦e“), lange Pfade ragen rechts aus dem Bild (Wartung › Aufgaben › …, Zeiterfassung eines Mitarbeiters, Detailseiten mit langen Namen). In `Layout.jsx` hat der linke Teil `min-w-0`, das `nav` in `Breadcrumbs.jsx` kürzt aber nicht.
- **Doppelte Breadcrumbs** auf `ProfilePage`, `admin/UsersPage`, `admin/UserDetailPage`, `admin/RolesPage`, `admin/CronJobsPage`: Diese Seiten binden `<Breadcrumbs items=…>` zusätzlich selbst ein. Die Komponente ignoriert `items` und zeigt dieselben Stufen wie die Kopfzeile.
- Idee: zentral beheben – `nav` mit `min-w-0`/`truncate`, am Handy nur die aktuelle Seite (evtl. mit Zurück-Pfeil); die Einbindungen in den fünf Seiten entfernen.

## 2. Seitenkopf mit Knöpfen – Hauptursache für das Wackeln

Titel und Aktionsknöpfe stehen in einer `flex`-Zeile ohne Umbruch; die Knöpfe ragen rechts raus (Seitenbreite bis knapp 800 px).

- Listen: Maschinen, Werkzeuge, Messmittel, Verbrauchsmaterial, T-Nummern-Listen, Benutzerverwaltung, Wartung (Übersicht), Wartungsaufgaben, Kalender (Monat/Jahr, „Heute“)
- Detailseiten: Maschine, Werkzeug, Lagerort, Lieferant, Messmittel, Spannmittel, Vorrichtung, Wartungsplan, Maschinen-Statistik, Benutzer

Idee: `flex-wrap` bzw. am Handy untereinander. Je Seite einfach, aber jede Seite einzeln – nur dort umsetzen, wo am Handy gearbeitet wird.

## 3. Tab-Leisten auf Detailseiten

Maschine („T-Nummern“, „Fehler-Wiki“ abgeschnitten), Werkzeug („Dokumente“, „Lieferanten“), Bauteil („Historie“). Idee: `overflow-x-auto` wie die Reiter in Urlaub & Arbeitszeit → Verwaltung.

## 4. Tabellen

- **Abgeschnitten, Spalten nicht erreichbar** (`overflow-hidden`): Benutzerverwaltung (nach „E-Mail“ Schluss – Rollen, Status, Aktionen fehlen), Verbrauchsmaterial, Operationstypen. Schlimmster Befund, schnell behebbar (`overflow-x-auto`).
- **Innen seitlich scrollbar** (`overflow-x-auto`, bedienbar, aber mühsam): Bauteile, Werkzeuge, Spannmittel, Vorrichtungen, Bestellungen, Wartungsaufgaben, Zeiterfassung eines Mitarbeiters. Wirklich gut nur mit Kartenansicht fürs Handy – viel Aufwand, nur wo nötig.
- Kleiner: lange Namen in Karten abgeschnitten (Lieferanten-Liste, Messmittel auf dem Dashboard), Automatische Aufgaben (Beschreibung).

## 5. Am Handy schon brauchbar

Dashboard, Bauteil anlegen/bearbeiten, Kunden, Scanner, Zerobot, Profil, Mein Bereich, Wiki, Wartungspläne (Liste), Betriebsstunden, Eskalationen, Mitarbeiter-Einstellungen (2.12.0). **Wartung durchführen** bis auf die Kopfzeile gut.

---

## Vorschlag zur Reihenfolge

1. Überall: Kopfzeile und doppelte Breadcrumbs (1), Tab-Leisten (3), die drei abgeschnittenen Tabellen (4)
2. Seitenkopf (2) nur auf Seiten, die am Handy wirklich genutzt werden – vorher festlegen, welche das sind
3. Komplexe Seiten (Werkzeugstamm, Messmittel-Liste, Zeiterfassungstabelle) bewusst nur für den PC; Kartenansicht nur bei echtem Bedarf

Nach dem Umbau dieselben 52 Seiten erneut messen. Das Skript liegt nicht im Repo, lässt sich aber nachbauen:
- Playwright mit `isMobile`, Viewport 412×915 und je Seite einem neuen Context
- Login über ein lokal erzeugtes Test-JWT im `localStorage`
- Messung: `document.documentElement.scrollWidth` gegen fest 412 px. `innerWidth` wächst im Mobil-Modus mit dem Inhalt mit und taugt dafür nicht.
