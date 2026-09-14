import * as a from "../assets/index";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";

const AREAS = ["Dashboard", "HRM", "Bestand", "Finanzen", "Berichte", "Marketing", "Honorare"];

const MODULES = [
  { label: "Dokumente", icon: a.folder },
  { label: "Notizen", icon: a.notes },
  { label: "Mail", icon: a.mail },
  { label: "Aufgaben Übersicht", icon: a.todo },
];

/** The management-area glyph is a shelf over a person, two layers in Figma. */
function ManagementAreaIcon() {
  return (
    <span className="mgmt-icon">
      <img src={a.mgmtAreaShelf} alt="" />
      <img src={a.mgmtAreaPerson} alt="" />
    </span>
  );
}

/** `partner` opens a second tab: the Bestandsmanager looking into someone's file. */
export function BestandMainNav({
  partner,
  onClosePartner,
}: {
  partner?: string;
  onClosePartner?: () => void;
} = {}) {
  const { leaveManager } = useWorkflow();

  return (
    <header className="main-nav">
      <div className="main-nav-left">
        <button type="button" className="logo-btn" aria-label="Wino">
          <Icon src={a.logoGlow} size={52} className="glow" />
          <Icon src={a.logoMark} size={34} className="mark" />
        </button>
        <div className="person-tab">
          <img className="tab-ear left" src={a.tabLeft} alt="" width={10} height={11} />
          <span className="person-tab-body mgmt-tab">
            <ManagementAreaIcon />
            <span className="mgmt-tab-copy">
              Management
              <br />
              Winter Vers.
            </span>
            <button
              type="button"
              className="close-icon"
              aria-label="Bestandsmanagement schließen"
              onClick={() => leaveManager()}
            >
              <img src={a.iconClose} alt="" width={18} height={18} />
            </button>
          </span>
          <img className="tab-ear flip" src={a.tabRight} alt="" width={10} height={11} />
        </div>
        {partner ? (
          <div className="person-tab">
            <img className="tab-ear left" src={a.tabLeft} alt="" width={10} height={11} />
            <span className="person-tab-body">
              <Icon src={a.person} size={24} />
              {partner}
              <button
                type="button"
                className="close-icon"
                aria-label={`${partner} schließen`}
                onClick={onClosePartner}
              >
                <img src={a.iconClose} alt="" width={18} height={18} />
              </button>
            </span>
            <img className="tab-ear flip" src={a.tabRight} alt="" width={10} height={11} />
          </div>
        ) : null}
      </div>
      <div className="main-nav-right">
        <button type="button" className="search-btn" aria-label="Suche">
          <Icon src={a.search} size={42} />
        </button>
        <div className="avatar-wrap">
          <img className="photo" src={a.avatar} alt="Profil" />
          <img className="ring" src={a.avatarRing} alt="" />
          <img className="dot" src={a.statusDot} alt="" />
        </div>
      </div>
    </header>
  );
}

export function BestandAreaNav() {
  return (
    <nav className="area-nav">
      {AREAS.map((area) => {
        const active = area === "Bestand";
        return (
          <span className={active ? "area-tab active" : "area-tab"} key={area}>
            {active ? (
              <img className="tab-ear left" src={a.appTabLeft} alt="" width={10} height={10} />
            ) : null}
            <button type="button" className="area-tab-body">
              {area}
            </button>
            {active ? (
              <img className="tab-ear flip" src={a.appTabRight} alt="" width={10} height={10} />
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}

export function BestandModuleNav() {
  return (
    <div className="module-nav">
      <button type="button" className="module-pill active">
        <Icon src={a.tickList} size={24} />
        Dashboard &amp; Listen
      </button>

      <div className="module-pill module-select">
        <span className="module-select-label">
          <Icon src={a.category} size={24} />
          Module
        </span>
        <button type="button" className="module-select-value">
          Weiterbildungen
          <Icon src={a.chevronDown} size={16} />
        </button>
      </div>

      <div className="module-group">
        {MODULES.map((module) => (
          <button type="button" className="module-pill ghost" key={module.label}>
            <Icon src={module.icon} size={24} />
            {module.label}
          </button>
        ))}
      </div>

      <button type="button" className="module-pill">
        <Icon src={a.settings} size={24} />
        Settings
      </button>
    </div>
  );
}
