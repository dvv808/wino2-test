import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as a from "./assets/index";
import { Summary } from "./Summary";
import { Icon } from "./ui";
import { DOCUMENTS, useWorkflow, type ApprovalStep } from "./workflow";

/**
 * The Aufgaben / Kommentare / Verlauf / Zusammenfassung panel. The advisor sees
 * it inside the Dokumentenfreigabe and Signaturen steps, the Bestandsmanager on
 * the Freigabe page. Everything except Aufgaben is identical on both sides.
 */
export type ApprovalTab = "aufgaben" | "kommentare" | "verlauf" | "zusammenfassung";

const MORE_LABEL = "Weitere Aktionen";

/** Gap and side padding of the bar, needed to work out how many tabs fit. */
const TAB_GAP = 8;
const BAR_PADDING = 30;

export function ApprovalTabsBar({
  active,
  onSelect,
  taskCount,
  commentCount,
}: {
  active: ApprovalTab;
  onSelect: (tab: ApprovalTab) => void;
  taskCount: number;
  commentCount: number;
}) {
  const tabs: { id: ApprovalTab; label: string }[] = [
    { id: "aufgaben", label: `Aufgaben (${taskCount})` },
    { id: "kommentare", label: `Kommentare (${commentCount})` },
    { id: "verlauf", label: "Verlauf" },
    { id: "zusammenfassung", label: "Zusammenfassung" },
  ];

  const barRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(tabs.length);
  const [open, setOpen] = useState(false);
  const labels = tabs.map((tab) => tab.label).join("|");

  /**
   * The tabs are measured in a hidden copy of the full row, so the widths stay
   * available even while some of them are collapsed into the dropdown.
   */
  useLayoutEffect(() => {
    const bar = barRef.current;
    const ruler = rulerRef.current;
    if (!bar || !ruler) return;

    function fit() {
      if (!bar || !ruler) return;
      const widths = Array.from(ruler.children).map((child) => child.clientWidth);
      const more = widths[widths.length - 1];
      const tabWidths = widths.slice(0, -1);
      const available = bar.clientWidth - BAR_PADDING;

      const full = tabWidths.reduce((sum, width) => sum + width + TAB_GAP, -TAB_GAP);
      if (full <= available) {
        setShown(tabWidths.length);
        return;
      }

      /* Everything no longer fits, so the dropdown needs room of its own. */
      let used = more;
      let count = 0;
      for (const width of tabWidths) {
        if (used + TAB_GAP + width > available) break;
        used += TAB_GAP + width;
        count += 1;
      }
      setShown(count);
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [labels]);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const visible = tabs.slice(0, shown);
  const collapsed = tabs.slice(shown);
  const activeIsCollapsed = collapsed.some((tab) => tab.id === active);

  return (
    <div className="atabs" ref={barRef}>
      <div className="atabs-ruler" ref={rulerRef} aria-hidden="true">
        {tabs.map((tab) => (
          <span className="atab" key={tab.id}>
            {tab.label}
          </span>
        ))}
        <span className="atab atab-more">
          {MORE_LABEL}
          <Icon src={a.chevronDown} size={14} />
        </span>
      </div>

      {visible.map((tab) => (
        <button
          type="button"
          key={tab.id}
          className={`atab${active === tab.id ? " active" : ""}`}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}

      {collapsed.length ? (
        <div className="atabs-menu" ref={menuRef}>
          <button
            type="button"
            className={`atab atab-more${activeIsCollapsed ? " active" : ""}`}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {MORE_LABEL}
            <Icon src={a.chevronDown} size={14} />
          </button>
          {open ? (
            <ul className="atabs-list">
              {collapsed.map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    className={active === tab.id ? "active" : undefined}
                    onClick={() => {
                      setOpen(false);
                      onSelect(tab.id);
                    }}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** The document name over the step label, e.g. "Maklervereinbarung / Signaturen". */
export function DocHeading({ label }: { label: string }) {
  const { activeDoc } = useWorkflow();

  return (
    <div className="doc-heading">
      <strong>{DOCUMENTS[activeDoc] ?? DOCUMENTS[0]}</strong>
      <span>
        <Icon src={a.shelveToggle} size={18} />
        {label}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Aufgaben                                                                   */
/* -------------------------------------------------------------------------- */

export type Task = { title?: string; text: string };

export function AufgabenList({ items }: { items: Task[] }) {
  return (
    <ul className="atasks">
      {items.map((item, index) => (
        <li key={`${item.title ?? item.text}-${index}`}>
          {item.title ? (
            <p>
              <strong>{item.title}</strong>
              {item.text}
            </p>
          ) : (
            <p>{item.text}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** What the Bestandsmanager has to check, which differs per step. */
export const MANAGER_TASKS: Record<ApprovalStep, Task[]> = {
  docs: [
    {
      title: "Besondere Bedingungen",
      text: "Es wurden besondere Bedingungen eingefügt. Bitte überprüfen.",
    },
    {
      title: "Honorar: Zahlweise Dauer",
      text: "Bitte überprüfe die Zahlweise auf ihre Dauer.",
    },
    {
      title: "Bankverbindung abweichend",
      text: "Achtung die Bankverbindung ist nicht die des Partners.",
    },
    {
      title: "Honorar-Modell: Mail",
      text: "Achtung, die Mail ist nicht die des Partners.",
    },
  ],
  sign: [
    { text: "Überprüfe die Unterschriften der unterzeichneten Personen" },
    { text: "Checke das originale Dokumente mit dem unterzeichneten auf Gleichheit" },
    { text: "Unterschreibe das Dokument digital." },
  ],
};

/** What the advisor still has to do before requesting the Freigabe. */
export const ADVISOR_TASKS: Record<ApprovalStep, Task[]> = {
  docs: [
    {
      text: "Bitte gehe die Dokumente noch einmal durch und bestätige diese unten durch die Freigabeanforderung.",
    },
    {
      text: "Anschließend werden diese durch den Bestandsmanager geprüft und zur finalen Signatur freigegeben.",
    },
  ],
  sign: [
    { text: "Lade das unterzeichnete Dokument hoch oder nutze die digitale Unterschrift." },
  ],
};

/* -------------------------------------------------------------------------- */
/* People                                                                     */
/* -------------------------------------------------------------------------- */

export type Stamp = { date: string; time: string };

export type Person = { name: string; photo: string };

/** Names run surname first, so "Auer Christine" shortens to AUCH. */
export function codeFor(name: string) {
  const [last = "", first = ""] = name.split(" ");
  return `${last.slice(0, 2)}${first.slice(0, 2)}`.toUpperCase();
}

export const ADVISOR = {
  name: "Auer Christine",
  role: "Beratung & Service",
  photo: a.empChristine,
};

export const MANAGER = {
  name: "Adams Anna",
  role: "Geschäftsleitung",
  photo: a.reqAnna,
};

const SUPERVISOR = { name: "Dullon Lucy", role: "Leitung", photo: a.empLucy };

export function PersonAvatar({
  person,
  size,
  bordered = false,
}: {
  person: Person;
  size: number;
  bordered?: boolean;
}) {
  /* The dot keeps its proportion as the avatar shrinks. */
  const dot = Math.round(size * 0.22 * 10) / 10;

  return (
    <span
      className={`pavatar${bordered ? " bordered" : ""}`}
      style={{ width: size, height: size }}
    >
      <img className="pavatar-photo" src={person.photo} alt="" />
      <img
        className="pavatar-dot"
        src={bordered ? a.dotOnlineWhite : a.dotOnline}
        alt=""
        width={dot}
        height={dot}
      />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Kommentare                                                                 */
/* -------------------------------------------------------------------------- */

export type Comment = { person: Person; text: string; at?: Stamp };

/** Sorts "12.03.2027" + "13:33" chronologically. */
function sortKey(at?: Stamp) {
  if (!at) return "";
  const [day, month, year] = at.date.split(".");
  return `${year}${month}${day}${at.time}`;
}

/**
 * The note from the request, the note from the decision, and anything typed
 * into the thread since, oldest first.
 */
export function buildComments({
  note,
  notePerson,
  noteAt,
  decision,
  decisionAt,
  posted = [],
}: {
  note?: string;
  notePerson: Person;
  noteAt?: Stamp;
  decision?: string;
  decisionAt?: Stamp;
  posted?: Comment[];
}): Comment[] {
  const thread: (Comment | null)[] = [
    note ? { person: notePerson, text: note, at: noteAt } : null,
    decision ? { person: MANAGER, text: decision, at: decisionAt } : null,
    ...posted,
  ];

  return thread
    .filter((entry): entry is Comment => Boolean(entry))
    .sort((left, right) => sortKey(left.at).localeCompare(sortKey(right.at)));
}

/** The composer at the foot of the thread. The buttons stay hidden until it is focused. */
function CommentComposer({ author, onPost }: { author: Person; onPost: (text: string) => void }) {
  const [draft, setDraft] = useState("");
  const [active, setActive] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement | null>(null);

  function grow(box: HTMLTextAreaElement) {
    box.style.height = "auto";
    box.style.height = `${box.scrollHeight}px`;
  }

  function reset() {
    setDraft("");
    setActive(false);
    if (boxRef.current) boxRef.current.style.height = "";
  }

  return (
    <li className="komm-row">
      <PersonAvatar person={author} size={31} bordered />
      <div className="komm-col">
        <img className="komm-tail light" src={a.bubbleTailLight} alt="" />
        <div className="komm-bubble compose">
          <textarea
            ref={boxRef}
            rows={1}
            value={draft}
            placeholder="Kommentar hinzufügen..."
            onFocus={() => setActive(true)}
            onChange={(event) => {
              setDraft(event.target.value);
              grow(event.target);
            }}
          />
        </div>

        {active ? (
          <div className="komm-actions">
            <button type="button" className="btn-secondary btn-xs" onClick={reset}>
              Abbrechen
            </button>
            <button
              type="button"
              className="btn-primary btn-xs"
              disabled={!draft.trim()}
              onClick={() => {
                onPost(draft.trim());
                reset();
              }}
            >
              Speichern
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function KommentareTab({
  comments,
  author,
  onPost,
}: {
  comments: Comment[];
  author: Person;
  onPost: (text: string) => void;
}) {
  return (
    <>
      {comments.length ? null : (
        <p className="atab-empty">Zu dieser Freigabe wurde noch kein Kommentar erfasst.</p>
      )}

      <ul className="komm">
        {comments.map((entry, index) => (
          <li className="komm-row" key={`${entry.person.name}-${index}`}>
            <PersonAvatar person={entry.person} size={37} bordered />
            <div className="komm-col">
              {/* Sits before the bubble so the bubble paints over its inner half. */}
              <img className="komm-tail" src={a.bubbleTail} alt="" />
              <div className="komm-bubble">
                <div className="komm-head">
                  <strong>{entry.person.name}</strong>
                  <button type="button" className="komm-menu" aria-label="Weitere Aktionen">
                    <Icon src={a.contextMenu} size={18} />
                  </button>
                </div>
                <p>{entry.text}</p>
              </div>
              {entry.at ? (
                <time className="komm-time">
                  {entry.at.date}, um {entry.at.time}
                </time>
              ) : null}
            </div>
          </li>
        ))}

        <CommentComposer author={author} onPost={onPost} />
      </ul>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Verlauf                                                                    */
/* -------------------------------------------------------------------------- */

export type Change = "added" | "changed" | "removed" | "sent";

const CHANGE: Record<Change, { label: string; icon: string }> = {
  added: { label: "Hinzugefügt", icon: a.badgeAdd },
  changed: { label: "Geändert", icon: a.badgeEdit },
  removed: { label: "Gelöscht", icon: a.badgeClose },
  sent: { label: "Gesendet", icon: a.badgeSent },
};

export type Entry = {
  person: Person;
  change: Change;
  field: string;
  from?: string;
  to?: string;
  at: Stamp;
};

/** What the advisor did while filling the workflow in, oldest first. */
export const VERLAUF: Entry[] = [
  {
    person: ADVISOR,
    change: "added",
    field: "Telefonnummer Mobil",
    to: "+43 1711 313 22",
    at: { date: "12.03.2027", time: "09:14" },
  },
  {
    person: ADVISOR,
    change: "added",
    field: "E-Mail",
    to: "julia.atkinson@mail.at",
    at: { date: "12.03.2027", time: "09:16" },
  },
  {
    person: ADVISOR,
    change: "added",
    field: "Postadresse",
    to: "Mondseestrasse 32, A-5310 Mondsee",
    at: { date: "12.03.2027", time: "09:21" },
  },
  {
    person: ADVISOR,
    change: "added",
    field: "Honorar-Modell",
    to: "Privat · EUR 120,00 pro Jahr, zahlbar in vier Teilbeträgen",
    at: { date: "12.03.2027", time: "10:01" },
  },
  {
    person: ADVISOR,
    change: "added",
    field: "Individuelle Vereinbarungen",
    to: "Es wird vereinbart, dass für die Dauer von zwölf Monaten ein Alleinvermittlungsauftrag besteht.",
    at: { date: "12.03.2027", time: "10:01" },
  },
  {
    person: ADVISOR,
    change: "added",
    field: "Bankverbindung",
    to: "Neon Bank · AT 2303 20002 0000 0002 0012",
    at: { date: "12.03.2027", time: "10:07" },
  },
  {
    person: MANAGER,
    change: "changed",
    field: "Honorarbetrag",
    from: "EUR 120,00",
    to: "EUR 170,00",
    at: { date: "12.03.2027", time: "13:01" },
  },
  {
    person: SUPERVISOR,
    change: "removed",
    field: "Individuelle Vereinbarungen",
    to: "Es wird vereinbart, dass für die Dauer von zwölf Monaten ein Kündigungsverzicht besteht.",
    at: { date: "12.03.2027", time: "13:33" },
  },
];

/**
 * The request and the decision that close out the timeline. Both roles see the
 * same two entries, they just source the stamps from different places.
 */
export function approvalTimeline({
  requester = ADVISOR,
  sentAt,
  note,
  decidedAt,
  decision,
}: {
  requester?: Person;
  sentAt?: Stamp;
  note?: string;
  decidedAt?: Stamp;
  decision?: "granted" | "rejected" | null;
}): Entry[] {
  const entries: Entry[] = [];

  if (sentAt) {
    entries.push({
      person: requester,
      change: "sent",
      field: "Freigabe angefordert",
      to: note,
      at: sentAt,
    });
  }

  if (decision && decidedAt) {
    entries.push({
      person: MANAGER,
      change: "changed",
      field: "Freigabe",
      from: "offen",
      to: decision === "rejected" ? "abgelehnt" : "genehmigt",
      at: decidedAt,
    });
  }

  return entries;
}

function VerlaufRow({ entry }: { entry: Entry }) {
  const [open, setOpen] = useState(false);
  const { label, icon } = CHANGE[entry.change];

  return (
    <li className="vl-row">
      <div className="vl-when">
        <button
          type="button"
          className="vl-marker"
          aria-expanded={open}
          aria-label={open ? "Eintrag zuklappen" : "Eintrag aufklappen"}
          onClick={() => setOpen(!open)}
        >
          <Icon src={open ? a.verlaufOpen : a.verlaufClosed} size={18} />
        </button>
        <p className="vl-date">
          {entry.at.date}
          <br />
          {entry.at.time}
        </p>
      </div>

      <div className="vl-what">
        <span className={`vl-badge ${entry.change}`}>
          <Icon src={icon} size={10} />
          {label}
        </span>
        <strong className="vl-field">{entry.field}</strong>
        {entry.from ? (
          <p className={`vl-value diff${open ? " open" : ""}`}>
            <span>{entry.from}</span>
            <Icon src={a.arrowRight} size={14} />
            <span>{entry.to}</span>
          </p>
        ) : entry.to ? (
          <p className={`vl-value${open ? " open" : ""}`}>
            {entry.change === "removed" ? <s>{entry.to}</s> : entry.to}
          </p>
        ) : null}
      </div>

      <div className="vl-who">
        <PersonAvatar person={entry.person} size={32} />
        <small>{codeFor(entry.person.name)}</small>
      </div>
    </li>
  );
}

export function VerlaufTab({ extra = [] }: { extra?: Entry[] }) {
  /* Newest first, so the freshest change is the first thing read. */
  const entries = [...VERLAUF, ...extra].reverse();

  return (
    <div className="vl">
      <div className="vl-head">
        <span>
          Datum
          <Icon src={a.colFilter} size={12} />
        </span>
        <span>
          Typ
          <Icon src={a.colFilter} size={12} />
        </span>
        <span>
          Person
          <Icon src={a.colFilter} size={12} />
        </span>
      </div>

      <ol className="vl-rows">
        {entries.map((entry, index) => (
          <VerlaufRow entry={entry} key={`${entry.field}-${entry.at.time}-${index}`} />
        ))}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Zusammenfassung                                                            */
/* -------------------------------------------------------------------------- */

export function ZusammenfassungTab() {
  return (
    <div className="asummary">
      <Summary cards={["contact", "honorar", "terms"]} />
    </div>
  );
}
