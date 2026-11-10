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

const STATS: { art: Art | "Gesamt"; label: string; icon: string }[] = [
  { art: "Gesamt", label: "Gesamt", icon: a.aktRequest },
  { art: "Homeoffice", label: "Homeoffice", icon: a.hoDot },
  { art: "Urlaub", label: "Urlaub", icon: a.mbHoliday },
  { art: "Dienstverh. Arzt", label: "Dienstverh. Arzt", icon: a.mbArzt },
  { art: "Dienstverh. Sonstiges", label: "Dienstverh. Sonstiges", icon: a.mbBlocked },
  { art: "Krank", label: "Krankenst.", icon: a.mbSickness },
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
  /** Figma: the list opens on the open requests ("Beantragt" chip); removing the chip shows all. */
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [art, setArt] = useState<Art | null>(null);

  const all = [...homeofficeRows(homeoffice), ...DEMO].sort((x, y) => y.day.localeCompare(x.day));
  const rows = all.filter((r) => (!onlyOpen || r.status === "beantragt") && (!art || r.art === art));
  const open = all.filter((r) => r.status === "beantragt");
  const count = (key: Art | "Gesamt") => open.filter((r) => key === "Gesamt" || r.art === key).length;

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
              {STATS.map((s) => {
                const active = s.art === "Gesamt" ? art === null : art === s.art;
                return (
                  <button
                    type="button"
                    key={s.art}
                    className={`stat-card mb-ant-stat${active ? " active" : ""}`}
                    aria-pressed={active}
                    onClick={() => setArt(s.art === "Gesamt" || art === s.art ? null : s.art)}
                  >
                    <span className="stat-copy">
                      <small>{s.label}</small>
                      <strong>{String(count(s.art)).padStart(2, "0")}</strong>
                      <span>beantragt</span>
                    </span>
                    <span className="stat-icon">
                      <img src={s.icon} alt="" width={16} height={16} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mb-ant-chips">
              {onlyOpen ? (
                <span className="mb-ant-chip">
                  Beantragt
                  <button type="button" aria-label="Filter Beantragt entfernen" onClick={() => setOnlyOpen(false)}>
                    <img src={a.iconCloseDark} alt="" width={8} height={8} />
                  </button>
                </span>
              ) : (
                <button type="button" className="mb-ant-chip add" onClick={() => setOnlyOpen(true)}>
                  Nur beantragte
                </button>
              )}
              {art ? (
                <span className="mb-ant-chip">
                  {art}
                  <button type="button" aria-label={`Filter ${art} entfernen`} onClick={() => setArt(null)}>
                    <img src={a.iconCloseDark} alt="" width={8} height={8} />
                  </button>
                </span>
              ) : null}
            </div>

            <DmsTable
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
              empty={<p className="dms-empty">{onlyOpen ? "Keine offenen Anträge." : "Noch keine Anträge."}</p>}
            />
          </>
        )}
      </section>
    </div>
  );
}
