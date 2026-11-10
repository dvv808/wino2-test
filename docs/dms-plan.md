# DMS – Plan (zur Freigabe)

Stand: 05.11.2026 · Status: **freigegeben**. Phasen a–g erledigt.

**Fortschritt**
- **a ✓** (05.11.2026):
  - Typen in `src/types/dms.ts`, inklusive `Ordnervorlage.mount` für den Pfad über der Vorlage, z. B. `["Partner"]`.
  - Seed in `src/mocks/dms/seed.ts`.
  - Store in `src/dms/store.tsx` (`wino.dms.v1`).
  - Test in `src/mocks/dms/seed.test.ts`.
  - `vitest` mit `npm test`; die strikte TypeScript-Prüfung gilt als Lint (K1).
- **b ✓** (05.11.2026): `src/lib/dms/` mit Tests in `dms.test.ts`:
  - `placeholders.ts`: Platzhalter auflösen, „/“ in Namen → „∕“.
  - `resolveAblage.ts`: Spezifität (Quelle + Entität + Slot), dann `priority`, dann Reihenfolge; fehlende Felder; nicht zuordenbar → Eingang.
  - `views.ts`: Vorlagen-Instanzen pro Entität, `groupBy`, neuestes Jahr pro (Sparte, Versicherer, Typ) mit „nicht aktuell“, `findFolder` / `locateDocument` / `eingang`.
  - `workflow.ts`: automatischer und manueller Statuswechsel.
  - `upload.ts`: aus einem Upload wird genau ein Datensatz.
  - Der Store wendet automatische Übergänge beim Laden und nach jeder Änderung an.
  - Regel: Ein Ordner ohne Filter (bei sich oder darüber) gruppiert nur Unterordner und hält selbst keine Dokumente.
- **c ✓** (05.11.2026): `src/lib/dms/permissions.ts`, Tests in `permissions.test.ts`:
  - Rechte gelten nur als Erlaubnis und werden nach unten vererbt; es gewinnt die höchste Stufe.
  - `filterView` blendet Ordner ohne Zugriff aus, lässt aber den Weg zu sichtbaren Unterordnern stehen (Stufe null, ohne Dokumente).
  - Vertraulich schlägt den Ordner: Nur die genannten Personen sehen das Dokument, auch ein Admin nicht. In der Verwaltung bleibt es gesperrt gelistet (`lockedIds`).
  - `whoHasAccess` liefert pro Person Stufe und Herkunft, etwa „Backoffice · geerbt von …“.
- **d ✓** (05.11.2026):
  - **Gemeinsamer Upload:** `src/dms/upload.tsx` mit `<DmsUpload context>` und `useDmsUpload`.
    - Der Dialog „Fehlende Angaben“ fragt nur die fehlenden Felder ab.
    - „Später zuordnen“ legt die Datei ins Eingang.
    - Ein Hinweis zeigt, wo die Datei gelandet ist.
  - **Migration:** Alle vier Upload-Punkte nutzen jetzt die gemeinsame Komponente. Das sichtbare Verhalten (Datei-Chips) bleibt gleich.
    - U1: `PartnerFields`, Anhänge
    - U2: `BankFields`
    - U3: `AnhaengeFields` für Firma und Wirtschaftsdaten (Slot `wirtschaft`)
    - U4: `SignStep`
  - **Partner aus den Stammdaten** kommen automatisch ins DMS (`syncEntities`), auch neu angelegte.
  - **Upload-Quellen (Demo):** in Admin → Spaces (`src/dms/UploadSources.tsx`). Das Panel ersetzt die fehlenden Module (K2) und zeigt den Eingang-Zähler.
  - **Build-Check:** `scripts/check-upload-inputs.mjs` läuft vor `tsc` im Build und bricht ab, sobald ein `type="file"` außerhalb von `src/dms/upload.tsx` steht.
- **e ✓** (05.11.2026): Admin → Spaces mit Modul-Pills.
  - **Verwaltung:** `src/dms/DmsBrowser.tsx`, drei Panels wie in Figma.
    - Ordnerbaum mit Personen-Umschalter, Suche, Zählern und ⋮ → „Wer hat Zugriff?“.
    - Ordnertabelle im Standard-Table-UI, mit Drag & Drop und Upload-Button.
    - Vorschau mit Status-Übergängen, Metadaten und der Ablage in beiden Ansichten („Ein Datensatz“).
  - **Ordnervorlagen:** Knoten anlegen, umbenennen, verschieben (↑↓→←) und löschen. Ebene je Wert, „Nur neuestes Jahr“, Filterregeln, Berechtigungen, Platzhalter-Chips, Ansichten und Pfad darüber.
  - **Dokumenttypen:** Pflichtfelder und Status bearbeiten (umbenennen, sortieren, löschen). Übergangsmatrix und automatischer Übergang.
  - **Ablageregeln:** Tabelle mit Bearbeiten-Dialog und Panel „Testen“ (gleiches `resolveAblage`).
    - Zeigt zusätzlich, wo das Dokument laut Ordnerfiltern wirklich erscheint (`predictLocation`).
    - Warnt, wenn der Zielpfad davon abweicht.
  - **Gruppen & Berechtigungen:** Mitglieder pflegen; „Wer hat Zugriff?“ je Ordner und Ansicht.
  - **Eingang:** Tabelle, Dialog „Zuordnen“ (Typ, Verknüpfung, Pflichtfelder, Vorschau „Landet in“), „Als Regel speichern“.
  - **Nur für DMS-Admins:** Die Konfigurationsseiten sind für Personen ohne diese Rolle gesperrt.
  - **Reine Logik** in `src/lib/dms/admin.ts`, Tests in `admin.test.ts`.
  - **Konflikt-Hinweis:** Ordner sind Filter. Der Zielpfad einer Regel ist nur die Erwartung; was eine Regel tatsächlich bestimmt, sind Dokumenttyp, Verknüpfungen und Metadaten.
- **f ✓** (05.11.2026): User-DMS unter Mein Bereich → Dokumente.
  - Dieselbe Komponente (`DmsBrowser`) mit der Ansicht `Standard` und dem Titel „Meine Dateien“, gefiltert nach den effektiven Rechten der aktiven Person.
  - Der Personen-Umschalter im Baumkopf gilt für das ganze DMS. Admin-Tab und Mein-Bereich-Tab bleiben nebeneinander offen.
  - Fix: Ältere Jahre, die „Nur neuestes Jahr“ ausblendet, landeten im Elternordner. Jetzt hat „Unternehmen / Versicherer“ 25 statt 70 Einträge. Test ergänzt.
- **g ✓** (05.11.2026): Maklervereinbarung-Karten.
  - `MaklermandatPage` zeigt die Maklervereinbarungen des Partners direkt aus den DMS-Datensätzen (`src/lib/dms/agreements.ts`):
    - Aktiv → Gültig
    - Entwurf und In Freigabe → Entwürfe
    - Abgelaufen und Gekündigt → Abgelaufen
  - Zähler in Sektionen und Seitenleiste.
  - Die Karte trägt Status-Buttons (gleiches `setStatus`) und „Im DMS“, das Mein Bereich → Dokumente mit dem Dokument geöffnet zeigt (`src/dms/focus.ts`).
  - Ein Wechsel auf der Karte oder im DMS ändert denselben Datensatz; Test ergänzt.
  - Hinweis: Ashley bleibt bis zur Umwandlung gesperrt, die Karten erscheinen dort erst danach. Die bestehende Honorar- bzw. Workflow-Karte bleibt zusätzlich in „Gültig“ (K4 offen).
- **Umbau 05.11.2026: Ordner Zuordnung und Spaces**
  - **Navigation:** Die Pills „Ordner Zuordnung | Spaces“ sind gruppiert (`module-group` wie in HRM). „Ordnervorlagen“ und „Ablageregeln“ fallen weg.
  - **Ordner Zuordnung** (`src/dms/admin/Zuordnung.tsx`) hat drei Panels:
    - Ordnerstruktur je Ansicht.
    - Quellen: alle Upload-Punkte; nicht verknüpfte sind amber markiert („landet im Eingang“).
    - Ordner-Details: Name, Ebene, verknüpfter Ordner, verknüpfte Quellen mit Dokumenttyp, Berechtigungen, Erweitert.
  - **Quelle verknüpfen:** eine Quelle auf einen Ordner ziehen.
    - Fehlt die Ebene für ihre Entität, wird „{Partner.Name}“ (bzw. Kunde, …) angelegt (`groupBy … allEntities`, ein Ordner je Entität aus den Stammdaten).
    - Eine Quelle ist genau einmal verknüpft; ein erneutes Ziehen verschiebt die Verknüpfung.
  - **Ablageregeln** werden aus den Verknüpfungen abgeleitet (`effectiveRules` in `src/lib/dms/links.ts`); in `regeln` bleibt nur Drag & Drop.
  - **Ordner verknüpfen** (`linkTo`): z. B. übernimmt Versicherungen / {Versicherer} / Fachbereiche die Unterordner von Global / Fachbereiche.
    - Die Unterordner tragen „Name = Sparte“ (`nameMatches`) und werden mit den eigenen Dokumenten gefüllt.
    - Global / Fachbereiche ist die Namensliste und hält selbst keine Dokumente.
  - **Regeln der Ablage:**
    - Ein Ordner hält Dokumente über eine verknüpfte Quelle oder einen Dokumenttyp-Filter.
    - Ist eine Quelle in der Ansicht verknüpft, erscheinen ihre Dateien nur dort.
    - Gruppier-Ebenen wie {Versicherer} halten keine übrig gebliebenen Dokumente.
  - **Spaces:** das Ergebnis mit Umschalter Verwaltung / Standard.
  - **Eingang:** „Quelle mit diesem Ordner verknüpfen“ ersetzt „Als Regel speichern“.
  - **Gespeicherter Zustand:** Version 2; ein alter Stand startet neu aus dem Seed.


## 1. Was existiert und was wiederverwendet wird

**Stack:** React 19, TypeScript 5.9, Vite 7, Hash-Routing (`src/routing.ts`), globaler Workflow-Context (`src/workflow.tsx`). Es gibt kein Backend, kein Supabase und keine Migrationen. Alle Daten sind Mocks, Zustand liegt im React-State und wird teilweise in `localStorage` gespeichert. Muster dafür: `src/honorar/store.tsx` (Provider + `apply`-Transitions + Seed + `wino.honorar.v1`).

**Es gibt keinen Test-Runner, keinen Linter und kein `lint`-Script.** `npm run build` = `tsc && vite build` ist die einzige Prüfung (siehe Konflikte K1).

**DMS heute:**
- Es gibt keinen DMS-Code.
- „Dokumente“ gibt es nur als:
  - Modul-Pill ohne Funktion (`src/manager/BestandChrome.tsx:10`),
  - „Seite noch im Aufbau“ in Mein Bereich (`src/mein-bereich/MeinBereichView.tsx`),
  - die Dokumentenleiste im Maklervereinbarungs-Workflow (`src/documents.tsx`, fixe `DOCUMENTS`-Liste).
- **Admin → Spaces** (`src/admin/AdminView.tsx`, Route `#/admin`) existiert seit heute als leere Seite.

**Rollen / Personen:**
- `ROLE_USER` / `PEOPLE` in `src/mocks/honorar/seed.ts`: Lucy Dallon (Backoffice, eingeloggt), Mike, Thomas (Bereichsleiter), Anna, Sandra.
- Echte Auth gibt es nicht. Die Rolle ist `state.role` im Honorar-Store.

**Partner:** `src/person/partners.ts` (Julia Atkinson, Ashley Johnson, Lunixo AG / Holding / Immobilien GmbH …).

**Kunden, Polizzen, Schäden, Versicherer und Kommunikation-Mails gibt es im Code nicht** (siehe K2).

**Maklervereinbarung:**
- `src/person/MaklermandatPage.tsx` mit Sektionen Gültig / Entwürfe / Abgelaufen / Kurzfristig, statisch.
- Der Workflow `src/steps/*` hat einen Unterschrifts-Upload (`SignStep.tsx`).

**Wiederverwendung UI:**
- Chrome: `main-nav`, `area-nav`, `module-nav` / `module-pill`.
- Standard-Tabelle: `.hn-status-table` + `StickyScroll` + `ColumnFilter` + `col-input` + `FilterSummary`.
- Weitere Bausteine: `StepEmpty`, `WarnBox` / `InfoBox`, `StatusBadge`, `PersonChip` / Avatare.
- Modals: Muster von `RequiredCommentModal`.
- Dropzone-Styles (`.dropzone`, `.file-chip`) und Icons aus `src/assets` (folder, pdf, upload, search, …).

Es kommt keine neue UI-Library dazu.

**DMS-UI laut Figma** (`17315-166798`, Mein Bereich → Dokumente). Nur die Struktur wird übernommen, nicht die Ordnerinhalte. Drei weiße Panels nebeneinander:
1. **Baum (links):**
   - Kopf mit Avatar „Meine Dateien / Lucy Dallon (Ich)“ und Dropdown. Das Dropdown wird der **Ansicht-/Rollen-Umschalter**.
   - Suchfeld.
   - Baum mit Chevron auf/zu, Ordner-Icon (Schloss-Variante für eingeschränkte Ordner), Zähler-Badge und ⋮-Menü.
   - Dateien als PDF-Zeilen im Baum. Der ausgewählte Knoten hat eine Umrandung.
2. **Inhalt (Mitte):**
   - Breadcrumb und Ordnername mit Anzahl.
   - Toggle, um den Baum einzuklappen.
   - Upload-Button, dunkle Pill (Sync/Link) und Suche.
   - Tabelle Name / Geändert / Kommentar / Zugriff, mit Filtern. Das entspricht schon dem Standard-Table-UI.
   - Die ausgewählte Zeile ist hervorgehoben.
3. **Vorschau (rechts):**
   - Dateiname, „PDF • 420 kB“.
   - Aktionen: Ansehen, Signieren, Kommentar, Zoom ±/100 %, ⋮, Vollbild.
   - Die PDF-Seite selbst ist ein Platzhalter.

Interaktion im Prototyp:
- Baum auf/zu, Auswahl Ordner → Tabelle, Auswahl Datei → Vorschau.
- Baum einklappen.
- ⋮-Menüs, Suche, Drag & Drop in den aktuellen Ordner.

## 2. Datenmodell („Schema“)

Da es keine DB gibt, ist das Schema = TypeScript-Typen in `src/types/dms.ts`, ein Store `src/dms/store.tsx` (Provider, `localStorage` `wino.dms.v1`, „Zurücksetzen“ auf Seed) und reine Logik in `src/lib/dms/*`. **Dateien werden nur einmal gespeichert:**
- `documents: Record<id, Dokument>` hält die Datensätze.
- Ordner sind ausschließlich berechnete Sichten. Es gibt kein Feld „folderId“ am Dokument.

```ts
Dokument { id, name, versions: Version[], dokumenttyp, status, links: {entityType, entityId}[],
           meta: { sparte?, jahr?, gueltig_von?, gueltig_bis?, ... }, upload_context, vertraulich?: PersonId[],
           createdAt, createdBy, kommentar? }
Version  { nr, fileName, size, mime, uploadedAt, uploadedBy, blobKey? }   // Datei: Name/Größe, Vorschau = Platzhalter
Dokumenttyp { id, name, requiredFields: MetaField[], workflow: { states[], transitions[], auto[] } }
Ordnervorlage { id, scope: 'global' | EntityType, ansicht: 'Verwaltung' | 'Standard', root: Knoten }
Knoten   { id, name /* mit Platzhaltern */, filter: FilterRegel, groupBy?: MetaField | Link, latestOnly?: boolean,
           permissions: Berechtigung[], children: Knoten[] }
FilterRegel = { all: Bedingung[] }   // Bedingung: typ ∈ [...], meta.x = / < / >, link.entityType = ..., linkedTo: '$entity'
Ablageregel { id, source, entityType?, slot?, requires: MetaField[], dokumenttyp, targetPath, priority? }
Berechtigung { principal: {kind: 'Person'|'Gruppe'|'Rolle'|'Alle', id?}, level: 'Sehen'|'Bearbeiten'|'Verwalten' }
Gruppe { id, name, members: PersonId[] }
EingangItem = Dokument mit dokumenttyp = null (gleicher Datensatz, kein eigenes Objekt)
```

Wie die Sichten berechnet werden:
- **Instanziierung:** Eine Vorlage mit `scope: 'Kunde'` erzeugt für jede Kunde-Entität einen Teilbaum. Die Entitäten kommen aus dem Mock-Stammdaten-Bestand. Es gibt kein manuelles „Kunde XYZ anlegen“.
- **Gruppierung:** Platzhalter-Ebenen wie `{Sparte}` und `{Jahr}` werden mit `groupBy` aus den Metadaten der passenden Dokumente erzeugt.
- **„Neuestes Jahr“:** `latestOnly` gilt in der Standard-Ansicht für Versicherer. Pro (Sparte, Versicherer, Typ) wird das maximale Jahr gezeigt. Ist es älter als das aktuelle Jahr, gibt es das Badge „nicht aktuell“.

**Rechte** (statt RLS):
- Die Funktion `effectiveLevel(person, knotenPfad, dokument)` vererbt nach unten und gibt das höchste erlaubte Level zurück. Es gibt nur Allow-Regeln.
- `vertraulich` schränkt auf explizit genannte Personen ein. Das gilt auch für Admins; Frage F4.
- Die Liste „Wer hat Zugriff?“ wird aus derselben Funktion abgeleitet.

**Automatischer Statuswechsel:** `applyAutoTransitions(doc, today)` ist rein und setzt zum Beispiel Aktiv → Abgelaufen, wenn `gueltig_bis < heute`. Der Store wendet das beim Laden und bei Datumssimulation an. „Heute“ kommt aus dem Store (wie `state.today` im Honorar-Store), damit es testbar bleibt.

## 3. Upload-Punkte im Code (heute)

| # | Datei | Was | Kontext für Ablageregel |
|---|---|---|---|
| U1 | `src/person/forms.tsx:380` `Drop` in `PartnerFields` (`:498`, Gruppe „Anhänge“) | Stammdaten Person → Anhänge | Partner, slot `anhang` |
| U2 | `src/person/forms.tsx:380` `Drop` in `BankFields` (`:1146`, „Dokumente hochladen“) | Bankverbindung → Nachweis | Partner, slot `bank` (neue Regel, Typ „Bankdokument“?) – F6 |
| U3 | `src/person/forms.tsx:727` `AnhaengeFields`, genutzt in `src/person/StammdatenWorkflow.tsx:577` (Firma) und `:596` (Wirtschaftsdaten) | Firmen-/Wirtschafts-Anhänge | Partner, slot `anhang` / `wirtschaft` |
| U4 | `src/steps/SignStep.tsx:276` | Maklervereinbarung → unterzeichnetes Dokument hochladen | Partner, slot `vertrag` → Typ Maklervereinbarung |
| – | `src/manager/ReviewModal.tsx:163–175` | nur Anzeige der Wahl („Unterz. Dokument definieren“), **kein** Datei-Input | keine Migration nötig |
| – | `src/steps/TasksStep.tsx:5` | nur Aufgabentext „Ausweis … hochladen“ | keine |

Alle vier echten Upload-Punkte bekommen die gemeinsame Komponente. Die Seed-Quellen aus der Spezifikation fehlen im Code: Kunde → Polizze, Schaden → Dokumente, Kommunikation → E-Mail-Anhang, Versicherer → Bedingungen. Siehe K2.

## 4. Gemeinsamer Upload

- `src/dms/upload.tsx`:
  - Hook `useDmsUpload(context: UploadContext)` und Komponente `<DmsUpload context={…} />`. Die Komponente nutzt Dropzone, Klick und Drag & Drop.
  - `UploadContext = { source: UploadSource; entityType; entityId; slot; knownMetadata }`. Alle Felder sind Pflicht, `source` ist ein Union-Typ. Ohne Kontext kompiliert der Aufruf nicht.
  - Der rohe `<input type="file">` wird nur hier verwendet. Ein Build-Check soll das sicherstellen; Grep-Regel im Build-Script, Frage F5.
- `src/lib/dms/resolveAblage.ts`:
  - Signatur: `resolveAblage(context, rules, dokumenttypen) → { dokumenttyp, targetPath, missingFields } | { unmatched: true }`.
  - Die Funktion ist rein.
  - Spezifität: Es gewinnt die Regel, die die meisten Kriterien erfüllt (source + entityType + slot + benötigte Metadaten). Bei Gleichstand entscheidet `priority`, danach die Reihenfolge.
- `src/lib/dms/placeholders.ts`:
  - `{Partner.Name}`, `{Sparte}`, `{Jahr}`, `{Schaden.Nummer}` werden aufgelöst.
  - Namen mit `/` werden als `∕` dargestellt (Pfadtrenner bleibt eindeutig).
  - `&` und Umlaute bleiben unverändert.
- **Upload-Dialog:** fragt nur `missingFields` ab, mit einem Feld pro fehlendem Wert.
- **Kein Treffer:** Das Dokument wird mit `dokumenttyp = null` angelegt und erscheint unter **Eingang / Nicht zugeordnet**. Es geht nie verloren.

## 5. Oberflächen

**Admin → Spaces** (Route `#/admin`, Tab existiert). Der einzige Area-Tab bleibt **Spaces**. Darunter liegen Modul-Pills, analog Mein Bereich:
1. **Ansicht Verwaltung**: das 3-Panel-DMS aus Figma mit der Verwaltungs-Hierarchie.
2. **Ordnervorlagen**:
   - Baum-Editor: Knoten anlegen, umbenennen, verschieben (hoch/runter/einrücken), löschen.
   - Rechts das Knoten-Detail: Name mit Platzhalter-Chips, Filterregel als Zeilen „Feld / Operator / Wert“, Berechtigungen.
3. **Dokumenttypen**:
   - Liste der Dokumenttypen.
   - Detail: Pflichtfelder und Status-Workflow (Zustände in Reihenfolge, erlaubte Übergänge, Auto-Übergang mit Bedingung).
4. **Ablageregeln**: Standard-Tabelle der Regeln und Panel **„Testen“**. Das Panel ruft dieselbe `resolveAblage` auf und zeigt Zielpfad oder fehlende Felder.
5. **Gruppen & Berechtigungen**:
   - Gruppen mit Mitgliedern.
   - Pro Ordner „Wer hat Zugriff?“, aufgelöst inklusive Vererbung, mit Herkunft („geerbt von Kunden/“).
6. **Eingang**:
   - Standard-Tabelle der nicht zugeordneten Dokumente, Badge in Amber mit Anzahl.
   - „Zuordnen“ öffnet ein kurzes Modal mit Typ und fehlenden Feldern.
   - „Als Regel speichern“ legt eine Ablageregel aus dem Kontext vor.

**User-DMS:**
- **Mein Bereich → Dokumente**: dasselbe 3-Panel-DMS mit der Ansicht `Standard`, gefiltert nach effektiven Rechten.
- Später (g) auch Bestand → Modul „Dokumente“.

**Rollen-/User-Umschalter:**
- Das Dropdown im Baumkopf („Meine Dateien / Lucy Dallon (Ich)“) wechselt die Person.
- Admin ↔ Standard wird nebeneinander demonstrierbar, indem Admin-Tab und Mein-Bereich-Tab offen bleiben (das Tab-System existiert).

**Maklervereinbarung-Karte:**
- `MaklermandatPage` zeigt die Maklervereinbarung-Dokumente des Partners in den passenden Sektionen: Entwürfe / In Freigabe / Gültig = Aktiv / Abgelaufen + Gekündigt.
- Die Karten kommen aus demselben DMS-Datensatz.
- Ein Statuswechsel auf der Karte oder im DMS ändert denselben Datensatz.

**Farben:**
- Amber (`--warn`-Töne bestehender Badges) heißt Aktion nötig: „In Freigabe“, Eingang.
- Grau heißt Abgelaufen / Gekündigt.
- Die Bedeutung steht immer auch im Label.

## 6. Phasen mit Prüfung

Nach jeder Phase laufen `npm run build` (tsc), `npm test` und – sobald vorhanden – Lint. Danach kommen 3–5 Zeilen Zusammenfassung und ein kurzer Klickpfad.

| Phase | Inhalt | Prüfung |
|---|---|---|
| a | `types/dms.ts`, Store + Seed (Versicherer, Sparten, Bedingungen 2024–26 mit Lücken, 3 Partner mit allen MV-Status inkl. auto-abgelaufen, 4 Kunden mit Polizzen/1 Schaden/Korrespondenz, 4 Gruppen, 1 vertraulich, 2 Eingang) | tsc; Seed-Smoke-Test (Zählwerte) |
| b | `resolveAblage`, Platzhalter, View-/Filter-Engine (Instanziierung, groupBy, latestOnly) | Unit-Tests: Spezifität, fehlende Felder, unmatched → Eingang, neuestes Jahr inkl. Lücken, Platzhalter mit Umlauten / „&“ / „/“, Auto-Abgelaufen |
| c | Rechte-Auflösung | Unit-Tests: Vererbung, vertraulich-Override, „Wer hat Zugriff?“ |
| d | `<DmsUpload>` + Migration U1–U4 + Demo-Upload-Quellen für fehlende Module (K2) | tsc; Grep: kein `type="file"` außerhalb `src/dms/upload.tsx`; Browser: Upload aus Stammdaten landet im Partner-Ordner |
| e | Admin-Screens 1–6 in Spaces | Browser: Regel ändern → „Testen“ zeigt neuen Pfad; Eingang zuordnen |
| f | User-DMS in Mein Bereich + Personen-Umschalter | Browser: Versicherer flach / neuestes Jahr / „nicht aktuell“ als User, tief als Admin |
| g | Maklervereinbarung-Karte | Browser: Status im DMS ändern → Karte wechselt Sektion, und umgekehrt |

Definition of Done wie in der Aufgabe.

## 7. Konflikte (bitte entscheiden)

- **K1 – Keine Tests und kein Lint im Repo.**
  - Vorschlag: `vitest` als einzige Dev-Abhängigkeit, mit `npm test`. Das ist keine UI-Library.
  - Lint: kein ESLint einführen, `tsc --noEmit` mit strict gilt als „Lint“. Oder soll ESLint dazu?
- **K2 – Kunden, Polizzen, Schäden, Versicherer und Kommunikation existieren nicht.** Die Seed-Quellen „Kunde → Polizze anlegen“, „Schaden → Dokumente“, „Kommunikation → E-Mail-Anhang“ und „Versicherer → Bedingungen“ haben keinen Ort im Code. Vorschlag:
  - Diese Entitäten nur als DMS-Mock-Stammdaten anlegen.
  - Pro Quelle einen schlanken **Upload-Auslöser** im Prototyp bauen, als Panel „Upload-Quellen (Demo)“ in Spaces. Jeder Auslöser nutzt die echte `<DmsUpload>` mit dem echten Kontext.
  - So ist die DoD „Upload aus dem Kunde-Modul“ testbar, ohne halbe Kunde-Module zu bauen.
  - Alternative: Minimalseiten Kunde / Schaden anlegen.
- **K3 – Dateien.** Es gibt keinen Speicher. Gespeichert werden Name, Größe und Typ. Die Vorschau zeigt einen Platzhalter wie in Figma. Dateien, die im Browser hochgeladen werden, können in der Sitzung per Object-URL echt angezeigt werden, gehen aber beim Neuladen verloren. Ist das ok?
- **K4 – Bestehende Maklervereinbarung-Status.** Der Honorar-Seed nutzt `agreement_in_approval` / `agreement_made` an Rechnungen, `MaklermandatPage` ist statisch.
  - Vorschlag: Das DMS wird die Quelle für die Karten auf `MaklermandatPage`.
  - Die Honorar-Logik („gültige Vereinbarung nötig“) bleibt vorerst unverändert und getrennt. Sollen beide gekoppelt werden?
- **K5 – Figma-Ordner.** Laut deiner Vorgabe werden die Figma-Ordner (Urkunden, Firmenbuchauszüge, Vollmacht …) nicht übernommen. Die Ordner kommen nur aus den Vorlagen der Spezifikation.
- **K6 – Rollen.** Es gibt keine Auth, nur `state.role` im Honorar-Store.
  - Vorschlag: Das DMS bekommt eine eigene „aktive Person“: Lucy, Mike, Thomas, Anna, Sandra plus neue Namen für Schadenabteilung und Partnerbetreuung.
  - Sie wird vom DMS-Umschalter gesetzt und ist von der Honorar-Rolle unabhängig.

## 8. Offene Fragen / Annahmen

- **F1:** Wer ist DMS-Admin? Annahme: Mitglieder von Geschäftsführung und Backoffice mit „Verwalten“ auf der Wurzel; Lucy ist Backoffice, also Admin.
- **F2:** Wo liegt das User-DMS? Annahme: Mein Bereich → Dokumente. Bestand → „Dokumente“ verlinkt später dorthin.
- **F3:** „Unternehmen/Versicherer/{Sparte}/“, „eine Zeile pro Versicherer“. Annahme: Die Ordnerebene ist die Sparte, die Tabelle zeigt pro Versicherer und Dokumenttyp eine Zeile (neuestes Jahr), mit Jahr-Spalte und Badge.
- **F4:** Sieht ein Admin vertrauliche Dokumente? Annahme: nein, außer er ist namentlich genannt. In der Verwaltung erscheint das Dokument als gesperrte Zeile „Vertraulich“ ohne Name und Vorschau, damit „nichts verschwindet“ erklärbar bleibt.
- **F5:** Soll der Build hart scheitern, wenn außerhalb der Upload-Komponente ein `type="file"` steht? Annahme: ja, als kleines Check-Script vor `tsc`.
- **F6:** Bankverbindung-Upload (U2): eigener Dokumenttyp „Bankdokument“ unter Partner/Anhänge? Annahme: ja, Ziel `Partner/{Name}/Anhänge`.
- **F7:** Datumsformat TT.MM.JJJJ, „heute“ = Datum des Prototyp-Stores (aktuell 04.11.2026), damit „nicht aktuell“ für 2025-Bedingungen sichtbar ist.

- **Umbau 06.11.2026: Kunde = Partner, Ordner verbinden**
  - **Kunde = Partner:**
    - Es gibt keinen eigenen Kunden-Baum mehr. Partner / {Partner.Name} enthält Vereinbarungen, Polizzen/{Sparte}, Schäden/{Schaden.Nummer}, Vollmachten & Verträge, Korrespondenz und Anhänge.
    - Der Entitätstyp „Kunde“ entfällt im DMS; Polizzen- und E-Mail-Uploads sind an den Partner gebunden.
  - **Ordner Zuordnung:** Neben dem Baum liegt ein breites Panel mit den Tabs „Quellen“, „Ordner verbinden“ und „Einstellungen“.
  - **Ordner verbinden** (`Knoten.verbindungen`, `setVerbindung`, `connectionPreview` in `links.ts`):
    - Ein Ordner zeigt zusätzlich die Dateien eines anderen Ordners, von jeder Stelle, an der es ihn gibt.
    - Gleichnamige Unterordner werden zusammengeführt („in 4 von 5“), und man wählt, welche übernommen werden.
    - Beispiel: Global / Fachbereiche ← Versicherungen / {Versicherer} / Fachbereiche.
    - Es wird nichts kopiert.
  - **Ersetzt:** „Verknüpfter Ordner“ (`linkTo`) und „Name = Sparte“ sind aus der Oberfläche entfernt.
  - **Gespeicherter Zustand:** Version 3.
