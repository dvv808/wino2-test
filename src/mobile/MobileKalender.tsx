import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as a from "../assets/index";
import { addDays, duration, headerDate, hhmm, parseIso, seedWeek, weekStart } from "../home/calendar/calendarData";
import { loadArbeitszeiten, onArbeitszeitenChange } from "../home/calendar/arbeitszeit";
import { inCalendar, loadAntraege, onAntraegeChange, sollzeit } from "../home/calendar/homeoffice";
import { MiniMonth } from "../home/calendar/MiniMonth";
import { workMinutes } from "../home/calendar/overlap";
import { TERMINARTEN, ZEITARTEN, loadTermine, onTermineChange, saveTermine, type MobileTermin } from "./termine";
import { MobileOverlay } from "./MobileOverlay";
import { MonthView, YearView, stepDay, type DayData } from "./MobileViews";

/** Day → its month → its year, like Apple Calendar. */
export type MobileView = "tag" | "monat" | "jahr";
const MONTH_NAMES = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

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
  onHomeoffice,
  onTermin,
  onToast,
  visible,
  view,
  onView,
}: {
  view: MobileView;
  onView: (view: MobileView) => void;
  day: string;
  today: string;
  onDay: (day: string) => void;
  onArbeitszeit: () => void;
  onHomeoffice: () => void;
  /** Calendars ticked in the side nav: Lucy's own entries only show while "lucy" is ticked. */
  visible: Set<string>;
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
    // Scroll to the selected week itself (not a computed width), so the strip always starts on its Monday.
    const week = el?.children[WEEKS_AROUND] as HTMLElement | undefined;
    if (el && week) el.scrollLeft += week.getBoundingClientRect().left - el.getBoundingClientRect().left;
  }, [monday, view]);

  const seed = seedWeek(today);
  const holiday = seed.holidays.has(day);
  const allDay = seed.allDay.filter((x) => x.day === day);
  const mine = visible.has("lucy");
  const worked = mine ? arbeitszeiten[day] ?? [] : [];
  const homeoffice = mine ? inCalendar(antraege, day) : [];
  const dayTermine = mine ? termine.filter((t) => t.day === day).sort((x, y) => x.start - y.start) : [];
  /* Everything of a day, for the week and month views. */
  const dataOf = (d: string): DayData => ({
    termine: mine ? termine.filter((t) => t.day === d) : [],
    homeoffice: mine ? inCalendar(antraege, d) : [],
    worked: mine ? arbeitszeiten[d] ?? [] : [],
    allDay: seed.allDay.filter((x) => x.day === d).map((x) => x.title),
  });
  /* Overlay of an entry (Figma 22761:367180); reise = opened from the trip. */
  const [open, setOpen] = useState<{ t: MobileTermin; reise: boolean } | null>(null);
  const openEntry = (t: MobileTermin, reise = false) => setOpen({ t, reise });

  /* Swipe on the day view: left = next day, right = previous day (only a clear sideways move counts). */
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [slide, setSlide] = useState<"" | "next" | "prev">("");
  const onTouchStart = (event: React.TouchEvent) => {
    const t = event.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    setSlide(dx < 0 ? "next" : "prev");
    onDay(stepDay(day, view, dx < 0 ? 1 : -1));
  };
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
      {/* Date, actions and the day strip stay at the top while the day scrolls. */}
      <div className="m-kal-sticky">
      <div className="m-kal-top">
        <div className="m-kal-title">
          <h1>
            {view === "tag" ? headerDate(day) : view === "monat" ? `${MONTH_NAMES[parseIso(day).getMonth()]} ${parseIso(day).getFullYear()}` : parseIso(day).getFullYear()}
          </h1>
          {/* One step up: the day's month, the month's year (Apple Calendar). */}
          {view !== "jahr" ? (
            <button type="button" className="m-up" onClick={() => onView(view === "tag" ? "monat" : "jahr")}>
              <img src={a.mChevronLeft} alt="" width={7} height={12} className="m-up-chev" />
              {view === "tag" ? MONTH_NAMES[parseIso(day).getMonth()] : parseIso(day).getFullYear()}
            </button>
          ) : null}
        </div>
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
                  else if (item.label === "Homeoffice") onHomeoffice();
                  else onToast(`${item.label} folgt in der mobilen Version.`);
                }}
              >
                {item.tone === "homeoffice" ? <img src={a.hoDot} alt="" width={10} height={10} /> : <i className={`m-dot ${item.tone}`} />}
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Scrollable strip: dark pill = selected day, dot = today (Figma 22757:333934). */}
      {view === "tag" ? (
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
      ) : null}
      </div>

      {view === "jahr" ? (
        <div className={slide ? `m-swipe slide-${slide}` : "m-swipe"} key={`y${day.slice(0, 4)}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onAnimationEnd={() => setSlide("")}>
          <YearView
            day={day}
            today={today}
            onPickMonth={(first) => {
              onDay(first.slice(0, 7) === today.slice(0, 7) ? today : first);
              onView("monat");
            }}
          />
        </div>
      ) : view === "monat" ? (
        <div className={slide ? `m-swipe slide-${slide}` : "m-swipe"} key={`m${day.slice(0, 7)}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onAnimationEnd={() => setSlide("")}>
          <MonthView
            day={day}
            today={today}
            data={dataOf}
            onPickDay={onDay}
            onOpenDay={(d) => {
              onDay(d);
              onView("tag");
            }}
            onOpen={openEntry}
          />
        </div>
      ) : (
      <div className={slide ? `m-day slide-${slide}` : "m-day"} key={day} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onAnimationEnd={() => setSlide("")}>
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
                    <button type="button" aria-label="Reise öffnen" className="m-bar reise" style={{ top: top(t.abfahrt), height: top(t.start) - top(t.abfahrt) }} onClick={() => openEntry(t, true)} />
                    <button type="button" className="m-chip" style={{ top: top(t.abfahrt) }} onClick={() => openEntry(t, true)}>
                      Abfahrt {t.abfahrtOrt} <b>{hhmm(t.abfahrt)}</b>
                    </button>
                  </>
                ) : null}
                <i className={`m-bar ${toneOfCard(t)}`} style={{ top: top(t.start), height: top(t.end) - top(t.start) }} />
                <button type="button" className={`m-card ${toneOfCard(t)}`} style={{ top: top(t.start), height: Math.max(top(t.end) - top(t.start), 52) }} onClick={() => openEntry(t)}>
                  <b>{hhmm(t.start)}</b>
                  <b>{t.title}</b>
                  <span>{t.art}</span>
                  {t.ort ? <small>{t.ort}</small> : null}
                </button>
                {t.ankunft !== undefined ? (
                  <>
                    <button type="button" aria-label="Reise öffnen" className="m-bar reise" style={{ top: top(t.end), height: top(t.ankunft) - top(t.end) }} onClick={() => openEntry(t, true)} />
                    <button type="button" className="m-chip" style={{ top: top(t.ankunft) - 20 }} onClick={() => openEntry(t, true)}>
                      Ankunft {t.ankunftOrt} <b>{hhmm(t.ankunft)}</b>
                    </button>
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
      )}

      <div className="m-fab">
        <button type="button" aria-label={view === "tag" ? "Voriger Tag" : view === "monat" ? "Voriger Monat" : "Voriges Jahr"} onClick={() => onDay(stepDay(day, view, -1))}>
          <img src={a.mChevronLeft} alt="" width={8} height={14} />
        </button>
        <button type="button" className="m-fab-today" onClick={() => onDay(today)}>
          Heute
        </button>
        <button type="button" aria-label={view === "tag" ? "Nächster Tag" : view === "monat" ? "Nächster Monat" : "Nächstes Jahr"} onClick={() => onDay(stepDay(day, view, 1))}>
          <img src={a.mChevronLeft} alt="" width={8} height={14} className="m-flip" />
        </button>
      </div>

      {open ? (
        <MobileOverlay
          termin={open.t}
          reise={open.reise}
          onClose={() => setOpen(null)}
          onEdit={() => {
            setOpen(null);
            onToast("Bearbeiten folgt in der mobilen Version.");
          }}
          onDelete={() => {
            saveTermine(termine.filter((x) => x.id !== open.t.id));
            setOpen(null);
            onToast("Termin gelöscht");
          }}
        />
      ) : null}
    </div>
  );
}

const toneOfCard = (t: MobileTermin) => TERMINARTEN.find((x) => x.label === t.art.replace(/ \(Entwurf\)$/, ""))?.tone ?? "termin";
