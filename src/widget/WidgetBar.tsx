import { useEffect, useMemo, useState } from "react";
import * as a from "../assets/index";
import { addDays, formatDate } from "../lib/honorar/format";
import { useHonorar } from "../honorar/store";
import { setFocusFees } from "../honorar/focusFee";
import { noticeForMe } from "../honorar/ownership";
import type { HonorarNotice } from "../types/honorar";
import { useWorkflow } from "../workflow";
import { hhmm, iso, parseIso } from "../home/calendar/calendarData";
import {
  GENEHMIGER,
  decisions,
  focusAntrag,
  loadAntraege,
  markGelesen,
  onAntraegeChange,
  saveAntraege,
  type HomeofficeAntrag,
} from "../home/calendar/homeoffice";
import { markNoticeRead as markPruefNoticeRead, pruefNotices, showPruefungNext, usePruefungen } from "../person/pruefung";

/** Only the notifications tab is built; the other tabs are shown as in Figma but stay inactive. */
const TABS = [
  { id: "notifications", label: "Benachrichtigungen", icon: a.widgetBell },
  { id: "contacts", label: "Kontakte", icon: a.widgetContacts },
  { id: "calendar", label: "Kalender", icon: a.widgetCalendar },
  { id: "todo", label: "Aufgaben", icon: a.widgetTodo },
  { id: "notes", label: "Notizen", icon: a.widgetNotes },
];

type FilterId = "all" | "unread";

function kindOf(notice: HonorarNotice) {
  return notice.kind ?? "openItems";
}

/** One card in the list: an Honorar notice, or the decision on a Homeoffice request. */
type Card = {
  id: string;
  title: string;
  subject?: string;
  text: string;
  /** Local "YYYY-MM-DDTHH:MM". */
  createdAt: string;
  read: boolean;
  icon: string;
  open: () => void;
  /** Homeoffice decision: drawn as the Figma notice (22729:226663 / 226700 / 226729). */
  homeoffice?: HoNoticeStatus;
};

type HoNoticeStatus = "genehmigt" | "abgelehnt" | "zurueckgesetzt";

const HO_NOTICE: Record<HoNoticeStatus, { title: string; icon: string; word: string }> = {
  genehmigt: { title: "Wurde genehmigt", icon: a.hoStatusGenehmigt, word: "genehmigt" },
  abgelehnt: { title: "Wurde abgelehnt", icon: a.hoStatusAbgelehnt, word: "abgelehnt" },
  zurueckgesetzt: { title: "Wurde zurückgesetzt", icon: a.hoStatusZurueck, word: "zurückgesetzt" },
};

/** The Homeoffice glyph of the Figma notice: green circle with two white stripes. */
function HomeofficeGlyph() {
  return (
    <span className="wg-ho-glyph" aria-hidden="true">
      <img className="dot" src={a.hoNoticeEllipse} alt="" />
      <img className="stripe one" src={a.hoNoticeStripe} alt="" />
      <img className="stripe two" src={a.hoNoticeStripe} alt="" />
    </span>
  );
}

/** Homeoffice decision notice: "Homeoffice / Wurde …", status icon in front of the text, "Anzeigen". */
function HomeofficeNotice({ notice, status, onOpen }: { notice: Card; status: HoNoticeStatus; onOpen: () => void }) {
  const look = HO_NOTICE[status];
  return (
    <article className={notice.read ? "wg-ho" : "wg-ho unread"}>
      <div className="wg-ho-head">
        <span className="wg-ho-ico">
          <HomeofficeGlyph />
          {notice.read ? null : <span className="wg-ho-dot" />}
        </span>
        <span className="wg-ho-title">
          <span>Homeoffice</span>
          <strong>{look.title}</strong>
        </span>
      </div>
      <p className="wg-ho-text">
        <span className={`wg-ho-status ${status}`}>
          <img src={look.icon} alt="" />
        </span>
        {notice.text}
      </p>
      <button type="button" className="wg-ho-action" onClick={onOpen}>
        Anzeigen
      </button>
    </article>
  );
}

const WEEKDAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const pad = (n: number) => String(n).padStart(2, "0");
const localStamp = (isoTime: string) => {
  const d = new Date(isoTime);
  return `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** A request's decision as the notice shows it ("abgelehnt" once the request knows that outcome). */
function hoNoticeStatus(status: string): HoNoticeStatus {
  return status === "genehmigt" ? "genehmigt" : status === "abgelehnt" ? "abgelehnt" : "zurueckgesetzt";
}

function homeofficeText(x: HomeofficeAntrag) {
  const d = parseIso(x.day);
  const when = `${WEEKDAY[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} · ${hhmm(x.start)} - ${hhmm(x.end)}`;
  const reason = x.entscheidNotiz ? ` „${x.entscheidNotiz}“` : "";
  const word = HO_NOTICE[hoNoticeStatus(x.status)].word;
  return `Dein Homeoffice am ${when} wurde ${word}.${reason}`;
}

function dayLabel(day: string, today: string) {
  if (day === today) return "Heute";
  if (day === addDays(today, -1)) return "Gestern";
  return formatDate(day);
}

function NoticeCard({ notice, onOpen }: { notice: Card; onOpen: () => void }) {
  const time = notice.createdAt.slice(11, 16);
  return (
    <article className={notice.read ? "wg-card" : "wg-card unread"}>
      <div className="wg-card-head">
        <span className="wg-card-ico">
          <img src={notice.icon} alt="" />
          {notice.read ? null : <span className="wg-card-dot" />}
        </span>
        <span className="wg-card-title">
          <span>{notice.title ?? "Hinweis"}</span>
          {notice.subject ? <strong>{notice.subject}</strong> : null}
        </span>
        {time ? <time>{time}</time> : null}
      </div>
      <p className="wg-card-text">{notice.text}</p>
      <button type="button" className="wg-card-action" onClick={onOpen}>
        Ansehen
      </button>
    </article>
  );
}

/** Right-hand widget bar, shown while "Widget einschalten" is on in the profile menu. */
export function WidgetBar() {
  const { widgetOn, openMeinBereich, setMeinBereichNav, openHome, openPruefung } = useWorkflow();
  // Stammdaten-Prüfungen: rejected Änderungswünsche and the closed Prüfung reach the advisor here.
  const pruefList = usePruefungen();
  // Homeoffice decisions (HRM / Freigaben) reach the employee here.
  const [homeoffice, setHomeoffice] = useState(loadAntraege);
  useEffect(() => onAntraegeChange(setHomeoffice), []);
  const { state, markNoticeRead, markNoticesRead } = useHonorar();
  const [filter, setFilter] = useState<FilterId>("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.body.classList.toggle("widget-on", widgetOn);
    return () => document.body.classList.remove("widget-on");
  }, [widgetOn]);

  // Only the logged-in person's notices, told for their own invoices (the rows of their Honorare/Forderungen).
  const mine = useMemo((): Card[] => {
    const honorar = state.notices
      .map((notice) => noticeForMe(state, notice))
      .filter((notice): notice is NonNullable<typeof notice> => Boolean(notice))
      .map(
        (notice): Card => ({
          id: notice.id,
          title: notice.title ?? "Hinweis",
          subject: notice.subject,
          text: notice.text,
          createdAt: notice.createdAt,
          read: !!notice.read,
          icon: kindOf(notice) === "advisor" ? a.widgetCardMail : a.widgetCardCalendar,
          open: () => openHonorar(notice),
        }),
      );
    const ho = decisions(homeoffice).map(
      (x): Card => ({
        id: `ho-${x.id}`,
        title: x.status === "genehmigt" ? "Homeoffice genehmigt" : "Homeoffice zurückgesetzt",
        subject: x.entschiedenVon ?? GENEHMIGER.name,
        text: homeofficeText(x),
        createdAt: onDemoDay(localStamp(x.entschieden!)),
        read: !!x.gelesen,
        icon: x.status === "genehmigt" ? a.calHomeofficeApproved : a.calUrlaubRejected,
        homeoffice: hoNoticeStatus(x.status),
        open: () => {
          saveAntraege(markGelesen(loadAntraege(), x.id));
          focusAntrag(x.id);
          openHome("Planner", "Kalender");
        },
      }),
    );
    const pr = pruefNotices(pruefList).map(
      (notice): Card => ({
        id: notice.id,
        title: notice.title,
        subject: notice.subject,
        text: notice.text,
        createdAt: onDemoDay(localStamp(notice.at)),
        read: notice.read,
        icon: notice.title.startsWith("Änderung") ? a.calUrlaubRejected : a.calHomeofficeApproved,
        open: () => {
          markPruefNoticeRead(notice.pruefungId, notice.id);
          showPruefungNext(notice.pruefungId);
          openPruefung(notice.partnerId);
        },
      }),
    );
    return [...honorar, ...ho, ...pr];

    /** The Honorar notices live on the demo date: a decision from today is filed under that same "Heute". */
    function onDemoDay(stamp: string) {
      return stamp.slice(0, 10) === iso(new Date()) ? `${state.today}${stamp.slice(10)}` : stamp;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, homeoffice, pruefList]);
  const unread = mine.filter((notice) => !notice.read).length;

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const shown = mine
      .filter((notice) => filter === "all" || !notice.read)
      .filter(
        (notice) =>
          !needle ||
          [notice.title, notice.subject, notice.text].some((part) => part?.toLowerCase().includes(needle)),
      )
      .sort((x, y) => (newestFirst ? y.createdAt.localeCompare(x.createdAt) : x.createdAt.localeCompare(y.createdAt)));
    const byDay = new Map<string, Card[]>();
    for (const notice of shown) {
      const day = notice.createdAt.slice(0, 10);
      byDay.set(day, [...(byDay.get(day) ?? []), notice]);
    }
    return [...byDay.entries()];
  }, [mine, filter, newestFirst, query]);

  if (!widgetOn) return null;

  /** "Ansehen": Mein Bereich → Bestand → Honorare/Forderungen, on the invoice's month, with its rows marked. */
  function openHonorar(notice: HonorarNotice) {
    markNoticeRead(notice.id);
    setMeinBereichNav({ area: "Bestand", page: "Honorare/Forderungen" });
    openMeinBereich();
    setFocusFees(notice.feeIds ?? (notice.feeId ? [notice.feeId] : []));
  }

  return (
    <aside className="wg-bar" aria-label="Widget">
      <div className="wg-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === "notifications" ? "wg-tab active" : "wg-tab"}
            aria-label={tab.label}
            aria-pressed={tab.id === "notifications"}
            disabled={tab.id !== "notifications"}
          >
            <img src={tab.icon} alt="" width={42} height={42} />
            {tab.id === "notifications" && unread ? <span className="wg-tab-badge">{unread}</span> : null}
          </button>
        ))}
        <span className="wg-tab-bump">
          <img src={a.widgetTabCurve} alt="" />
        </span>
      </div>

      <div className="wg-body">
        <div className="wg-head">
          <h2>Benachrichtigungen{unread ? ` (${unread} Neue)` : ""}</h2>
          <button
            type="button"
            className="wg-search-btn"
            aria-label="Benachrichtigungen durchsuchen"
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((current) => !current);
              setQuery("");
            }}
          >
            <img src={a.widgetSearch} alt="" />
          </button>
        </div>
        {searchOpen ? (
          <input
            className="wg-search"
            type="search"
            placeholder="Suchen"
            value={query}
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
          />
        ) : null}

        <div className="wg-chips">
          <div className="wg-chips-left">
            <button
              type="button"
              className={filter === "all" ? "wg-chip active" : "wg-chip"}
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
            >
              Alle
            </button>
            <button
              type="button"
              className={filter === "unread" ? "wg-unread active" : "wg-unread"}
              aria-pressed={filter === "unread"}
              onClick={() => setFilter("unread")}
            >
              Ungelesen ({unread})
            </button>
          </div>
          {unread ? (
            <button
              type="button"
              className="wg-mark-read"
              onClick={() => {
                markNoticesRead();
                saveAntraege(markGelesen(loadAntraege()));
              }}
            >
              Alle als gelesen markieren
            </button>
          ) : null}
        </div>

        {groups.length === 0 ? (
          <p className="wg-empty">
            Keine Benachrichtigungen. Neue Offene Posten, Nachrichten an Berater und Entscheidungen zu deinen Anträgen erscheinen hier.
          </p>
        ) : (
          groups.map(([day, notices], index) => (
            <section key={day} className="wg-group">
              <div className="wg-group-head">
                <h3>{dayLabel(day, state.today)}</h3>
                {index === 0 ? (
                  <button type="button" className="wg-sort" onClick={() => setNewestFirst((current) => !current)}>
                    Sortieren nach: {newestFirst ? "Neueste" : "Älteste"}
                  </button>
                ) : null}
              </div>
              <div className="wg-list">
                {notices.map((notice) => (
                  notice.homeoffice ? (
                    <HomeofficeNotice key={notice.id} notice={notice} status={notice.homeoffice} onOpen={notice.open} />
                  ) : (
                    <NoticeCard key={notice.id} notice={notice} onOpen={notice.open} />
                  )
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
