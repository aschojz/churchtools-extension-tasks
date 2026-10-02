# Umsetzungsstand

Stand: 02.10.2026

Die erste Stabilisierung aus der Projektanalyse ist umgesetzt. Der Stand baut,
wird typgeprüft und besitzt Regressionstests für die wichtigsten Datenrisiken.

## Erledigt

- Dependencies aktualisiert und per Lockfile reproduzierbar gemacht.
- ChurchTools Styleguide und Utils vollständig entfernt. Nuxt UI deckt Dialoge,
  Felder, Menüs, Tags, Karten und Statusanzeigen ab; `src/platform.ts` kapselt die
  wenigen benötigten Plattformfunktionen.
- Den App-Rahmen auf Nuxt UI Dashboard umgestellt: responsive Sidebar mit
  Projekt- und Ansichts-Navigation, Navbar, globale Projektsuche/Aufgabensuche,
  Kontextaktionen und kompaktere Dashboard-Karten.
- Apollo, GraphQL und die externe Icon-Suche entfernt; Projekte verwenden eine
  kuratierte lokale Font-Awesome-Auswahl.
- CCM-Zugriffe, JSON-Serialisierung und Cache-Invalidierung in
  `src/data/ccm.ts` gekapselt.
- Einen eigenen QueryClient für die Extension eingeführt.
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
- Tags lassen sich direkt in der Tag-Ansicht anlegen, bearbeiten und nach Bestätigung
  löschen. Beim Löschen werden Referenzen aus den betroffenen Aufgaben entfernt.
- Die Projektanlage funktioniert auch in lokalen HTTP-Kontexten, in denen
  `crypto.randomUUID` fehlt. Ein `getRandomValues`-basierter Fallback erzeugt einen
  zulässigen, eindeutigen Kategorie-Schlüssel.

## Verifikation

- `npm run check`: Typecheck, ESLint, 17 Vitest-Tests und Production-Build grün.
- Browser-Smoke-Test mit vollständig simulierten CCM-Daten: Übersicht, Board,
  Tags, Detail und Projekt-Dialog laden ohne Browserfehler.
- Der Smoke-Test bestätigt: reine Navigation erzeugt keine Schreibanfrage,
  Abbrechen speichert nicht, Bearbeiten speichert den neuen Titel und Statuswechsel
  erzeugen jeweils genau einen PUT.
- Ein separater Browser-Test mit zwei simulierten Projekten bestätigt die globale
  Aufgabenübersicht, schreibfreie Navigation und den richtigen Projekt-/Aufgabenlink.
- Die gebaute Extension ist in ChurchTools `3.137.0-RC17` lokal als `tasks`
  verknüpft. Ein isolierter End-to-End-Test gegen die echte CCM-API bestätigt
  Projekt und Standardliste, Aufgabenanlage, Bearbeitung, Statuswechsel,
  Aktivitätsverlauf sowie alle fünf Projektansichten. Das Testprojekt wurde danach
  vollständig gelöscht.
- Ein weiterer echter Browser-/CCM-Test bestätigt die Projektanlage ohne
  `crypto.randomUUID`, den erzeugten Kategorie-Schlüssel und die Standardliste;
  auch dieses Testprojekt wurde danach vollständig gelöscht.
- `npm audit`: ein niedriger Befund in der transitiven Windows-Dev-Server-Abhängigkeit
  `fontless > esbuild`; `npm audit fix` kann ihn mit dem aktuellen Nuxt-UI-Baum
  noch nicht auflösen. Produktionscode und die lokale macOS-Ausführung sind davon
  nicht betroffen.
- Browserprüfung der Nuxt-UI-Oberfläche im echten eingebetteten ChurchTools-Rahmen:
  Übersicht, Projektansicht, Select-Menüs sowie einfache und verschachtelte Dialoge
  sind funktionsfähig. Der Tailwind-Präfix verhindert Klassennamenskollisionen.
- Dashboard-Sidebar einschließlich Ein-/Ausklappen, globale Suche und Navigation
  von Suchergebnissen direkt in den bestehenden Aufgabendialog wurden im echten
  ChurchTools-Rahmen geprüft.

## Noch offen

- Der lokale Neuinstallations- und CRUD-Test ist abgeschlossen. Noch ausstehend ist
  ein Upgrade-Test mit einem repräsentativen Bestandsdatenbestand und einem
  vorher/nachher dokumentierten Rollback.
- Berechtigungsmodell für Projekte und CCM-Kategorien mit der Zielinstanz prüfen.
- Konfliktschutz für gleichzeitige Bearbeitung hängt von ETag-/Versionsfunktionen
  der ChurchTools-API ab und ist noch nicht umgesetzt.
- Unteraufgaben werden derzeit in zwei aufeinanderfolgenden Requests angelegt und
  verknüpft. Bei einem Teilausfall bleibt die neue Aufgabe als normale Aufgabe
  erhalten und ein Fehler wird angezeigt; eine serverseitige Transaktion fehlt.
- Die Accessibility der fachlichen Abläufe sollte trotz der zugänglichen
  Nuxt-UI-Basis in einem eigenen Durchlauf mit Tastatur und Screenreader geprüft werden.
- Produktfeatures aus der Analyse wie Vorlagen, Wiederholungen, Erinnerungen,
  Archiv und Mehrfachaktionen folgen nach der Testinstanz-Abnahme.
