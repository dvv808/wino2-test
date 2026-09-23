import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as a from "./assets/index";
import { FILE_PARTNERS, kindLabel } from "./person/partners";
import { liveFileIdentity } from "./person/stammdaten";
import { Icon } from "./ui";
import { useWorkflow, type WorkflowPane } from "./workflow";

const APPS = ["Person", "Risk Management", "Verträge", "Schäden", "Angebote"];

/** Two text links under the mark: the files this prototype can open. */
export function LogoButton() {
  const { openPartner, ashleyConverted } = useWorkflow();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function away(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const links = [
    { id: "julia" as const, label: `${FILE_PARTNERS.julia.name} (${kindLabel("interessent")})` },
    {
      id: "ashley" as const,
      label: ashleyConverted
        ? `${FILE_PARTNERS.ashley.name} (${kindLabel("interessent")})`
        : `${FILE_PARTNERS.ashley.name} (Einfache Person)`,
    },
  ];

  return (
    <div className="logo-menu" ref={wrapRef}>
      <button
        type="button"
        className="logo-btn"
        aria-label="Wino"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon src={a.logoGlow} size={52} className="glow" />
        <Icon src={a.logoMark} size={34} className="mark" />
      </button>
      {open ? (
        <div className="logo-pop">
          {links.map((link) => (
            <button
              type="button"
              key={link.id}
              onClick={() => {
                openPartner(link.id);
                setOpen(false);
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProfileIcon({ src }: { src: string }) {
  return (
    <span className="profile-pop-icon">
      <img src={src} alt="" />
    </span>
  );
}

function ProfileAreaIcon({
  shelf,
  mark,
  shelfInset,
  markInset,
}: {
  shelf: string;
  mark: string;
  shelfInset: string;
  markInset: string;
}) {
  return (
    <span className="profile-pop-icon area">
      <span className="layer" style={{ inset: shelfInset }}>
        <img src={shelf} alt="" />
      </span>
      <span className="layer" style={{ inset: markInset }}>
        <img src={mark} alt="" />
      </span>
    </span>
  );
}

/** Header avatar. Opens the Figma profile menu; item actions come later. */
export function ProfileMenu() {
  const { openManager } = useWorkflow();
  const [open, setOpen] = useState(false);
  const [widgetOn, setWidgetOn] = useState(true);
  const [popBox, setPopBox] = useState<{ top: number; right: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPopBox(null);
      return;
    }

    function place() {
      const button = wrapRef.current?.querySelector("button.avatar-wrap");
      if (!button) return;
      const box = button.getBoundingClientRect();
      setPopBox({
        top: box.bottom + 8,
        right: Math.max(12, window.innerWidth - box.right),
      });
    }

    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function away(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="profile-menu" ref={wrapRef}>
      <button
        type="button"
        className="avatar-wrap"
        aria-label="Profil"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <img className="photo" src={a.avatar} alt="" />
        <img className="ring" src={a.avatarRing} alt="" />
        <img className="dot" src={a.statusDot} alt="" />
      </button>
      {open ? (
        <div
          className="profile-pop"
          role="menu"
          aria-label="Profil"
          style={popBox ?? undefined}
        >
          <p className="profile-pop-name">Lucy Dallon (Ich):</p>
          <div className="profile-pop-widget">
            <span className="profile-pop-item static">
              <ProfileIcon src={a.profileWidget} />
              Widget einschalten
            </span>
            <button
              type="button"
              className="profile-pop-toggle"
              aria-label="Widget einschalten"
              aria-pressed={widgetOn}
              onClick={() => setWidgetOn((current) => !current)}
            >
              <img src={widgetOn ? a.profileToggleOn : a.profileToggleOff} alt="" />
            </button>
          </div>
          <div className="profile-pop-rule" />
          <div className="profile-pop-list">
            <button type="button" className="profile-pop-item" role="menuitem">
              <ProfileIcon src={a.profileUser} />
              Mein Bereich
            </button>
            <button type="button" className="profile-pop-item" role="menuitem">
              <ProfileIcon src={a.profileSettings} />
              Einstellungen
            </button>
            <button type="button" className="profile-pop-item" role="menuitem">
              <ProfileIcon src={a.profileAdmin} />
              Admin
            </button>
            <button type="button" className="profile-pop-item" role="menuitem">
              <ProfileAreaIcon
                shelf={a.profileMgmtShelf}
                mark={a.profileMgmtPerson}
                shelfInset="17.71% 7.29% 12.5% 6.22%"
                markInset="45.83% 31.1% 12.5% 29.32%"
              />
              Management
            </button>
            <div className="profile-pop-subs">
              <img className="profile-pop-tree short" src={a.profileTreeShort} alt="" />
              <img className="profile-pop-tree long" src={a.profileTree} alt="" />
              <button
                type="button"
                className="profile-pop-item sub"
                role="menuitem"
                onClick={() => {
                  openManager();
                  setOpen(false);
                }}
              >
                <ProfileAreaIcon
                  shelf={a.profileAreaShelf}
                  mark={a.profileAreaWinter}
                  shelfInset="16.67% 3.25% 23.82% 4.17%"
                  markInset="44.79% 26.17% 7.3% 25.92%"
                />
                Winter Versicherung
              </button>
              <button type="button" className="profile-pop-item sub" role="menuitem">
                <ProfileAreaIcon
                  shelf={a.profileAreaShelf}
                  mark={a.profileAreaBrombauer}
                  shelfInset="18.75% 3.25% 21.73% 4.17%"
                  markInset="52.08% 20.6% 18.07% 20.69%"
                />
                Brombauer & Partner
              </button>
            </div>
          </div>
          <div className="profile-pop-rule" />
          <button type="button" className="profile-pop-item logout" role="menuitem">
            <span className="profile-pop-icon logout-icon">
              <span className="layer door">
                <img src={a.profileLogoutDoor} alt="" />
              </span>
              <span className="layer arrow">
                <img src={a.profileLogoutArrow} alt="" />
              </span>
            </span>
            Ausloggen
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Light filled tab while the workflow is open; white-on-dark when it is only parked. */
export function WorkflowDockTab({
  kicker,
  name,
  active = false,
  onActivate,
  onClose,
}: {
  kicker: string;
  name: string;
  active?: boolean;
  onActivate?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className={active ? "workflow-tab" : "workflow-tab idle"}>
      {active ? <img className="tab-ear left" src={a.appTabLeft} alt="" width={10} height={10} /> : null}
      <button type="button" className="workflow-tab-body" onClick={onActivate}>
        <span className="workflow-main">
          <Icon src={a.workflow} size={24} />
          <span className="workflow-copy">
            <small>{kicker}</small>
            <strong>{name}</strong>
          </span>
        </span>
        <span
          className="close-icon"
          role="button"
          aria-label={`${kicker} schließen`}
          onClick={(event) => {
            event.stopPropagation();
            onClose?.();
          }}
        >
          <img src={active ? a.iconCloseDark : a.iconClose} alt="" width={18} height={18} />
        </span>
      </button>
      {active ? <img className="tab-ear flip" src={a.appTabRight} alt="" width={10} height={10} /> : null}
    </div>
  );
}

/** Every open workflow stays in the bar; only its own close control dismisses it. */
export function WorkflowDock() {
  const { view, maklerOpen, stammdatenOpen, openMakler, closeMakler, resumeStammdaten, closeStammdaten, personName } =
    useWorkflow();

  const tabs: {
    id: string;
    kicker: string;
    active: boolean;
    onActivate: () => void;
    onClose: () => void;
  }[] = [];
  if (maklerOpen) {
    tabs.push({
      id: "makler",
      kicker: "Maklervereinbarung",
      active: view === "workflow" || view === "freigabe" || view === "manager",
      onActivate: openMakler,
      onClose: closeMakler,
    });
  }
  if (stammdatenOpen) {
    tabs.push({
      id: "stammdaten",
      kicker: "Stammdaten Workflow",
      active: view === "stammdaten",
      onActivate: resumeStammdaten,
      onClose: () => closeStammdaten(true),
    });
  }

  if (!tabs.length) return null;

  return (
    <div className="workflow-dock">
      {tabs.map((tab) => (
        <WorkflowDockTab
          key={tab.id}
          kicker={tab.kicker}
          name={personName}
          active={tab.active}
          onActivate={tab.active ? undefined : tab.onActivate}
          onClose={tab.onClose}
        />
      ))}
    </div>
  );
}

export function FileIdentity({
  className = "pp-id",
  forceInteressent = false,
}: {
  className?: string;
  forceInteressent?: boolean;
}) {
  const { filePartnerId, personName, ashleyConverted, displaySections } = useWorkflow();
  const file = FILE_PARTNERS[filePartnerId];
  const live = liveFileIdentity(displaySections);
  const born = live.born ?? file.born;
  const address = live.address ?? file.address;
  const usingLive = live.contacts.length > 0;
  const contacts = usingLive ? live.contacts : file.contacts;
  const extra = usingLive ? Math.max(contacts.length - 2, 0) : file.moreContacts;
  const shown = contacts.slice(0, 2);
  const interessent = forceInteressent || filePartnerId === "julia" || ashleyConverted;
  const blank = filePartnerId === "ashley";
  const compact = /\bcompact\b/.test(className);
  const street = address?.[0] ?? "";
  const city = address?.[1] ?? "";
  const hasAddress = Boolean(street || city);
  const showContacts = !compact && shown.length > 0;

  return (
    <div className={className}>
      {compact ? null : (
        <span className="pp-id-deco" aria-hidden>
          <img src={a.idDeco} alt="" />
        </span>
      )}
      <span className={blank ? "pp-id-avatar mm-avatar" : "pp-id-avatar"}>
        {blank ? (
          <>
            <img src={a.avatarBg} alt="" />
            <img className="glyph" src={a.clientBlank} alt="" />
          </>
        ) : (
          <img src={a.avatar} alt="" />
        )}
      </span>
      <div className="pp-id-copy">
        {interessent ? <span className="chip">Interessent</span> : null}
        <strong>{personName}</strong>
        {born ? <span className="pp-id-born">{born}</span> : null}
        {hasAddress ? (
          <span className="pp-id-address">
            {street}
            {street && city ? <br /> : null}
            {city}
          </span>
        ) : null}
        {showContacts ? (
          <div className="mm-contacts">
            {shown.map((contact) => (
              <div className="mm-contact" key={`${contact.kind}-${contact.value}`}>
                <span className="mm-contact-icon">
                  <Icon src={contact.kind === "mail" ? a.mail : a.phone} size={18} />
                </span>
                <span>
                  <small>{contact.caption}</small>
                  <strong>{contact.value}</strong>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {!compact && extra > 0 ? (
        <button type="button" className="mm-more">
          +{extra} weitere Kontakte
        </button>
      ) : null}
      <span className="pp-id-nr">ID: {file.fileId}</span>
    </div>
  );
}

/** The app row plus every open workflow tab. */
export function AppsNav() {
  const { openPerson } = useWorkflow();

  return (
    <nav className="apps-nav">
      <div className="app-pills">
        {APPS.map((label) => (
          <button
            type="button"
            className="app-pill"
            key={label}
            onClick={label === "Person" ? openPerson : undefined}
          >
            {label}
          </button>
        ))}
      </div>
      <WorkflowDock />
    </nav>
  );
}

export type ContentPane = "workflow" | "freigabe";

const WORKFLOW_PANES: { id: WorkflowPane; label: string; icon: string }[] = [
  { id: "workflow", label: "Workflow", icon: a.moduleWorkflow },
  { id: "notizen", label: "Notizen", icon: a.navNotes },
  { id: "email", label: "E-Mail", icon: a.navMail },
  { id: "dateien", label: "Dateien", icon: a.navFolder },
  { id: "verlauf", label: "Verlauf", icon: a.navHistory },
];

/** Sits under the app tabs and switches between the workflow and its Freigabe. */
export function ContentNav({
  active,
  pending,
  onSelect,
}: {
  active: ContentPane;
  pending?: number;
  onSelect: (pane: ContentPane) => void;
}) {
  return (
    <div className="content-nav">
      <div className="content-nav-items">
        <button
          type="button"
          className={`content-nav-item${active === "workflow" ? " active" : ""}`}
          onClick={() => onSelect("workflow")}
        >
          <Icon src={a.moduleWorkflow} size={24} />
          Workflow
        </button>
        <button
          type="button"
          className={`content-nav-item${active === "freigabe" ? " active" : ""}`}
          onClick={() => onSelect("freigabe")}
        >
          <Icon src={a.request} size={24} />
          Freigabe
          {pending ? <span className="content-nav-badge">{pending}</span> : null}
        </button>
      </div>
      <button type="button" className="content-nav-item ghost">
        <Icon src={a.filterLines} size={24} />
        Verlauf
      </button>
    </div>
  );
}

export function VerlaufCaption() {
  const { isHistorical } = useWorkflow();
  return (
    <span className={`verlauf-copy${isHistorical ? " old" : ""}`}>
      Verlauf
      <small>{isHistorical ? "Alte Version" : "Aktuellste Version"}</small>
    </span>
  );
}

/** The advisor's Maklervereinbarung nav: the live workflow, then blank areas. */
export function WorkflowNav({
  active,
  onSelect,
}: {
  active: WorkflowPane;
  onSelect: (pane: WorkflowPane) => void;
}) {
  const { openVersionHistory, closeVersionHistory, versionHistoryOpen } = useWorkflow();

  return (
    <div className="content-nav">
      <div className="content-nav-items">
        {WORKFLOW_PANES.map((pane) => (
          <button
            type="button"
            className={`content-nav-item${pane.id === "verlauf" ? " stacked" : ""}${
              pane.id === "verlauf"
                ? versionHistoryOpen
                  ? " active"
                  : ""
                : active === pane.id
                  ? " active"
                  : ""
            }`}
            key={pane.id}
            onClick={() => {
              if (pane.id === "verlauf") {
                if (versionHistoryOpen) closeVersionHistory();
                else openVersionHistory();
                return;
              }
              onSelect(pane.id);
            }}
          >
            <Icon src={pane.icon} size={24} />
            {pane.id === "verlauf" ? <VerlaufCaption /> : pane.label}
          </button>
        ))}
      </div>
    </div>
  );
}
