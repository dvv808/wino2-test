import { useEffect, useMemo, useState } from "react";
import * as a from "../assets/index";
import { addDays, formatDate } from "../lib/honorar/format";
import { useHonorar } from "../honorar/store";
import { isOpenItemFee } from "../lib/honorar/queries";
import type { HonorarNotice } from "../types/honorar";
import { useWorkflow } from "../workflow";

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

function dayLabel(day: string, today: string) {
  if (day === today) return "Heute";
  if (day === addDays(today, -1)) return "Gestern";
  return formatDate(day);
}

function NoticeCard({ notice, onOpen }: { notice: HonorarNotice; onOpen: () => void }) {
  const time = notice.createdAt.slice(11, 16);
  return (
    <article className={notice.read ? "wg-card" : "wg-card unread"}>
      <div className="wg-card-head">
        <span className="wg-card-ico">
          <img src={kindOf(notice) === "advisor" ? a.widgetCardMail : a.widgetCardCalendar} alt="" />
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
  const { widgetOn, openFinanzen } = useWorkflow();
  const { state, markNoticeRead, markNoticesRead } = useHonorar();
  const [filter, setFilter] = useState<FilterId>("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.body.classList.toggle("widget-on", widgetOn);
    return () => document.body.classList.remove("widget-on");
  }, [widgetOn]);

  const unread = state.notices.filter((notice) => !notice.read).length;

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const shown = state.notices
      .filter((notice) => filter === "all" || !notice.read)
      .filter(
        (notice) =>
          !needle ||
          [notice.title, notice.subject, notice.text].some((part) => part?.toLowerCase().includes(needle)),
      )
      .sort((x, y) => (newestFirst ? y.createdAt.localeCompare(x.createdAt) : x.createdAt.localeCompare(y.createdAt)));
    const byDay = new Map<string, HonorarNotice[]>();
    for (const notice of shown) {
      const day = notice.createdAt.slice(0, 10);
      byDay.set(day, [...(byDay.get(day) ?? []), notice]);
    }
    return [...byDay.entries()];
  }, [state.notices, filter, newestFirst, query]);

  if (!widgetOn) return null;

  function open(notice: HonorarNotice) {
    markNoticeRead(notice.id);
    const fee = notice.feeId ? state.fees.find((entry) => entry.id === notice.feeId) : undefined;
    if (fee && !isOpenItemFee(state, fee)) {
      openFinanzen("month", fee.month, "status");
      return;
    }
    openFinanzen("openItems");
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
            <button type="button" className="wg-mark-read" onClick={() => markNoticesRead()}>
              Alle als gelesen markieren
            </button>
          ) : null}
        </div>

        {groups.length === 0 ? (
          <p className="wg-empty">
            Keine Benachrichtigungen. Neue Offene Posten und Nachrichten an Berater erscheinen hier.
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
                  <NoticeCard key={notice.id} notice={notice} onOpen={() => open(notice)} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
