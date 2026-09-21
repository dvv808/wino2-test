import { useState } from "react";
import * as a from "../assets/index";
import { StatCard, StatusPill } from "../manager/FreigabenPanel";
import {
  STEP_LABEL,
  STEP_POSITION,
  groupRequestRows,
  liveMaklerRows,
  liveStammdatenDraftRows,
  reviewerOf,
  statusOfGroup,
  stepOf,
  type RequestRow,
  type RequestStatus,
} from "../manager/requests";
import { FILE_PARTNERS } from "./partners";
import { ContextMenu, Icon } from "../ui";
import { useWorkflow } from "../workflow";

const TABS = [
  { id: "workflows" as const, label: "Workflows", icon: a.request },
  { id: "todos" as const, label: "To-Dos", icon: a.todo },
];

type ListTab = (typeof TABS)[number]["id"];

const COLUMNS = [
  "Partner",
  "Partner Typ",
  "Art / Schritt",
  "Angefordert an",
  "Angeford. am",
  "Kommentare",
  "Status",
];

const GLYPH_COLUMNS = new Set(["Art / Schritt", "Angefordert an", "Angeford. am", "Kommentare", "Status"]);

function Reviewer({ row }: { row: RequestRow }) {
  const person = reviewerOf(row);
  return (
    <>
      <span className="requester-avatar">
        <img src={person.photo} alt="" />
      </span>
      <span className="requester-copy">
        <strong>{person.name}</strong>
        <small>{person.role}</small>
      </span>
    </>
  );
}

function SubRow({
  row,
  last,
  onView,
}: {
  row: RequestRow;
  last: boolean;
  onView: (row: RequestRow) => void;
}) {
  const draft = Boolean(row.stammdatenArea);
  const step = row.step ?? (draft ? undefined : stepOf(row));
  const label = row.stepLabel ?? (step ? STEP_LABEL[step] : row.schritt);
  const position = row.stepPosition ?? (step ? STEP_POSITION[step] : undefined);
  const edge = last ? " last" : "";

  return (
    <div className={`req-sub${edge}`} role="row" onClick={() => onView(row)}>
      <span className={`req-link${edge}`} aria-hidden="true" />

      <div className="subcell art-cell">
        <p>
          {label}
          {position ? <small>{position}</small> : null}
        </p>
      </div>

      <div className="subcell requester-cell">
        {row.pending || draft ? null : <Reviewer row={row} />}
      </div>

      <div className="subcell date-cell">
        {draft ? (
          <p className="muted">Entwurf gespeichert</p>
        ) : row.pending ? (
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
        {row.pending || draft ? null : (
          <>
            <img src={a.comment} alt="" width={17} height={18} />
            <span>
              {row.commentCount ?? 0} {row.commentCount === 1 ? "Kommentar" : "Kommentare"}
            </span>
          </>
        )}
      </div>

      <div className="subcell status-cell">
        {draft ? (
          <StatusPill status="offen" />
        ) : row.pending ? null : (
          <>
            <StatusPill status={row.status} short />
            {row.status === "offen" ? (
              <span className="wait-label">Warte auf Freigabe</span>
            ) : (
              <button type="button" className="status-meta" onClick={() => onView(row)}>
                {row.decided}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WorkflowRow({
  rows,
  open,
  onToggle,
  onView,
}: {
  rows: RequestRow[];
  open: boolean;
  onToggle: () => void;
  onView: (row: RequestRow) => void;
}) {
  const [lead] = rows;
  const { partner } = lead;
  const entry = rows.find((row) => !row.pending) ?? lead;
  const done = rows.every((row) => !row.pending && row.status === "abgeschlossen");
  const comments = rows.reduce((sum, row) => sum + (row.commentCount ?? 0), 0);

  return (
    <div className="req-row" role="row" onClick={() => onView(entry)}>
      <div className="cell partner-cell">
        <button
          type="button"
          className={open ? "req-toggle open" : "req-toggle"}
          aria-expanded={open}
          aria-label={open ? "Freigaben zuklappen" : "Freigaben aufklappen"}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
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

        <button
          type="button"
          className="cell-open"
          aria-label={`${partner.name} öffnen`}
          onClick={(event) => {
            event.stopPropagation();
            onView(entry);
          }}
        >
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
            <Reviewer row={lead} />
            <button
              type="button"
              className="cell-open"
              aria-label="Bestandsmanager öffnen"
              onClick={(event) => {
                event.stopPropagation();
                onView(entry);
              }}
            >
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
            <button
              type="button"
              className="status-meta"
              onClick={(event) => {
                event.stopPropagation();
                onView(entry);
              }}
            >
              {rows[rows.length - 1].decided}
            </button>
          </>
        ) : null}

        <div onClick={(event) => event.stopPropagation()}>
          <ContextMenu
            label={`Aktionen für ${partner.name}`}
            items={[{ label: "View", icon: a.eye, onSelect: () => onView(entry) }]}
          />
        </div>
      </div>
    </div>
  );
}

export function WorkflowsPage() {
  const {
    approvalOf,
    docSigner,
    requestedAt,
    requestNote,
    decisionNote,
    comments,
    goTo,
    openMakler,
    openStammdaten,
    filePartnerId,
    sections,
    personName,
    ashleyConverted,
  } = useWorkflow();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [tab, setTab] = useState<ListTab>("workflows");

  const file = FILE_PARTNERS[filePartnerId];
  const stammdatenRows = liveStammdatenDraftRows({
    sections,
    partner: { name: personName, meta: file.born, kind: "person" },
    types: filePartnerId === "ashley" && !ashleyConverted ? [] : ["Interessent"],
  });
  const maklerRows =
    filePartnerId === "julia"
      ? liveMaklerRows({
          approvalOf,
          docSigner,
          requestedAt,
          requestNote,
          decisionNote,
          comments,
        })
      : [];
  const rows = tab === "todos" ? stammdatenRows : [...maklerRows, ...stammdatenRows];
  const groups = groupRequestRows(rows);
  const count = (status: RequestStatus) =>
    groups.filter((group) => statusOfGroup(group) === status).length;

  function toggle(key: string) {
    setCollapsed((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key],
    );
  }

  function openRequest(row: RequestRow) {
    if (row.stammdatenArea) {
      openStammdaten(row.stammdatenArea, row.stammdatenCardId);
      return;
    }
    goTo(row.step ?? stepOf(row));
    openMakler();
  }

  return (
    <div className="pp-body workflows">
      <section className="freigaben">
        <h1 className="freigaben-title">
          <Icon src={a.workflow} size={18} />
          Workflows &amp; To-Dos
        </h1>

        <div className="freigaben-tabs">
          {TABS.map((entry) => (
            <button
              type="button"
              className={entry.id === tab ? "fg-tab active" : "fg-tab"}
              key={entry.id}
              onClick={() => setTab(entry.id)}
            >
              <Icon src={entry.icon} size={24} />
              {entry.label}
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

        <div className="req-table" role="table" aria-label="Eigene Freigabeanforderungen">
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
                  onView={openRequest}
                />

                {open
                  ? group.map((row, index) => (
                      <SubRow
                        row={row}
                        last={index === group.length - 1}
                        key={row.id}
                        onView={openRequest}
                      />
                    ))
                  : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
