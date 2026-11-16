import * as a from "../assets/index";
import { FileTabs, LogoButton, MeinBereichTab, ProfileMenu } from "../chrome";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { useKeptState } from "../lib/keptState";
import { DmsBrowser, PersonSwitch } from "../dms/DmsBrowser";
import { Berechtigungen } from "../dms/admin/Berechtigungen";
import { Dokumenttypen } from "../dms/admin/Dokumenttypen";
import { Zuordnung } from "../dms/admin/Zuordnung";
import type { Ansicht } from "../types/dms";
import { useDms } from "../dms/store";
import { GlobalSearch } from "../search/GlobalSearch";
import { ConstructionArt } from "../mein-bereich/MeinBereichView";

/** Admin areas: Spaces (DMS), plus HRM Admin and Rollen & Berechtigungen (content follows). */
const AREAS = ["Spaces", "HRM Admin", "Rollen & Berechtigungen"] as const;
type Area = (typeof AREAS)[number];

/** Ordner Zuordnung (build and link) and Spaces (the outcome) belong together, like a pill group in HRM. */
const PAIR = [
  { id: "zuordnung", label: "Ordner Zuordnung", icon: a.verknuepfung },
  { id: "spaces", label: "Spaces", icon: a.folder },
] as const;
const PAGES = [
  { id: "typen", label: "Dokumenttypen", icon: a.docList },
  { id: "rechte", label: "Gruppen & Berechtigungen", icon: a.contacts },
] as const;
type Page = (typeof PAIR)[number]["id"] | (typeof PAGES)[number]["id"];

/** Configuration screens are for DMS-Admins; others see who they are browsing as and can switch. */
function AdminOnly({ children }: { children: React.ReactNode }) {
  const { state } = useDms();
  const person = state.people.find((p) => p.id === state.activePerson);
  if (person?.rollen.includes("DMS-Admin")) return <>{children}</>;
  return (
    <section className="dms-panel dms-admin-full dms-admin-locked">
      <img src={a.hnLock} alt="" width={28} height={28} />
      <h3>Nur für DMS-Admins</h3>
      <p className="dms-muted">Du siehst Wino gerade als {person?.name}. Wechsle die Person, um die Verwaltung zu bearbeiten.</p>
      <PersonSwitch title="Ansehen als" />
    </section>
  );
}

/**
 * Admin, opened from the profile menu as its own tab. Its only area is "Spaces": the DMS where the main folders
 * for the rest of Wino are defined: the Verwaltung view of the DMS and its configuration screens.
 */
export function AdminView() {
  const { closeAdmin } = useWorkflow();
  const { state } = useDms();
  const [page, setPage] = useKeptState<Page>("admin.page", "zuordnung");
  const [area, setArea] = useKeptState<Area>("admin.area", "Spaces");
  // Spaces simulates the real thing: a DMS-Admin gets the Verwaltung structure, everyone else the Standard one.
  // Switch the person in the Spaces header to see the other outcome.
  const viewer = state.people.find((p) => p.id === state.activePerson);
  const ansicht: Ansicht = viewer?.rollen.includes("DMS-Admin") ? "Verwaltung" : "Standard";

  return (
    <div className="app">
      <div className="shell">
        <header className="main-nav">
          <div className="main-nav-left">
            <LogoButton />
            <FileTabs />
            <MeinBereichTab />
            <div className="person-tab">
              <img className="tab-ear left" src={a.tabLeft} alt="" width={10} height={11} />
              <span className="person-tab-body">
                <Icon src={a.profileAdmin} size={24} />
                Admin
                <button type="button" className="close-icon" aria-label="Admin schließen" onClick={closeAdmin}>
                  <img src={a.iconClose} alt="" width={18} height={18} />
                </button>
              </span>
              <img className="tab-ear flip" src={a.tabRight} alt="" width={10} height={11} />
            </div>
          </div>
          <div className="main-nav-right">
            <GlobalSearch />
            <ProfileMenu />
          </div>
        </header>

        <nav className="area-nav mb-area-nav">
          {AREAS.map((item) => {
            const active = item === area;
            return (
              <span className={active ? "area-tab active" : "area-tab"} key={item}>
                {active ? <img className="tab-ear left" src={a.appTabLeft} alt="" width={10} height={10} /> : null}
                <button type="button" className="area-tab-body" aria-current={active ? "page" : undefined} onClick={() => setArea(item)}>
                  {item}
                </button>
                {active ? <img className="tab-ear flip" src={a.appTabRight} alt="" width={10} height={10} /> : null}
              </span>
            );
          })}
        </nav>

        {area !== "Spaces" ? (
          <div className="content-shell mb-body">
            <section className="mb-empty">
              <ConstructionArt />
              <h1>Seite noch im Aufbau</h1>
              <p>Diese Seite wird noch erstellt und wird veröffentlicht sobald sie fertig entwickelt wurde.</p>
            </section>
          </div>
        ) : (
        <>
        <div className="module-nav">
          <div className="module-group">
            {PAIR.map((item) => (
              <button
                type="button"
                className={item.id === page ? "module-pill active" : "module-pill ghost"}
                key={item.id}
                onClick={() => setPage(item.id)}
              >
                <Icon src={item.icon} size={24} />
                {item.label}
              </button>
            ))}
          </div>
          {/* Dokumenttypen stays built but is not shown yet. */}
          {PAGES.filter((item) => item.id !== "typen").map((item) => (
            <button
              type="button"
              className={item.id === page ? "module-pill active" : "module-pill"}
              key={item.id}
              onClick={() => setPage(item.id)}
            >
              <Icon src={item.icon} size={24} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="content-shell admin-body">
          {page === "zuordnung" ? (
            <AdminOnly>
              <Zuordnung />
            </AdminOnly>
          ) : null}
          {page === "spaces" ? (
            <DmsBrowser key={ansicht} ansicht={ansicht} title="Spaces" lockConfidential={ansicht === "Verwaltung"} />
          ) : null}
          {page === "typen" ? (
            <AdminOnly>
              <Dokumenttypen />
            </AdminOnly>
          ) : null}
          {page === "rechte" ? (
            <AdminOnly>
              <Berechtigungen />
            </AdminOnly>
          ) : null}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
