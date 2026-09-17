import * as a from "./assets/index";
import { Icon } from "./ui";
import { useWorkflow } from "./workflow";

const APPS = ["Person", "Risk Management", "Verträge", "Schäden", "Angebote"];

/** The app row plus the open workflow tab, shared by the advisor and the Bestandsmanager. */
export function AppsNav({ kicker, name }: { kicker: string; name: string }) {
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
      <div className="workflow-tab">
        <img className="tab-ear left" src={a.appTabLeft} alt="" width={10} height={10} />
        <button type="button" className="workflow-tab-body">
          <span className="workflow-main">
            <Icon src={a.workflow} size={24} />
            <span className="workflow-copy">
              <small>{kicker}</small>
              <strong>{name}</strong>
            </span>
          </span>
          <span className="close-icon">
            <img src={a.iconCloseDark} alt="" width={18} height={18} />
          </span>
        </button>
        <img className="tab-ear flip" src={a.appTabRight} alt="" width={10} height={10} />
      </div>
    </nav>
  );
}

export type ContentPane = "workflow" | "freigabe";

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
