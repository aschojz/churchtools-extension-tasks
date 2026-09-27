# Extension Tasks – Analyse und Entwicklungsplan

Stand: 27.09.2026 · untersuchter Commit: `a265d9c`, einschließlich vorhandenem Arbeitsstand.

> Diese Datei beschreibt den Ausgangsbefund. Die erste Stabilisierung wurde
> anschließend umgesetzt; der aktuelle Stand steht in
> [UMSETZUNGSSTAND.md](UMSETZUNGSSTAND.md).

Die Extension besitzt einen brauchbaren Funktionskern, ist im untersuchten Checkout aber nicht releasefähig. Vorrang haben die Migration der ChurchTools-Anbindung, reproduzierbare Dependencies und die Datenintegrität. Insbesondere darf das Öffnen einer Ansicht keine Aufgaben umsortieren oder anderen Listen zuordnen. Ein vollständiger Neuaufbau ist dafür nicht erforderlich.

## Umfang und belastbare Ergebnisse

Untersucht wurden alle fachlichen Bereiche unter `src`, Typen, Build-/Release-Konfiguration sowie die tatsächlich verlinkten ChurchTools-Pakete im Nachbar-Repository. Die bereits vorhandenen Änderungen in `src/App.vue` und `src/project/views/ViewWrapper.vue` wurden berücksichtigt und unverändert belassen.

| Prüfung | Ergebnis |
|---|---|
| `vue-tsc --noEmit` | 167 Diagnosen, davon 121 unter `src`, 46 in eingebundenen generierten API-Typen |
| `vite build --outDir /tmp/extension-tasks-analysis-build` | Fehler: `useCustomModuleQuery` wird von `@churchtools/utils` nicht exportiert |
| `eslint src scripts` | 3 Fehler, 7 Warnungen; Befunde in `scripts/package.js` |
| `npm outdated --json` | 26 Einträge; darunter auch abweichende Major-Versionen und ein irreführender `latest`-Tag bei `vuedraggable` |
| `npm audit --json` | 18 betroffene Pakete: 1 kritisch, 12 hoch, 4 mittel, 1 niedrig |
| Isolierte Ausführung der Originalfunktion `List.updateSortKeys` | Aufgabe mit `list: 100` wird beim Initialisieren einer virtuellen Spalte `200` als Update mit `list: 200` ausgegeben |
| Router-Probe mit installiertem Vue Router | Öffnen `/1/board/11` und Schließen nach `/1/board` funktionieren in der isolierten Probe; ungewöhnliche Route-Spreads sind daher kein bestätigter Navigationsfehler |
| Automatisierte Tests / CI | Keine projektspezifischen Tests oder CI-Konfiguration im untersuchten Repository gefunden |

Die Laufzeitabläufe wurden nicht gegen eine ChurchTools-Instanz getestet. Es wurden keine produktiven Daten verändert und keine Dependencies installiert. Aussagen zu UI-Verhalten sind Quellcodebefunde, sofern nicht ausdrücklich als isoliert reproduziert bezeichnet. Die lokale ChurchTools-Version ist nicht automatisch die Version der Zielinstanz. Falls mit „CCM Store“ der Installations-/Distributionsstore gemeint ist, bleibt dessen End-to-End-Test separat erforderlich; nachgewiesen ist hier zunächst die defekte CCM-Datenanbindung.

Die Registry- und Audit-Ergebnisse stehen dauerhaft in [dependency-snapshot.json](analysis/dependency-snapshot.json). Audit-Zahlen beziehen sich auf betroffene Pakete im untersuchten Abhängigkeitsbaum, nicht auf 18 nachgewiesene Angriffe auf die Anwendung. Lokale `file:`-Pakete und tatsächlich ausgelieferte Browser-Abhängigkeiten müssen zusätzlich bewertet werden.

## Vorhandene Features und tatsächlicher Fertigstellungsgrad

| Bereich | Vorhanden | Lücke / Einschränkung |
|---|---|---|
| Projekte | Übersicht, Anlegen, Bearbeiten, Löschen, Farbe und Icon | Berechtigungsdarstellung, Archivierung, saubere Fehlerzustände fehlen |
| Aufgaben | Titel, Beschreibung, Datum, Link, mehrere Verantwortliche, Tags | Speichern/Abbrechen unsauber; Erledigen im Detaildialog ohne Implementierung |
| Ansichten | Meine Aufgaben, Board, Liste, Tags, Unteraufgaben-Board | Filter unterscheiden sich; virtuelle Spalten werden teilweise wie echte Listen behandelt |
| Listen | Standardliste, Bearbeiten, Löschen, Einklappen, Sichtbarkeitsoptionen | Neue Liste im aktiven Wrapper nicht erreichbar; gefährliche automatische Schreibzugriffe |
| Unteraufgaben | Anzeige, Fortschritt, rekursives Duplizieren/Löschen | Erstellung/Verknüpfung fehlt im aktuellen Editor; Rekursion nicht gegen beschädigte Daten geschützt |
| Tags | Auswahl, Anzeige, Datenfunktionen und separater Dialog | Plus-Button zeigt nur TODO; Editieren/Löschen kein vollständiger Nutzerablauf |
| Termine | Absolute Termine; relative Berechnung im Datenmodell | Relative Termine im aktuellen Editor nicht bearbeitbar; Null-Tage-Abstand fehlerhaft |
| Zusammenarbeit | Kommentare und Aktivitätsverlauf | Kein appseitiger Konfliktschutz; Kommentare sind Teil des gesamten Aufgabenobjekts |
| Suche | Fuse-Suche nach Titel, Beschreibung, URL | Unteraufgaben-Board berücksichtigt Suche nicht; Filtermodell nicht einheitlich |
| Bedienung | Vollbild, Drag-and-drop, Fehler-melden-Link | Board-Einstellungen und Projektverschiebung sind TODO; mobile/Tastaturbedienung ausbauen |

`DialogTaskOld.vue` enthält noch Funktionen für Tags, relative Termine und Unteraufgaben, ist jedoch nicht in den aktiven Dialog eingebunden. Das ist eine unvollständige Ablösung: benötigte Funktionen gezielt übertragen, dann den Altcode entfernen.

## Architektur und CCM-Anbindung

Der aktuelle Datenfluss lautet:

```text
Vue-Seiten / Dialoge / Karten
  → useProjects / useLists / useTasks / useTask / useTags
  → ChurchTools Query- und Mutation-Helfer
  → Custom-Module-REST-API

Projekt = CustomDataCategory
Aufgabe / Liste / Tag = CustomDataValue mit JSON und type-Discriminator
Pinia taskStore = globale Such-/Ansichtsoptionen und Standardlisten-Sperre
```

Das Modell ist für eine überschaubare Extension geeignet. Die Trennung zwischen Anzeige, Fachlogik und Schreiboperationen ist jedoch zu durchlässig. `List.vue` sortiert, speichert, bearbeitet und löscht Daten. `useTasks` erzeugt über `useLists` indirekt Standardlisten; schon die Verwendung eines Lese-Composables kann schreiben. Jede Aufgabenkarte baut zudem erneut Task-, Tag-, Listen- und Personen-Ableitungen auf. Query-Caching kann Requests bündeln, beseitigt aber die mehrfachen Observer, Watches und Berechnungen nicht.

### Nachgewiesener Integrationsbruch

`package.json` verlinkt `@churchtools/utils` und `@churchtools/styleguide` auf `../churchtools/frontend-packages/...`. Der Lockfile fixiert damit keinen unveränderlichen Bibliotheksstand. Änderungen im Nachbarprojekt verändern die Extension ohne Änderung ihres eigenen Codes.

Im aktuell verlinkten Code liegen die CCM-Helfer unter `../churchtools/frontend-packages/vue-query/src/customModules/` und werden von `@churchtools/vue-query` exportiert. Die Extension importiert sie weiterhin aus `@churchtools/utils`. Zusätzlich fehlen dort alte Exporte wie `useCurrentUser`, `useColors`, `EDIT_ICON` und `useBodyScrollbarWidth`; UI-Verträge für Farben, Menüs und Toasts haben sich verändert.

Ein bloßes Umschreiben der Importpfade reicht nicht:

- Die aktuelle Kategorien-Löschmutation erwartet `{ id, dryRun }`; `useProjects.ts:44` übergibt nur eine Zahl.
- Die aktuelle Modulquery ist mit einer numerischen Modul-ID typisiert, `usePlugin.ts:5` übergibt den Extension-Key. Auflösung per Key und ID explizit vereinbaren und gegen die Ziel-API testen.
- Das aktuelle Query-Paket verwendet einen eigenen exportierten `queryClient`; `main.ts` installiert `VueQueryPlugin` ohne diesen explizit zu übergeben. Bei der Migration einen gemeinsamen Client sicherstellen und Cache-Invalidierung testen.
- Die aktuellen lokalen Pakete erwarten teilweise andere Vue-/Pinia-Stände. Runtime und Typen müssen dieselbe kompatible Paketfamilie verwenden.
- Projekt-Metadaten werden in der aktuellen Kategorienmutation anders aufgeteilt. `securityLevelId: 1` in der Extension ist kein ausreichender Nachweis wirksamer Zugriffssteuerung. Tatsächliche Rechte für die Zielversion prüfen.

### Empfohlenes Zielbild

1. Ein schmales CCM-Repository kapselt API-Aufrufe, Serialisierung, Query-Keys, Validierung und Fehlerbehandlung.
2. Reine Fachfunktionen berechnen Hierarchien, Termine, Filter und Sortierung ohne Netzwerk oder Vue-Lifecycle.
3. Projektbezogene Composables liefern gemeinsame, indizierte Daten; lesende Zugriffe erzeugen keine Daten.
4. Dialoge bearbeiten eigene Entwürfe. Explizite Commands speichern, verschieben, vervollständigen oder löschen.
5. Serverzustand bleibt im Query-Cache; benutzerspezifische Ansichtseinstellungen liegen getrennt davon. Teamweit gespeicherte Listeneinstellungen und persönliche Filter klar unterscheiden.

Keine zusätzliche Backend-Plattform oder große State-Management-Neuentwicklung ist für diesen Schritt notwendig. Konfliktkontrolle hängt allerdings von den Möglichkeiten der ChurchTools-API ab.

## Priorisierte Fehler und Abnahmekriterien

### P0 – vor einem weiteren Release

**F01: Build und ChurchTools-Verträge sind gebrochen.** Belege: `src/composables/usePlugin.ts:1`, `src/project/useProjects.ts`, tatsächlicher Buildfehler und Typecheck. Lösung: kompatible, versionierte Pakete festlegen und APIs vollständig migrieren. Abnahme: frischer Checkout kann ohne benachbartes ChurchTools-Repository installiert, typgeprüft und gebaut werden; Projekt-/Aufgaben-CRUD funktioniert auf der Zielversion.

**F02: Ansichten können Listenzuordnungen ungewollt überschreiben.** Belege: `src/components/List.vue:38–91`, `src/project/views/TagBoard.vue`, `src/project/views/TaskBoard.vue`. Initialisierung ersetzt `internItems`, dessen Watch `updateSortKeys` aufruft. Diese Funktion setzt `list` auf die Spalten-ID. Tag- und Aufgaben-Boards übergeben aber Tag- bzw. Aufgaben-IDs als virtuelle Listen. `isDraggable=false` deaktiviert diesen Watch nicht. Isoliert mit Originalfunktionscode reproduziert: `{id:11,list:100}` erzeugt Update `{id:11,list:200,sortKey:5000}` in Spalte 200. Bei mehreren Tags sind konkurrierende Updates möglich. Lösung: nur explizite Drag-Ereignisse persistieren; virtuelle Spalten und echte Listen getrennt typisieren. Abnahme: Mount, Refetch, Suche und Ansichtswechsel erzeugen **keine** Mutation; echtes Verschieben genau die beabsichtigte Änderung.

**F03: Dependency-Sicherheitsbefunde und fehlende Reproduzierbarkeit.** Audit meldet u. a. `tar` kritisch sowie `vite`, `axios`, `lodash-es` und `rollup` hoch. npm meldet für alle 18 Pakete verfügbare Fixes, deren Kompatibilität trotzdem geprüft werden muss. Lösung und Abnahme siehe Dependency-Plan. `npm audit --omit=dev` allein reicht hier nicht: viele tatsächlich im Browser verwendete Pakete stehen unter `devDependencies`.

### P1 – Kernfunktionen und Datenintegrität

**F04: Aufgaben- und Listeneditor besitzen keinen unabhängigen Entwurf.** `TaskEditor.vue:37` übernimmt `tasksMap.value[tId]` direkt, `DialogList.vue` übernimmt `props.list`. Änderungen betreffen somit das gelieferte Objekt; je nach Readonly-Verhalten werden sie sichtbar oder vom Framework abgewiesen. Beim Aufgaben-Speichern können Entwurf und Vergleichsobjekt bereits identisch sein, sodass der Diff leer bleibt. Lösung: tief kopierter, validierter Entwurf und unveränderliche Ausgangsversion. Abnahme: Abbrechen ändert weder Anzeige noch Cache; Speichern produziert genau den tatsächlichen Diff.

**F05: Erledigen-Button im Detaildialog tut nichts.** `DialogTask.vue:59` behandelt nur Anlegen und Bearbeiten, obwohl der Primärbutton im Anzeigemodus „Als erledigt/unerledigt markieren“ anbietet. Lösung: fehlenden Status-Command ergänzen. Abnahme: beide Richtungen inklusive Aktivitätsverlauf, Fehleranzeige und Ladezustand funktionieren.

**F06: Neue Liste mit Sortierung wird fälschlich als vorhandene Liste erkannt.** `DialogList.vue` prüft mit `'sortKey' in list`, obwohl auch neue Listen einen Sortierschlüssel besitzen. Das kann einen Update-Aufruf ohne ID auslösen. Lösung: anhand einer validierten ID entscheiden und auf erfolgreiches Speichern warten. Abnahme: Anlegen mit/ohne eingegebene Sortierung verwendet POST, Bearbeiten PUT; Fehler lassen den Entwurf offen.

**F07: Standardlisten-Erzeugung ist nicht robust.** `useLists.ts:17–29` verwendet eine globale Sperre für alle Projekte, setzt sie ohne `finally` zurück und prüft nur `!isLoading`. Das unterscheidet Erfolg nicht sauber von deaktivierter oder fehlgeschlagener Query. Es fehlt eine modul-/projektbezogene, idempotente Initialisierung; zwischen Clients sind Duplikate möglich. Abnahme: Fehler blockiert spätere Versuche nicht; schnelle Projektwechsel und zwei gleichzeitige Clients erzeugen keine falschen oder doppelten Standardlisten.

**F08: Virtuelle Spalten erzeugen Aufgaben mit falschem Kontext.** `NewTask.vue` setzt immer `{list: props.list.id}`. In Tagspalten müsste ein Tag gesetzt werden; in Unteraufgabenspalten müsste eine Elternbeziehung entstehen. Lösung: getrennte Erstellungs-Commands nach Spaltenart. Abnahme: neue Aufgabe ist nach Reload im richtigen Tag bzw. unter dem richtigen Parent und hat eine gültige Liste.

**F09: Fehlende und beschädigte Daten können Abstürze verursachen.** `TaskEditor.initTask` liest `.name` auch bei nicht gefundener Aufgabe. `calculateDueDate` erwartet ein Objekt. Rekursive Funktionen in `useTasks.ts` und `TaskItem.vue` besitzen keinen Zyklenschutz; `duplicateSubtasks` und `deleteRecursive` greifen auf möglicherweise fehlende Kinder zu. Lösung: Lade-/404-Zustände, Laufzeitvalidierung, besuchte IDs und eindeutige Parent-Regeln. Abnahme: ungültige Route, fehlendes Kind und zyklische Testdaten werden kontrolliert behandelt.

**F10: Löschen und Zusammenarbeit können Inkonsistenzen hinterlassen.** `deleteRecursive` wartet nicht auf die Löschoperationen, bereinigt Parent-Referenzen nicht und bietet keine Bestätigung. Kommentare/Änderungen schreiben jeweils das vollständige Aufgabenobjekt; ein Konfliktmechanismus ist in der Extension nicht vorhanden. Lösung: definierte Löschstrategie mit Ergebnis pro Schritt, Referenzbereinigung und Fehlerbehandlung; Versionsprüfung/ETag verwenden, sofern serverseitig unterstützt. Abnahme: Teilausfall bleibt sichtbar und reparierbar; zwei Bearbeiter überschreiben Kommentare nicht unbemerkt.

**F11: Unteraufgaben-Board reagiert nicht korrekt auf Projektwechsel.** `TaskBoard.vue:14` übergibt `projectId.value` statt der reaktiven Referenz an `useTasks`. Bei wiederverwendeter Komponente bleibt die alte ID gebunden. Abnahme: Wechsel zwischen zwei Projekten zeigt ausschließlich die jeweils richtigen Aufgaben.

**F12: Filterverhalten ist inkonsistent.** `showTask` erwartet `task.parent`, aber Liste, Meine Aufgaben und Tagboard übergeben rohe Aufgaben ohne abgeleitetes `parent`. Das Unteraufgaben-Board ignoriert die Suche ganz. Lösung: gemeinsame Selektoren auf einem konsistenten ViewModel. Abnahme: dieselbe Suche und dieselbe Unteraufgaben-/Erledigt-Einstellung liefern über alle relevanten Ansichten nachvollziehbare Ergebnisse.

**F13: Pflichtfelder und Mutationszustände sind nicht verlässlich abgesichert.** Anlegen aus `{ } as Task` setzt erforderliche Defaults nicht; Enter im Schnellformular umgeht die alleinige Button-Deaktivierung. Projekt-, Listen- und Tagdialog schließen vor Abschluss der Mutation. Lösung: Commands validieren Titel und Defaults, verhindern Doppelspeichern und schließen erst bei Erfolg. Abnahme: leere Titel, Doppelklick und Serverfehler verlieren keine Eingaben.

### P2 – Funktionale Bereinigung und Bedienung

- `getPercentFullfilled` teilt bei Aufgaben ohne Kinder durch null; verwaiste Kinder verfälschen den Nenner. Definierten Wert und ausschließlich gültige Kinder verwenden.
- `calculateDueDate` behandelt `dueDateRelative=0` als nicht gesetzt; `useTask.parent` schreibt ein berechnetes `Date` in das gespeicherte `dueDate`-Feld. Abgeleitete Termine separat führen und Kalendertage/Zeitzonen explizit testen.
- `getObjectDiff` iteriert nur über Schlüssel des ersten Objekts; entfernte Felder im zweiten werden nicht erfasst. Union beider Schlüsselmengen vergleichen.
- `TaskItem.showLastRow` prüft `item.comments` statt der Kommentare in `activity` und ignoriert reine Links. Dadurch können Kommentarzähler und Link verschwinden.
- `router.ts` hardcodiert `/ccm/tasks/`, während Vite den Pfad aus `VITE_KEY` bildet. Einheitliche Basis verwenden; Installation unter alternativem Key testen.
- Projekt nicht gefunden und Ladefehler erscheinen teilweise dauerhaft als Ladezustand; Überblick beobachtet Modul- statt Kategorien-Ladevorgang. Loading, Empty, Error und Forbidden trennen.
- `onSearchForPerson` interpoliert Suchtext unkodiert in die URL. Query-Parameter korrekt kodieren.
- Mobile Breite in `App.vue` ist nicht reaktiv; feste Boardbreiten und Vier-Spalten-Dialog testen. Klickbare Icons als beschriftete Buttons, Fokusführung und Tastaturbedienung ergänzen.
- `txx` gibt nur den Ausgangstext zurück; deutsche und englische UI-Texte sind gemischt. Internationalisierung bei Bedarf systematisch vervollständigen.

## Dependency- und Release-Plan

Live aus der npm-Registry ermittelt; „Ziel“ bezeichnet einen sinnvollen ersten Update-Schritt, keine bereits verifizierte Gesamtkombination.

| Paket | Installiert | Erster Zielkandidat | Entscheidung |
|---|---|---|---|
| ChurchTools Client | 1.4.0 | 1.7.3 | Mit CCM-Verträgen und transitive Axios-Version prüfen |
| ChurchTools utils/styleguide | lokale Verzeichnisse | kompatible veröffentlichte Versionen | Höchste Priorität; Query-/API-Typ-Pakete explizit ergänzen |
| Vue | 3.5.21 | 3.5.43 | Version über alle Pakete harmonisieren |
| Vue Router | 4.5.1 | 4.6.4 | Major 5.3.1 getrennt bewerten |
| TanStack Vue Query | 5.87.4 | 5.104.0 | Mit ChurchTools-Query-Paket und gemeinsamem Client testen |
| Pinia | 3.0.3 | 3.0.4 oder 4.0.3 | Entscheidung nach ChurchTools-Kompatibilität, nicht isoliert |
| Vite | 7.1.4 | 7.3.6 | Danach Major 8.3.1 separat prüfen |
| Vite Vue Plugin | 6.0.1 | 6.0.9 | Mit gewähltem Vite-Stand |
| Tailwind und Vite-Plugin | 4.1.13 | 4.3.3 | Gemeinsam und gegen Styleguide prüfen |
| TypeScript | 5.9.2 | 5.9.3 | Major 7.0.2 separat; Konflikt um generierte Enums lösen |
| vue-tsc / Component Type Helpers | 3.0.6 | 3.3.11 | Zusammen mit Vue/TypeScript |
| ESLint | 9.35.0 | 9.39.5 | Major 10.11.0 separat |
| lodash-es | 4.17.21 | 4.18.1 | Sicherheitsbefunde und Nutzung prüfen |
| Font Awesome | 7.0.1 | 7.3.1 | Auch kopierte Dateien unter `src/assets` berücksichtigen |
| vuedraggable | 4.1.0 | zunächst 4.1.0 | Registry-`latest` ist 2.24.3: nicht blind auf Vue-2-Zweig wechseln |

Weitere verifizierte Versionen stehen im Snapshot. Vite 7.1 liegt außerhalb der aktuell unterstützten Minor-Linien; die offizielle [Vite-Supportübersicht](https://vite.dev/releases) nennt unter anderem 7.3 als unterstützte Linie. Deshalb ist 7.3.6 ein sinnvoller erster Schritt vor einer gesonderten Major-Migration.

Reihenfolge:

1. Ziel-ChurchTools-Version und kompatible Paketfamilie festlegen. Lokale Verzeichnislinks durch versionierte Artefakte ersetzen; private Registry-Konfiguration reproduzierbar dokumentieren.
2. Node-Version/`engines` festlegen. Typecheck, Lint, Tests und Build als getrennte Skripte einführen. `build` verwendet aktuell `vue-tsc ; vite build`: durch `&&` ersetzen, damit Typfehler den Release tatsächlich stoppen.
3. ChurchTools-Integration migrieren; UI- und API-Verträge anpassen. Importierte direkte Dependencies explizit deklarieren, z. B. `@apollo/client`, `@eslint/js`, `globals`, `typescript-eslint` statt Zufallsverfügbarkeit über Peers/Transitives.
4. Kompatible Updates einschließlich Lockfile durchführen; transitive Audit-Fixes nachvollziehen. Major-Upgrades separat halten. Kein unkontrolliertes `npm audit fix --force`.
5. Frische Installation, Typecheck, Lint, Regressionstests und Production-Build prüfen. Vollständiges Audit wiederholen und verbleibende Befunde nach Browser-/Build-/Node-Erreichbarkeit dokumentieren.
6. Paket in einer Testinstanz installieren und aktualisieren. Assetpfade, Deep Links nach Reload, Berechtigungen und Erhalt vorhandener Daten prüfen.

`scripts/package.js` erstellt lediglich ein ZIP aus `dist`. Das ist noch kein nachgewiesener CCM-Store-Releaseprozess. Archivstruktur und benötigte Metadaten gegen den tatsächlichen Installationsvertrag prüfen. Bei gleichem Versions-/Commitnamen aktualisiert `zip -r` ein bestehendes Archiv; entfernte Assets können darin verbleiben. Frisches Archiv, eindeutige Release-Version, Integritätsprüfung und dokumentierter Rollback gehören in den Ablauf. Die README beschreibt noch ein Boilerplate und verweist auf eine fehlende `.env-example`.

## Was als Nächstes fehlen darf – und was nicht

Vor neuen Produktfeatures müssen die sichtbaren Grundabläufe vollständig sein: Listen und Tags anlegen, Unteraufgaben erstellen, relative Termine bearbeiten, Status ändern, Fehler verstehen und gefahrlos abbrechen. TODO-Aktionen entweder fertigstellen oder bis dahin ausblenden.

Danach sind die wertvollsten Erweiterungen:

1. Projektübergreifende „Meine Aufgaben“ mit Heute, Überfällig und Demnächst sowie Filtern nach Verantwortlichen, Tags und Status.
2. Projekt-/Aufgabenvorlagen und wiederkehrende Aufgaben für wiederkehrende Gemeindearbeit.
3. Erinnerungen und Benachrichtigungen, sofern ChurchTools eine passende Integration bietet.
4. Archivierung, Wiederherstellung/Undo und Mehrfachaktionen.
5. Export und dokumentiertes Datenschema inklusive `schemaVersion` und Migrationen.

Ein volles Kanban-Statusmodell, Prioritäten, Anhänge und Abhängigkeiten sind mögliche nächste Ausbaustufen. Zuerst klären, ob Listen organisatorische Sammlungen oder Workflow-Status darstellen sollen; das verhindert doppelte oder widersprüchliche Modelle.

## Konkrete Arbeitspakete

| Paket | Inhalt | Fertig, wenn … |
|---|---|---|
| A – Releasebasis | F01/F03, ChurchTools-Migration, Versionierung, Dependency-Updates, Build-Gates | frische Installation und alle Checks erfolgreich; Installation in Ziel-Testinstanz funktioniert |
| B – Sichere Datenoperationen | F02/F04/F06/F07/F08/F09/F10/F13 | Ansichtswechsel schreibt nichts; Entwürfe abbrechbar; Operationen bei Fehlern nachvollziehbar |
| C – Vollständiger Funktionskern | F05/F11/F12, Listen/Tags/Unteraufgaben/relative Termine, TODOs | alle angebotenen Kernaktionen funktionieren; Alt-Dialog kann entfallen |
| D – Wartbarkeit und UX | Repository-Schicht, reine Fachlogik, einheitliche Filter, Zustände, mobile/Tastaturbedienung | keine Lifecycle-Schreibeffekte; übersichtliche Zustandsführung; dokumentierte Nutzerabläufe |
| E – Produktnutzen | globale Aufgabenübersicht, Vorlagen, Wiederholungen/Erinnerungen | anhand konkreter Nutzerabläufe priorisiert und getestet |

Notwendige Regressionstests für A–C: Mount/Refetch ohne Mutation; echter Drag zwischen Listen; Tag-/Parent-Kontext beim Erstellen; Editieren und Abbrechen; Statuswechsel; fehlende/zyklische Kinder; Standardliste nach API-Fehler; Projektwechsel; konsistente Suche; relative Termine einschließlich null Tagen; Speicherkonflikt und Teilausfall beim Löschen. Dazu ein Browserablauf Projekt → Liste → Aufgabe → Bearbeiten → Kommentar → Erledigen → Reload und ein Installation-/Upgrade-Test mit bestehendem Datenbestand.

Der Dependency-Snapshot dokumentiert den Stand der Erstanalyse. Umgesetzte
Reparaturen, aktuelle Prüfungen und verbleibende Grenzen werden separat im
Umsetzungsstand geführt.
