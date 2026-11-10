import { useEffect, useRef, useState } from "react";
import * as a from "../assets/index";
import { DmsTable, type DmsColumn } from "../dms/ui";
import { Icon, Snackbar } from "../ui";
import { hhmm, parseIso } from "../home/calendar/calendarData";
import { decide, loadAntraege, onAntraegeChange, saveAntraege, type HomeofficeAntrag } from "../home/calendar/homeoffice";
import { StatCard } from "./FreigabenPanel";

/**
 * Management → HRM → HRM Listen → Anträge (Figma section "MANAGEMENT - ANTRÄGE", 17588:78920).
 * HR decides every employee request with the status dropdown (17588:83957): Genehmigen, or Zurücksetzen –
 * the request is taken out and the employee is told to ask again, with the reason. A prompt sums up the
 * request first (18020:155530 / 18405:43774); afterwards a snackbar confirms it, with Rückgängig.
 * Homeoffice rows are live (Lucy's Kalender); the others are the demo rows of the Figma table.
 */

type HrStatus = "beantragt" | "zurueckgesetzt" | "genehmigt";
type Art = "Homeoffice" | "Urlaub" | "Krank" | "DV Arzt" | "DV Sonstiges";

type Person = { name: string; role: string; photo?: string };

type HrAntrag = {
  id: string;
  person: Person;
  art: Art;
  /** Sort key (ISO day). */
  day: string;
  datum: string;
  zeit: string;
  anhang: string[];
  status: HrStatus;
  /** The employee's own comment (DV Sonstiges and Homeoffice). */
  kommentar?: string;
  /** HR's note with the decision ("Status Kommentar"). */
  statusKommentar?: string;
  vertretung?: Person;
  homeofficeId?: string;
};

const STATUS_LABEL: Record<HrStatus, string> = { beantragt: "Beantragt", zurueckgesetzt: "Zurückgesetzt", genehmigt: "Genehmigt" };
const STATUS_ICON: Record<HrStatus, string> = { beantragt: a.hoOnhold, zurueckgesetzt: a.revertDark, genehmigt: a.confirm };

const ART_ICON: Record<Art, string> = {
  Homeoffice: a.hoDot,
  Urlaub: a.mbUrlaub,
  Krank: a.mbOffline,
  "DV Arzt": a.mbOffline,
  "DV Sonstiges": a.mbOffline,
};

const HR = "Adams Anna";
const LUCY: Person = { name: "Lucy Dallon", role: "Innendienst", photo: a.empLucy };
const MIKE: Person = { name: "Bennett Mike", role: "KFZ Innendienst", photo: a.reqMike };

/** The rows of the Figma table. */
const DEMO: HrAntrag[] = [
  { id: "hr-1", person: { name: "Adams Anna", role: "Geschäftsleitung", photo: a.reqAnna }, art: "Urlaub", day: "2026-01-01", datum: "01.01.2026", zeit: "09:00 - 11:30 (2h 30m)", anhang: [], status: "beantragt", vertretung: MIKE },
  { id: "hr-2", person: { name: "Adams Sonja", role: "KFZ Innendienst", photo: a.reqSonja }, art: "Krank", day: "2026-05-03", datum: "03.05.2026 - 07.05.2026", zeit: "4 Tage 4 Stunden", anhang: ["arztzeugnis.pdf", "bestätigung...2023.pdf"], status: "beantragt" },
  { id: "hr-3", person: { name: "Adams Sonja", role: "KFZ Innendienst", photo: a.reqSonja }, art: "DV Sonstiges", day: "2026-05-03", datum: "03.05.2026", zeit: "1 Tag", anhang: ["Umzugsbestät_.pdf"], status: "beantragt", kommentar: "Ziehe um und brauche bitte einen Umzugstag.", vertretung: MIKE },
  { id: "hr-4", person: MIKE, art: "DV Sonstiges", day: "2026-03-02", datum: "02.03.2026 - 04.03.2026", zeit: "3 Tage", anhang: [], status: "beantragt", kommentar: "Begleitung meiner Mutter zur Reha." },
  { id: "hr-5", person: { name: "Cooper Ashton", role: "KFZ Innendienst", photo: a.reqAshton }, art: "DV Arzt", day: "2026-10-04", datum: "04.10.2026", zeit: "1 Tag", anhang: ["arztzeugnis.pdf", "bestätigung.pdf"], status: "beantragt" },
  { id: "hr-6", person: { name: "Davis Julia", role: "KFZ Innendienst", photo: a.reqDavis }, art: "Urlaub", day: "2026-05-05", datum: "05.05.2026 - 09.05.2026", zeit: "4 Tage", anhang: [], status: "zurueckgesetzt", statusKommentar: "Wie besprochen ist es an diesem Zeitpunkt leider nicht möglich." },
  { id: "hr-7", person: { name: "Dennett Lily", role: "Schaden", photo: a.empJasmin }, art: "DV Sonstiges", day: "2026-05-02", datum: "02.05.2026", zeit: "1 Tag", anhang: [], status: "zurueckgesetzt", statusKommentar: "Bitte Vertretung auswählen und neuen Antrag bitte stellen." },
  { id: "hr-8", person: { name: "Garcia Thomas", role: "Schaden", photo: a.empPeter }, art: "Urlaub", day: "2026-07-25", datum: "25.07.2026", zeit: "09:15 - 11:45 (2h 30m)", anhang: [], status: "zurueckgesetzt", statusKommentar: "Es fehlen noch weitere Angaben zum Q1." },
  { id: "hr-9", person: { name: "Patel Aarav", role: "Schaden", photo: a.empAlexander }, art: "Urlaub", day: "2027-01-08", datum: "08.01.2027 - 12.01.2027", zeit: "4 Tage", anhang: ["lalala.pdf"], status: "genehmigt", statusKommentar: "Bitte in Zukunft Dateien richtig benennen. Danke." },
];

const pad = (n: number) => String(n).padStart(2, "0");
const dmy = (day: string) => {
  const d = parseIso(day);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};
const span = (min: number) => `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}`;

function homeofficeRows(antraege: HomeofficeAntrag[]): HrAntrag[] {
  return antraege.map((x) => ({
    id: `ho-${x.id}`,
    person: LUCY,
    art: "Homeoffice",
    day: x.day,
    datum: dmy(x.day),
    zeit: `${hhmm(x.start)} - ${hhmm(x.end)} (${span(x.end - x.start)})`,
    anhang: [],
    status: x.status === "offen" ? "beantragt" : x.status,
    kommentar: x.kommentar,
    statusKommentar: x.entscheidNotiz,
    homeofficeId: x.id,
  }));
}

function StatusChip({ status }: { status: HrStatus }) {
  return (
    <span className={`hrm-status ${status}`}>
      <img src={STATUS_ICON[status]} alt="" width={16} height={16} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Status dropdown (Figma 17588:83957): the current status, and below it Zurücksetzen and Genehmigen. */
function StatusDropdown({ row, onPick }: { row: HrAntrag; onPick: (next: "zurueckgesetzt" | "genehmigt") => void }) {
  // Fixed position: the table scrolls sideways and would clip a menu inside it.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const open = pos !== null;
  const setOpen = (next: boolean) => {
    if (!next) return setPos(null);
    const box = ref.current?.getBoundingClientRect();
    if (box) setPos({ top: box.bottom + 4, left: box.left });
  };
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => ref.current && !ref.current.contains(event.target as Node) && setPos(null);
    const drop = () => setPos(null);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", drop, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", drop, true);
    };
  }, [open]);
  const options = (["zurueckgesetzt", "genehmigt"] as const).filter((x) => x !== row.status);
  return (
    <div className={`hrm-dd${open ? " open" : ""}`} ref={ref} onClick={(event) => event.stopPropagation()}>
      <button type="button" className="hrm-dd-current" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <StatusChip status={row.status} />
        <Icon src={a.chevronDown} size={14} className={open ? "kal-open" : undefined} />
      </button>
      {pos ? (
        <div className="hrm-dd-menu" role="menu" style={{ top: pos.top, left: pos.left }}>
          {options.map((x) => (
            <button
              type="button"
              role="menuitem"
              key={x}
              className={`hrm-dd-option ${x}`}
              onClick={() => {
                setOpen(false);
                onPick(x);
              }}
            >
              <img src={x === "zurueckgesetzt" ? a.revert : a.confirm} alt="" width={16} height={16} />
              {x === "zurueckgesetzt" ? "Zurücksetzen" : "Genehmigen"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Prompt before the status changes: sums up the request, and HR can add a reason. */
function DecidePrompt({
  row,
  next,
  onCancel,
  onConfirm,
}: {
  row: HrAntrag;
  next: "zurueckgesetzt" | "genehmigt";
  onCancel: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const reset = next === "zurueckgesetzt";
  const title = reset ? "Antrag zurücksetzen" : "Antrag genehmigen";
  return (
    <div className="prompt-modal" role="dialog" aria-label={title}>
      <button type="button" className="prompt-scrim" aria-label="Schließen" onClick={onCancel} />
      <div className="prompt-body hrm-prompt">
        <header className="kal-hom-head">
          <span>
            <img src={reset ? a.revert : a.checkGreen} alt="" width={12} height={12} className={reset ? "hrm-prompt-ico" : undefined} /> {title}
          </span>
          <button type="button" aria-label="Schließen" onClick={onCancel}>
            <img src={a.iconCloseDark} alt="" width={8} height={8} />
          </button>
        </header>
        <div className="prompt-main">
          <div className="hrm-sum">
            <div className="hrm-person">
              {row.person.photo ? <img src={row.person.photo} alt="" /> : <span className="hrm-person-blank" />}
              <span>
                <strong>{row.person.name}</strong>
                <small>{row.person.role}</small>
              </span>
            </div>
            <dl className="hrm-sum-grid">
              <div>
                <dt>Antragsart</dt>
                <dd className="hrm-art">
                  <img src={ART_ICON[row.art]} alt="" width={12} height={12} />
                  {row.art}
                </dd>
              </div>
              <div>
                <dt>Datum &amp; Uhrzeit</dt>
                <dd className="hrm-when">
                  <span>
                    <img src={a.calendar} alt="" width={13} height={12} /> {row.datum}
                  </span>
                  <span>
                    <img src={a.aktClock} alt="" width={14} height={14} /> {row.zeit}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Beilage</dt>
                <dd>{row.anhang.length ? row.anhang.map((f) => <u key={f}>{f}</u>) : "-"}</dd>
              </div>
              <div>
                <dt>Vertretung</dt>
                <dd>
                  {row.vertretung ? (
                    <span className="hrm-person small">
                      {row.vertretung.photo ? <img src={row.vertretung.photo} alt="" /> : null}
                      {row.vertretung.name}
                    </span>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
            </dl>
            {row.kommentar ? (
              <div className="hrm-sum-note">
                <small>Kommentar</small>
                <strong>{row.kommentar}</strong>
              </div>
            ) : null}
          </div>
          {reset ? (
            <p className="hrm-prompt-hint">
              Der Antrag wird gelöscht{row.art === "Homeoffice" ? " und aus dem Kalender genommen" : ""}. {row.person.name.split(" ")[0]} wird
              informiert und muss ihn neu stellen.
            </p>
          ) : null}
          <label className="field-label" htmlFor="hrm-note">
            Kommentar
          </label>
          <textarea
            id="hrm-note"
            className="prompt-input"
            placeholder="Begründung oder Hinweis hinzufügen..."
            value={note}
            onChange={(event) => setNote(event.target.value)}
            autoFocus
          />
        </div>
        <footer className="prompt-foot">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className={reset ? "btn-primary" : "btn-primary hrm-btn-ok"} onClick={() => onConfirm(note.trim())}>
            {title}
          </button>
        </footer>
      </div>
    </div>
  );
}

const TABS = [
  { id: "antraege", label: "Anträge", icon: a.aktRequest },
  { id: "zeit", label: "Zeitübersichten", icon: a.aktClock },
  { id: "reisen", label: "Reisen", icon: a.mbCar },
  { id: "weiterbildungen", label: "Weiterbildungen", icon: a.mbEducation },
  { id: "gespraeche", label: "Mitarbeitergespräche", icon: a.comment },
];

export function HrmListen({ tab, onTab: setTab }: { tab: string; onTab: (tab: string) => void }) {
  const [homeoffice, setHomeoffice] = useState(loadAntraege);
  useEffect(() => onAntraegeChange(setHomeoffice), []);
  /** Decisions on the demo rows stay on this screen. */
  const [demo, setDemo] = useState(DEMO);
  const [pending, setPending] = useState<{ row: HrAntrag; next: "zurueckgesetzt" | "genehmigt" } | null>(null);
  const [snack, setSnack] = useState<{ message: string; undo: () => void } | null>(null);
  const [statusFilter, setStatusFilter] = useState<HrStatus | null>(null);
  const [comment, setComment] = useState<string | null>(null);

  const all = [...homeofficeRows(homeoffice), ...demo].sort((x, y) => y.day.localeCompare(x.day));
  const rows = statusFilter ? all.filter((r) => r.status === statusFilter) : all;
  const count = (s: HrStatus) => all.filter((r) => r.status === s).length;
  const card = (s: HrStatus) => ({ active: statusFilter === s, onClick: () => setStatusFilter((c) => (c === s ? null : s)) });

  function apply(row: HrAntrag, next: "zurueckgesetzt" | "genehmigt", note: string) {
    if (row.homeofficeId) {
      const before = loadAntraege();
      saveAntraege(decide(before, row.homeofficeId, next, new Date().toISOString(), HR, note));
      setSnack({
        message: next === "genehmigt" ? "Antrag wurde erfolgreich genehmigt." : "Antrag wurde zurückgesetzt. Lucy wurde informiert.",
        undo: () => saveAntraege(before),
      });
    } else {
      const before = demo;
      setDemo((list) => list.map((x) => (x.id === row.id ? { ...x, status: next, statusKommentar: note || undefined } : x)));
      setSnack({
        message: next === "genehmigt" ? "Antrag wurde erfolgreich genehmigt." : `Antrag wurde zurückgesetzt. ${row.person.name} wurde informiert.`,
        undo: () => setDemo(before),
      });
    }
  }

  const columns: DmsColumn<HrAntrag>[] = [
    {
      key: "person",
      label: "Mitarbeiter",
      width: "minmax(230px, 230fr)",
      text: (r) => `${r.person.name} ${r.person.role}`,
      render: (r) => (
        <span className="hrm-person">
          {r.person.photo ? <img src={r.person.photo} alt="" /> : <span className="hrm-person-blank" />}
          <span>
            <strong>{r.person.name}</strong>
            <small>{r.person.role}</small>
          </span>
        </span>
      ),
    },
    {
      key: "art",
      label: "Antragsart",
      width: "minmax(220px, 220fr)",
      text: (r) => r.art,
      render: (r) => (
        <span className="hrm-art">
          <img src={ART_ICON[r.art]} alt="" width={r.art === "Homeoffice" ? 11 : 16} height={r.art === "Homeoffice" ? 11 : 16} />
          {r.art}
          {r.kommentar ? (
            <span className="hrm-comment-wrap">
              <button
                type="button"
                className="hrm-comment-btn"
                aria-label="Kommentar ansehen"
                onClick={(event) => {
                  event.stopPropagation();
                  setComment(comment === r.id ? null : r.id);
                }}
              >
                <img src={a.comment} alt="" width={13} height={14} />
              </button>
              {comment === r.id ? (
                <span className="hrm-comment-pop" role="dialog" aria-label="Kommentar">
                  <small>Kommentar von {r.person.name}</small>
                  {r.kommentar}
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "datum",
      label: "Datum & Uhrzeit",
      width: "minmax(240px, 240fr)",
      text: (r) => `${r.datum} ${r.zeit}`,
      render: (r) => (
        <span className="hrm-when">
          <span>
            <img src={a.calendar} alt="" width={13} height={12} /> {r.datum}
          </span>
          <span>
            <img src={a.aktClock} alt="" width={14} height={14} /> {r.zeit}
          </span>
        </span>
      ),
    },
    {
      key: "anhang",
      label: "Anhang",
      width: "minmax(200px, 200fr)",
      text: (r) => r.anhang.join(" "),
      render: (r) => (r.anhang.length ? <span className="hrm-files">{r.anhang.map((f) => <u key={f}>{f}</u>)}</span> : "-"),
    },
    {
      key: "status",
      label: "Status",
      width: "minmax(170px, 170fr)",
      text: (r) => STATUS_LABEL[r.status],
      render: (r) => <StatusDropdown row={r} onPick={(next) => setPending({ row: r, next })} />,
    },
    {
      key: "statusKommentar",
      label: "Status Kommentar",
      width: "minmax(260px, 260fr)",
      text: (r) => r.statusKommentar ?? "",
      render: (r) => <span className="hrm-note">{r.statusKommentar || ""}</span>,
    },
  ];

  return (
    <section className="freigaben hrm-listen" onClick={() => setComment(null)}>
      <h1 className="freigaben-title">
        <Icon src={a.shelveToggle} size={18} />
        HRM Listen
      </h1>
      <div className="freigaben-tabs">
        {TABS.map((t) => (
          <button type="button" key={t.id} className={t.id === tab ? "fg-tab active" : "fg-tab"} onClick={() => setTab(t.id)}>
            <Icon src={t.icon} size={20} />
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "antraege" ? (
        <p className="atab-empty center">Diese Liste folgt.</p>
      ) : (
        <>
          <div className="freigaben-statbar">
            <div className="freigaben-stats">
              <StatCard label="Beantragt" value={count("beantragt")} icon={a.hoOnhold} {...card("beantragt")} />
              <StatCard label="Zurückgesetzt" value={count("zurueckgesetzt")} icon={a.revertDark} {...card("zurueckgesetzt")} />
              <StatCard label="Genehmigt" value={count("genehmigt")} icon={a.confirm} {...card("genehmigt")} />
            </div>
          </div>
          <DmsTable rows={rows} columns={columns} rowKey={(r) => r.id} label="Anträge" unit="Anträge" rowClass={(r) => `hrm-row ${r.status}`} />
        </>
      )}

      {pending ? (
        <DecidePrompt
          row={pending.row}
          next={pending.next}
          onCancel={() => setPending(null)}
          onConfirm={(note) => {
            apply(pending.row, pending.next, note);
            setPending(null);
          }}
        />
      ) : null}
      {snack ? (
        <Snackbar
          message={snack.message}
          onUndo={() => {
            snack.undo();
            setSnack(null);
          }}
          onClose={() => setSnack(null)}
        />
      ) : null}
    </section>
  );
}
