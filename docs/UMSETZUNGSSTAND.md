# Umsetzungsstand

Stand: 04.10.2026 · Version 0.4.0

## Produkt

- Projekte, Listen, Board, kompakte Liste, persönliche Aufgaben, Tags und
  Unteraufgaben sind produktiv nutzbar.
- Aufgaben besitzen Priorität, Verantwortliche, Fälligkeit, Beschreibung, Link,
  Kommentare und Aktivitätsverlauf.
- Status, Priorität, Fälligkeit, Verantwortlichkeit, Liste und Tag lassen sich
  kombinieren; Sortierungen werden je Ansicht gespeichert.
- Die Listenansicht bietet Mehrfachauswahl und Sammelaktionen für Status und
  Priorität. `N` öffnet die Schnellerfassung.
- Erledigte Aufgaben können archiviert, gelöschte Aufgaben aus dem Papierkorb
  wiederhergestellt werden. Beide Abläufe erhalten Unteraufgabenbeziehungen.
- Monatskalender, Timeline und Auswertung ergänzen die Aufgabenansichten. Persönliche
  Ansichten und Aufgabenvorlagen werden lokal gespeichert; die Auswertung exportiert CSV.
- Aufgaben können andere Aufgaben blockieren. Offene Blocker verhindern den Abschluss,
  und zyklische Abhängigkeiten werden abgewiesen.

## Daten und Zuverlässigkeit

- Alle gespeicherten Entitäten werden gegen Laufzeitschemas geprüft. Defekte
  Einzelwerte werden isoliert und im Systemstatus gemeldet.
- Schema 5 migriert unversionierte Daten, normalisiert das historische
  `fulfilled`-Feld und ergänzt Prioritäten, Archivmetadaten, Aufgabenblocker sowie Startdaten.
- Revision und Änderungszeitpunkt schützen clientseitig vor unbemerktem
  Überschreiben. Ohne serverseitiges Compare-and-swap bleibt ein kleines
  Zeitfenster zwischen Prüfung und Schreiben.
- Mehrstufige Projekt-, Unteraufgaben-, Duplizierungs-, Tag-, Papierkorb-,
  Archiv- und Sammeloperationen besitzen Kompensationen für Teilfehler.
- Authentifizierungsfehler sind sichtbar und sperren sämtliche Schreibpfade.
  Unsichere Aufgaben-URLs werden weder gespeichert noch ausgegeben.

## Architektur, UI und Betrieb

- ChurchTools Styleguide und Utils sind entfernt. Als ChurchTools-Abhängigkeit
  bleibt ausschließlich `@churchtools/churchtools-client`.
- Nuxt UI stellt Dashboard, Sidebar, Navbar, Suche, Formulare, Dialoge und Menüs.
  Tailwind-Utilities sind unter `#tasks` gescopt; die Höhe richtet sich nach dem
  tatsächlichen Einbaupunkt im Host.
- Font Awesome wird einschließlich Webfonts gebündelt. Der Produktionsbuild
  benötigt keine Host-Styles und keinen benachbarten ChurchTools-Checkout.
- Routen und große Dialoge werden lazy geladen. Die globale Suche lädt
  Projektaufgaben erst beim Öffnen.
- Der Systemstatus zeigt Paketversion, Commit, Schema, Modul, Anmeldung und
  isolierte Datenprobleme, ohne Aufgabeninhalte oder Personendaten zu exportieren.
- Das Release-ZIP besitzt die vom offiziellen Boilerplate erwartete einzelne
  `dist/`-Wurzel. CI prüft Node 22 und 24 sowie Typen, Lint, Tests, Build und Paket.
- Dependencies sind auf kompatiblen aktuellen Ständen; `npm audit` meldet keine
  bekannten Schwachstellen.

## Verifikation

- `npm run check`: TypeScript, ESLint, 74 Vitest-Tests in 17 Dateien und Produktionsbuild grün.
- `npm run package:verify`: Extension-Key, HTML-Assets, JavaScript, CSS und
  Archivstruktur erfolgreich geprüft.
- Browser-Smoke-Tests im eingebetteten ChurchTools-Rahmen prüfen Dashboard,
  Deep Links, Karten, Dialoge, Filter, Sortierung, Sammelmenü, Kalender, Timeline,
  Auswertung, Vorlagen, Tastatur-Schnellerfassung und leere Browserkonsole.

## Extern verbleibend

- Die CCM-API bietet aktuell kein dokumentiertes atomisches Compare-and-swap;
  vollständiger serverseitiger Konfliktschutz hängt davon ab.
- Neuinstallation und Update mit repräsentativen Bestandsdaten müssen vor einem
  Store-Release in einer dedizierten ChurchTools-Testinstanz abgenommen werden.
- Die konkrete Wirkung von `securityLevelId: 1` und differenzierte Rechte müssen
  mit der Zielinstanz verifiziert werden.
- Ein vollständiger Axe- und Screenreader-Durchlauf bleibt trotz semantischer
  Buttons, zugänglicher Namen und Tastaturbedienung offen.

Weitere technische Einordnung und der langfristige Funktionsplan stehen in
[PROJEKTANALYSE.md](./PROJEKTANALYSE.md).
