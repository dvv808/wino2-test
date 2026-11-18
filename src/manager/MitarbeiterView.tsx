import * as a from "../assets/index";
import { FileTabs, LogoButton, MeinBereichTab, ProfileMenu, WorkflowDockTab } from "../chrome";
import { GlobalSearch } from "../search/GlobalSearch";
import { useWorkflow } from "../workflow";
import { useMemo, useState } from "react";
import { Icon } from "../ui";
import { HrmDashboard } from "./HrmDashboard";
import { HrmListen } from "./HrmListen";
import { MitarbeiterCard } from "./MitarbeiterCard";
import { AbteilungScope } from "./mitarbeiterAuswahl";
import { memberBySlug } from "./hrmTeam";
import { MitarbeiterProfil, MitarbeiterStammdatenWorkflow, takeNextView, type AreaId } from "./MitarbeiterProfil";
import { ConstructionArt } from "../mein-bereich/MeinBereichView";

const AREAS = ["HRM", "Bestand", "Finanzen", "Berechtigung", "Controlling"] as const;
const PAGES = [
  { label: "Dashboard", icon: a.dashboard },
  { label: "Profil", icon: a.moduleProfile },
  { label: "Listen", icon: a.tickList },
  { label: "Dokumente", icon: a.folder },
] as const;
type Page = (typeof PAGES)[number]["label"];

/**
 * The employee tab (Figma 17315:165304), opened with the open icon in the Mitarbeiter side nav: HRM with
 * Dashboard, Profil, Listen and Dokumente. Dashboard and Listen are the HRM Listen pages narrowed to this one
 * person (no side nav); Profil holds the Stammdaten (Anstellung) and what was entered in "Mitarbeiter anlegen".
 */
export function MitarbeiterView() {
  const { mitarbeiterId } = useWorkflow();
  const person = mitarbeiterId ? memberBySlug(mitarbeiterId) : undefined;
  const employee = person ? !person.typ || person.typ === "Mitarbeiter" : false;
  // Right after Partner anlegen the tab may open on Profil or straight in the Stammdaten Workflow.
  const [start] = useState(() => (mitarbeiterId ? takeNextView(mitarbeiterId) : undefined));
  const [page, setPage] = useState<Page>(start?.page ?? (employee ? "Dashboard" : "Profil"));
  const [editing, setEditing] = useState<AreaId | null>(start?.edit ?? null);
  const [, setVersion] = useState(0);
  const [tab, setTab] = useState("antraege");
  const scope = useMemo(() => (person ? [person.name] : null), [person]);

  return (
    <div className="app">
      <div className="shell">
        <header className="main-nav">
          <div className="main-nav-left">
            <LogoButton />
            <FileTabs />
            <MeinBereichTab />
          </div>
          <div className="main-nav-right">
            <GlobalSearch />
            <ProfileMenu />
          </div>
        </header>

        {/* Figma 21745:76795 / 21745:72464: the small app pills; HRM is the light tab until the Stammdaten Workflow opens. */}
        <nav className="apps-nav ma-apps-nav">
          <div className="app-pills">
            {AREAS.map((area) => {
              const active = area === "HRM" && !(editing && person);
              return active ? (
                <span className="app-pill-tab" key={area}>
                  <img className="tab-ear left" src={a.appTabLeft} alt="" width={10} height={10} />
                  <button type="button" className="app-pill active" onClick={() => setEditing(null)}>
                    {area}
                  </button>
                  <img className="tab-ear flip" src={a.appTabRight} alt="" width={10} height={10} />
                </span>
              ) : (
                <button type="button" className="app-pill" key={area} onClick={area === "HRM" ? () => setEditing(null) : undefined}>
                  {area}
                </button>
              );
            })}
          </div>
          {editing && person ? (
            <div className="workflow-dock">
              <WorkflowDockTab kicker="Stammdaten Workflow" name={person.name} active onClose={() => setEditing(null)} />
            </div>
          ) : null}
        </nav>

        {editing && person ? null : (
        <div className="module-nav">
          {PAGES.map((item) => (
            <button type="button" key={item.label} className={item.label === page ? "module-pill active" : "module-pill"} onClick={() => setPage(item.label)}>
              <Icon src={item.icon} size={24} />
              {item.label}
            </button>
          ))}
        </div>
        )}

        {person && editing ? (
          <MitarbeiterStammdatenWorkflow
            key={`${person.name}-wf`}
            person={person}
            area={editing}
            onArea={setEditing}
            onClose={() => {
              setEditing(null);
              setPage("Profil");
              setVersion((v) => v + 1);
            }}
          />
        ) : person ? (
          <AbteilungScope.Provider value={scope}>
            {page === "Dashboard" && !employee ? (
              // Bewerber: their dashboard follows.
              <div className="content-shell mb-body">
                <section className="mb-empty">
                  <ConstructionArt />
                  <h1>Seite noch im Aufbau</h1>
                  <p>Diese Seite wird noch erstellt und wird veröffentlicht sobald sie fertig entwickelt wurde.</p>
                </section>
              </div>
            ) : page === "Dashboard" ? (
              <div className="content-shell ma-dash">
                <MitarbeiterCard key={person.name} person={person} onPage={setPage} />
                <div className="ma-dash-main">
                  <HrmDashboard onTab={(next) => (next === "dashboard" ? undefined : (setTab(next), setPage("Listen")))} />
                </div>
              </div>
            ) : page === "Listen" ? (
              <div className="content-shell bestand-body ma-hrm">
                <HrmListen tab={tab} onTab={(next) => (next === "dashboard" ? setPage("Dashboard") : setTab(next))} />
              </div>
            ) : page === "Profil" ? (
              <MitarbeiterProfil key={person.name} person={person} onEdit={setEditing} />
            ) : (
              <div className="content-shell ma-body">
                <p className="dms-empty">Diese Seite folgt.</p>
              </div>
            )}
          </AbteilungScope.Provider>
        ) : (
          <p className="atab-empty center">Mitarbeiter nicht gefunden.</p>
        )}
      </div>
    </div>
  );
}
