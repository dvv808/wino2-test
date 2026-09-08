import * as a from "../assets/index";
import { Icon } from "../ui";
import type { RequestRow, RequestStatus } from "./requests";

const TABS = [
  { label: "Dashboard", icon: a.dashboard },
  { label: "Freigaben", icon: a.request },
  { label: "Bestandsübersicht", icon: a.abteilung },
  { label: "Dynamische Listen", icon: a.tickList },
];

const COLUMNS = [
  "Partner",
  "Partner Typ",
  "Art / Schritt",
  "Angefordert von",
  "Angeford. am",
  "Status",
  "Kommentar / Grund",
];

/** Only these columns carry the sort/filter glyph in the header. */
const GLYPH_COLUMNS = new Set([
  "Art / Schritt",
  "Angefordert von",
  "Angeford. am",
  "Status",
  "Kommentar / Grund",
]);

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-copy">
        <small>{label}</small>
        <strong>{String(value).padStart(2, "0")}</strong>
        <span>gesamt</span>
      </div>
      <span className="stat-icon">
        <Icon src={icon} size={16} />
      </span>
    </div>
  );
}

export function StatusPill({ status }: { status: RequestStatus }) {
  if (status === "abgelehnt") {
    return (
      <span className="status-pill rejected">
        <Icon src={a.revert} size={16} />
        Abgelehnt
      </span>
    );
  }
  if (status === "abgeschlossen") {
    return (
      <span className="status-pill done">
        <Icon src={a.confirm} size={16} />
        Abgeschlossen
      </span>
    );
  }
  return (
    <span className="status-pill open">
      <Icon src={a.onhold} size={16} />
      offen
    </span>
  );
}

function PartnerCell({ row }: { row: RequestRow }) {
  const { partner } = row;

  return (
    <div className="cell partner-cell">
      <span className="partner-avatar">
        {partner.photo ? (
          <img className="photo" src={partner.photo} alt="" />
        ) : (
          <img
            className="glyph"
            src={partner.kind === "company" ? a.companyBlank : a.clientBlank}
            alt=""
          />
        )}
        {partner.winter ? <img className="winter" src={a.winterMark} alt="" /> : null}
      </span>
      <span className="partner-copy">
        <strong>{partner.name}</strong>
        {partner.meta ? (
          <small>
            {partner.meta}
            {partner.alias ? <em>{partner.alias}</em> : null}
          </small>
        ) : null}
      </span>
      <button type="button" className="cell-open" aria-label={`${partner.name} öffnen`}>
        <Icon src={a.openTab} size={18} />
      </button>
    </div>
  );
}

export function FreigabenPanel({
  rows,
  onStart,
}: {
  rows: RequestRow[];
  onStart: (row: RequestRow) => void;
}) {
  const count = (status: RequestStatus) => rows.filter((row) => row.status === status).length;

  return (
    <section className="freigaben">
      <h1 className="freigaben-title">
        <Icon src={a.shelveToggle} size={18} />
        Bestand Listen
      </h1>

      <div className="freigaben-tabs">
        {TABS.map((tab) => (
          <button
            type="button"
            className={tab.label === "Freigaben" ? "fg-tab active" : "fg-tab"}
            key={tab.label}
          >
            <Icon src={tab.icon} size={24} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="freigaben-stats">
        <StatCard label="Offen" value={count("offen")} icon={a.onhold} />
        <StatCard label="Zurückgesetzt" value={count("abgelehnt")} icon={a.revertDark} />
        <StatCard label="Abgeschl." value={count("abgeschlossen")} icon={a.confirm} />
      </div>

      <div className="freigaben-toolbar">
        <button type="button" className="export-btn">
          <Icon src={a.download} size={18} />
          Export
        </button>
      </div>

      <div className="req-table" role="table" aria-label="Freigabeanforderungen">
        <div className="req-head" role="row">
          {COLUMNS.map((column) => (
            <div className="req-th" role="columnheader" key={column}>
              <span className="req-th-top">
                {column}
                {GLYPH_COLUMNS.has(column) ? (
                  <img className="col-filter" src={a.colFilter} alt="" width={34} height={34} />
                ) : null}
              </span>
              <input className="col-input" aria-label={`${column} filtern`} />
            </div>
          ))}
        </div>

        {rows.map((row) => (
          <div className="req-row" role="row" key={row.id}>
            <PartnerCell row={row} />

            <div className="cell type-cell">
              {row.types.map((type) => (
                <span className="type-tag" key={type}>
                  {type}
                </span>
              ))}
            </div>

            <div className="cell art-cell">
              <p>
                {row.art}
                <br />
                {row.schritt}
              </p>
            </div>

            <div className="cell requester-cell">
              <span className="requester-avatar">
                <img src={row.requester.photo} alt="" />
              </span>
              <span className="requester-copy">
                <strong>{row.requester.name}</strong>
                <small>{row.requester.role}</small>
              </span>
              <button type="button" className="cell-open" aria-label="Mitarbeiter öffnen">
                <Icon src={a.openTab} size={15} />
              </button>
            </div>

            <div className="cell date-cell">
              <p>
                {row.date}
                <br />
                {row.time}
              </p>
            </div>

            <div className="cell status-cell">
              <StatusPill status={row.status} />
              {row.status === "offen" ? (
                <button type="button" className="start-btn" onClick={() => onStart(row)}>
                  Freigabe starten
                </button>
              ) : (
                <button type="button" className="status-meta" onClick={() => onStart(row)}>
                  {row.decided}
                </button>
              )}
            </div>

            <div className="cell comment-cell">
              <span>{row.comment ?? row.note}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
