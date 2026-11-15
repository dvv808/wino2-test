import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as a from "../assets/index";
import { addDays, duration, headerDate, hhmm, parseIso, seedWeek, weekStart } from "../home/calendar/calendarData";
import { loadArbeitszeiten, onArbeitszeitenChange } from "../home/calendar/arbeitszeit";
import { inCalendar, loadAntraege, onAntraegeChange, sollzeit } from "../home/calendar/homeoffice";
import { MiniMonth } from "../home/calendar/MiniMonth";
import { workMinutes } from "../home/calendar/overlap";
import { TERMINARTEN, ZEITARTEN, loadTermine, onTermineChange } from "./termine";

/** Mobile day view of the Kalender (Figma 19075:470560; logic 22757:333933 and 22757:333934). */
const FROM = 6 * 60;
const TO = 22 * 60;
const HOUR = 54;
const top = (min: number) => ((Math.min(Math.max(min, FROM), TO) - FROM) / 60) * HOUR;
const LETTERS = ["M", "D", "M", "D", "F", "S", "S"];
const WEEKS_AROUND = 4;

type Popup = "monat" | "termin" | "zeit" | null;

export function MobileKalender({
  day,
  today,
  onDay,
  onArbeitszeit,
  onTermin,
  onToast,
}: {
  day: string;
  today: string;
  onDay: (day: string) => void;
  onArbeitszeit: () => void;
  onTermin: (art: string) => void;
  onToast: (message: string) => void;
}) {
  const [popup, setPopup] = useState<Popup>(null);
  const [arbeitszeiten, setArbeitszeiten] = useState(loadArbeitszeiten);
  const [antraege, setAntraege] = useState(loadAntraege);
  const [termine, setTermine] = useState(loadTermine);
  useEffect(() => onArbeitszeitenChange(setArbeitszeiten), []);
  useEffect(() => onAntraegeChange(setAntraege), []);
  useEffect(() => onTermineChange(setTermine), []);

  /* Day strip: scrollable week by week; the week of the selected day sits in the middle of the rendered range. */
  const monday = weekStart(day);
  const weeks = Array.from({ length: WEEKS_AROUND * 2 + 1 }, (_, i) => addDays(monday, (i - WEEKS_AROUND) * 7));
  const strip = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = strip.current;
    if (el) el.scrollLeft = WEEKS_AROUND * el.clientWidth;
  }, [monday]);

  const seed = seedWeek(day);
  const holiday = seed.holidays.has(day);
  const allDay = seed.allDay.filter((x) => x.day === day);
  const worked = arbeitszeiten[day] ?? [];
  const homeoffice = inCalendar(antraege, day);
  const dayTermine = termine.filter((t) => t.day === day).sort((x, y) => x.start - y.start);
  const soll = holiday ? 0 : sollzeit(day);
  const ist = workMinutes(worked);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = day === today && nowMin >= FROM && nowMin <= TO;

  const hours = Array.from({ length: (TO - FROM) / 60 + 1 }, (_, i) => FROM + i * 60);
  const weekend = [0, 6].includes(parseIso(day).getDay());
  const toggle = (next: Exclude<Popup, null>) => setPopup((current) => (current === next ? null : next));

  return (
    <div className="m-kal">
      <div className="m-kal-top">
        <h1>{headerDate(day)}</h1>
        <div className="m-kal-actions">
          <button type="button" className={popup === "monat" ? "m-round open" : "m-round"} aria-label="Kalender" aria-expanded={popup === "monat"} onClick={() => toggle("monat")}>
            <img src={a.mCalGrid} alt="" width={28} height={28} />
          </button>
          <button type="button" className={popup === "termin" ? "m-round open" : "m-round"} aria-label="Termin erfassen" aria-expanded={popup === "termin"} onClick={() => toggle("termin")}>
            <img src={a.calNeuerTermin} alt="" width={22} height={25} />
          </button>
          <button type="button" className={popup === "zeit" ? "m-round open" : "m-round"} aria-label="Arbeitszeit erfassen" aria-expanded={popup === "zeit"} onClick={() => toggle("zeit")}>
            <img src={a.calZeiterfassung} alt="" width={22} height={25} />
          </button>
        </div>

        {popup ? <button type="button" className="m-backdrop" aria-label="Schließen" onClick={() => setPopup(null)} /> : null}
        {popup === "monat" ? (
          <div className="m-pop m-pop-monat">
            <MiniMonth
              day={day}
              today={today}
              onPick={(d) => {
                onDay(d);
                setPopup(null);
              }}
            />
          </div>
        ) : null}
        {popup === "termin" ? (
          <div className="m-pop m-pop-list" role="menu">
            <strong>Termin erfassen</strong>
            {TERMINARTEN.map((item) => (
              <button
                type="button"
                role="menuitem"
                key={item.label}
                onClick={() => {
                  setPopup(null);
                  onTermin(item.label);
                }}
              >
                <i className={`m-dot ${item.tone}`} />
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        {popup === "zeit" ? (
          <div className="m-pop m-pop-list narrow" role="menu">
            <strong>Zeiterfassung</strong>
            {ZEITARTEN.map((item) => (
              <button
                type="button"
                role="menuitem"
                key={item.label}
                onClick={() => {
                  setPopup(null);
                  if (item.label === "Arbeitszeit") onArbeitszeit();
                  else onToast(`${item.label} folgt in der mobilen Version.`);
                }}
              >
                <i className={`m-dot ${item.tone}`} />
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Scrollable strip: dark pill = selected day, dot = today (Figma 22757:333934). */}
      <div className="m-strip" ref={strip}>
        {weeks.map((start) => (
          <div className="m-strip-week" key={start}>
            {LETTERS.map((letter, i) => {
              const d = addDays(start, i);
              const cls = `m-strip-day${d === day ? " selected" : ""}${i > 4 ? " weekend" : ""}${d === today ? " today" : ""}`;
              return (
                <button type="button" key={d} className={cls} aria-pressed={d === day} aria-label={headerDate(d)} onClick={() => onDay(d)}>
                  <small>{letter}</small>
                  <b>{String(parseIso(d).getDate()).padStart(2, "0")}</b>
                  {d === today ? <i /> : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="m-day">
        <div className="m-day-allday">
          {allDay.map((item) => (
            <span key={item.id} className={item.office ? "office" : ""}>
              {item.title}
            </span>
          ))}
        </div>
        <div className="m-grid" style={{ height: ((TO - FROM) / 60) * HOUR }}>
          {hours.map((h) => (
            <span className="m-hour" key={h} style={{ top: top(h) }}>
              {hhmm(h)}
            </span>
          ))}
          <div className={weekend || holiday ? "m-grid-body off" : "m-grid-body"}>
            {hours.slice(1, -1).map((h) => (
              <i className="m-line" key={h} style={{ top: top(h) }} />
            ))}
            {/* Outside the usual working hours the background is grey, as in the desktop week. */}
            {weekend || holiday ? null : (
              <>
                <i className="m-off" style={{ top: 0, height: top(8 * 60) }} />
                <i className="m-off" style={{ top: top(17 * 60), bottom: 0 }} />
              </>
            )}
            {homeoffice.map((x) => (
              <i key={x.id} className={`m-bar homeoffice ${x.status}`} style={{ top: top(x.start), height: top(x.end) - top(x.start) }} title="Homeoffice" />
            ))}
            {worked.map((b, i) => (
              <i key={i} className="m-bar worked" style={{ top: top(b.start), height: top(b.end) - top(b.start) }} title="Arbeitszeit" />
            ))}
            {dayTermine.map((t) => (
              <div key={t.id}>
                {t.abfahrt !== undefined ? (
                  <>
                    <i className="m-bar reise" style={{ top: top(t.abfahrt), height: top(t.start) - top(t.abfahrt) }} />
                    <span className="m-chip" style={{ top: top(t.abfahrt) }}>
                      Abfahrt {t.abfahrtOrt} <b>{hhmm(t.abfahrt)}</b>
                    </span>
                  </>
                ) : null}
                <i className="m-bar termin" style={{ top: top(t.start), height: top(t.end) - top(t.start) }} />
                <div className="m-card" style={{ top: top(t.start), height: Math.max(top(t.end) - top(t.start), 52) }}>
                  <b>{hhmm(t.start)}</b>
                  <b>{t.title}</b>
                  <span>{t.art}</span>
                </div>
                {t.ankunft !== undefined ? (
                  <>
                    <i className="m-bar reise" style={{ top: top(t.end), height: top(t.ankunft) - top(t.end) }} />
                    <span className="m-chip" style={{ top: top(t.ankunft) - 20 }}>
                      Ankunft {t.ankunftOrt} <b>{hhmm(t.ankunft)}</b>
                    </span>
                  </>
                ) : null}
              </div>
            ))}
          </div>
          {showNow ? (
            <div className="m-now" style={{ top: top(nowMin) }}>
              <b>{hhmm(nowMin)}</b>
            </div>
          ) : null}
        </div>
        <dl className="m-day-times">
          <div>
            <dt>Sollzeit:</dt>
            <dd>{duration(soll)}</dd>
          </div>
          <div>
            <dt>Istzeit:</dt>
            <dd>{duration(ist)}</dd>
          </div>
        </dl>
      </div>

      <div className="m-fab">
        <button type="button" aria-label="Voriger Tag" onClick={() => onDay(addDays(day, -1))}>
          <img src={a.mChevronLeft} alt="" width={8} height={14} />
        </button>
        <button type="button" className="m-fab-today" onClick={() => onDay(today)}>
          Heute
        </button>
        <button type="button" aria-label="Nächster Tag" onClick={() => onDay(addDays(day, 1))}>
          <img src={a.mChevronLeft} alt="" width={8} height={14} className="m-flip" />
        </button>
      </div>
    </div>
  );
}
