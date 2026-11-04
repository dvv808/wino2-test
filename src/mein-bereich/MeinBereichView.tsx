import * as a from "../assets/index";
import { FileTabs, LogoButton, ProfileMenu } from "../chrome";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { useHonorar } from "../honorar/store";
import { MyForderungen, ownActionCount } from "./MyForderungen";

type Area = "Mein Bereich" | "Bestand";
const AREAS: Area[] = ["Mein Bereich", "Bestand"];

const PAGES: Record<Area, { label: string; icon: string }[]> = {
  "Mein Bereich": [
    { label: "Dashboard", icon: a.dashboard },
    { label: "Profil", icon: a.moduleProfile },
    { label: "Dokumente", icon: a.folder },
  ],
  Bestand: [
    { label: "Dashboard", icon: a.dashboard },
    { label: "Honorare/Forderungen", icon: a.honorar },
  ],
};

/** "Seite noch im Aufbau" illustration: a sphere with a crane, and the Winter + W badges on its lower edge. */
export function ConstructionArt() {
  return (
    <div className="mb-art" aria-hidden>
      <img className="mb-sphere" src={a.mbSphere} alt="" />
      <span className="mb-sphere-inner">
        <img src={a.mbSphereInner} alt="" />
      </span>
      <img className="mb-construction" src={a.mbConstruction} alt="" />
      <span className="mb-tower">
        <img src={a.mbTower} alt="" />
      </span>
      <span className="mb-sphere-shade">
        <img src={a.mbSphereShade} alt="" />
      </span>
      <span className="mb-badge dark">
        <img src={a.mbBadgeDark} alt="" />
      </span>
      <img className="mb-badge-icon" src={a.mbIconWinter} alt="" />
      <span className="mb-badge light">
        <img src={a.mbBadgeLight} alt="" />
      </span>
      <img className="mb-badge-w" src={a.mbBadgeW} alt="" />
      <span className="mb-crane-arm">
        <span>
          <img src={a.mbCraneArm} alt="" />
        </span>
      </span>
      <span className="mb-crane-hook">
        <span>
          <img src={a.mbCraneHook} alt="" />
        </span>
      </span>
    </div>
  );
}

/** Personal area behind the profile menu. "Mein Bereich" is not designed yet; "Bestand" shows the own Honorare/Forderungen. */
export function MeinBereichView() {
  const { closeMeinBereich, meinBereichNav, setMeinBereichNav } = useWorkflow();
  const area = meinBereichNav.area as Area;
  const page = meinBereichNav.page;
  const setPage = (next: string) => setMeinBereichNav({ area, page: next });
  const forderungen = area === "Bestand" && page === "Honorare/Forderungen";
  const { state } = useHonorar();
  // Red bubble on Honorare/Forderungen: own invoices that are open and need action.
  const actionCount = ownActionCount(state);

  function openArea(next: Area) {
    setMeinBereichNav({ area: next, page: "Dashboard" });
  }

  return (
    <div className="app">
      <div className="shell">
        <header className="main-nav">
          <div className="main-nav-left">
            <LogoButton />
            <FileTabs />
            <div className="person-tab">
              <img className="tab-ear left" src={a.tabLeft} alt="" width={10} height={11} />
              <span className="person-tab-body">
                <img className="mb-tab-avatar" src={a.avatar} alt="" width={24} height={24} />
                Mein Bereich
                <button type="button" className="close-icon" aria-label="Mein Bereich schließen" onClick={closeMeinBereich}>
                  <img src={a.iconClose} alt="" width={18} height={18} />
                </button>
              </span>
              <img className="tab-ear flip" src={a.tabRight} alt="" width={10} height={11} />
            </div>
          </div>
          <div className="main-nav-right">
            <button type="button" className="search-btn" aria-label="Suche">
              <Icon src={a.search} size={42} />
            </button>
            <ProfileMenu />
          </div>
        </header>

        <nav className="area-nav mb-area-nav">
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
              onClick={() => setPage(item.label)}
            >
              <Icon src={item.icon} size={24} />
              {item.label}
              {item.label === "Honorare/Forderungen" && actionCount > 0 ? (
                <span className="mb-action-count" aria-label={`${actionCount} offen, Handlung nötig`}>
                  {actionCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {forderungen ? (
          <MyForderungen />
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
