# Changelog

## 0.9.1 · 16.10.2026

- Einheitliche Überschriften und Trennlinien auch bei leeren Aufgabenbereichen der Übersicht
- Korrekte, von Status- und Primärfarben unabhängige Tagfarben; Palette mit 18 Farben und Vorschaukreisen in der Farb- und Tagauswahl
- Kompaktere Übersichtskarten mit anklickbarem Elternpfad, Projekt in der Metadatenzeile und ohne zusätzlichen Navigationspfeil
- Übersicht ohne maximale Seitenbreite; Aufgabenbereiche nutzen je nach verfügbarem Platz bis zu vier Spalten

## 0.9.0 · 16.10.2026

- Spalten-Scrollbars nur bei Hover oder Tastaturfokus sichtbar; auf Touch-Geräten weiterhin dauerhaft sichtbar
- Tooltips erscheinen vor der Sidebar und den übrigen Aufgaben-Overlays
- Gleichmäßig schmale Kartenabstände in Board-Spalten mit platzsparender Scrollbar
- Projekte direkt über den Plusbutton neben der Sidebar-Überschrift erstellen
- Leere Aufgabenbereiche unterbrechen das Spaltenraster der Übersicht nicht mehr
- Gleichmäßiger Randabstand auch hinter der letzten horizontal gescrollten Board-Spalte
- Sichtbarer, themefähiger Rahmen zur klareren Abgrenzung der Board-Lanes
- Erledigte Unteraufgaben sichtbar markiert und im Dialog ausblendbar; dezenter Elternpfad auf Karten, ohne Wiederholung im Eltern-Dialog
- Klar erkennbare Oberaufgaben mit direkt öffnbarem Aufgabenpfad auf Karten und im Aufgabendialog
- Kompakter, am Icon ausgerichteter Projektkopf; getrennte Bereiche für Hauptaktion, Suche und Sammelauswahl
- Projektmenü für Listen, Vollbild und ansichtsspezifische Aktionen; Monatssteuerung direkt am Kalender
- Klarer Projektkopf und besser auffindbare Kalender- und Timeline-Ansichten
- Neu gestaltete Übersicht mit Kennzahlen, leichteren Aufgabenbereichen und überarbeiteten Projektkarten
- Ruhigere Board-Karten und konsistente visuelle Hierarchie in Hell und Dunkel
- Kalenderkarten mit Priorität, Status und verantwortlicher Person; Timeline mit Datum, Wochentag und Liste
- Kompakte mobile Werkzeugleiste und responsive Planungsansichten

## 0.8.0 · 15.10.2026

- Aktualisierte Produktions- und Entwicklungsabhängigkeiten, einschließlich Markdown-Parser; TypeScript bleibt wegen der ESLint-Kompatibilität auf 5.9.3

- Projektformular mit sichtbarer Standardfarbe „Neutral“; Platzhalter verwenden kontrastreichere Nuxt-UI-Textfarben
- Sichtbare Rahmen und Trennlinien im Dark Mode, insbesondere an Sidebar und Headern
- Erreichbare lange Inhalte: eigene Scrollbereiche für Übersicht und Board-Spalten sowie Dialoge mit sichtbaren Aktionen und scrollbarem Inhalt
- Hell- und Dunkelmodus über Nuxt UIs semantische Themefarben; der aktive Modus folgt der ChurchTools-Umgebung
- Themefähige Karten, Kalender, Auswertung, Dialoge, Kommentare und Markdown-Editor

## 0.7.0 · 09.10.2026

- Sammelaktionen für Listen, Tags, Verantwortliche, Fälligkeits- und Startdaten sowie Papierkorb
- Tags und Verantwortliche gesammelt hinzufügen, entfernen oder ersetzen; weitere Personen über die Suche auswählen
- Klick auf die gesamte Aufgabenkarte wählt im Bulk-Modus aus oder ab, ohne den Dialog zu öffnen
- Runde Auswahlfelder ganz rechts; Einzelaktionsmenüs sind im Bulk-Modus ausgeblendet
- Zusätzliche Aufgaben-Properties bleiben beim Einlesen und Bearbeiten erhalten
- Aufgaben im Editor mit Cmd+Enter oder Ctrl+Enter speichern
- Fälligkeits- und Startdatum mit einem Klick vollständig leeren
- Aufgabendialog schließt nach erfolgreichem Erledigen und bleibt bei Fehlern offen
- Überfällige Fälligkeitstermine werden auch im Aufgabendialog rot angezeigt
- Fortschrittskreise haben dieselbe Größe wie Personenavatare

## 0.6.0 · 09.10.2026

- Aktualisierte Node-Typdefinitionen und Sicherheitskorrektur für source-map-js
- Kompaktere Projektsteuerung mit Sortier-Icon, CSV-Menü und vereinfachten Filterwerten
- Kompakte Timeline-Karten ohne Beschreibung und mit rechtsbündigen Tags
- Kleinere Kennzahlen, vollbreite Fortschritts- und Auslastungskarten sowie Personenavatare in der Auswertung
- Lesbare Aufgabenübersicht mit Tags und Metadaten statt Beschreibungen
- Einheitliche warmgraue Icons und Platzhalter, dezentere Kommentare und Blocker-Hinweise
- Aufgabenvorlagen im Dialogkopf und Trennlinie unter der Editor-Toolbar

- Timeline mit denselben Aufgabenkarten wie das Board, Sammelauswahl und exakt zentrierten Zeitlinienpunkten
- Markdown-Vorschau auf Aufgabenkarten, Kürzung am rechten Zeilenende und unten ausgerichtete Metadaten
- Lesbare Aktivitätswerte für Wiederholungen und verschachtelte Änderungen; technische Speicherfelder werden ausgeblendet
- Korrigierte Markdown-Textfarben, ruhigere Detail-Labels und einheitliches Blocker-Symbol
- Markdown-Beschreibungen mit Nuxt-UI-Editor, Formatierungsleiste und formatierter Aufgabenansicht
- Aufgabendialog und Editor werden erst beim Öffnen geladen

- Ruhigere Aufgabenkarten mit separaten Tags, grauen Metadaten ohne Hintergrund und Avataren unten rechts
- Nur überfällige Termine werden rot hervorgehoben; offene Blocker erhalten ein Blockierungssymbol
- Aufgabenabschluss über Kontextmenü und Dialog; Kartencheckboxen erscheinen nur im Sammelauswahlmodus
- Aufgaben lassen sich über die gesamte freie Kartenfläche öffnen
- Verantwortlichen-Auswahl schlägt bisher zugewiesene Projektmitglieder sofort vor
- Optionale E-Mail-Benachrichtigung beim Erstellen einer Aufgabe, inklusive Aufgabenlink
- Versandfehler werden separat gemeldet; die erstellte Aufgabe bleibt gespeichert

## 0.5.0 · 04.10.2026

### Neu

- optionale Startdaten in Karten, Kalender, Timeline und CSV-Export
- täglich, wöchentlich oder monatlich wiederkehrende Aufgaben mit frei wählbarem Intervall
- sicherer CSV-Import mit Vorschau, Zuordnungsprüfung und Rückabwicklung
- aktivierbare Sammelauswahl in Board-, Listen-, Tag- und Unteraufgabenansichten
- bestätigter Migrationslauf zum revisionsgeführten Zurückschreiben erkannter Altwerte

### Stabilität und Architektur

- Schema 6 für Startdaten und Wiederholungen mit getesteten Migrationen
- zentrale Statusänderungen mit einheitlicher Blocker-, Wiederholungs- und Fehlerbehandlung
- validierte persönliche Ansichts- und Listenpräferenzen
- korrelierbare Fehler-IDs für Schnellerfassung und globale Suche
- explizite Domänenimporte statt globaler TypeScript-Typ-Aliase
- Schutz exportierter CSV-Zellen vor Formelausführung in Tabellenprogrammen

### UI und Integration

- responsiver Tab-Überlauf, kompaktere Projektsteuerung und ansichtsübergreifende Sammelaktionen
- vollständig isolierte Lucide-Icons ohne Eingriff in Font Awesome des ChurchTools-Headers
- vereinheitlichte Karten, Listenzeilen, Seitenleistenaktionen und Planungsansichten
- korrigierte Kontraste für Kennzahlen und Sidebar-Titel im ChurchTools-Rahmen

## 0.4.0 · 04.10.2026

### Neu

- Monatskalender, chronologische Timeline und kompakte Projektauswertung
- konkrete Personenfilter und persönliche gespeicherte Ansichten
- Aufgabenblocker mit Abschlussprüfung und Schutz vor zyklischen Abhängigkeiten
- persönliche Aufgabenvorlagen pro Projekt
- CSV-Export der gefilterten Projektauswertung

### Betrieb und Daten

- Schema 4 für Aufgabenabhängigkeiten mit getesteter Migration
- Migrationsvorschau für erkannte Altwerte im Systemstatus
- korrelierbare Fehler-IDs für sichtbare Schreib- und Anmeldefehler

## 0.3.0 · 04.10.2026

### Neu

- Prioritäten mit Schemamigration, Anzeige, Filterung und Sortierung
- kombinierbare, lokal gespeicherte Projektfilter und ansichtsbezogene Sortierung
- Mehrfachauswahl mit kompensierten Status- und Prioritätsänderungen
- Archiv für erledigte Aufgaben sowie Papierkorb mit Wiederherstellung
- Schnellerfassung per Taste `N`
- datensparsamer Systemstatus mit Version, Commit und Schema

### Stabilität und Architektur

- versionierte Laufzeitschemas und Migrationen bis Schema 3
- clientseitige Revisionen und sichtbare Konflikte bei parallelen Änderungen
- Kompensation für mehrstufige Projekt-, Aufgaben-, Tag- und Sammeloperationen
- explizites Domänenmodell ohne `any` in Aktivitätseinträgen
- lazy geladene Routen und Suchabfragen erst beim Öffnen
- Authentifizierungsfehler sperren Schreibvorgänge und bleiben sichtbar
- sichere HTTP(S)-Links und gebündelte Font-Awesome-Assets

### UI und Distribution

- Nuxt-UI-Dashboard mit kompakter Filteroberfläche und zugänglichen Aktionen
- auf den Extension-Root begrenzte Tailwind-Utilities und dynamische Einbauhöhe
- aktualisierte Dependencies ohne bekannte `npm audit`-Findings
- verifiziertes CCM-ZIP mit `dist/`-Wurzel und CI unter Node 22 und 24
