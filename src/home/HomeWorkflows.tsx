import { Fragment, useMemo, useState } from "react";
import * as a from "../assets/index";
import { WORKFLOW_STEPS, invoiceNumberOf, workflowStepIndex } from "../honorar/invoiceCells";
import { useHonorar } from "../honorar/store";
import { formatDay } from "../lib/honorar/format";
import { partnerOf } from "../lib/honorar/queries";
import { StatusPill } from "../manager/FreigabenPanel";
import {
  ADVISOR_REQUESTS,
  DEMO_REQUESTS,
  STAMMDATEN_REQUESTS,
  groupRequestRows,
  liveMaklerRows,
  statusOfGroup,
  stepOf,
  STEP_LABEL,
  type RequestRow,
  type RequestStatus,
} from "../manager/requests";
import { ROLE_USER } from "../mocks/honorar/seed";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";

/** The signed-in Honorarverwalter: "Meine Workflows" are the ones she started, "Mit mir" the ones waiting on her. */
const ME = ROLE_USER.backoffice;

type Person = { name: string; photo?: string };
type StepState = RequestStatus | "wartet";

/** Under a workflow row only its To-Dos and the workflows linked to it - never the workflow's own steps. */
type Linked = {
  id: string;
  kind: "To-Do" | "Workflow";
  title: string;
  detail?: string;
  state: StepState;
  owner?: Person;
  open: () => void;
};

type Flow = {
  id: string;
  title: string;
  due?: string;
  overdue: boolean;
  category: { label: string; icon: string };
  step: string;
  partner: { name: string; company: boolean };
  tag: string;
  owner: Person;
  status: RequestStatus;
  mine: boolean;
  withMe: boolean;
  linked: Linked[];
  open: () => void;
};

type SideFilter = "Alle" | "Workflows" | "To-Dos" | "Projekte";
type Chip = "Meine Workflows" | "Mit mir" | "In Beobachtung";
type StatusFilter = "Alle" | RequestStatus;

const COLUMNS = ["Titel", "Fälligkeit", "Kategorie", "Schritt", "Partner & Tags", "Bearb.", "Status"] as const;
type Column = (typeof COLUMNS)[number];

const STATUS_LABEL: Record<StatusFilter, string> = {
  Alle: "Status (Alle)",
  offen: "Status (Offen)",
  abgelehnt: "Status (Zurückgesetzt)",
  abgeschlossen: "Status (Fertig)",
};

/** "Lucy Dallon" -> "DALU": two letters of the last name, two of the first, as in Figma's Bearb. column. */
function personCode(name: string) {
  const parts = name.split(" ").filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? first;
  return `${last.slice(0, 2)}${first.slice(0, 2)}`.toUpperCase();
}

function PersonBadge({ person }: { person: Person }) {
  return (
    <span className="hw-person" title={person.name}>
      {person.photo ? (
        <img src={person.photo} alt="" width={24} height={24} />
      ) : (
        <span className="hw-initials" aria-hidden>
          {person.name.slice(0, 1)}
        </span>
      )}
      {personCode(person.name)}
    </span>
  );
}

function StatePill({ state, overdue = false }: { state: StepState; overdue?: boolean }) {
  if (state === "wartet") return <span className="status-pill hw-waiting">wartet</span>;
  if (state === "offen" && overdue) {
    return (
      <span className="status-pill hw-overdue">
        <Icon src={a.hnAttention} size={14} />
        offen
      </span>
    );
  }
  return <StatusPill status={state} short />;
}

const PHOTOS: Record<string, string> = { [ROLE_USER.advisor]: a.reqMike };

/**
 * Planner › Workflows & To-Dos (Figma "Workflows"): every workflow as a row; To-Dos and linked workflows fold out under it.
 * Covers every invoice workflow of Einzelfaktura plus the Maklervereinbarung and Stammdaten requests.
 */
export function HomeWorkflows() {
  const { state } = useHonorar();
  const {
    openRechnungWorkflow,
    openFreigabe,
    approvalOf,
    docSigner,
    requestedAt,
    requestNote,
    decisionNote,
    comments,
  } = useWorkflow();
  const [side, setSide] = useState<SideFilter>("Workflows");
  const [chip, setChip] = useState<Chip | null>("Meine Workflows");
  const [status, setStatus] = useState<StatusFilter>("Alle");
  const [filters, setFilters] = useState<Partial<Record<Column, string>>>({});
  const [expanded, setExpanded] = useState<string[]>([]);

  const flows = useMemo<Flow[]>(() => {
    const list: Flow[] = [];

    // Invoice workflows: Antrag (Kundenberater), Freigabe (Bestandsmanager), Verbuchung (Honorarverwalter).
    for (const fee of state.fees) {
      const correction = fee.correction;
      if (!correction) continue;
      const partner = partnerOf(state, fee.partnerId);
      const index = workflowStepIndex(correction);
      const booked = correction.status === "verbucht";
      const rejected = correction.status === "abgelehnt";
      const holders = [partner?.advisor ?? ROLE_USER.advisor, ROLE_USER.head, ROLE_USER.backoffice];
      const current = booked ? 2 : Math.min(index, 2);
      const owner = { name: booked ? correction.bookedBy ?? ME : holders[current], photo: PHOTOS[holders[current]] };
      const number = invoiceNumberOf(fee) ?? "";
      const open = () => openRechnungWorkflow(fee.id);
      list.push({
        id: `rechnung-${fee.id}`,
        title: `${correction.workflow} ${number.replace("RE", "")}`,
        due: fee.dueDate,
        overdue: !booked && fee.dueDate < state.today,
        category: { label: "Rechnung", icon: a.docList },
        step: booked ? "Verbucht" : rejected ? "Antrag abgelehnt" : `${WORKFLOW_STEPS[current].label} offen`,
        partner: { name: partner?.name ?? "Partner", company: partner?.type === "company" },
        tag: `WF: ${correction.workflow} · ${number}`,
        owner,
        status: booked ? "abgeschlossen" : rejected ? "abgelehnt" : "offen",
        mine: correction.startedBy === ME,
        withMe: !booked && !rejected && holders[current] === ME,
        linked: [],
        open,
      });
    }

    // Maklervereinbarung and Stammdaten: one row per workflow.
    const rows: RequestRow[] = [
      ...liveMaklerRows({ approvalOf, docSigner, requestedAt, requestNote, decisionNote, comments }),
      ...DEMO_REQUESTS,
      ...ADVISOR_REQUESTS,
      ...STAMMDATEN_REQUESTS,
    ];
    for (const group of groupRequestRows(rows)) {
      const lead = group[0];
      if (group.every((row) => row.pending)) continue;
      const stammdaten = lead.kind === "stammdaten";
      const waiting = group.find((row) => !row.pending && row.status === "offen") ?? group.find((row) => !row.pending) ?? lead;
      const reviewer = lead.reviewer ?? { name: "Bestandsmanager", photo: undefined };
      list.push({
        id: `request-${lead.group}`,
        title: lead.art,
        overdue: false,
        category: stammdaten
          ? { label: "Stammdaten", icon: a.stammdaten }
          : { label: "Maklervereinbarung", icon: a.iconBrokerContract },
        step: waiting.stepLabel ?? (stammdaten ? waiting.schritt : STEP_LABEL[stepOf(waiting)]),
        partner: { name: lead.partner.name, company: lead.partner.kind === "company" },
        tag: `WF: ${lead.art}`,
        owner: { name: reviewer.name, photo: reviewer.photo },
        status: statusOfGroup(group),
        mine: lead.requester.name === ME,
        withMe: false,
        linked: [],
        open: () => openFreigabe(waiting.id),
      });
    }
    return list;
  }, [state, approvalOf, docSigner, requestedAt, requestNote, decisionNote, comments, openRechnungWorkflow, openFreigabe]);

  const textOf = (flow: Flow): Record<Column, string> => ({
    Titel: `${flow.title} ${flow.linked.map((entry) => entry.title).join(" ")}`,
    Fälligkeit: flow.due ? formatDay(flow.due) : "",
    Kategorie: flow.category.label,
    Schritt: flow.step,
    "Partner & Tags": `${flow.partner.name} ${flow.tag}`,
    "Bearb.": `${flow.owner.name} ${personCode(flow.owner.name)}`,
    Status: flow.status,
  });

  const visible = flows.filter((flow) => {
    if (chip === "Meine Workflows" && !flow.mine) return false;
    if (chip === "Mit mir" && !flow.withMe) return false;
    if (chip === "In Beobachtung" && (flow.mine || flow.withMe)) return false;
    if (status !== "Alle" && flow.status !== status) return false;
    const text = textOf(flow);
    return COLUMNS.every((column) => !filters[column] || text[column].toLowerCase().includes(filters[column]!.toLowerCase()));
  });
  const todos = visible.flatMap((flow) =>
    flow.linked.filter((entry) => entry.kind === "To-Do").map((step) => ({ flow, step })),
  );
  const counts: Record<SideFilter, number> = {
    Alle: visible.length + todos.length,
    Workflows: visible.length,
    "To-Dos": todos.length,
    Projekte: 0,
  };
  const sideIcons: Record<SideFilter, string> = {
    Alle: a.dashboard,
    Workflows: a.moduleWorkflow,
    "To-Dos": a.tickList,
    Projekte: a.folder,
  };

  function toggle(id: string) {
    setExpanded((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }

  const flowRow = (flow: Flow) => {
    const open = expanded.includes(flow.id);
    return (
      <Fragment key={flow.id}>
        <div className="req-row hw-row" role="row" onClick={flow.open}>
          <div className="cell hw-title">
            <Icon src={a.moduleWorkflow} size={20} />
            <span className="hw-title-copy">
              <strong>{flow.title}</strong>
              {flow.linked.length > 0 ? (
                <button
                  type="button"
                  className="hw-more"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(flow.id);
                  }}
                >
                  +{flow.linked.length} {flow.linked.length === 1 ? "weiteres" : "weitere"}
                </button>
              ) : null}
            </span>
            {flow.linked.length > 0 ? (
              <button
                type="button"
                className={open ? "hw-chevron open" : "hw-chevron"}
                aria-expanded={open}
                aria-label={open ? "Zuklappen" : "Aufklappen"}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle(flow.id);
                }}
              >
                <Icon src={a.chevronDark} size={14} />
              </button>
            ) : null}
          </div>
          <div className="cell">
            {flow.due ? (
              <span className="hw-due">
                <Icon src={a.calendar} size={16} />
                {formatDay(flow.due)}
              </span>
            ) : null}
          </div>
          <div className="cell hw-category">
            <Icon src={flow.category.icon} size={16} />
            {flow.category.label}
          </div>
          <div className="cell hw-step">{flow.step}</div>
          <div className="cell hw-partner">
            <span>
              <img src={flow.partner.company ? a.companyBlank : a.clientBlank} alt="" width={18} height={18} />
              {flow.partner.name}
            </span>
            <span className="hw-tag">
              <Icon src={a.moduleWorkflow} size={14} />
              {flow.tag}
            </span>
          </div>
          <div className="cell">
            <PersonBadge person={flow.owner} />
          </div>
          <div className="cell hw-status">
            <StatePill state={flow.status} overdue={flow.overdue} />
          </div>
        </div>
        {open
          ? flow.linked.map((step, index) => (
              <div
                className={index === flow.linked.length - 1 ? "req-row hw-row hw-child last" : "req-row hw-row hw-child"}
                role="row"
                key={step.id}
                onClick={step.open}
              >
                <div className="cell hw-title">
                  <span className="hw-elbow" aria-hidden />
                  <Icon src={step.kind === "To-Do" ? a.tickList : a.moduleWorkflow} size={18} />
                  <span className="hw-title-copy">
                    <span>{step.title}</span>
                    {step.detail ? <small>{step.detail}</small> : null}
                  </span>
                </div>
                <div className="cell" />
                <div className="cell hw-category">
                  <Icon src={flow.category.icon} size={16} />
                  {flow.category.label}
                </div>
                <div className="cell hw-step">{step.kind}</div>
                <div className="cell hw-partner">
                  <span>
                    <img src={flow.partner.company ? a.companyBlank : a.clientBlank} alt="" width={18} height={18} />
                    {flow.partner.name}
                  </span>
                </div>
                <div className="cell">{step.owner ? <PersonBadge person={step.owner} /> : null}</div>
                <div className="cell hw-status">
                  <StatePill state={step.state} />
                </div>
              </div>
            ))
          : null}
      </Fragment>
    );
  };

  const todoRow = ({ flow, step }: (typeof todos)[number]) => (
    <div className="req-row hw-row" role="row" key={step.id} onClick={step.open}>
      <div className="cell hw-title">
        <Icon src={a.tickList} size={18} />
        <span className="hw-title-copy">
          <strong>{step.title}</strong>
          <small>{flow.title}</small>
        </span>
      </div>
      <div className="cell">
        {flow.due ? (
          <span className="hw-due">
            <Icon src={a.calendar} size={16} />
            {formatDay(flow.due)}
          </span>
        ) : null}
      </div>
      <div className="cell hw-category">
        <Icon src={flow.category.icon} size={16} />
        {flow.category.label}
      </div>
      <div className="cell hw-step">{step.detail ?? ""}</div>
      <div className="cell hw-partner">
        <span>
          <img src={flow.partner.company ? a.companyBlank : a.clientBlank} alt="" width={18} height={18} />
          {flow.partner.name}
        </span>
        <span className="hw-tag">
          <Icon src={a.moduleWorkflow} size={14} />
          {flow.tag}
        </span>
      </div>
      <div className="cell">{step.owner ? <PersonBadge person={step.owner} /> : null}</div>
      <div className="cell hw-status">
        <StatePill state={step.state} overdue={flow.overdue} />
      </div>
    </div>
  );

  const heading =
    side === "To-Dos" ? `${todos.length} To-Dos` : side === "Projekte" ? "0 Projekte" : `${visible.length} Workflows`;

  return (
    <div className="hw-layout">
      <aside className="hw-side">
        <div className="hw-side-head">
          <img src={a.avatar} alt="" width={36} height={36} />
          <span>
            <strong>Workflows & To-Dos</strong>
            <small>Meine ({ME})</small>
          </span>
          <Icon src={a.chevronDark} size={16} />
        </div>
        <div className="hw-side-list">
          {(Object.keys(counts) as SideFilter[]).map((item) => (
            <button
              type="button"
              key={item}
              className={side === item ? "hw-side-item active" : "hw-side-item"}
              onClick={() => setSide(item)}
            >
              <Icon src={sideIcons[item]} size={18} />
              {item}
              <span className="hw-count">{counts[item]}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="hw-main">
        <header className="hw-head">
          <div>
            <strong>Workflows</strong>
            <small>Übersicht</small>
          </div>
          <div className="hw-head-actions">
            <button type="button" className="hw-add">
              <Icon src={a.moduleWorkflow} size={22} />
              Workflow
              <br />
              Hinzufügen
            </button>
            <button type="button" className="hw-search" aria-label="Suchen">
              <Icon src={a.searchDark} size={20} />
            </button>
          </div>
        </header>

        <div className="hw-body">
          <div className="hw-toolbar">
            <h2>{heading}</h2>
            <div className="hw-chips">
              {(["Meine Workflows", "Mit mir", "In Beobachtung"] as Chip[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  aria-pressed={chip === item}
                  className={chip === item ? "hw-chip active" : "hw-chip"}
                  onClick={() => setChip(chip === item ? null : item)}
                >
                  {chip === item ? "✓ " : ""}
                  {item}
                </button>
              ))}
              <label className="hw-chip hw-select">
                <select
                  aria-label="Status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as StatusFilter)}
                >
                  {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((item) => (
                    <option value={item} key={item}>
                      {STATUS_LABEL[item]}
                    </option>
                  ))}
                </select>
                <Icon src={a.chevronDark} size={14} />
              </label>
            </div>
          </div>

          <div className="hw-scroll">
            <div className="req-table hw-table" role="table" aria-label="Workflows">
              <div className="req-head" role="row">
                {COLUMNS.map((column) => (
                  <div className="req-th" role="columnheader" key={column}>
                    <span className="req-th-top">
                      {column}
                      <img className="col-filter" src={a.colFilter} alt="" width={34} height={34} />
                    </span>
                    <input
                      className="col-input"
                      aria-label={`${column} filtern`}
                      value={filters[column] ?? ""}
                      onChange={(event) => setFilters((current) => ({ ...current, [column]: event.target.value }))}
                    />
                  </div>
                ))}
              </div>

              {side === "Projekte" ? (
                <p className="atab-empty center">Noch keine Projekte.</p>
              ) : side === "To-Dos" ? (
                todos.map(todoRow)
              ) : (
                visible.map(flowRow)
              )}
              {side !== "Projekte" && (side === "To-Dos" ? todos.length === 0 : visible.length === 0) ? (
                <p className="atab-empty center">Keine Einträge für diesen Filter.</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
