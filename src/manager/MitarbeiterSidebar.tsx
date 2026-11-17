import { useContext, useEffect, useRef, useState } from "react";
import * as a from "../assets/index";
import { loadAntraege, onAntraegeChange } from "../home/calendar/homeoffice";
import { Icon } from "../ui";
import { homeofficeRows, useHrDemo } from "./hrmAntraege";
import { ABTEILUNGEN, ABTEILUNG_NAMEN, FIRMA, TEAM, isEmployee, member, slugOf, type Abteilung, type TeamMember } from "./hrmTeam";
import { useWorkflow } from "../workflow";
import { AbteilungScope, setSelected, setZeitpunkt, useAuswahlRaw, type Zeitpunkt } from "./mitarbeiterAuswahl";

/**
 * Mitarbeiter side nav (Figma 22743:399086, "SIDENAV BREAKDOWN").
 * - A click on a card, or on a department's tickbox, selects. The filter dropdown selects the same way
 *   (company → Abteilungen → Mitarbeiter, with its own search, Zurücksetzen and Speichern).
 * - As soon as something is selected, "N Mitarbeiter ausgewählt" and the tabs Alle / Auswahl appear:
 *   Alle always lists everybody, Auswahl only the selected. The X clears everything.
 * - The selection and the Zeitpunkt filter the tables and the dashboard next to the nav.
 */

const matches = (m: TeamMember, query: string) => {
  const q = query.trim().toLowerCase();
  return !q || `${m.name} ${m.role} ${m.abteilung}`.toLowerCase().includes(q);
};
const membersOf = (dept: Abteilung) => dept.people.map(member).filter((m): m is TeamMember => !!m);

function Tick({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={checked ? "ms-tick on" : "ms-tick"}
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
    >
      {checked ? <img src={a.hnCheckTick} alt="" width={12} height={12} /> : null}
    </button>
  );
}

function CountChip({ icon, value, tone }: { icon: string; value: number; tone: "requests" | "workflows" }) {
  return (
    <span className={value ? `emp-chip ${tone}` : "emp-chip"}>
      <Icon src={icon} size={14} />
      {value}
    </span>
  );
}

function EmployeeCard({ person, requests, selected, onToggle, onOpen }: { person: TeamMember; requests: number; selected: boolean; onToggle: () => void; onOpen: () => void }) {
  return (
    <li
      className={selected ? "emp-card selected" : "emp-card"}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <span className="emp-avatar">
        <img className={person.photo ? undefined : "blank"} src={person.photo || a.clientBlank} alt="" />
        <img className="emp-dot" src={a.statusDot} alt="" />
      </span>
      <span className="emp-copy">
        <strong>{person.name}</strong>
        <small>{person.role}</small>
      </span>
      <button
        type="button"
        className="emp-open"
        aria-label={`${person.name} in neuem Tab öffnen`}
        title="In neuem Tab öffnen"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      >
        <Icon src={a.openTab} size={15} />
      </button>
      <span className="emp-chips">
        <CountChip icon={a.requestSmall} value={requests} tone="requests" />
        <CountChip icon={a.workflow} value={person.workflows} tone="workflows" />
      </span>
      {selected ? <img className="emp-check" src={a.checkGreen} alt="ausgewählt" width={22} height={22} /> : null}
    </li>
  );
}

/** Closes a popover on a click outside of it or on Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (event: MouseEvent) => ref.current && !ref.current.contains(event.target as Node) && close();
    const key = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open, close]);
  return ref;
}

/** The filter box: company → Abteilungen → Mitarbeiter. Nothing changes until Speichern. */
function FilterBox({ selected, onSave, onClose }: { selected: string[]; onSave: (next: string[]) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(selected);
  const [query, setQuery] = useState("");
  const [firmaOpen, setFirmaOpen] = useState(selected.length > 0);
  const [open, setOpen] = useState<string[]>(() => ABTEILUNGEN.filter((d) => d.people.some((p) => selected.includes(p))).map((d) => d.name));
  const searching = query.trim().length > 0;
  const depts = ABTEILUNGEN.map((dept) => ({ dept, people: membersOf(dept).filter((m) => matches(m, query)) })).filter((x) => x.people.length);
  const shown = depts.flatMap((x) => x.people.map((m) => m.name));
  const has = (name: string) => draft.includes(name);
  const toggle = (names: string[]) =>
    setDraft((list) => (names.every((n) => list.includes(n)) ? list.filter((n) => !names.includes(n)) : [...new Set([...list, ...names])]));

  return (
    <div className="ms-filter" role="dialog" aria-label="Mitarbeiter oder Abteilungen filtern">
      <label className="ms-filter-search">
        <Icon src={a.searchDark} size={18} />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Suche Mitarbeiter oder Abteilungen..." />
        {query ? (
          <button type="button" aria-label="Suche löschen" onClick={() => setQuery("")}>
            <Icon src={a.iconCloseDark} size={14} />
          </button>
        ) : null}
      </label>
      <p className="ms-filter-sum">
        {TEAM.filter(isEmployee).length} Mitarbeiter in {ABTEILUNG_NAMEN.length} Abteilungen
      </p>
      <div className="ms-tree">
        <div className="ms-tree-row firma">
          <Tick checked={shown.length > 0 && shown.every(has)} label={`${FIRMA} auswählen`} onChange={() => toggle(shown)} />
          <button type="button" className="ms-tree-label" aria-expanded={firmaOpen || searching} onClick={() => setFirmaOpen(!firmaOpen)}>
            <img src={a.winterMark} alt="" width={22} height={13} />
            <strong>
              {FIRMA} ({shown.length})
            </strong>
            <Icon src={a.chevronDown} size={18} className={firmaOpen || searching ? "" : "side"} />
          </button>
        </div>
        {firmaOpen || searching
          ? depts.map(({ dept, people }) => {
              const names = people.map((m) => m.name);
              const isOpen = searching || open.includes(dept.name);
              return (
                <div className="ms-tree-dept" key={dept.name}>
                  <div className="ms-tree-row">
                    <Tick checked={names.every(has)} label={`${dept.name} auswählen`} onChange={() => toggle(names)} />
                    <button
                      type="button"
                      className="ms-tree-label"
                      aria-expanded={isOpen}
                      onClick={() => setOpen((list) => (list.includes(dept.name) ? list.filter((n) => n !== dept.name) : [...list, dept.name]))}
                    >
                      <strong>
                        {dept.name} ({people.length})
                      </strong>
                      <Icon src={a.chevronDown} size={18} className={isOpen ? "" : "side"} />
                    </button>
                  </div>
                  {isOpen
                    ? people.map((m) => (
                        <div className="ms-tree-row person" key={m.name}>
                          <Tick checked={has(m.name)} label={`${m.name} auswählen`} onChange={() => toggle([m.name])} />
                          <button type="button" className="ms-tree-label" onClick={() => toggle([m.name])}>
                            <span className="emp-avatar">
                              <img className={m.photo ? undefined : "blank"} src={m.photo || a.clientBlank} alt="" />
                              <img className="emp-dot" src={a.statusDot} alt="" />
                            </span>
                            <span className="ms-tree-person">
                              <strong>{m.name}</strong>
                              <small>{m.role}</small>
                            </span>
                          </button>
                        </div>
                      ))
                    : null}
                </div>
              );
            })
          : null}
        {searching && !depts.length ? <p className="ms-empty">Keine Treffer.</p> : null}
      </div>
      <footer className="ms-filter-foot">
        <button type="button" className="reset" onClick={() => setDraft([])}>
          Zurücksetzen
        </button>
        <button
          type="button"
          className="save"
          onClick={() => {
            onSave(draft);
            onClose();
          }}
        >
          Speichern
        </button>
      </footer>
    </div>
  );
}

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export function MitarbeiterSidebar() {
  const { selected, zeitpunkt } = useAuswahlRaw();
  const { openMitarbeiter, openAbteilung } = useWorkflow();
  /** In a department tab only that department is listed. */
  const scope = useContext(AbteilungScope);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"alle" | "auswahl">("alle");
  const [closed, setClosed] = useState<string[]>([]);
  const [menu, setMenu] = useState<"filter" | "zeit" | null>(null);
  const filterRef = useDismiss(menu === "filter", () => setMenu(null));
  const zeitRef = useDismiss(menu === "zeit", () => setMenu(null));

  /* Open requests per employee: live from the HR-Anträge. */
  const [homeoffice, setHomeoffice] = useState(loadAntraege);
  useEffect(() => onAntraegeChange(setHomeoffice), []);
  const [demo] = useHrDemo();
  const offen = [...homeofficeRows(homeoffice), ...demo].filter((r) => r.status === "beantragt");
  const requests = (name: string) => offen.filter((r) => r.person.name === name).length;

  const any = selected.length > 0;
  const onlySelected = any && tab === "auswahl";
  const toggle = (names: string[]) =>
    setSelected(names.every((n) => selected.includes(n)) ? selected.filter((n) => !names.includes(n)) : [...new Set([...selected, ...names])]);
  const clear = () => {
    setSelected([]);
    setTab("alle");
  };
  const pick = (value: Zeitpunkt) => {
    setZeitpunkt(value);
    setMenu(null);
  };

  const depts = ABTEILUNGEN.filter((dept) => !scope || dept.people.every((name) => scope.includes(name))).map((dept) => ({
    dept,
    all: membersOf(dept),
    people: membersOf(dept).filter((m) => matches(m, query) && (!onlySelected || selected.includes(m.name))),
  })).filter((x) => x.people.length);

  return (
    <aside className="mitarbeiter">
      <div className="mitarbeiter-head">
        <div className="mitarbeiter-title">
          <h2>Mitarbeiter</h2>
          <span className="mitarbeiter-count">{scope ? scope.length : TEAM.filter(isEmployee).length}</span>
        </div>

        <label className="mitarbeiter-search">
          <Icon src={a.searchDark} size={18} />
          <input type="text" placeholder="Suchen..." value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Mitarbeiter suchen" />
          {query ? (
            <button type="button" className="ms-x" aria-label="Suche löschen" onClick={() => setQuery("")}>
              <Icon src={a.iconCloseDark} size={12} />
            </button>
          ) : null}
        </label>

        <div className="ms-pop" ref={filterRef}>
          <div className={menu === "filter" ? "mitarbeiter-select open" : "mitarbeiter-select"}>
            <button type="button" className="ms-select-main" aria-haspopup="dialog" aria-expanded={menu === "filter"} onClick={() => setMenu(menu === "filter" ? null : "filter")}>
              {any ? <span className="ms-counter">{selected.length}</span> : null}
              <span className="ms-select-text">Alle Mitarbeiter &amp; Abteilungen</span>
            </button>
            {any ? (
              <button type="button" className="ms-clear" aria-label="Filter löschen" onClick={clear}>
                <span className="ms-xdark small" />
              </button>
            ) : null}
            <Icon src={a.chevronDown} size={18} />
          </div>
          {menu === "filter" ? <FilterBox selected={selected} onSave={setSelected} onClose={() => setMenu(null)} /> : null}
        </div>

        <div className="ms-pop" ref={zeitRef}>
          <button type="button" className="mitarbeiter-select" aria-haspopup="listbox" aria-expanded={menu === "zeit"} onClick={() => setMenu(menu === "zeit" ? null : "zeit")}>
            <Icon src={a.calendar} size={18} />
            Zeitpunkt: {zeitpunkt === "heute" ? "Heute" : zeitpunkt}
            <Icon src={a.chevronDown} size={18} />
          </button>
          {menu === "zeit" ? (
            <ul className="ms-zeit" role="listbox" aria-label="Zeitpunkt">
              <li>
                <button type="button" role="option" aria-selected={zeitpunkt === "heute"} onClick={() => pick("heute")}>
                  Heute <small>Alle Jahre bis heute</small>
                </button>
              </li>
              {YEARS.map((year) => (
                <li key={year}>
                  <button type="button" role="option" aria-selected={zeitpunkt === year} onClick={() => pick(year)}>
                    {year}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="ms-lower">
      {any ? (
        <div className="ms-auswahl">
          <div className="ms-auswahl-head">
            <span>{selected.length} Mitarbeiter ausgewählt</span>
            <button type="button" aria-label="Auswahl löschen" onClick={clear}>
              <span className="ms-xdark" />
            </button>
          </div>
          <div className="ms-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "alle"} className={tab === "alle" ? "active" : ""} onClick={() => setTab("alle")}>
              Alle ({scope ? scope.length : TEAM.filter(isEmployee).length})
            </button>
            <button type="button" role="tab" aria-selected={tab === "auswahl"} className={tab === "auswahl" ? "active" : ""} onClick={() => setTab("auswahl")}>
              Auswahl ({selected.length})
            </button>
          </div>
        </div>
      ) : null}

      <div className={any ? "mitarbeiter-body tabbed" : "mitarbeiter-body"}>
        {depts.map(({ dept, all, people }) => {
          const names = all.map((m) => m.name);
          const isOpen = !closed.includes(dept.name) || query.trim().length > 0;
          return (
            <section className="dept" key={dept.name}>
              <div className="dept-head">
                <span className="dept-name">
                  <Tick checked={names.every((n) => selected.includes(n))} label={`${dept.name} auswählen`} onChange={() => toggle(names)} />
                  {dept.name} ({onlySelected ? people.length : all.length})
                </span>
                <span className="dept-actions">
                  <button type="button" aria-label={`${dept.name} im eigenen Tab öffnen`} title={`${dept.name} öffnen`} onClick={() => openAbteilung(slugOf(dept.name))}>
                    <Icon src={a.openTab} size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label={isOpen ? `${dept.name} zuklappen` : `${dept.name} aufklappen`}
                    aria-expanded={isOpen}
                    onClick={() => setClosed((list) => (list.includes(dept.name) ? list.filter((n) => n !== dept.name) : [...list, dept.name]))}
                  >
                    <Icon src={a.chevronDown} size={18} className={isOpen ? "" : "side"} />
                  </button>
                </span>
              </div>
              {dept.lead.map((line) => {
                const [label, name] = line.split(": ");
                return (
                  <p className="dept-lead" key={line}>
                    {label}: <b>{name}</b>
                  </p>
                );
              })}
              {isOpen ? (
                <ul className="emp-list">
                  {people.map((person) => (
                    <EmployeeCard person={person} requests={requests(person.name)} selected={selected.includes(person.name)} onToggle={() => toggle([person.name])} onOpen={() => openMitarbeiter(slugOf(person.name))} key={person.name} />
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
        {!depts.length ? <p className="ms-empty">{onlySelected ? "Keine Auswahl in dieser Suche." : "Keine Mitarbeiter gefunden."}</p> : null}
      </div>
      </div>
    </aside>
  );
}
