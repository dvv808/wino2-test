import { addDays, hhmm, monthGrid, parseIso } from "../home/calendar/calendarData";
import type { ArbeitszeitBlock } from "../home/calendar/arbeitszeit";
import type { HomeofficeAntrag } from "../home/calendar/homeoffice";
import { TERMINARTEN, type MobileTermin } from "./termine";

/**
 * Month and year views of the mobile Kalender, in the spirit of Apple Calendar: the day view steps back to its
 * month, the month back to its year. Month = grid with dots and the picked day's list below; year = 12 small months.
 */
export type DayData = { termine: MobileTermin[]; homeoffice: HomeofficeAntrag[]; worked: ArbeitszeitBlock[]; allDay: string[] };
const LETTERS = ["M", "D", "M", "D", "F", "S", "S"];
export const toneOf = (t: MobileTermin) => TERMINARTEN.find((x) => x.label === t.art.replace(/ \(Entwurf\)$/, ""))?.tone ?? "termin";

export function MonthView({
  day,
  today,
  data,
  onPickDay,
  onOpenDay,
  onOpen,
}: {
  day: string;
  today: string;
  data: (d: string) => DayData;
  onPickDay: (d: string) => void;
  onOpenDay: (d: string) => void;
  onOpen: (t: MobileTermin, reise?: boolean) => void;
}) {
  const d = parseIso(day);
  const rows = monthGrid(d.getFullYear(), d.getMonth());
  const picked = data(day);
  const list = [...picked.termine].sort((p, q) => p.start - q.start);
  return (
    <div className="m-month">
      <div className="m-month-wd">
        {LETTERS.map((l, i) => (
          <span key={i} className={i > 4 ? "weekend" : ""}>
            {l}
          </span>
        ))}
      </div>
      <div className="m-month-grid">
        {rows.map((row) =>
          row.days.map((x) => {
            const info = data(x.day);
            const tones = [...new Set(info.termine.map(toneOf))].slice(0, 3);
            const extra = info.homeoffice.length ? ["homeoffice"] : [];
            const dots = [...tones, ...extra].slice(0, 4);
            return (
              <button
                type="button"
                key={x.day}
                className={`m-month-day${x.inMonth ? "" : " out"}${x.day === today ? " today" : ""}${x.day === day ? " selected" : ""}`}
                aria-pressed={x.day === day}
                onClick={() => (x.day === day ? onOpenDay(x.day) : onPickDay(x.day))}
              >
                <b>{parseIso(x.day).getDate()}</b>
                <span className="m-month-dots">
                  {dots.map((tone) => (
                    <i key={tone} className={`m-mdot ${tone}`} />
                  ))}
                </span>
              </button>
            );
          }),
        )}
      </div>

      <section className="m-month-list">
        <header>
          <strong>
            {["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"][d.getDay()]}, {d.getDate()}.{" "}
            {["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"][d.getMonth()]}
          </strong>
          <button type="button" className="m-link" onClick={() => onOpenDay(day)}>
            Tag öffnen
          </button>
        </header>
        {picked.allDay.map((title) => (
          <div className="m-month-item allday" key={title}>
            <i className="m-mbar ereignis" />
            <span>
              <b>{title}</b>
              <small>ganztägig</small>
            </span>
          </div>
        ))}
        {picked.homeoffice.map((x) => (
          <div className="m-month-item" key={x.id}>
            <i className="m-mbar homeoffice" />
            <span>
              <b>Homeoffice</b>
              <small>
                {hhmm(x.start)} – {hhmm(x.end)} · {x.status === "offen" ? "beantragt" : x.status}
              </small>
            </span>
          </div>
        ))}
        {list.map((t) => (
          <button type="button" className="m-month-item" key={t.id} onClick={() => onOpen(t)}>
            <i className={`m-mbar ${toneOf(t)}`} />
            <span>
              <b>{t.title}</b>
              <small>
                {hhmm(t.start)} – {hhmm(t.end)} · {t.art.replace(/ \(Wino Partner\)/, "")}
              </small>
            </span>
            <time>{hhmm(t.start)}</time>
          </button>
        ))}
        {!list.length && !picked.homeoffice.length && !picked.allDay.length ? <p className="m-month-empty">Keine Einträge</p> : null}
      </section>
    </div>
  );
}

/** Step of the ‹ › control and the swipe per view. */
export function stepDay(day: string, view: "tag" | "monat" | "jahr", n: number) {
  if (view === "tag") return addDays(day, n);
  const d = parseIso(day);
  const target = new Date(d.getFullYear() + (view === "jahr" ? n : 0), d.getMonth() + (view === "monat" ? n : 0), 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), last));
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
}

const MONTHS = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/** Year overview: 12 small months; the current month's name and today stand out. Tap a month to open it. */
export function YearView({ day, today, onPickMonth }: { day: string; today: string; onPickMonth: (firstDay: string) => void }) {
  const year = parseIso(day).getFullYear();
  const pad = (x: number) => String(x).padStart(2, "0");
  return (
    <div className="m-year">
      {MONTHS.map((name, m) => {
        const rows = monthGrid(year, m);
        const current = today.startsWith(`${year}-${pad(m + 1)}`);
        return (
          <button type="button" key={name} className="m-year-month" onClick={() => onPickMonth(`${year}-${pad(m + 1)}-01`)}>
            <strong className={current ? "current" : ""}>{name}</strong>
            <span className="m-year-grid">
              {rows.flatMap((row) =>
                row.days.map((x) => (
                  <i key={x.day} className={`${x.inMonth ? "" : "out"}${x.day === today ? " today" : ""}`}>
                    {x.inMonth ? parseIso(x.day).getDate() : ""}
                  </i>
                )),
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
