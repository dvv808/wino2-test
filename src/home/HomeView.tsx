import * as a from "../assets/index";
import { KalenderPage } from "./calendar/KalenderPage";
import { FileTabs, LogoButton, MeinBereichTab, ProfileMenu } from "../chrome";
import { ConstructionArt } from "../mein-bereich/MeinBereichView";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { HomeWorkflows } from "./HomeWorkflows";
import { KundenList } from "./KundenList";
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
  // Figma 8534:82498: Schnellsuche, then the lists of the Bestand.
  Bestand: [
    { label: "Schnellsuche", icon: a.bestandFastSearch },
    { label: "Kunden", icon: a.bestandUser },
    { label: "Versicherer", icon: a.bestandInsurance },
    { label: "Verträge", icon: a.bestandFiles },
    { label: "Schäden", icon: a.bestandDamage },
    { label: "Angebote", icon: a.bestandOffer },
    { label: "Objekte", icon: a.bestandObject },
  ],
  Wissen: [{ label: "Dashboard", icon: a.dashboard }],
};

/** Home area behind the logo: Planner (Workflows & To-Dos), Kommunikation, Bestand (partners), Wissen. */
export function HomeView() {
  const { homeNav, setHomeNav } = useWorkflow();
  const area = homeNav.area as Area;
  // An old link to Bestand → Dashboard lands on Kunden.
  const page = PAGES[area].some((p) => p.label === homeNav.page) ? homeNav.page : area === "Bestand" ? "Kunden" : homeNav.page;

  const kunden = area === "Bestand" && page === "Kunden";
  const workflows = area === "Planner" && page === "Workflows & To-Dos";
  const kalender = area === "Planner" && page === "Kalender";

  function openArea(next: Area) {
    setHomeNav({ area: next, page: next === "Planner" ? "Workflows & To-Dos" : next === "Bestand" ? "Kunden" : PAGES[next][0].label });
  }

  return (
    <div className="app">
      <div className="shell">
        <header className="main-nav">
          <div className="main-nav-left">
            <LogoButton />
            <FileTabs />
            {/* Mein Bereich and Admin stay open as tabs while Home is shown. */}
            <MeinBereichTab />
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
            <span className="module-pill-wrap" key={item.label}>
            <button
              type="button"
              className={item.label === page ? "module-pill active" : "module-pill"}
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
            {/* Figma: a divider between Schnellsuche and the Bestand lists. */}
            {item.label === "Schnellsuche" ? <span className="module-divider" aria-hidden /> : null}
            </span>
          ))}
          {area === "Bestand" ? null : (
          <button type="button" className="module-pill ghost module-history">
            <Icon src={a.filterLines} size={24} />
            Verlauf
          </button>
          )}
        </div>

        {kunden ? (
          <div className="content-shell kd-shell">
            <KundenList />
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
