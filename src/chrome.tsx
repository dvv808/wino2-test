import { useEffect, useRef, useState } from "react";
import * as a from "./assets/index";
import { FILE_PARTNERS, kindLabel } from "./person/partners";
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
  const { filePartnerId, personName, ashleyConverted } = useWorkflow();
  const file = FILE_PARTNERS[filePartnerId];
  const interessent = forceInteressent || filePartnerId === "julia" || ashleyConverted;
  const blank = filePartnerId === "ashley";

  return (
    <div className={className}>
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
        {file.born ? <span className="pp-id-born">{file.born}</span> : null}
        {file.address ? (
          <span className="pp-id-address">
            {file.address[0]}
            <br />
            {file.address[1]}
          </span>
        ) : null}
      </div>
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
  { id: "workflow", label: "Workflow", icon: a.workflow },
  { id: "notizen", label: "Notizen", icon: a.notes },
  { id: "email", label: "E-Mail", icon: a.mail },
  { id: "dateien", label: "Dateien", icon: a.folder },
  { id: "verlauf", label: "Verlauf", icon: a.history },
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
          <Icon src={a.workflow} size={24} />
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
