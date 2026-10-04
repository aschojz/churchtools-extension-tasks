# Changelog

## 0.4.0 · 04.10.2026

### Neu

- Monatskalender, chronologische Timeline und kompakte Projektauswertung
- konkrete Personenfilter und persönliche gespeicherte Ansichten
- Aufgabenblocker mit Abschlussprüfung und Schutz vor zyklischen Abhängigkeiten
- persönliche Aufgabenvorlagen pro Projekt
- CSV-Export der gefilterten Projektauswertung
- optionale Startdaten in Karten, Kalender, Timeline und Export
- täglich, wöchentlich oder monatlich wiederkehrende Aufgaben mit frei wählbarem Intervall
- responsiver Tab-Überlauf und aktivierbare Sammelauswahl in Board-, Listen-, Tag- und Unteraufgabenansichten

### Betrieb und Daten

- Schema 6 für Aufgabenabhängigkeiten, Startdaten und Wiederholungen mit getesteten Migrationen
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
