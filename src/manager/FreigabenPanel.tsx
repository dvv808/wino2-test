import { useState } from "react";
import * as a from "../assets/index";
import { ContextMenu, Icon } from "../ui";
import {
  STEP_LABEL,
  STEP_POSITION,
  stepOf,
  type RequestRow,
  type RequestStatus,
} from "./requests";

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
  "Kommentare",
  "Status",
];

/** Only these columns carry the sort/filter glyph in the header. */
const GLYPH_COLUMNS = new Set([
  "Art / Schritt",
  "Angefordert von",
  "Angeford. am",
  "Kommentare",
  "Status",
]);

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
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

/**
 * A single Freigabe reads "Fertig" once it is through, while the workflow as a
 * whole reads "Abgeschlossen". `short` picks the former.
 */
export function StatusPill({ status, short }: { status: RequestStatus; short?: boolean }) {
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
      <span className={short ? "status-pill fertig" : "status-pill done"}>
        <Icon src={a.confirm} size={16} />
        {short ? "Fertig" : "Abgeschlossen"}
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

/** The requester's avatar, name and role, shared by the parent row and sub-rows. */
function Requester({ row }: { row: RequestRow }) {
  return (
    <>
      <span className="requester-avatar">
        <img src={row.requester.photo} alt="" />
      </span>
      <span className="requester-copy">
        <strong>{row.requester.name}</strong>
        <small>{row.requester.role}</small>
      </span>
    </>
  );
}

/**
 * One Freigabe of the workflow, drawn under the partner it belongs to. It only
 * reaches from the Art column rightwards; the elbow in the gutter ties it back
 * to the parent row.
 */
function SubRow({
  row,
  last,
  onStart,
}: {
  row: RequestRow;
  last: boolean;
  onStart: (row: RequestRow) => void;
}) {
  const step = stepOf(row);
  const edge = last ? " last" : "";

  return (
    <div className={`req-sub${edge}`} role="row">
      <span className={`req-link${edge}`} aria-hidden="true" />

      <div className="subcell art-cell">
        <p>
          {STEP_LABEL[step]}
          <small>{STEP_POSITION[step]}</small>
        </p>
      </div>

      <div className="subcell requester-cell">
        {row.pending ? null : <Requester row={row} />}
      </div>

      <div className="subcell date-cell">
        {row.pending ? (
          <p className="muted">Anforderung ausstehend</p>
        ) : (
          <p>
            {row.date}
            <br />
            {row.time}
          </p>
        )}
      </div>

      <div className="subcell comment-cell">
        {row.pending ? null : (
          <>
            {/* Sized from the icon's own 12.5 : 13.5 ratio, since it does not letterbox. */}
            <img src={a.comment} alt="" width={17} height={18} />
            <span>
              {row.commentCount ?? 0} {row.commentCount === 1 ? "Kommentar" : "Kommentare"}
            </span>
          </>
        )}
      </div>

      <div className="subcell status-cell">
        {row.pending ? null : (
          <>
            <StatusPill status={row.status} short />
            {row.status === "offen" ? (
              <button type="button" className="start-btn" onClick={() => onStart(row)}>
                Freigabe starten
              </button>
            ) : (
              <button type="button" className="status-meta" onClick={() => onStart(row)}>
                {row.decided}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The partner and its Maklervereinbarung. The aggregate columns stay empty
 * until every Freigabe of the workflow is through, which is when the row can
 * report one date, one comment total and one status.
 */
function WorkflowRow({
  rows,
  open,
  onToggle,
  onView,
  onDelete,
}: {
  rows: RequestRow[];
  open: boolean;
  onToggle: () => void;
  onView: (row: RequestRow) => void;
  onDelete: (row: RequestRow) => void;
}) {
  const [lead] = rows;
  const { partner } = lead;
  /* Opening the workflow lands on its first Freigabe that actually exists. */
  const entry = rows.find((row) => !row.pending) ?? lead;
  const done = rows.every((row) => !row.pending && row.status === "abgeschlossen");
  const comments = rows.reduce((sum, row) => sum + (row.commentCount ?? 0), 0);

  return (
    <div className="req-row" role="row">
      <div className="cell partner-cell">
        <button
          type="button"
          className={open ? "req-toggle open" : "req-toggle"}
          aria-expanded={open}
          aria-label={open ? "Freigaben zuklappen" : "Freigaben aufklappen"}
          onClick={onToggle}
        >
          <Icon src={a.chevronDark} size={18} />
        </button>

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

      <div className="cell type-cell">
        {lead.types.map((type) => (
          <span className="type-tag" key={type}>
            {type}
          </span>
        ))}
      </div>

      <div className="cell art-cell">
        <strong>{lead.art}</strong>
      </div>

      <div className="cell requester-cell">
        {done ? (
          <>
            <Requester row={lead} />
            <button type="button" className="cell-open" aria-label="Mitarbeiter öffnen">
              <Icon src={a.openTab} size={15} />
            </button>
          </>
        ) : null}
      </div>

      <div className="cell date-cell">
        {done ? (
          <p>
            {lead.date}
            <br />
            {lead.time}
          </p>
        ) : null}
      </div>

      <div className="cell comment-cell">
        {done ? (
          <>
            <img src={a.comment} alt="" width={19} height={20} />
            <span>
              {comments} {comments === 1 ? "Kommentar" : "Kommentare"}
            </span>
          </>
        ) : null}
      </div>

      <div className="cell status-cell">
        {done ? (
          <>
            <StatusPill status="abgeschlossen" />
            <button type="button" className="status-meta" onClick={() => onView(entry)}>
              {rows[rows.length - 1].decided}
            </button>
          </>
        ) : null}

        <ContextMenu
          label={`Aktionen für ${partner.name}`}
          items={[
            { label: "View", icon: a.eye, onSelect: () => onView(entry) },
            { label: "Löschen", icon: a.trash, danger: true, onSelect: () => onDelete(lead) },
          ]}
        />
      </div>
    </div>
  );
}

/** Splits the flat request list into one entry per Maklervereinbarung. */
function groupRows(rows: RequestRow[]) {
  const groups: RequestRow[][] = [];
  const byKey = new Map<string, RequestRow[]>();

  for (const row of rows) {
    const existing = byKey.get(row.group);
    if (existing) {
      existing.push(row);
      continue;
    }

    const group = [row];
    groups.push(group);
    byKey.set(row.group, group);
  }

  return groups;
}

/** A workflow counts as one entry in the stat cards, not one per Freigabe. */
function statusOf(rows: RequestRow[]): RequestStatus {
  if (rows.some((row) => row.status === "abgelehnt")) return "abgelehnt";
  if (rows.every((row) => !row.pending && row.status === "abgeschlossen")) return "abgeschlossen";
  return "offen";
}

export function FreigabenPanel({
  rows,
  onStart,
  onView,
  onDelete,
}: {
  rows: RequestRow[];
  onStart: (row: RequestRow) => void;
  onView: (row: RequestRow) => void;
  onDelete: (row: RequestRow) => void;
}) {
  const groups = groupRows(rows);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const count = (status: RequestStatus) =>
    groups.filter((group) => statusOf(group) === status).length;

  function toggle(key: string) {
    setCollapsed((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key],
    );
  }

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

        {groups.map((group) => {
          const key = group[0].group;
          const open = !collapsed.includes(key);

          return (
            <div className={open ? "req-group" : "req-group closed"} role="rowgroup" key={key}>
              <WorkflowRow
                rows={group}
                open={open}
                onToggle={() => toggle(key)}
                onView={onView}
                onDelete={onDelete}
              />

              {open
                ? group.map((row, index) => (
                    <SubRow
                      row={row}
                      last={index === group.length - 1}
                      key={row.id}
                      onStart={onStart}
                    />
                  ))
                : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
