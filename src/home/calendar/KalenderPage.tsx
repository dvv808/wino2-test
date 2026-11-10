import { useEffect, useMemo, useRef, useState } from "react";
import * as a from "../../assets/index";
import { Icon } from "../../ui";
import {
  DEFAULT_RANGE,
  FULL_RANGE,
  HOUR_PX,
  KALENDER,
  WEEKDAYS_SHORT,
  addDays,
  duration,
  headerDate,
  hhmm,
  iso,
  isoWeek,
  parseIso,
  placeInLanes,
  seedWeek,
  topOf,
  weekDays,
  type CalendarEntry,
} from "./calendarData";
import { AktivitaetenPanel, BeantragungenPanel, counts } from "./Aktivitaeten";
import { HomeofficeModal, HomeofficePopover } from "./HomeofficeUI";
import { MiniMonth } from "./MiniMonth";
import { decide, inCalendar, loadAntraege, takeFocus, onAntraegeChange, remove, saveAntraege, saveDay, type HomeofficeAntrag } from "./homeoffice";

/** Home → Planner → Kalender: "Mein Kalender", Ansicht Woche (Figma 16702:185207). Tag/Monat/Jahr follow. */

type View = "Tag" | "Woche" | "Monat" | "Jahr";
const VIEWS: View[] = ["Tag", "Woche", "Monat", "Jahr"];

const PHOTO: Record<string, string> = {
  lucy: a.empLucy,
  caleb: a.empAlexander,
  lucymaria: a.empJasmin,
  andrea: a.empChristine,
};

const SETTINGS_KEY = "wino.kalender.24h";

function readFull24() {
  try {
    return localStorage.getItem(SETTINGS_KEY) === "1";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- side nav

function Tick({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} aria-label={label} className={`kal-tick${on ? " on" : ""}`} onClick={onChange}>
      {on ? <Icon src={a.tick} size={12} /> : null}
    </button>
  );
}

type SidePanel = "kalender" | "aktivitaeten" | "beantragungen";

function SideNav({
  day,
  today,
  onPick,
  visible,
  toggle,
  panel,
  setPanel,
  highlight,
  antraege,
  onOpenAntrag,
  onEditAntrag,
}: {
  day: string;
  today: string;
  onPick: (d: string) => void;
  visible: Set<string>;
  toggle: (id: string) => void;
  panel: SidePanel;
  setPanel: (p: SidePanel) => void;
  highlight: string | null;
  antraege: HomeofficeAntrag[];
  onOpenAntrag: (x: HomeofficeAntrag) => void;
  onEditAntrag: (x: HomeofficeAntrag) => void;
}) {
  const [mineOpen, setMineOpen] = useState(true);
  const [sharedOpen, setSharedOpen] = useState(true);
  const [legend, setLegend] = useState(false);
  const mine = KALENDER.filter((k) => k.owner === "ich");
  const shared = KALENDER.filter((k) => k.owner === "geteilt");
  const aktivitaeten = counts(antraege, today).aktivitaeten;
  return (
    <aside className="kal-side">
      <header className="kal-side-head">
        <img src={a.empLucy} alt="" className="kal-side-avatar" />
        <span>
          <strong>Mein Kalender ({mine.length})</strong>
          <small>Lucy Dallon (Ich)</small>
        </span>
        <Icon src={a.chevronDown} size={12} />
      </header>
      {panel === "aktivitaeten" ? (
        <div className="kal-side-body">
          <AktivitaetenPanel
            antraege={antraege}
            today={today}
            shared={shared.length}
            onBack={() => setPanel("kalender")}
            onBeantragungen={() => setPanel("beantragungen")}
          />
        </div>
      ) : panel === "beantragungen" ? (
        <div className="kal-side-body">
          <BeantragungenPanel
            key={highlight ?? "list"}
            highlight={highlight}
            antraege={antraege}
            today={today}
            onBack={() => setPanel("aktivitaeten")}
            onOpen={onOpenAntrag}
            onEdit={onEditAntrag}
          />
        </div>
      ) : (
      <div className="kal-side-body">
        <button type="button" className="kal-activities" onClick={() => setPanel("aktivitaeten")}>
          <Icon src={a.calBell} size={20} />
          {aktivitaeten > 0 ? <span className="mb-action-count">{aktivitaeten}</span> : null}
          Kalender Aktivitäten
        </button>

        <MiniMonth day={day} today={today} onPick={onPick} />

        <button type="button" className="kal-group-head" aria-expanded={mineOpen} onClick={() => setMineOpen(!mineOpen)}>
          Mein Kalender ({mine.length})
          <Icon src={a.chevronDown} size={18} className={mineOpen ? undefined : "kal-closed"} />
        </button>
        {mineOpen ? (
          <div className="kal-cals">
            {mine.map((k) => (
              <div key={k.id} className={`kal-cal${k.parent ? " child" : " root"}`}>
                <Tick on={visible.has(k.id)} onChange={() => toggle(k.id)} label={k.name} />
                {k.parent ? <span className="kal-dot icloud" /> : <img src={PHOTO[k.id]} alt="" className="kal-cal-photo" />}
                <span>{k.name}</span>
              </div>
            ))}
          </div>
        ) : null}

        <button type="button" className="kal-group-head" aria-expanded={sharedOpen} onClick={() => setSharedOpen(!sharedOpen)}>
          Geteilte Kalender ({shared.length})
          <Icon src={a.chevronDown} size={18} className={sharedOpen ? undefined : "kal-closed"} />
        </button>
        {sharedOpen ? (
          <div className="kal-cals">
            {shared.map((k) => (
              <div key={k.id} className="kal-cal">
                <Tick on={visible.has(k.id)} onChange={() => toggle(k.id)} label={k.name} />
                <img src={PHOTO[k.id]} alt="" className="kal-cal-photo" />
                <span>{k.name}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      )}
      {panel === "kalender" ? (
      <footer className="kal-legend">
        <button type="button" className="kal-group-head" aria-expanded={legend} onClick={() => setLegend(!legend)}>
          Legende zum Kalender
          <Icon src={a.plusCircle} size={18} />
        </button>
        {legend ? (
          <ul>
            <li>
              <i className="kal-key termin" /> Termin
            </li>
            <li>
              <i className="kal-key worked" /> Erfasste Arbeitszeit
            </li>
            <li>
              <i className="kal-key urlaub" /> Urlaub
            </li>
            <li>
              <i className="kal-key reise" /> Reise (Abfahrt / Ankunft)
            </li>
            <li>
              <i className="kal-key privat" /> Privat – zählt nicht als Arbeitszeit
            </li>
            <li>
              <i className="kal-key office" /> Anderes Büro (z. B. Kapfenberg)
            </li>
            <li>
              <i className="kal-key homeoffice" /> Homeoffice (schraffiert = Antrag offen)
            </li>
          </ul>
        ) : null}
      </footer>
      ) : null}
    </aside>
  );
}

// ---------------------------------------------------------------- week grid

function StatusIcon({ entry }: { entry: CalendarEntry }) {
  if (!entry.status) return null;
  const src =
    entry.kind === "urlaub"
      ? entry.status === "abgelehnt"
        ? a.calUrlaubRejected
        : a.calUrlaubPending
      : entry.status === "abgelehnt"
        ? a.calDocRejected
        : entry.status === "genehmigt"
          ? a.calDocApproved
          : null;
  const label = { offen: "Antrag offen", genehmigt: "Genehmigt", abgelehnt: "Abgelehnt" }[entry.status];
  return src ? <img className="kal-status" src={src} alt={label} title={label} /> : null;
}

function EntryCard({
  entry,
  from,
  lane,
  lanes,
  selected,
  onSelect,
}: {
  entry: CalendarEntry;
  from: number;
  lane: number;
  lanes: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const height = Math.max(18, topOf(entry.end, from) - topOf(entry.start, from));
  const compact = height < 40;
  const shared = KALENDER.find((k) => k.id === entry.calendar)?.owner === "geteilt";
  const tooltip = [`${hhmm(entry.start)}–${hhmm(entry.end)} ${entry.title}`, entry.ort, entry.teams ? "MS Teams" : ""].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      className={`kal-entry ${entry.kind}${compact ? " compact" : ""}${selected ? " selected" : ""}${shared ? " shared" : ""}`}
      style={{
        top: topOf(entry.start, from),
        height,
        left: `calc(${(lane / lanes) * 100}% + ${lane === 0 ? 8 : 2}px)`,
        width: `calc(${100 / lanes}% - ${lane === 0 ? 10 : 4}px)`,
      }}
      title={tooltip}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {entry.kind !== "privat" ? <i className={`kal-bar ${entry.kind}`} /> : null}
      <span className="kal-entry-text">
        <strong>{hhmm(entry.start)}</strong> {entry.kind === "privat" && compact ? "Privat" : entry.title}
      </span>
      {entry.kind === "privat" ? <img className="kal-lock" src={a.hnLock} alt="Privat" title="Privat: nur für dich sichtbar" /> : <StatusIcon entry={entry} />}
      {shared ? <img className="kal-entry-photo" src={PHOTO[entry.calendar]} alt="" /> : null}
      {!compact && (entry.teams || entry.ort) ? (
        <span className="kal-entry-meta">
          {entry.teams ? (
            <span className="kal-teams">
              <img src={a.calTeams} alt="" width={12} height={7} />
              <u>MS Teams</u>
            </span>
          ) : null}
          {entry.ort ? (
            <span>
              <img src={a.calPin} alt="" width={7} height={12} />
              {entry.ort}
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  );
}

/** Reise: Abfahrt and Ankunft as small blue chips, the trip as a dashed blue bar between them. */
function TripCard({ entry, from }: { entry: CalendarEntry; from: number }) {
  const top = topOf(entry.start, from);
  const bottom = topOf(entry.end, from) + 20;
  return (
    <>
      <i className="kal-trip-bar" style={{ top, height: bottom - top }} />
      <span className="kal-trip-chip" style={{ top }} title={`${hhmm(entry.start)} ${entry.abfahrt ?? "Abfahrt"}`}>
        <strong>{hhmm(entry.start)}</strong> {entry.abfahrt ?? "Abfahrt"}
      </span>
      <span className="kal-trip-chip" style={{ top: topOf(entry.end, from) }} title={`${hhmm(entry.end)} ${entry.ankunft ?? "Ankunft"}`}>
        <strong>{hhmm(entry.end)}</strong> {entry.ankunft ?? "Ankunft"}
      </span>
    </>
  );
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/** Working hours Mo–Fr: white in the week grid. */
const WORK_FROM = 8 * 60;
const WORK_TO = 17 * 60;

function WeekGrid({
  day,
  today,
  visible,
  full24,
  onOpenDay,
  homeoffice,
  openId,
  onOpenAntrag,
  onEditAntrag,
  onDeleteAntrag,
  onDecideAntrag,
  onShowRequest,
}: {
  day: string;
  today: string;
  visible: Set<string>;
  full24: boolean;
  onOpenDay: (d: string) => void;
  homeoffice: HomeofficeAntrag[];
  openId: string | null;
  onOpenAntrag: (id: string | null) => void;
  onEditAntrag: (x: HomeofficeAntrag) => void;
  onDeleteAntrag: (id: string) => void;
  onDecideAntrag: (id: string, status: "genehmigt" | "zurueckgesetzt") => void;
  onShowRequest: (id: string) => void;
}) {
  const days = weekDays(day);
  const seed = useMemo(() => seedWeek(today), [today]);
  const showHomeoffice = visible.has("lucy");
  const { from, to } = full24 ? FULL_RANGE : DEFAULT_RANGE;
  const hours = Array.from({ length: (to - from) / 60 }, (_, i) => from + i * 60);
  const height = ((to - from) / 60) * HOUR_PX;
  const now = useNow();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = days.includes(today) && nowMin >= from && nowMin <= to;
  const [selected, setSelected] = useState<string | null>(null);
  const body = useRef<HTMLDivElement>(null);

  // An opened Homeoffice popover (e.g. coming from Mein Bereich → Anträge) is scrolled into sight.
  useEffect(() => {
    if (!openId) return;
    const frame = requestAnimationFrame(() => body.current?.querySelector(".kal-hop")?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    return () => cancelAnimationFrame(frame);
  }, [openId]);

  // Opens at 06:00 (24 h view) so the working day is in sight.
  useEffect(() => {
    if (body.current) body.current.scrollTop = full24 ? topOf(6 * 60, 0) : 0;
  }, [full24]);

  const entries = seed.entries.filter((e) => visible.has(e.calendar));
  const allDay = seed.allDay.filter((e) => visible.has(e.calendar));
  const worked = seed.worked.filter((w) => visible.has(w.calendar));

  return (
    <div className="kal-week" onClick={() => setSelected(null)}>
      <div className="kal-week-head">
        <span />
        {days.map((d, i) => (
          <button
            type="button"
            key={d}
            className={`kal-dayhead${d === today ? " today" : ""}`}
            title="Tagesansicht öffnen"
            onClick={() => onOpenDay(d)}
          >
            {WEEKDAYS_SHORT[i]} {parseIso(d).getDate()}
          </button>
        ))}
      </div>
      <div className="kal-allday">
        <span />
        {days.map((d) => {
          const items = allDay.filter((x) => x.day === d);
          const shown = items.slice(0, 2);
          return (
            <div key={d} className={`kal-allday-cell${d === today ? " today" : ""}`}>
              {shown.map((x) => (
                <span key={x.id} className={`kal-allday-chip${x.office ? " office" : ""}${items.length === 1 ? " wide" : ""}`} title={x.title}>
                  {x.title}
                </span>
              ))}
              {items.length > 2 ? (
                <span className="kal-allday-chip more" title={items.slice(2).map((x) => x.title).join(", ")}>
                  +{items.length - 2}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="kal-body" ref={body}>
        <div className="kal-body-inner" style={{ height }}>
          <div className="kal-gutter">
            {hours.map((m) => (
              <span key={m} style={{ top: topOf(m, from) }}>
                {hhmm(m)}
              </span>
            ))}
            {showNow ? (
              <span className="kal-now-label" style={{ top: topOf(nowMin, from) }}>
                {hhmm(nowMin)}
              </span>
            ) : null}
          </div>
          {days.map((d, i) => {
            const weekend = i >= 5;
            const holiday = seed.holidays.has(d);
            const dayEntries = entries.filter((e) => e.day === d);
            const trips = dayEntries.filter((e) => e.kind === "reise");
            const placed = placeInLanes(dayEntries.filter((e) => e.kind !== "reise"));
            return (
              <div key={d} className={`kal-col${d === today ? " today" : ""}${holiday ? " holiday" : ""}`}>
                {hours.map((m) => (
                  <i key={m} className="kal-line" style={{ top: topOf(m, from) }} />
                ))}
                {/* Mo–Fr 08:00–17:00 is white, the rest of the day shaded. Weekends fully. Holidays have their own look. */}
                {holiday ? null : weekend ? (
                  <i className="kal-off" style={{ top: 0, height }} />
                ) : (
                  <>
                    <i className="kal-off" style={{ top: 0, height: Math.max(0, topOf(WORK_FROM, from)) }} />
                    <i className="kal-off" style={{ top: topOf(WORK_TO, from), height: Math.max(0, height - topOf(WORK_TO, from)) }} />
                  </>
                )}
                {worked
                  .filter((w) => w.day === d)
                  .map((w) => (
                    <i
                      key={`${w.start}`}
                      className={`kal-worked${d === today ? " today" : ""}`}
                      style={{ top: topOf(w.start, from), height: topOf(w.end, from) - topOf(w.start, from) }}
                      title={`Erfasste Arbeitszeit ${hhmm(w.start)}–${hhmm(w.end)}`}
                    />
                  ))}
                {/* Homeoffice: a green bar on the left edge for each time block; hatched while the request is open. */}
                {(showHomeoffice ? inCalendar(homeoffice, d) : []).map((x) => (
                  <div key={x.id} className="kal-ho-slot" style={{ top: topOf(x.start, from), height: topOf(x.end, from) - topOf(x.start, from) }}>
                    <button
                      type="button"
                      className={`kal-ho-bar ${x.status}${openId === x.id ? " active" : ""}`}
                      aria-label={`Homeoffice ${hhmm(x.start)}–${hhmm(x.end)}`}
                      title={`Homeoffice ${hhmm(x.start)}–${hhmm(x.end)}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenAntrag(openId === x.id ? null : x.id);
                      }}
                    />
                    {openId === x.id ? (
                      <HomeofficePopover
                        antrag={x}
                        side={i >= 4 ? "left" : "right"}
                        up={x.start >= 12 * 60}
                        onClose={() => onOpenAntrag(null)}
                        onEdit={() => onEditAntrag(x)}
                        onDelete={() => onDeleteAntrag(x.id)}
                        onDecide={(status) => onDecideAntrag(x.id, status)}
                        onStatus={() => onShowRequest(x.id)}
                      />
                    ) : null}
                  </div>
                ))}
                {trips.map((t) => (
                  <TripCard key={t.id} entry={t} from={from} />
                ))}
                {placed.map((e) => (
                  <EntryCard
                    key={e.id}
                    entry={e}
                    from={from}
                    lane={e.lane}
                    lanes={e.lanes}
                    selected={selected === e.id}
                    onSelect={() => setSelected(e.id)}
                  />
                ))}
              </div>
            );
          })}
          {showNow ? (
            <div className="kal-now" style={{ top: topOf(nowMin, from) }}>
              <i style={{ left: `calc(100% / 7 * ${days.indexOf(today)})` }} />
            </div>
          ) : null}
        </div>
      </div>
      <div className="kal-foot">
        <span />
        {days.map((d) => {
          const t = seed.times[d];
          return (
            <div key={d} className={`kal-foot-cell${d === today ? " today" : ""}`}>
              {t ? (
                <dl>
                  <dt>Sollzeit:</dt>
                  <dd>{duration(t.soll)}</dd>
                  <dt>Istzeit:</dt>
                  <dd>{duration(t.ist)}</dd>
                </dl>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- top bar, menu, settings

function SettingsModal({ full24, onClose, onSave }: { full24: boolean; onClose: () => void; onSave: (v: boolean) => void }) {
  const [on, setOn] = useState(full24);
  return (
    <div className="prompt-modal" role="dialog" aria-label="Einstellungen">
      <button type="button" className="prompt-scrim" aria-label="Schließen" onClick={onClose} />
      <div className="prompt-body kal-settings">
        <header className="review-titlebar">
          <span className="review-titlebar-label">
            <Icon src={a.settings} size={16} /> Einstellungen
          </span>
          <button type="button" className="review-titlebar-close" aria-label="Schließen" onClick={onClose}>
            <img src={a.iconCloseDark} alt="" width={12} height={12} />
          </button>
        </header>
        <div className="prompt-main">
          <div className="kal-setting">
            <div>
              <strong>24 Stunden Kalenderansicht</strong>
              <p>Standard werden die Kalender Zeiten von 06:00 bis 22:00 angezeigt.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label="24 Stunden Kalenderansicht"
              className={on ? "sw-switch on" : "sw-switch"}
              onClick={() => setOn(!on)}
            >
              <span className="sw-switch-knob" />
            </button>
          </div>
        </div>
        <footer className="prompt-foot">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary" onClick={() => onSave(on)}>
            Speichern
          </button>
        </footer>
      </div>
    </div>
  );
}

/** Zeiterfassung: what is being recorded (Figma "Dropdown_Arbeitszeit", 16702:176459). */
const ERFASSUNG = [
  { label: "Arbeitszeit", marker: a.zeitArbeitszeit },
  { label: "Homeoffice", marker: a.hoDot },
  { label: "Urlaub", marker: a.zeitUrlaub },
  { label: "Unbezahlter Urlaub/Papamonat", marker: a.zeitUrlaub },
  { label: "Zeitausgleich", marker: a.zeitZeitausgleich },
  { label: "Krank", marker: a.zeitAbwesend },
  { label: "DV Arzt", marker: a.zeitAbwesend },
  { label: "DV Sonstiges", marker: a.zeitAbwesend },
  { label: "Pflegeurlaub", marker: a.zeitAbwesend },
];

/** Closes a popover on a click outside of it or on Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function ZeiterfassungMenu({ onHomeoffice }: { onHomeoffice: () => void }) {
  const [open, setOpen] = useState(false);
  const [art, setArt] = useState("Arbeitszeit");
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div className="kal-menu-wrap" ref={ref}>
      <button type="button" className="kal-action" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <img src={a.calZeiterfassung} alt="" width={22} height={25} />
        <span>
          Zeit-
          <br />
          erfassung
        </span>
        <Icon src={a.chevronDown} size={10} className={open ? "kal-open" : undefined} />
      </button>
      {open ? (
        <div className="kal-zeit-menu" role="menu" aria-label="Zeiterfassung">
          {ERFASSUNG.map((item) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={art === item.label}
              key={item.label}
              className={art === item.label ? "active" : undefined}
              onClick={() => {
                setOpen(false);
                // Homeoffice needs approval: it opens the request instead of switching what is recorded.
                if (item.label === "Homeoffice") onHomeoffice();
                else setArt(item.label);
              }}
            >
              <img src={item.marker} alt="" width={10} height={10} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Placeholder({ view, onBack }: { view: View; onBack: () => void }) {
  return (
    <div className="kal-placeholder">
      <Icon src={a.calendar} size={40} />
      <h2>{view === "Tag" ? "Tagesansicht" : `${view}sansicht`} folgt</h2>
      <p>Diese Ansicht ist noch nicht gestaltet. Die Wochenansicht ist die Standard-Ansicht.</p>
      <button type="button" className="btn-secondary" onClick={onBack}>
        Zur Wochenansicht
      </button>
    </div>
  );
}

export function KalenderPage() {
  const today = iso(new Date());
  // Opened from Mein Bereich → Anträge: that request's day, with its popover open.
  const [focused] = useState(() => {
    const id = takeFocus();
    return id ? loadAntraege().find((x) => x.id === id) ?? null : null;
  });
  const [day, setDay] = useState(focused?.day ?? today);
  const [view, setView] = useState<View>("Woche");
  const [visible, setVisible] = useState<Set<string>>(() => new Set(["lucy", "icloud"]));
  const [full24, setFull24] = useState(readFull24);
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const menuRef = useDismiss(menu, () => setMenu(false));
  const [antraege, setAntraegeState] = useState<HomeofficeAntrag[]>(loadAntraege);
  /** The day the Homeoffice modal is open on, or null. */
  const [hoModal, setHoModal] = useState<string | null>(null);
  const [hoOpen, setHoOpen] = useState<string | null>(focused && focused.status !== "zurueckgesetzt" ? focused.id : null);
  const [panel, setPanel] = useState<SidePanel>("kalender");
  /** The request highlighted in Beantragungen (opened from the status in the calendar popover). */
  const [highlight, setHighlight] = useState<string | null>(null);
  const setAntraege = (next: HomeofficeAntrag[]) => {
    setAntraegeState(next);
    saveAntraege(next);
  };
  // Decisions made in Bestand → Freigaben reach the calendar right away.
  useEffect(() => onAntraegeChange(setAntraegeState), []);
  const holidays = useMemo(() => seedWeek(today).holidays, [today]);
  const showAntrag = (x: HomeofficeAntrag) => {
    setDay(x.day);
    setView("Woche");
    setVisible((prev) => new Set(prev).add("lucy"));
    setHoOpen(x.id);
  };
  const editAntrag = (x: HomeofficeAntrag) => {
    setHoOpen(null);
    setHoModal(x.day);
  };

  const toggle = (id: string) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const step = (n: number) => setDay((d) => addDays(d, view === "Tag" ? n : 7 * n));

  return (
    <div className="content-shell kal-page">
      <SideNav
        day={day}
        today={today}
        onPick={(d) => setDay(d)}
        visible={visible}
        toggle={toggle}
        panel={panel}
        setPanel={(p) => {
          setPanel(p);
          setHighlight(null);
        }}
        highlight={highlight}
        antraege={antraege}
        onOpenAntrag={showAntrag}
        onEditAntrag={editAntrag}
      />
      <section className="kal-main">
        <header className="kal-top">
          <button type="button" className="kal-date" title="Datum wählen">
            {headerDate(day)} <small>(KW {isoWeek(day)})</small>
            <Icon src={a.chevronDown} size={14} />
          </button>
          <div className="kal-nav">
            <button type="button" aria-label="Zurück" onClick={() => step(-1)}>
              <Icon src={a.chevronDark} size={14} className="kal-prev" />
            </button>
            <button type="button" className="kal-today" onClick={() => setDay(today)}>
              Heute
            </button>
            <button type="button" aria-label="Weiter" onClick={() => step(1)}>
              <Icon src={a.chevronDark} size={14} className="kal-next" />
            </button>
          </div>
          <div className="kal-switch" role="tablist" aria-label="Ansicht">
            {VIEWS.map((v) => (
              <button type="button" role="tab" key={v} aria-selected={view === v} className={view === v ? "active" : ""} onClick={() => setView(v)}>
                {v}
              </button>
            ))}
          </div>
          <div className="kal-actions">
            <ZeiterfassungMenu onHomeoffice={() => setHoModal(day < today ? today : day)} />
            <button type="button" className="kal-action" title="Neuer Termin (folgt)">
              <img src={a.calNeuerTermin} alt="" width={22} height={25} />
              <span>
                Neuer
                <br />
                Termin
              </span>
              <Icon src={a.chevronDown} size={10} />
            </button>
          </div>
          <i className="kal-divider" />
          <button type="button" className="kal-round" aria-label="Suche">
            <Icon src={a.searchDark} size={20} />
          </button>
          <div className="kal-menu-wrap" ref={menuRef}>
            <button type="button" className="kal-round" aria-label="Mehr" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <Icon src={a.contextMenu} size={20} />
            </button>
            {menu ? (
              <div className="kal-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    setSettings(true);
                  }}
                >
                  <Icon src={a.settings} size={20} /> Einstellungen
                </button>
                <button type="button" role="menuitem" onClick={() => setMenu(false)}>
                  <img src={a.calSharing} alt="" width={20} height={20} /> Meinen Kalender teilen
                </button>
                <button type="button" role="menuitem" onClick={() => setMenu(false)}>
                  <img src={a.calShared} alt="" width={20} height={20} /> Mit mir geteilte Kalender
                </button>
              </div>
            ) : null}
          </div>
        </header>
        {view === "Woche" ? (
          <WeekGrid
            day={day}
            today={today}
            visible={visible}
            full24={full24}
            onOpenDay={(d) => {
              setDay(d);
              setView("Tag");
            }}
            homeoffice={antraege}
            openId={hoOpen}
            onOpenAntrag={setHoOpen}
            onEditAntrag={editAntrag}
            onDeleteAntrag={(id) => {
              setAntraege(remove(antraege, id));
              setHoOpen(null);
            }}
            onDecideAntrag={(id, status) => setAntraege(decide(antraege, id, status, new Date().toISOString()))}
            onShowRequest={(id) => {
              setHoOpen(null);
              setHighlight(id);
              setPanel("beantragungen");
            }}
          />
        ) : (
          <Placeholder view={view} onBack={() => setView("Woche")} />
        )}
      </section>
      {hoModal ? (
        <HomeofficeModal
          today={today}
          start={hoModal}
          antraege={antraege}
          holidays={holidays}
          onClose={() => setHoModal(null)}
          onSave={(d, blocks) => {
            const next = saveDay(antraege, d, blocks, new Date().toISOString());
            setAntraege(next);
            setHoModal(null);
            setDay(d);
            setView("Woche");
            setVisible((prev) => new Set(prev).add("lucy"));
          }}
        />
      ) : null}
      {settings ? (
        <SettingsModal
          full24={full24}
          onClose={() => setSettings(false)}
          onSave={(v) => {
            setFull24(v);
            try {
              localStorage.setItem(SETTINGS_KEY, v ? "1" : "0");
            } catch {
              // Not saved: the setting holds until reload.
            }
            setSettings(false);
          }}
        />
      ) : null}
    </div>
  );
}
