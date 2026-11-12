import * as a from "../assets/index";
import { LogoButton, ProfileMenu, MeinBereichTab } from "../chrome";
import { getPartner } from "../person/partners";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { GlobalSearch } from "../search/GlobalSearch";

const AREAS = ["Dashboard", "HRM", "Bestand", "Finanzen", "Berichte", "Marketing", "Honorare"];

const MODULES = [
  { label: "Dokumente", icon: a.folder },
  { label: "Notizen", icon: a.notes },
  { label: "Mail", icon: a.mail },
  { label: "Aufgaben Übersicht", icon: a.todo },
];

/** The management-area glyph is a shelf over a person, two layers in Figma. */
export function ManagementAreaIcon() {
  return (
    <span className="mgmt-icon">
      <img src={a.mgmtAreaShelf} alt="" />
      <img src={a.mgmtAreaPerson} alt="" />
    </span>
  );
}

/**
 * Partner tabs that were open before Management: they stay in the header, parked, with Management beside them.
 * `hide` skips the file that the header already shows as its own partner tab.
 */
function ParkedFileTabs({ hide }: { hide?: string }) {
  const { openFileIds, filePartnerId, activateFile, openPerson, dropFileTab } = useWorkflow();

  return (
    <>
      {openFileIds
        .filter((id) => getPartner(id).name !== hide)
        .map((id) => {
          const file = getPartner(id);
          return (
            <div className="person-tab inactive" key={id}>
              <img className="tab-ear left" src={a.tabLeft} alt="" width={10} height={11} />
              <span className="person-tab-body">
                <Icon src={file.fileKind === "company" ? a.company : a.person} size={24} />
                <button
                  type="button"
                  className="person-tab-open"
                  onClick={() => (id === filePartnerId ? openPerson() : activateFile(id))}
                >
                  {file.name}
                </button>
                <button type="button" className="close-icon" aria-label={`${file.name} schließen`} onClick={() => dropFileTab(id)}>
                  <img src={a.iconClose} alt="" width={18} height={18} />
                </button>
              </span>
              <img className="tab-ear flip" src={a.tabRight} alt="" width={10} height={11} />
            </div>
          );
        })}
    </>
  );
}

/** `partner` opens a second tab: the Bestandsmanager looking into someone's file. */
export function BestandMainNav({
  partner,
  onClosePartner,
  onOpenPartner,
  onOpenManagement,
}: {
  partner?: string;
  onClosePartner?: () => void;
  /** Makes the partner tab a button that switches to the partner's file. */
  onOpenPartner?: () => void;
  /** Parks the Management tab (the partner tab is the current one) and makes it a way back. */
  onOpenManagement?: () => void;
} = {}) {
  const { closeManagement, view, freigabeId, freigabeName, openFreigabe, dropFreigabe } = useWorkflow();
  // A Freigabe left for another tab stays open in the background, after Management.
  const parkedFreigabe = freigabeId && freigabeName && view !== "freigabe" && partner !== freigabeName ? freigabeName : null;

  return (
    <header className="main-nav">
      <div className="main-nav-left">
        <LogoButton />
        <ParkedFileTabs hide={partner} />
        <div className={onOpenManagement ? "person-tab inactive" : "person-tab"}>
          <img className="tab-ear left" src={a.tabLeft} alt="" width={10} height={11} />
          <span className="person-tab-body mgmt-tab">
            <ManagementAreaIcon />
            {onOpenManagement ? (
              <button type="button" className="mgmt-tab-copy person-tab-open" onClick={onOpenManagement}>
                Management
                <br />
                Winter Vers.
              </button>
            ) : (
              <span className="mgmt-tab-copy">
                Management
                <br />
                Winter Vers.
              </span>
            )}
            <button
              type="button"
              className="close-icon"
              aria-label="Bestandsmanagement schließen"
              onClick={closeManagement}
            >
              <img src={a.iconClose} alt="" width={18} height={18} />
            </button>
          </span>
          <img className="tab-ear flip" src={a.tabRight} alt="" width={10} height={11} />
        </div>
        {parkedFreigabe && freigabeId ? (
          <div className="person-tab inactive">
            <img className="tab-ear left" src={a.tabLeft} alt="" width={10} height={11} />
            <span className="person-tab-body">
              <Icon src={a.person} size={24} />
              <button type="button" className="person-tab-open" onClick={() => openFreigabe(freigabeId)}>
                {parkedFreigabe}
              </button>
              <button type="button" className="close-icon" aria-label={`${parkedFreigabe} schließen`} onClick={dropFreigabe}>
                <img src={a.iconClose} alt="" width={18} height={18} />
              </button>
            </span>
            <img className="tab-ear flip" src={a.tabRight} alt="" width={10} height={11} />
          </div>
        ) : null}
        {partner ? (
          <div className={onOpenPartner ? "person-tab inactive" : "person-tab"}>
            <img className="tab-ear left" src={a.tabLeft} alt="" width={10} height={11} />
            <span className="person-tab-body">
              <Icon src={a.person} size={24} />
              {onOpenPartner ? (
                <button type="button" className="person-tab-open" onClick={onOpenPartner}>
                  {partner}
                </button>
              ) : (
                partner
              )}
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
        <MeinBereichTab />
      </div>
      <div className="main-nav-right">
        <GlobalSearch />
        <ProfileMenu />
      </div>
    </header>
  );
}

export function BestandAreaNav({ active: current = "Bestand", onArea }: { active?: string; onArea?: (area: string) => void } = {}) {
  const { openFinanzen } = useWorkflow();

  return (
    <nav className="area-nav">
      {AREAS.map((area) => {
        const active = area === current;
        return (
          <span className={active ? "area-tab active" : "area-tab"} key={area}>
            {active ? (
              <img className="tab-ear left" src={a.appTabLeft} alt="" width={10} height={10} />
            ) : null}
            <button
              type="button"
              className="area-tab-body"
              onClick={() => {
                if (area === "Finanzen") openFinanzen();
                else if (area === "HRM" || area === "Bestand") onArea?.(area);
              }}
            >
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
