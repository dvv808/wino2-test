import { useState } from "react";
import * as a from "../assets/index";
import { FileTabs, LogoButton, MeinBereichTab, ProfileMenu } from "../chrome";
import { HonorarSideContext } from "../honorar/ui";
import { GlobalSearch } from "../search/GlobalSearch";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { HrmListen } from "./HrmListen";
import { MitarbeiterSidebar } from "./MitarbeiterSidebar";
import { abteilungBySlug } from "./hrmTeam";
import { AbteilungScope } from "./mitarbeiterAuswahl";

/**
 * The department tab (Figma 17685:116438), opened with the open icon on a department in the Mitarbeiter side nav.
 * Its own HRM: the side nav lists only this department and HRM Listen shows only its employees.
 */
const AREAS = ["HRM", "Bestand", "Finanzen", "Berechtigung", "Controlling"] as const;
const PAGES = [
  { label: "Dashboard", icon: a.dashboard },
  { label: "Profil", icon: a.moduleProfile },
  { label: "Listen", icon: a.tickList },
  { label: "Dokumente", icon: a.folder },
] as const;
type Page = (typeof PAGES)[number]["label"];

export function AbteilungView() {
  const { abteilungId } = useWorkflow();
  const dept = abteilungId ? abteilungBySlug(abteilungId) : undefined;
  const [page, setPage] = useState<Page>("Listen");
  const [tab, setTab] = useState("antraege");
  const [sideCollapsed, setSideCollapsed] = useState(false);

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
            <button
              type="button"
              key={item.label}
              className={item.label === page ? "module-pill active" : "module-pill"}
              onClick={() => setPage(item.label)}
            >
              <Icon src={item.icon} size={24} />
              {item.label}
            </button>
          ))}
        </div>

        {dept ? (
          <AbteilungScope.Provider value={dept.people}>
            <HonorarSideContext.Provider
              value={{ collapsed: sideCollapsed, toggle: () => setSideCollapsed((value) => !value), sidebar: <MitarbeiterSidebar /> }}
            >
              <div className="content-shell bestand-body">
                {sideCollapsed ? null : <MitarbeiterSidebar />}
                {page === "Listen" || page === "Dashboard" ? (
                  <HrmListen tab={page === "Dashboard" ? "dashboard" : tab} onTab={(next) => (next === "dashboard" ? setPage("Dashboard") : (setTab(next), setPage("Listen")))} />
                ) : (
                  <p className="dms-empty">Diese Seite folgt.</p>
                )}
              </div>
            </HonorarSideContext.Provider>
          </AbteilungScope.Provider>
        ) : (
          <p className="atab-empty center">Abteilung nicht gefunden.</p>
        )}
      </div>
    </div>
  );
}
