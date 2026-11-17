import * as a from "../assets/index";
import { FileTabs, LogoButton, MeinBereichTab, ProfileMenu } from "../chrome";
import { GlobalSearch } from "../search/GlobalSearch";
import { useWorkflow } from "../workflow";
import { useMemo, useState } from "react";
import { Icon } from "../ui";
import { HrmDashboard } from "./HrmDashboard";
import { HrmListen } from "./HrmListen";
import { MitarbeiterCard } from "./MitarbeiterCard";
import { AbteilungScope } from "./mitarbeiterAuswahl";
import { memberBySlug } from "./hrmTeam";
import { MitarbeiterProfil } from "./MitarbeiterProfil";

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
  const [page, setPage] = useState<Page>(employee ? "Dashboard" : "Profil");
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

        <nav className="area-nav">
          {AREAS.map((area) => {
            const active = area === "HRM";
            return (
              <span className={active ? "area-tab active" : "area-tab"} key={area}>
                {active ? <img className="tab-ear left" src={a.appTabLeft} alt="" width={10} height={10} /> : null}
                <button type="button" className="area-tab-body">
                  {area}
                </button>
                {active ? <img className="tab-ear flip" src={a.appTabRight} alt="" width={10} height={10} /> : null}
              </span>
            );
          })}
        </nav>

        <div className="module-nav">
          {PAGES.map((item) => (
            <button type="button" key={item.label} className={item.label === page ? "module-pill active" : "module-pill"} onClick={() => setPage(item.label)}>
              <Icon src={item.icon} size={24} />
              {item.label}
            </button>
          ))}
        </div>

        {person ? (
          <AbteilungScope.Provider value={scope}>
            {page === "Dashboard" ? (
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
              <MitarbeiterProfil key={person.name} person={person} />
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
