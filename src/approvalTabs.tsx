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

export const ADVISOR = { who: "Christine Auer", role: "Beratung & Service" };

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
/* Kommentare                                                                 */
/* -------------------------------------------------------------------------- */

export type Comment = { who: string; role: string; text: string };

/** The advisor's note from the request plus the manager's note from the decision. */
export function buildComments({
  note,
  noteBy,
  decision,
  rejected,
}: {
  note?: string;
  noteBy: string;
  decision?: string;
  rejected: boolean;
}): Comment[] {
  return [
    note ? { who: noteBy, role: "Anfrage an den Bestandsmanager", text: note } : null,
    decision
      ? {
          who: "Bestandsmanager",
          role: rejected ? "Begründung der Ablehnung" : "Anmerkung zur Genehmigung",
          text: decision,
        }
      : null,
  ].filter((entry): entry is Comment => Boolean(entry));
}

export function KommentareTab({ comments }: { comments: Comment[] }) {
  if (!comments.length) {
    return <p className="atab-empty">Zu dieser Freigabe wurde noch kein Kommentar erfasst.</p>;
  }

  return (
    <ul className="acomments">
      {comments.map((entry) => (
        <li className="acomment" key={entry.who}>
          <span className="acomment-head">
            <Icon src={a.comment} size={18} />
            <span>
              <strong>{entry.who}</strong>
              <small>{entry.role}</small>
            </span>
          </span>
          <p>{entry.text}</p>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Verlauf                                                                    */
/* -------------------------------------------------------------------------- */

export type Change = "added" | "changed" | "removed" | "sent";

const CHANGE_LABEL: Record<Change, string> = {
  added: "hinzugefügt",
  changed: "geändert",
  removed: "entfernt",
  sent: "gesendet",
};

export type Entry = {
  who: string;
  role: string;
  change: Change;
  field: string;
  from?: string;
  to?: string;
  at: string;
};

/** What the advisor did while filling the workflow in, oldest first. */
export const VERLAUF: Entry[] = [
  {
    ...ADVISOR,
    change: "added",
    field: "Telefonnummer",
    to: "+43 3810 393 112 3",
    at: "12.03.2027, 09:14",
  },
  {
    ...ADVISOR,
    change: "added",
    field: "E-Mail",
    to: "julia.atkinson@mail.at",
    at: "12.03.2027, 09:16",
  },
  {
    ...ADVISOR,
    change: "added",
    field: "Postadresse",
    to: "Mondseestrasse 32, A-5310 Mondsee",
    at: "12.03.2027, 09:21",
  },
  {
    ...ADVISOR,
    change: "added",
    field: "Honorar-Modell",
    to: "Privat · EUR 120,00 / Jahr",
    at: "12.03.2027, 10:02",
  },
  {
    ...ADVISOR,
    change: "changed",
    field: "Zahlweise",
    from: "Rechnung",
    to: "Abbuchung",
    at: "12.03.2027, 10:05",
  },
  {
    ...ADVISOR,
    change: "added",
    field: "Bankverbindung",
    to: "Neon Bank · AT 2303 20002 0000 0002 0012",
    at: "12.03.2027, 10:07",
  },
  {
    ...ADVISOR,
    change: "added",
    field: "Individuelle Vereinbarungen",
    to: "Alleinvermittlungsauftrag",
    at: "12.03.2027, 11:40",
  },
  {
    ...ADVISOR,
    change: "removed",
    field: "Kündigungsverzicht 12 Monate",
    at: "12.03.2027, 11:44",
  },
];

export function VerlaufTab({ extra = [] }: { extra?: Entry[] }) {
  const entries = [...VERLAUF, ...extra];

  return (
    <ol className="averlauf">
      {entries.map((entry, index) => (
        <li className={`aentry ${entry.change}`} key={`${entry.field}-${index}`}>
          <span className="aentry-mark" />
          <div>
            <span className="aentry-top">
              <strong>{entry.who}</strong>
              <small>{entry.role}</small>
              <time>{entry.at}</time>
            </span>
            <p className="aentry-what">
              <span className={`achip ${entry.change}`}>{CHANGE_LABEL[entry.change]}</span>
              {entry.field}
            </p>
            {entry.from || entry.to ? (
              <p className="aentry-diff">
                {entry.from ? <s>{entry.from}</s> : null}
                {entry.from && entry.to ? <em>→</em> : null}
                {entry.to ? <b>{entry.to}</b> : null}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
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
