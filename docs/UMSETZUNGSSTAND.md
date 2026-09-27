# Umsetzungsstand

Stand: 27.09.2026

Die erste Stabilisierung aus der Projektanalyse ist umgesetzt. Der Stand baut,
wird typgeprüft und besitzt Regressionstests für die wichtigsten Datenrisiken.

## Erledigt

- Dependencies aktualisiert und per Lockfile reproduzierbar gemacht.
- ChurchTools Styleguide und Utils auf eine zusammenpassende veröffentlichte
  Kombination fixiert; die zuvor veränderlichen `file:`-Links entfernt.
- CCM-Zugriffe, JSON-Serialisierung und Cache-Invalidierung in
  `src/data/ccm.ts` gekapselt.
- Einen kompatiblen QueryClient für die Extension eingeführt. Der interne Client
  des älteren Utils-Bundles wird nicht mit aktuellen TanStack-Observern vermischt.
- Produktionsbuild repariert; Router- und Asset-Basis verwenden beide
  `VITE_KEY`.
- Unbeabsichtigte Schreibzugriffe beim Laden, Refetch und Anzeigen virtueller
  Tag-/Unteraufgaben-Spalten beseitigt. Nur ein echtes Drag-Ereignis in einer
  echten Liste speichert.
- Editor arbeiten mit tief kopierten Entwürfen. Abbrechen verändert weder Cache
  noch API-Daten. Schnelles Tippen und direktes Speichern verliert keinen Wert.
- Statuswechsel im Aufgabendialog implementiert.
- Tags, relative Termine und das Erstellen von Unteraufgaben in den aktiven
  Dialog übernommen; den ungenutzten Alt-Dialog entfernt.
- Projektanlage erstellt explizit eine Standardliste. Für bestehende Projekte
  lässt sich eine Liste über die Board-Leiste anlegen.
- Laufzeitfehler, fehlende Datensätze und Mutationsfehler erhalten sichtbare
  Zustände. Rekursive Operationen besitzen Zyklenschutz.
- Typecheck, Lint, Tests und Build in `npm run check` zusammengeführt; CI ergänzt.
- Release-Skript erzeugt ein frisches ZIP, sodass gelöschte Assets nicht aus
  einem älteren Archiv übernommen werden.
- Die Startseite zeigt offene, persönlich zugewiesene Aufgaben projektübergreifend
  als „Überfällig“, „Heute“, „Demnächst“ oder „Ohne Termin“ und öffnet direkt den
  passenden Projektdialog.

## Verifikation

- `npm run check`: Typecheck, ESLint, 15 Vitest-Tests und Production-Build grün.
- Browser-Smoke-Test mit vollständig simulierten CCM-Daten: Übersicht, Board,
  Tags, Detail und Projekt-Dialog laden ohne Browserfehler.
- Der Smoke-Test bestätigt: reine Navigation erzeugt keine Schreibanfrage,
  Abbrechen speichert nicht, Bearbeiten speichert den neuen Titel und Statuswechsel
  erzeugen jeweils genau einen PUT.
- Ein separater Browser-Test mit zwei simulierten Projekten bestätigt die globale
  Aufgabenübersicht, schreibfreie Navigation und den richtigen Projekt-/Aufgabenlink.
- `npm audit`: keine kritischen oder hohen Befunde mehr. Sechs mittlere Befunde
  bleiben in der veröffentlichten ChurchTools-Markdown-Kette (`showdown` /
  `vue-showdown`). Der von npm vorgeschlagene Fix wäre ein inkompatibles Downgrade
  von Utils auf 0.5.1 und wurde daher nicht automatisch angewendet.

## Noch offen

- Installation und Upgrade mit realem Bestandsdatenbestand in einer ChurchTools-
  Testinstanz. Die lokale Simulation beweist keine Serverkompatibilität der
  konkreten Zielversion.
- Berechtigungsmodell für Projekte und CCM-Kategorien mit der Zielinstanz prüfen.
- Konfliktschutz für gleichzeitige Bearbeitung hängt von ETag-/Versionsfunktionen
  der ChurchTools-API ab und ist noch nicht umgesetzt.
- Unteraufgaben werden derzeit in zwei aufeinanderfolgenden Requests angelegt und
  verknüpft. Bei einem Teilausfall bleibt die neue Aufgabe als normale Aufgabe
  erhalten und ein Fehler wird angezeigt; eine serverseitige Transaktion fehlt.
- Der veröffentlichte Styleguide bringt ein großes Bundle und eine fehlerhafte
  Tailwind-Referenz mit. Die Extension enthält einen dokumentierten Build-Workaround.
- Einige Styleguide-Inputs verbinden sichtbare Labels nicht mit dem nativen Input;
  das sollte upstream für bessere Accessibility korrigiert werden.
- Produktfeatures aus der Analyse wie Vorlagen, Wiederholungen, Erinnerungen,
  Archiv und Mehrfachaktionen folgen nach der Testinstanz-Abnahme.
