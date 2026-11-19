import { useEffect, useRef, useState } from "react";
import * as a from "../assets/index";
import { ConstructionArt } from "../mein-bereich/MeinBereichView";
import { ProfileShelfProvider, ShelfBody, ShelfTitle } from "../person/ProfileShelf";
import { ContextMenu, Icon, useClickOutside } from "../ui";
import { useWorkflow } from "../workflow";
import { setKept } from "../lib/keptState";
import { BEREICHE, FIRMA, TEAM, bereichOf, isEmployee, member } from "./hrmTeam";
import { FNS, LEVEL_LABEL, ROLE_LABEL, isLead, leadsOf, missingFns, org, useOrganigramm, type OrgFn, type OrgGroup, type OrgLevel, type OrgPerson } from "./organigramm";

/**
 * HRM → Settings: side nav Organigramm | Regelung / Plausis (im Aufbau).
 * Organigramm: H1 Geschäftsführung, H2 Abteilungen (all on the same level under H1), Weitere (H3) for people
 * who work for the company but are not part of it. In every group: add people (Mitglied), then pick who within
 * is Vorgesetzter / Leiter / Leiter Stv. – those may grant holidays. Data: `organigramm.ts`.
 */

export type SettingsArea = "organigramm" | "regelung";
export const SETTINGS_TABS: SettingsArea[] = ["organigramm", "regelung"];

const AREAS: { id: SettingsArea; label: string; icon: string }[] = [
  { id: "organigramm", label: "Organigramm", icon: a.mOvGroup },
  { id: "regelung", label: "Regelung / Plausis", icon: a.plausiCheck },
];

export function HrmSettings({ area, onArea }: { area: SettingsArea; onArea: (area: SettingsArea) => void }) {
  const { openAdmin } = useWorkflow();
  const current = AREAS.find((entry) => entry.id === area) ?? AREAS[0];
  return (
    <ProfileShelfProvider>
      <ShelfBody>
        <aside className="pp-side">
          <header className="pp-side-head">
            <span className="pp-side-glyph">
              <Icon src={a.settings} size={24} />
            </span>
            <span className="pp-side-title">
              <strong>Settings</strong>
              <small>HRM · {FIRMA}</small>
            </span>
          </header>
          <div className="pp-side-search">
            <Icon src={a.searchDark} size={18} />
            Suchen...
          </div>
          {AREAS.map((entry) => (
            <button type="button" key={entry.id} className={entry.id === area ? "pp-area open" : "pp-area"} onClick={() => onArea(entry.id)}>
              <span className="pp-area-label">
                <Icon src={entry.icon} size={18} />
                {entry.label}
              </span>
            </button>
          ))}
        </aside>
        <main className="pp-main og-main">
          <header className="fg-head pp-main-head">
            <ShelfTitle icon={current.icon}>{current.label}</ShelfTitle>
            {area === "organigramm" ? (
              <button
                type="button"
                className="btn-secondary og-rights"
                onClick={() => {
                  // Admin → HRM Admin → Organigramm Berechtigungen.
                  setKept("admin.area", "HRM Admin");
                  openAdmin();
                }}
              >
                <Icon src={a.profileAdmin} size={18} />
                Rechte verwalten
              </button>
            ) : null}
          </header>
          {area === "organigramm" ? (
            <Organigramm />
          ) : (
            <section className="mb-empty km-tba">
              <ConstructionArt />
              <h1>Seite noch im Aufbau</h1>
              <p>Regelung / Plausis wird noch erstellt und wird veröffentlicht sobald sie fertig entwickelt wurde.</p>
            </section>
          )}
        </main>
      </ShelfBody>
    </ProfileShelfProvider>
  );
}

function Organigramm() {
  const groups = useOrganigramm();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const [open, setOpen] = useState<string[]>(() => groups.filter((g) => g.level === 1).map((g) => g.id));
  const toggle = (id: string) => setOpen((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const add = (level: 2 | 3) => {
    const id = org.addGroup(level);
    setOpen((list) => [...list, id]);
  };

  /* Search: a group matches by its name / Ebene (then all its people show), else by the people that match. */
  const shown = groups.map((g) => {
    if (!q) return { group: g, people: null as OrgPerson[] | null };
    if (`${g.name} ${LEVEL_LABEL[g.level]}`.toLowerCase().includes(q)) return { group: g, people: null };
    const people = g.people.filter((p) => personText(p).includes(q));
    return people.length ? { group: g, people } : null;
  }).filter((x): x is { group: OrgGroup; people: OrgPerson[] | null } => x !== null);
  const hits = shown.reduce((sum, x) => sum + (x.people ? x.people.length : 1), 0);
  const of = (level: OrgLevel) => shown.filter((x) => x.group.level === level);
  const card = (x: { group: OrgGroup; people: OrgPerson[] | null }, removable: boolean) => (
    <GroupCard
      key={x.group.id}
      group={x.group}
      only={x.people}
      query={q}
      open={Boolean(q) || open.includes(x.group.id)}
      onToggle={() => toggle(x.group.id)}
      removable={removable}
    />
  );

  return (
    <div className="og-body">
      <p className="og-intro">
        Im Organigramm legst du fest, wer zu welcher Ebene gehört. Personen einer Gruppe sind <strong>Mitglied</strong>; zusätzlich hat jede Abteilung einen{" "}
        <strong>Vorgesetzten</strong> und einen <strong>Leiter</strong>, optional einen <strong>Leiter Stv.</strong> – dafür muss man nicht Mitglied der Gruppe sein, und eine Person kann
        mehrere Funktionen haben. Was diese Personen dürfen, legst du im Admin unter Organigramm Berechtigungen fest.
      </p>

      <div className="og-search">
        <span className="og-search-field">
          <Icon src={a.searchDark} size={18} />
          <input value={query} placeholder="Personen, Funktionen oder Gruppen suchen" aria-label="Organigramm durchsuchen" onChange={(event) => setQuery(event.target.value)} />
          {query ? (
            <button type="button" className="og-icon-btn" aria-label="Suche leeren" onClick={() => setQuery("")}>
              <Icon src={a.iconCloseDark} size={14} />
            </button>
          ) : null}
        </span>
        {q ? <span className="og-search-count">{hits ? `${hits} ${hits === 1 ? "Treffer" : "Treffer"}` : "Keine Treffer"}</span> : null}
      </div>

      {!q || of(1).length ? (
        <Level level="H1" title="Geschäftsführung" hint="Oberste Ebene des Unternehmens.">
          {of(1).map((x) => card(x, false))}
        </Level>
      ) : null}

      {!q || of(2).length ? (
        <Level level="H2" title="Abteilungen" hint="Alle H2-Gruppen liegen auf derselben Ebene unter der Geschäftsführung, gruppiert nach Bereich (Management, Beratung & Service)." onAdd={q ? undefined : () => add(2)} addLabel="H2 hinzufügen">
          {[...BEREICHE.map((b) => b.name), null].map((bereich) => {
            const list = of(2).filter((x) => bereichOf(x.group.name) === bereich);
            if (!list.length) return null;
            return (
              <div className="og-bereich-block" key={bereich ?? "ohne"}>
                <span className="og-bereich">{bereich ?? "Ohne Bereich"}</span>
                {list.map((x) => card(x, true))}
              </div>
            );
          })}
        </Level>
      ) : null}

      {!q || of(3).length ? (
        <Level level="H3" title="Weitere" hint="Personen, die für das Unternehmen arbeiten, aber nicht im Unternehmen sind. Nur Mitglieder; die fünf Basis-Gruppen bleiben immer bestehen." onAdd={q ? undefined : () => add(3)} addLabel="H3 hinzufügen">
          {of(3).map((x) => card(x, !x.group.fixed))}
        </Level>
      ) : null}
    </div>
  );
}

/** What the search looks at for a person: name, job, Funktionen ("Leiter", "Mitglied"), Extern info. */
const personText = (p: OrgPerson) =>
  [p.name, p.extern ? p.info ?? "Extern" : member(p.name)?.role ?? "", p.fns.length ? p.fns.map((fn) => ROLE_LABEL[fn]).join(" ") + " Führung" : "Mitglied"].join(" ").toLowerCase();

/** Marks the search text inside a label. */
function Hl({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="og-mark">{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  );
}

function Level({ level, title, hint, onAdd, addLabel, children }: { level: string; title: string; hint: string; onAdd?: () => void; addLabel?: string; children: React.ReactNode }) {
  return (
    <section className="og-level">
      <header className="og-level-head">
        <span className="og-level-tag">{level}</span>
        <span className="og-level-title">
          <strong>{title}</strong>
          <small>{hint}</small>
        </span>
        {onAdd ? (
          <button type="button" className="btn-secondary og-add-group" onClick={onAdd}>
            <Icon src={a.plusCircle} size={18} />
            {addLabel}
          </button>
        ) : null}
      </header>
      <div className="og-groups">{children}</div>
    </section>
  );
}

function PersonAvatar({ person }: { person: Pick<OrgPerson, "name" | "extern"> }) {
  const photo = member(person.name)?.photo;
  return (
    <span className={person.extern ? "og-avatar extern" : "og-avatar"}>
      <img className={photo ? undefined : "blank"} src={photo || a.clientBlank} alt="" />
    </span>
  );
}

function GroupCard({ group, only, query, open, onToggle, removable }: { group: OrgGroup; only: OrgPerson[] | null; query: string; open: boolean; onToggle: () => void; removable?: boolean }) {
  const leads = leadsOf(group).sort((x, y) => FNS.indexOf(x.fns[0]) - FNS.indexOf(y.fns[0]));
  const missing = missingFns(group);
  const visible = (p: OrgPerson) => !only || only.includes(p);
  const shownLeads = leads.filter(visible);
  const members = group.people.filter((p) => !isLead(p) && visible(p));
  const [confirm, setConfirm] = useState(false);
  return (
    <article className={open ? "og-group open" : "og-group"}>
      {confirm ? (
        <div className="wmodal" role="dialog" aria-label="Gruppe löschen">
          <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={() => setConfirm(false)} />
          <div className="wmodal-body">
            <button type="button" className="wmodal-close" aria-label="Schließen" onClick={() => setConfirm(false)}>
              <img src={a.iconCloseDark} alt="" width={16} height={16} />
            </button>
            <h2>Achtung! Gruppe „{group.name}“ wirklich löschen?</h2>
            <p>
              Die Gruppe wird mit ihren {group.people.length} {group.people.length === 1 ? "Zuordnung" : "Zuordnungen"} und allen Funktionen (Vorgesetzter, Leiter, Leiter Stv.) aus dem Organigramm
              entfernt. Ihre Berechtigungen im Admin gehen verloren. Die Personen selbst bleiben in Wino.
            </p>
            <footer className="wmodal-foot centered">
              <button type="button" className="btn-secondary" onClick={() => setConfirm(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  setConfirm(false);
                  org.removeGroup(group.id);
                }}
              >
                Löschen
              </button>
            </footer>
          </div>
        </div>
      ) : null}
      <header className="og-group-head">
        <span className="og-level-tag small">{LEVEL_LABEL[group.level]}</span>
        <input className="og-name" value={group.name} aria-label="Name der Gruppe" onChange={(event) => org.rename(group.id, event.target.value)} />
        <span className="og-meta">
          <span>
            {group.people.length} {group.people.length === 1 ? "Person" : "Personen"}
          </span>
          {group.level === 3 ? (
            <span>nur Mitglieder</span>
          ) : (
            <span className="og-meta-lead" title="Führung">
              {leads.map((p) => (
                <span key={p.name}>
                  <PersonAvatar person={p} />
                  {p.name} <small>{p.fns.map((fn) => ROLE_LABEL[fn]).join(" · ")}</small>
                </span>
              ))}
              {missing.map((fn) => (
                <span key={fn} className="og-meta-missing">
                  {ROLE_LABEL[fn]} fehlt
                </span>
              ))}
            </span>
          )}
        </span>
        {removable ? (
          <span className="og-group-menu">
            <ContextMenu label={`Aktionen für ${group.name}`} items={[{ label: "Gruppe löschen", icon: a.trash, danger: true, onSelect: () => setConfirm(true) }]} />
          </span>
        ) : null}
        <button type="button" className="og-icon-btn og-chevron" aria-expanded={open} aria-label={open ? "Zuklappen" : "Aufklappen"} onClick={onToggle}>
          <Icon src={a.chevronDown} size={18} />
        </button>
      </header>
      {open ? (
        <div className="og-group-body">
          {group.level === 3 ? (
            group.people.length ? (
              <PeopleList group={group} people={group.people.filter(visible)} query={query} />
            ) : (
              <p className="og-empty">Noch keine Personen in dieser Gruppe.</p>
            )
          ) : (
            <>
              {shownLeads.length || (!only && missing.length) ? (
                <div className={missing.length ? "og-lead-block missing" : "og-lead-block"}>
                  <span className="og-block-title">
                    <strong>Führung</strong>
                    <small>Immer ein Vorgesetzter und ein Leiter, optional Leiter Stv. Mit + bekommt eine Person eine weitere Funktion.</small>
                  </span>
                  {shownLeads.length ? <PeopleList group={group} people={shownLeads} query={query} /> : null}
                  {only ? null : missing.map((fn) => <EmptySlot key={fn} group={group} fn={fn} />)}
                </div>
              ) : null}
              {members.length ? (
                <div className="og-member-block">
                  <span className="og-block-title">
                    <strong>Mitglieder</strong>
                  </span>
                  <PeopleList group={group} people={members} query={query} />
                </div>
              ) : null}
            </>
          )}
          {only ? null : <AddPerson group={group} />}
        </div>
      ) : null}
    </article>
  );
}

/** A required function nobody holds yet: pick a person for it (from the group or anyone else). */
function EmptySlot({ group, fn }: { group: OrgGroup; fn: OrgFn }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="og-slot" ref={ref}>
      <span className="og-slot-avatar" />
      <span className="og-person-name">
        <strong>{ROLE_LABEL[fn]} nicht besetzt</strong>
        <small>Jede Abteilung braucht {fn === "vorgesetzter" ? "einen Vorgesetzten" : "einen Leiter"}</small>
      </span>
      <button type="button" className="og-slot-pick" onClick={() => setOpen(!open)}>
        <Icon src={a.plusCircle} size={16} />
        {ROLE_LABEL[fn]} wählen
      </button>
      {open ? (
        <PersonPicker
          group={group}
          floating
          includeMembers
          exclude={group.people.filter((p) => p.fns.includes(fn)).map((p) => p.name)}
          onPick={(person) => {
            org.assign(group.id, person, fn);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function PeopleList({ group, people, query }: { group: OrgGroup; people: OrgPerson[]; query: string }) {
  return (
    <ul className="og-people">
      {people.map((person) => (
        <li key={person.name} className="og-person">
          <PersonSwap group={group} person={person} query={query} />
          <span className="og-perm">
            {isLead(person) ? <span className="og-chip lead">Führung</span> : <span className="og-chip">Mitglied</span>}
            {group.level === 3 ? null : <FnControls group={group} person={person} />}
          </span>
          <button type="button" className="og-icon-btn" aria-label={`${person.name} entfernen`} title="Aus der Gruppe entfernen" onClick={() => org.removePerson(group.id, person.name)}>
            <Icon src={a.iconCloseDark} size={16} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** One select per function the person holds, and "+" for another one (e.g. Leiter and Vorgesetzter). */
function FnControls({ group, person }: { group: OrgGroup; person: OrgPerson }) {
  const set = (fns: OrgFn[]) => org.setFns(group.id, person.name, fns);
  const free = FNS.filter((fn) => !person.fns.includes(fn));
  if (!person.fns.length)
    return (
      <select className="og-select" value="" aria-label={`Funktion von ${person.name}`} onChange={(event) => set([event.target.value as OrgFn])}>
        <option value="">Keine Funktion</option>
        {FNS.map((fn) => (
          <option key={fn} value={fn}>
            {ROLE_LABEL[fn]}
          </option>
        ))}
      </select>
    );
  return (
    <span className="og-fns">
      {person.fns.map((fn, index) => (
        <select
          key={fn}
          className="og-select"
          value={fn}
          aria-label={`Funktion ${index + 1} von ${person.name}`}
          onChange={(event) => {
            const next = event.target.value as OrgFn | "";
            set(next ? person.fns.map((f) => (f === fn ? next : f)) : person.fns.filter((f) => f !== fn));
          }}
        >
          <option value="">{person.fns.length > 1 ? "Funktion entfernen" : "Keine Funktion"}</option>
          {FNS.filter((f) => f === fn || !person.fns.includes(f)).map((f) => (
            <option key={f} value={f}>
              {ROLE_LABEL[f]}
            </option>
          ))}
        </select>
      ))}
      {free.length ? (
        <button type="button" className="og-fn-add" title="Weitere Funktion hinzufügen" aria-label={`Weitere Funktion für ${person.name}`} onClick={() => set([...person.fns, free[0]])}>
          <Icon src={a.plusCircle} size={18} />
        </button>
      ) : null}
    </span>
  );
}

/** The person of a row as a dropdown: click, search, pick someone else – the functions stay. */
function PersonSwap({ group, person, query }: { group: OrgGroup; person: OrgPerson; query: string }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="og-swap" ref={ref}>
      <button type="button" className={open ? "og-swap-btn open" : "og-swap-btn"} aria-haspopup="listbox" aria-expanded={open} title="Person ändern" onClick={() => setOpen(!open)}>
        <PersonAvatar person={person} />
        <span className="og-person-name">
          <strong>
            <Hl text={person.name} query={query} />
          </strong>
          <small>
            <Hl text={person.extern ? person.info ?? "Extern" : member(person.name)?.role ?? ""} query={query} />
          </small>
        </span>
        <Icon src={a.chevronDown} size={16} />
      </button>
      {open ? (
        <PersonPicker
          group={group}
          floating
          onPick={(next) => {
            org.replacePerson(group.id, person.name, next);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

/** Search the team (H1 / H2), or – in Weitere (H3) – also add someone from outside by name. */
function PersonPicker({ group, floating, includeMembers, exclude = [], onPick }: { group: OrgGroup; floating?: boolean; includeMembers?: boolean; exclude?: string[]; onPick: (person: OrgPerson) => void }) {
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);
  const q = query.trim().toLowerCase();
  const taken = new Set(includeMembers ? exclude : group.people.map((p) => p.name));
  const pool = TEAM.filter((m) => (group.level === 3 ? true : isEmployee(m)));
  // Filling a slot: the group's own people first.
  const inGroup = (name: string) => group.people.some((p) => p.name === name);
  const hits = pool
    .filter((m) => !taken.has(m.name) && (!q || `${m.name} ${m.role} ${m.abteilung}`.toLowerCase().includes(q)))
    .sort((x, y) => (includeMembers ? Number(inGroup(y.name)) - Number(inGroup(x.name)) : 0))
    .slice(0, 8);
  const extern = group.level === 3 && query.trim().length > 1 && !TEAM.some((m) => m.name.toLowerCase() === q);

  return (
    <div className={floating ? "og-picker floating" : "og-picker"} ref={ref}>
      <span className="og-picker-search">
        <Icon src={a.searchDark} size={18} />
        <input autoFocus value={query} placeholder={group.level === 3 ? "Person suchen oder externe Person eingeben" : "Mitarbeiter suchen"} onChange={(event) => setQuery(event.target.value)} />
      </span>
      <ul>
        {extern ? (
          <li>
            <button type="button" onClick={() => onPick({ name: query.trim(), fns: [], extern: true, info: "Extern" })}>
              <Icon src={a.plusCircle} size={18} />„{query.trim()}“ als externe Person hinzufügen
            </button>
          </li>
        ) : null}
        {hits.map((m) => (
          <li key={m.name}>
            <button type="button" onClick={() => onPick({ name: m.name, fns: [], ...(group.level === 3 ? { extern: true, info: m.typ ?? m.role } : {}) })}>
              <PersonAvatar person={{ name: m.name }} />
              <span className="og-person-name">
                <strong>{m.name}</strong>
                <small>
                  {m.role} · {m.abteilung}
                  {includeMembers && inGroup(m.name) ? " · in dieser Gruppe" : ""}
                </small>
              </span>
            </button>
          </li>
        ))}
        {!hits.length && !extern ? <li className="og-empty">Keine Treffer</li> : null}
      </ul>
    </div>
  );
}

function AddPerson({ group }: { group: OrgGroup }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="og-addperson" ref={ref}>
      {open ? (
        <PersonPicker
          group={group}
          onPick={(person) => {
            org.addPerson(group.id, person);
            setOpen(false);
          }}
        />
      ) : (
        <button type="button" className="og-add-person" onClick={() => setOpen(true)}>
          <Icon src={a.plusCircle} size={18} />
          Person hinzufügen
        </button>
      )}
    </div>
  );
}
