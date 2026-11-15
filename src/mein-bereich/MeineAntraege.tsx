import { useEffect, useState } from "react";
import * as a from "../assets/index";
import { DmsTable, type DmsColumn } from "../dms/ui";
import { Icon } from "../ui";
import { hhmm, parseIso } from "../home/calendar/calendarData";
import { GENEHMIGER, focusAntrag, loadAntraege, onAntraegeChange, type HomeofficeAntrag } from "../home/calendar/homeoffice";
import { useWorkflow } from "../workflow";

/**
 * Mein Bereich → Listen (Figma 17685:117446): what I asked for. "Anträge" lists the own requests – Homeoffice
 * live from the Kalender, Urlaub and Krank as demo rows. The other list tabs follow.
 */

type ListTab = "antraege" | "zeit" | "reisen" | "weiterbildungen" | "gespraeche";

const TABS: { id: ListTab; label: string; icon: string }[] = [
  { id: "antraege", label: "Anträge", icon: a.aktRequest },
  { id: "zeit", label: "Zeitübersichten", icon: a.aktClock },
  { id: "reisen", label: "Reisen", icon: a.mbCar },
  { id: "weiterbildungen", label: "Weiterbildungen", icon: a.mbEducation },
  { id: "gespraeche", label: "Mitarbeitergespräche", icon: a.comment },
];

type Art = "Homeoffice" | "Urlaub" | "Dienstverh. Arzt" | "Dienstverh. Sonstiges" | "Krank";
type Status = "beantragt" | "genehmigt" | "zurueckgesetzt";

type Antrag = {
  id: string;
  art: Art;
  /** Sort key (ISO day). */
  day: string;
  datum: string;
  zeit: string;
  /** When I sent it: date and time. */
  beantragt: { datum: string; zeit: string };
  status: Status;
  kommentar?: string;
  /** Homeoffice: the request in the Kalender. */
  homeofficeId?: string;
};

const ART_ICON: Record<Art, string> = {
  Homeoffice: a.hoDot,
  Urlaub: a.mbUrlaub,
  "Dienstverh. Arzt": a.mbOffline,
  "Dienstverh. Sonstiges": a.mbOffline,
  Krank: a.mbOffline,
};

/** Status cards come first: Beantragt (clock) and Genehmigt (tick). They filter the list by status. */
type StatusFilter = Status;
const STATUS_STATS: { status: StatusFilter; label: string; icon: string; activeIcon?: string }[] = [
  { status: "beantragt", label: "Beantragt", icon: a.antOnhold },
  { status: "genehmigt", label: "Genehmigt", icon: a.antConfirm },
  // Revert arrow: dark on the light card, white on the selected (dark) card.
  { status: "zurueckgesetzt", label: "Zurückgesetzt", icon: a.antRevertDark, activeIcon: a.antRefresh },
];


const STATUS_LABEL: Record<Status, string> = { beantragt: "Beantragt", genehmigt: "Genehmigt", zurueckgesetzt: "Zurückgesetzt" };

const pad = (n: number) => String(n).padStart(2, "0");
const dmy = (day: string) => {
  const d = parseIso(day);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};
/** "4h 30m" */
const stamp = (isoTime: string) => {
  const d = new Date(isoTime);
  return { datum: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`, zeit: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
};
const span = (min: number) => `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}`;

function homeofficeRows(antraege: HomeofficeAntrag[]): Antrag[] {
  return antraege.map((x) => ({
    id: x.id,
    art: "Homeoffice",
    day: x.day,
    datum: dmy(x.day),
    zeit: `${hhmm(x.start)} - ${hhmm(x.end)} (${span(x.end - x.start)})`,
    beantragt: stamp(x.beantragt),
    homeofficeId: x.id,
    status: x.status === "offen" ? "beantragt" : x.status,
    kommentar:
      x.status === "offen"
        ? x.kommentar
        : [`${STATUS_LABEL[x.status]} von ${x.entschiedenVon ?? GENEHMIGER.name}`, x.entscheidNotiz].filter(Boolean).join(": "),
  }));
}

/** The two rows of the Figma frame. */
const DEMO: Antrag[] = [
  { id: "urlaub-1", art: "Urlaub", day: "2026-01-01", datum: "01.01.2026", zeit: "09:00 - 11:30 (2h 30m)", beantragt: { datum: "12.12.2025", zeit: "10:14" }, status: "beantragt" },
  {
    id: "krank-1",
    art: "Krank",
    day: "2026-05-03",
    datum: "03.05.2026 - 07.05.2026",
    zeit: "4 Tage 4 Stunden",
    beantragt: { datum: "03.05.2026", zeit: "07:42" },
    status: "beantragt",
  },
  {
    id: "urlaub-2",
    art: "Urlaub",
    day: "2026-08-10",
    datum: "10.08.2026 - 21.08.2026",
    zeit: "10 Tage",
    beantragt: { datum: "02.06.2026", zeit: "09:20" },
    status: "genehmigt",
    kommentar: "Genehmigt von Thomas Winter",
  },
  {
    id: "arzt-1",
    art: "Dienstverh. Arzt",
    day: "2026-10-21",
    datum: "21.10.2026",
    zeit: "14:00 - 16:00 (2h)",
    beantragt: { datum: "15.10.2026", zeit: "11:05" },
    status: "zurueckgesetzt",
    kommentar: "Zurückgesetzt von Thomas Winter: Bitte die Terminbestätigung als Anhang hinzufügen.",
  },
];

function StatusPill({ status }: { status: Status }) {
  const tone = status === "beantragt" ? "open" : status === "genehmigt" ? "done" : "rejected";
  const icon = status === "beantragt" ? a.onhold : status === "genehmigt" ? a.confirm : a.revert;
  return (
    <span className={`status-pill ${tone}`}>
      <Icon src={icon} size={16} />
      {STATUS_LABEL[status]}
    </span>
  );
}

const COLUMNS: DmsColumn<Antrag>[] = [
  {
    key: "art",
    label: "Antragsart",
    width: "minmax(240px, 240fr)",
    text: (r) => r.art,
    render: (r) => (
      <span className="mb-ant-art">
        <img src={ART_ICON[r.art]} alt="" width={r.art === "Homeoffice" ? 11 : 16} height={r.art === "Homeoffice" ? 11 : 16} />
        {r.art}
      </span>
    ),
  },
  {
    key: "datum",
    label: "Datum & Uhrzeit",
    width: "minmax(260px, 260fr)",
    text: (r) => `${r.datum} ${r.zeit}`,
    render: (r) => (
      <span className="mb-ant-when">
        <span>
          <img src={a.calendar} alt="" width={14} height={13} />
          {r.datum}
        </span>
        <span>
          <img src={a.aktClock} alt="" width={14} height={14} />
          {r.zeit}
        </span>
      </span>
    ),
  },
  {
    key: "beantragt",
    label: "Beantragt am",
    width: "minmax(180px, 180fr)",
    text: (r) => `${r.beantragt.datum} ${r.beantragt.zeit}`,
    render: (r) => (
      <span className="mb-ant-when">
        <span>
          <img src={a.calendar} alt="" width={14} height={13} />
          {r.beantragt.datum}
        </span>
        <span>
          <img src={a.aktClock} alt="" width={14} height={14} />
          {r.beantragt.zeit} Uhr
        </span>
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    width: "minmax(150px, 150fr)",
    text: (r) => STATUS_LABEL[r.status],
    render: (r) => <StatusPill status={r.status} />,
  },
  {
    key: "kommentar",
    label: "Kommentar",
    width: "minmax(260px, 260fr)",
    text: (r) => r.kommentar ?? "",
    render: (r) => <span className="mb-ant-note">{r.kommentar || "-"}</span>,
  },
];

export function MeineListen() {
  const { openHome } = useWorkflow();
  const [tab, setTab] = useState<ListTab>("antraege");
  const [homeoffice, setHomeoffice] = useState(loadAntraege);
  useEffect(() => onAntraegeChange(setHomeoffice), []);
  /** Figma: the list opens on the open requests ("Beantragt"); clicking the active status card again shows all. */
  const [status, setStatus] = useState<StatusFilter | null>("beantragt");
  /** Bumped by "Alle Filter zurücksetzen" so the table's column filters start empty again. */
  const [tableKey, setTableKey] = useState(0);

  const all = [...homeofficeRows(homeoffice), ...DEMO].sort((x, y) => y.day.localeCompare(x.day));
  // Only the two status cards filter; the Antragsart is filtered in its table column.
  const rows = all.filter((r) => !status || r.status === status);
  const countStatus = (key: StatusFilter) => all.filter((r) => r.status === key).length;

  return (
    <div className="content-shell mb-listen-body">
      <section className="freigaben mb-listen">
        <div className="freigaben-tabs mb-listen-tabs">
          {TABS.map((t) => (
            <button type="button" key={t.id} className={t.id === tab ? "fg-tab active" : "fg-tab"} onClick={() => setTab(t.id)}>
              <Icon src={t.icon} size={20} />
              {t.label}
            </button>
          ))}
        </div>

        {tab !== "antraege" ? (
          <p className="dms-empty">Diese Liste folgt.</p>
        ) : (
          <>
            <div className="mb-ant-stats">
              {STATUS_STATS.map((s) => {
                const active = status === s.status;
                return (
                  <button
                    type="button"
                    key={s.status}
                    className={`stat-card mb-ant-stat ${s.status}${active ? " active" : ""}`}
                    aria-pressed={active}
                    onClick={() => setStatus(active ? null : s.status)}
                  >
                    <span className="stat-copy">
                      <small>{s.label}</small>
                      <strong>{String(countStatus(s.status)).padStart(2, "0")}</strong>
                      <span>total</span>
                    </span>
                    <span className="stat-icon">
                      <img src={active && s.activeIcon ? s.activeIcon : s.icon} alt="" width={16} height={16} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Figma 17685:117446: the picked status as a bubble to click away, and the reset on the right. */}
            {status ? (
              <div className="mb-ant-filterbar">
                <button type="button" className="mb-ant-bubble" onClick={() => setStatus(null)}>
                  {STATUS_LABEL[status]}
                  <img src={a.iconCloseDark} alt={`Filter ${STATUS_LABEL[status]} entfernen`} width={12} height={12} />
                </button>
                <button
                  type="button"
                  className="mb-ant-reset"
                  onClick={() => {
                    setStatus(null);
                    setTableKey((key) => key + 1);
                  }}
                >
                  <img src={a.antRefresh} alt="" width={16} height={16} />
                  Alle Filter zurücksetzen
                </button>
              </div>
            ) : null}

            <DmsTable
              key={tableKey}
              rows={rows}
              columns={COLUMNS}
              rowKey={(r) => r.id}
              label="Meine Anträge"
              unit="Anträge"
              rowClass={(r) => `mb-ant-row ${r.status}${r.homeofficeId ? " to-calendar" : ""}`}
              onSelect={(r) => {
                // Homeoffice: jump to its day in the Kalender, with the request open.
                if (!r.homeofficeId) return;
                focusAntrag(r.homeofficeId);
                openHome("Planner", "Kalender");
              }}
              empty={<p className="dms-empty">{status === "beantragt"
                    ? "Keine offenen Anträge."
                    : status === "genehmigt"
                      ? "Keine genehmigten Anträge."
                      : status === "zurueckgesetzt"
                        ? "Keine zurückgesetzten Anträge."
                        : "Noch keine Anträge."}</p>}
            />
          </>
        )}
      </section>
    </div>
  );
}
