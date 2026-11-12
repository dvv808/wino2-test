import * as a from "../assets/index";
import { KalenderPage } from "./calendar/KalenderPage";
import { FileTabs, LogoButton, ProfileMenu } from "../chrome";
import { ConstructionArt } from "../mein-bereich/MeinBereichView";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { HomeWorkflows } from "./HomeWorkflows";
import { PartnerList } from "./PartnerList";
import { GlobalSearch } from "../search/GlobalSearch";

type Area = "Planner" | "Kommunikation" | "Bestand" | "Wissen";
const AREAS: Area[] = ["Planner", "Kommunikation", "Bestand", "Wissen"];

/** Figma "Home": the areas behind the logo and the pages of each. Pages without a design stay "im Aufbau". */
const PAGES: Record<Area, { label: string; icon: string }[]> = {
  Planner: [
    { label: "Dashboard", icon: a.dashboard },
    { label: "Kalender", icon: a.calendar },
    { label: "Workflows & To-Dos", icon: a.moduleWorkflow },
    { label: "Notizblock", icon: a.navNotes },
    { label: "Meine Dateien", icon: a.navFolder },
  ],
  Kommunikation: [
    { label: "Chat", icon: a.navMail },
    { label: "E-Mail", icon: a.navMail },
    { label: "Telefonie", icon: a.navMail },
  ],
  Bestand: [{ label: "Dashboard", icon: a.dashboard }],
  Wissen: [{ label: "Dashboard", icon: a.dashboard }],
};

/** Home area behind the logo: Planner (Workflows & To-Dos), Kommunikation, Bestand (partners), Wissen. */
export function HomeView() {
  const { homeNav, setHomeNav } = useWorkflow();
  const area = homeNav.area as Area;
  const page = homeNav.page;

  const partners = area === "Bestand" && page === "Dashboard";
  const workflows = area === "Planner" && page === "Workflows & To-Dos";
  const kalender = area === "Planner" && page === "Kalender";

  function openArea(next: Area) {
    setHomeNav({ area: next, page: next === "Planner" ? "Workflows & To-Dos" : PAGES[next][0].label });
  }

  return (
    <div className="app">
      <div className="shell">
        <header className="main-nav">
          <div className="main-nav-left">
            <LogoButton />
            <FileTabs />
          </div>
          <div className="main-nav-right">
            <GlobalSearch />
            <ProfileMenu />
          </div>
        </header>

        <nav className="area-nav">
          {AREAS.map((item) => {
            const active = item === area;
            return (
              <span className={active ? "area-tab active" : "area-tab"} key={item}>
                {active ? <img className="tab-ear left" src={a.appTabLeft} alt="" width={10} height={10} /> : null}
                <button type="button" className="area-tab-body" onClick={() => openArea(item)}>
                  {item}
                </button>
                {active ? <img className="tab-ear flip" src={a.appTabRight} alt="" width={10} height={10} /> : null}
              </span>
            );
          })}
        </nav>

        <div className="module-nav">
          {PAGES[area].map((item) => (
            <button
              type="button"
              className={item.label === page ? "module-pill active" : "module-pill"}
              key={item.label}
              onClick={() => setHomeNav({ area, page: item.label })}
            >
              <Icon src={item.icon} size={24} />
              {item.label}
              {item.label === "Kalender" ? (
                <span className="mb-action-count" aria-label="3 Kalender Aktivitäten">
                  3
                </span>
              ) : null}
            </button>
          ))}
          <button type="button" className="module-pill ghost module-history">
            <Icon src={a.filterLines} size={24} />
            Verlauf
          </button>
        </div>

        {partners ? (
          <div className="content-shell mb-page">
            <PartnerList />
          </div>
        ) : kalender ? (
          <KalenderPage />
        ) : workflows ? (
          <div className="content-shell hw-page">
            <HomeWorkflows />
          </div>
        ) : (
          <div className="content-shell mb-body">
            <section className="mb-empty">
              <ConstructionArt />
              <h1>Seite noch im Aufbau</h1>
              <p>Diese Seite wird noch erstellt und wird veröffentlicht sobald sie fertig entwickelt wurde.</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
