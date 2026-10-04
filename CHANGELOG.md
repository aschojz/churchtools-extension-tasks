# Changelog

## 0.3.0 · 04.10.2026

### Neu

- Prioritäten mit Schemamigration, Anzeige, Filterung und Sortierung
- kombinierbare, lokal gespeicherte Projektfilter und ansichtsbezogene Sortierung
- Mehrfachauswahl mit kompensierten Status- und Prioritätsänderungen
- Archiv für erledigte Aufgaben sowie Papierkorb mit Wiederherstellung
- Schnellerfassung per Taste `N`
- datensparsamer Systemstatus mit Version, Commit und Schema
- Aufgabenblocker mit Abschlussprüfung und Schutz vor zyklischen Abhängigkeiten
- CSV-Export der gefilterten Projektauswertung
- persönliche Aufgabenvorlagen pro Projekt

### Stabilität und Architektur

- versionierte Laufzeitschemas und Migrationen bis Schema 4
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
