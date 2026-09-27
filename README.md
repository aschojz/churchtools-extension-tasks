# ChurchTools Extension Tasks

Aufgabenverwaltung für ChurchTools: projektübergreifende persönliche Übersicht,
Listen und Boards, Tags, Verantwortliche, Unteraufgaben, Fälligkeiten und Aktivitäten.

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
es lädt nichts hoch. Das ZIP enthält `dist/`. Installation, Update und Berechtigungen
müssen vor einem Release in einer ChurchTools-Testinstanz geprüft werden.

## Daten und Architektur

- Projekte sind CCM-Datenkategorien; Aufgaben, Listen und Tags sind JSON-Datenwerte.
- `src/data/ccm.ts` kapselt REST-Verträge, Serialisierung und Invalidierung.
- `src/data/queryClient.ts` ist der gemeinsame Client für Extension-Abfragen.
- `src/domain/tasks.ts` enthält reine Funktionen für Entwürfe, Hierarchie, Termine
  und Sortierung; die Regressionstests liegen unter `tests/`.
- Die Startseite bündelt offene, persönlich zugewiesene Aufgaben aus allen Projekten
  nach „Überfällig“, „Heute“, „Demnächst“ und „Ohne Termin“.
- Ansichten schreiben keine Daten beim Mounten oder Refetch. Drag-and-drop speichert
  ausschließlich nach einem tatsächlichen Verschiebeereignis in einer echten Liste.
- Standardlisten werden beim expliziten Anlegen eines Projekts erzeugt. Für ältere
  Projekte ohne Liste kann über „Liste“ eine angelegt werden.

## Bewusste Kompatibilitätsgrenzen

`@churchtools/styleguide` ist auf 0.66.0 und `@churchtools/utils` auf 0.10.0 fixiert.
Utils 0.10.1 entfernt APIs, die dieser veröffentlichte Styleguide noch verwendet.
Ein Override hält transitive Utils-Verwendungen auf demselben Stand. Die lokale
ChurchTools-Entwicklung hat sich bereits weiterentwickelt; ein späterer Wechsel
auf lokale/neue Pakete muss gemeinsam erfolgen.

Das Utils-Bundle enthält eine ältere TanStack-Runtime. Deren interner QueryClient
wird **nicht** an die aktuelle Extension-Runtime übergeben. ChurchTools-interne
Abfragen bleiben in der Bibliothek, CCM- und Personenabfragen der Extension nutzen
ihren eigenen Client.

Styleguide 0.66.0 veröffentlicht einen falschen Typ-Einstieg und verweist aus dem
CSS auf eine nicht mitgelieferte Tailwind-Quelldatei. `tsconfig.json` verweist auf die
tatsächlich vorhandenen Deklarationen; Vite löst die CSS-Referenz auf das lokale
Theme auf. Nach einem korrigierten Paketrelease können diese Anpassungen entfallen.

Offene Themen, Audit-Einordnung und Entwicklungsplan:
[Projektanalyse](docs/PROJEKTANALYSE.md) und [Umsetzungsstand](docs/UMSETZUNGSSTAND.md).
