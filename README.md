# ChurchTools Extension Tasks

Aufgabenverwaltung für ChurchTools: persönliche Übersicht, Listen und Boards,
Kalender, Timeline, Auswertung, Prioritäten, Filter, Tags, Verantwortliche,
Unteraufgaben, Blocker, Vorlagen, Archiv und Papierkorb.

## Funktionsumfang

- Projekte mit Board, kompakter Liste, persönlichen Aufgaben, Tags und Unteraufgaben
- Prioritäten sowie Filter nach Status, Priorität, Fälligkeit, Verantwortlichkeit,
  Liste und Tag
- Sortierung nach Fälligkeit, Priorität, Titel, Änderung oder manueller Reihenfolge
- Mehrfachauswahl für gemeinsame Status- und Prioritätsänderungen
- Kommentare, Aktivitätsverlauf, Startdaten, absolute und relative Fälligkeiten und sichere Links
- Archiv für erledigte Aufgaben und wiederherstellbarer Papierkorb
- globale Suche und Schnellerfassung per Taste `N`
- Systemstatus mit Version, Commit, Datenschema und datensparsamer Fehlerdiagnose
- Aufgabenabhängigkeiten mit sichtbaren Blockern und abgesichertem Abschluss
- Kalender, Timeline und Projektauswertung mit lokalem CSV-Export
- persönliche gespeicherte Ansichten und Aufgabenvorlagen

## Lokal entwickeln

Voraussetzungen: Node.js 22.12+ oder 24 und npm. Der Lockfile verwendet versionierte
Pakete; ein benachbartes ChurchTools-Repository ist nicht erforderlich.

```sh
npm ci
cp .env-example .env
npm run dev
```

In `.env` die Testinstanz und den Extension-Key setzen. Der Key bestimmt sowohl
Asset- als auch Router-Basis (`/ccm/<key>/`). Für Entwicklung muss die Instanz CORS
für den lokalen Vite-Ursprung erlauben. Optionale Zugangsdaten werden nur beim
Entwicklungsstart für `/login` verwendet. `.env` bleibt lokal.

### In eine lokale ChurchTools-Installation einbinden

Wenn ChurchTools im Nachbarverzeichnis `../churchtools` liegt und das Custom Module
mit dem Key `tasks` bereits registriert ist, kann der Build direkt verknüpft werden:

```sh
npm run build
ln -s "$(pwd)/dist" ../churchtools/sites/default/custommodules/tasks
```

Danach ist die Extension unter `/ccm/tasks/` erreichbar. Der Symlink muss nur einmal
angelegt werden; spätere Builds ersetzen den Inhalt von `dist`. Existiert am Ziel
bereits ein Verzeichnis oder Symlink, muss dessen Herkunft vor dem Ersetzen geprüft
werden.

## Prüfen und paketieren

```sh
npm run typecheck
npm run lint
npm test
npm run check
npm run deploy
```

`check` führt Typecheck, Lint, Regressionstests und Production-Build aus. `build`
bricht bei Typfehlern ab. `deploy` erstellt lediglich ein lokales ZIP in `releases/`;
es lädt nichts hoch. Vor dem Verpacken werden Extension-Key, referenzierte Assets
und die vom offiziellen Boilerplate erwartete einzelne `dist/`-Wurzel geprüft.
`npm run package:verify` prüft einen vorhandenen Build ohne ein ZIP anzulegen.
Installation, Update und Berechtigungen müssen vor einem Release in einer
ChurchTools-Testinstanz geprüft werden.

## Daten und Architektur

- Projekte sind CCM-Datenkategorien; Aufgaben, Listen und Tags sind JSON-Datenwerte.
- `src/data/ccm.ts` kapselt REST-Verträge, Serialisierung und Invalidierung.
- `src/data/queryClient.ts` ist der gemeinsame Client für Extension-Abfragen.
- `src/domain/types.ts`, `storedData.ts` und `tasks.ts` enthalten das versionierte
  Domänenmodell, Migrationen und reine Funktionen für Hierarchie, Termine und
  Sortierung; die Regressionstests liegen unter `tests/`.
- Nuxt UI stellt Dialoge, Felder, Menüs, Karten, Tags, Personen und Ladezustände
  bereit. Die Vue/Vite-Einbindung liegt in `vite.config.ts` und `src/main.ts`;
  auf `#tasks` gescopte Tailwind-Utilities verhindern CSS-Kollisionen mit dem
  ChurchTools-Rahmen.
- Der App-Rahmen verwendet Nuxt UI Dashboard mit einklappbarer, größenveränderbarer
  Projekt-Sidebar, Navbar, projektweiter Navigation und globaler Suche nach
  Projekten und Aufgaben.
- `src/platform.ts` enthält die wenigen browser- und ChurchTools-nahen Adapter
  für den aktuellen Benutzer, Farben, Icons und Formatierung.
- Die Startseite bündelt offene, persönlich zugewiesene Aufgaben aus allen Projekten
  nach „Überfällig“, „Heute“, „Demnächst“ und „Ohne Termin“.
- Ansichten schreiben keine Daten beim Mounten oder Refetch. Drag-and-drop speichert
  ausschließlich nach einem tatsächlichen Verschiebeereignis in einer echten Liste.
- Standardlisten werden beim expliziten Anlegen eines Projekts erzeugt. Für ältere
  Projekte ohne Liste kann über „Liste“ eine angelegt werden.

## Abhängigkeiten und UI

Die Extension verwendet aus dem ChurchTools-Ökosystem ausschließlich
`@churchtools/churchtools-client`. Die Oberfläche basiert auf Nuxt UI; Farben und
die aktuelle Person kapselt `src/platform.ts`. Damit hängt der Build weder von
internen Frontend-Paketen noch von einem benachbarten ChurchTools-Checkout ab.

Font Awesome bleibt für Icons erhalten. Die Projektauswahl nutzt eine kuratierte
lokale Icon-Liste und der Build bündelt CSS sowie Webfonts; dadurch sind für die
Oberfläche weder Host-Styles, Apollo, GraphQL noch eine externe Icon-Suche
erforderlich.

Offene Themen, Audit-Einordnung und Entwicklungsplan:
[Projektanalyse](docs/PROJEKTANALYSE.md) und [Umsetzungsstand](docs/UMSETZUNGSSTAND.md).
