import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as a from "../assets/index";
import { Icon, ShelveToggleIcon } from "../ui";
import { useWorkflow } from "../workflow";
import type { Fee, OpenItemStatus, Partner, PaymentStatus } from "../types/honorar";
import { money } from "./invoiceCells";
import { totals } from "../lib/honorar/queries";

export function ConfirmModal({
  title,
  text,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="wmodal" role="dialog" aria-label={title}>
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onCancel} />
      <div className="wmodal-body">
        <button type="button" className="wmodal-close" aria-label="Schließen" onClick={onCancel}>
          <img src={a.iconCloseDark} alt="" width={16} height={16} />
        </button>
        <h2>{title}</h2>
        <p>{text}</p>
        <footer className="wmodal-foot centered">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function RequiredCommentModal({
  title,
  text,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  /** Short line above the comment field. */
  text?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (comment: string) => void;
}) {
  const [comment, setComment] = useState("");
  return (
    <div className="prompt-modal" role="dialog" aria-label={title}>
      <button type="button" className="prompt-scrim" aria-label="Schließen" onClick={onCancel} />
      <div className="prompt-body">
        <header className="review-titlebar">
          <span className="review-titlebar-label">{title}</span>
          <button type="button" className="review-titlebar-close" aria-label="Schließen" onClick={onCancel}>
            <img src={a.iconCloseDark} alt="" width={12} height={12} />
          </button>
        </header>
        <div className="prompt-main">
          {text ? <p className="prompt-text">{text}</p> : null}
          <label className="field-label" htmlFor="honorar-comment">
            Kommentar
          </label>
          <textarea
            id="honorar-comment"
            className="prompt-input"
            placeholder="Begründung oder Hinweis hinzufügen..."
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            autoFocus
          />
        </div>
        <footer className="prompt-foot">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!comment.trim()}
            onClick={() => onConfirm(comment.trim())}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function StatusBadge({
  kind,
}: {
  kind: "offen" | "fertig" | "action" | "done" | "muted";
}) {
  if (kind === "offen" || kind === "action") {
    return (
      <span className="status-pill open">
        <Icon src={a.onhold} size={16} />
        Offen
      </span>
    );
  }
  if (kind === "fertig" || kind === "done") {
    return (
      <span className="status-pill fertig">
        <Icon src={a.confirm} size={16} />
        Fertig
      </span>
    );
  }
  return null;
}

export function PaymentBadge({ status }: { status: PaymentStatus | OpenItemStatus | "action" | "grey" | "done" }) {
  const amber =
    status === "unpaid" ||
    status === "no_reminder" ||
    status === "reminder_overdue" ||
    status === "action";
  const done = status === "paid" || status === "done";
  return (
    <span className={`status-pill ${amber ? "open" : done ? "fertig" : "done"}`}>
      <Icon src={done ? a.confirm : a.onhold} size={16} />
    </span>
  );
}

export function StepEmpty({
  icon,
  title,
  lead,
  link,
  onLink,
}: {
  icon: string;
  title: string;
  lead?: string;
  link?: string;
  onLink?: () => void;
}) {
  return (
    <article className="pp-card empty">
      <div className="pp-empty-art">
        <span className="plate p3" />
        <span className="plate p2" />
        <span className="plate p1" />
        <span className="orb">
          <Icon src={icon} size={40} />
        </span>
      </div>
      <strong>{title}</strong>
      {lead || link ? (
        <p>
          {lead ? `${lead}${link ? " " : ""}` : null}
          {link && onLink ? (
            <button type="button" className="pp-empty-link" onClick={onLink}>
              {link}
            </button>
          ) : (
            link
          )}.
        </p>
      ) : null}
    </article>
  );
}

export function PartnerAvatar({ company }: { company?: boolean }) {
  if (company) {
    return (
      <>
        <img className="hn-company-ring" src={a.hnCompanyRing} alt="" width={40} height={40} />
        <img className="hn-company-glyph" src={a.hnCompanyGlyph} alt="" width={24.9187} height={25} />
      </>
    );
  }
  return (
    <>
      <img className="hn-person-ring" src={a.hnPersonRing} alt="" width={40} height={40} />
      <img className="hn-person-glyph" src={a.hnPersonGlyph} alt="" width={22.3333} height={26.7858} />
    </>
  );
}

export function CountBadge({ value }: { value: number }) {
  if (!value) return null;
  return <span className="hn-count">{value}</span>;
}

export function PartnerCell({
  name,
  meta,
  photo,
  company,
}: {
  name: string;
  meta?: string;
  photo?: string;
  company?: boolean;
}) {
  return (
    <span className="hn-partner">
      <span className="requester-avatar">
        <img src={photo ?? (company ? a.companyBlank : a.clientBlank)} alt="" />
      </span>
      <span className="requester-copy">
        <strong>{name}</strong>
        {meta ? <small>{meta}</small> : null}
      </span>
    </span>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="hn-empty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export function StickyBar({ children }: { children: ReactNode }) {
  return <div className="hn-sticky">{children}</div>;
}

export type StatFilter = "open" | "done" | "credit" | "due" | "paid" | null;

export type StatExtra = { kind: "credit" | "due" | "paid"; label: string; count: number; icon: string };

/**
 * Filter cards above a table. The dark card is the active filter, the grey one is inactive.
 * Clicking the active card clears the filter again (table shows everything).
 */
export function StatCards({
  open,
  done,
  unit,
  doneLabel = "Abgeschl.",
  extra = [],
  trailing = [],
  value,
  onChange,
}: {
  extra?: StatExtra[];
  /** Cards shown after the "done" card. */
  trailing?: StatExtra[];
  open: number;
  done: number;
  unit: string;
  doneLabel?: string;
  value: StatFilter;
  onChange: (value: StatFilter) => void;
}) {
  const card = (kind: "open" | "done" | "credit" | "due" | "paid", label: string, count: number, icon: string) => (
    <button
      type="button"
      key={kind}
      className={value === kind ? "stat-card dark" : "stat-card"}
      aria-pressed={value === kind}
      onClick={() => onChange(value === kind ? null : kind)}
    >
      <span className="stat-copy">
        <small>{label}</small>
        <strong>{String(count).padStart(2, "0")}</strong>
        <span>{unit}</span>
      </span>
      <span className="stat-icon">
        <Icon src={icon} size={16} />
      </span>
    </button>
  );
  return (
    <div className="hn-stats">
      {card("open", "Offen", open, a.onhold)}
      {extra.map((entry) => card(entry.kind, entry.label, entry.count, entry.icon))}
      {card("done", doneLabel, done, a.confirm)}
      {trailing.map((entry) => card(entry.kind, entry.label, entry.count, entry.icon))}
    </div>
  );
}

/** Row menu for tables that only offer the profile shortcut. */
export function ProfileDueMenu() {
  const { openPartnerInkasso } = useWorkflow();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pos) return;
    const away = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setPos(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPos(null);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [pos]);

  return (
    <>
      <button
        type="button"
        className="hn-st-menu"
        aria-label="Aktionen"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - 260) });
        }}
      >
        <Icon src={a.contextMenu} size={24} />
      </button>
      {pos ? (
        <div className="hn-row-menu wide" ref={ref} role="menu" style={{ top: pos.top, left: pos.left }}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setPos(null);
              openPartnerInkasso();
            }}
          >
            <span className="hn-menu-ico">
              <Icon src={a.calendar} size={18} />
            </span>
            Zahlungsziel im Profil anpassen
          </button>
        </div>
      ) : null}
    </>
  );
}

/** Open-tab icon beside a partner in the Forderungen tables: the partner's file as a tab, on its Dashboard. */
export function PartnerOpenButton({ partner }: { partner: Partner | undefined }) {
  const { openHonorarPartner } = useWorkflow();
  if (!partner) return null;
  return (
    <button
      type="button"
      className="hn-st-open"
      aria-label={`${partner.name} als Tab öffnen`}
      title="Als Tab öffnen"
      onClick={() => openHonorarPartner(partner)}
    >
      <Icon src={a.openTab} size={16} />
    </button>
  );
}

/** Forderungen side nav: collapsed (shelved) or shown beside the page. */
export const HonorarSideContext = createContext<{
  collapsed: boolean;
  toggle: () => void;
  sidebar: ReactNode;
}>({ collapsed: false, toggle: () => {}, sidebar: null });

/**
 * Page kicker with the shelve toggle in front. With the side nav shelved, the kicker
 * itself opens the side nav as a dropdown (chevron at the end).
 */
export function HnKicker({ children }: { children: ReactNode }) {
  const { collapsed, toggle, sidebar } = useContext(HonorarSideContext);
  const { finanzenPage, finanzenMonth, finanzenStep, finanzenYear } = useWorkflow();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [collapsed, finanzenPage, finanzenMonth, finanzenStep, finanzenYear]);

  useEffect(() => {
    if (!open) return;
    function onDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="hn-kicker-wrap" ref={ref}>
      <h1 className="freigaben-title hn-kicker">
        <button
          type="button"
          className="hn-shelve"
          aria-label={collapsed ? "Navigation einblenden" : "Navigation ausblenden"}
          title={collapsed ? "Navigation einblenden" : "Navigation ausblenden"}
          onClick={toggle}
        >
          <ShelveToggleIcon collapsed={collapsed} />
        </button>
        {collapsed ? (
          <button
            type="button"
            className={open ? "hn-kicker-drop open" : "hn-kicker-drop"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {children}
            <Icon src={a.chevronDown} size={16} />
          </button>
        ) : (
          children
        )}
      </h1>
      {collapsed && open ? <div className="hn-kicker-panel">{sidebar}</div> : null}
    </div>
  );
}

/**
 * Stat cards on the left, dashboard totals of the shown rows on the far right.
 * Replaces the "Alle Honorare" sum row in the Forderungen tables; the totals follow the filters.
 */
export function StatsRow({
  stats,
  fees,
  onlyDue,
  onToggleDue,
}: {
  stats?: ReactNode;
  fees: Fee[];
  /** With a toggle, the Ausstehend tile filters the table to the rows still open. */
  onlyDue?: boolean;
  onToggleDue?: () => void;
}) {
  const sum = totals(fees);
  const paidShare = sum.due ? Math.round((sum.paid / sum.due) * 100) : 0;
  return (
    <div className="hn-stats-row">
      {stats ?? <span />}
      <div className="hn-kpis" aria-label="Summen">
        <div className="hn-kpi">
          <small>Rechnungsbetrag</small>
          <strong>€ {money(sum.due)}</strong>
          <span>
            {fees.length} {fees.length === 1 ? "Rechnung" : "Rechnungen"}
          </span>
        </div>
        <div className="hn-kpi">
          <small>Zahlungseingang</small>
          <strong>€ {money(sum.paid)}</strong>
          <span>{paidShare} % bezahlt</span>
        </div>
        {onToggleDue ? (
          <button
            type="button"
            className={`hn-kpi${sum.open > 0 ? " due" : ""}${onlyDue ? " active" : ""}`}
            aria-pressed={onlyDue}
            title={onlyDue ? "Alle Rechnungen zeigen" : "Nur ausstehende Rechnungen zeigen"}
            onClick={onToggleDue}
          >
            <small>Ausstehend</small>
            <strong>€ {money(sum.open)}</strong>
            <span>{onlyDue ? "Filter aktiv" : "noch offen"}</span>
          </button>
        ) : (
          <div className={sum.open > 0 ? "hn-kpi due" : "hn-kpi"}>
            <small>Ausstehend</small>
            <strong>€ {money(sum.open)}</strong>
            <span>noch offen</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Wide tables scroll sideways inside their panel. The table's own scrollbar is hidden; a synced copy
 * pins to the bottom of the window while the table runs past it, so it never needs scrolling down to.
 */
export function StickyScroll({ children }: { children: ReactNode }) {
  const body = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ inner: 0, outer: 0 });
  const [pin, setPin] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const measure = () => {
      setSize({ inner: el.scrollWidth, outer: el.clientWidth });
      const rect = el.getBoundingClientRect();
      // Pinned while the table's top is on screen and its end is below the window.
      setPin(rect.top < window.innerHeight - 40 && rect.bottom > window.innerHeight ? { left: rect.left, width: rect.width } : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (bar.current && body.current) bar.current.scrollLeft = body.current.scrollLeft;
  }, [pin]);

  function sync(from: HTMLDivElement | null, to: HTMLDivElement | null) {
    if (from && to && to.scrollLeft !== from.scrollLeft) to.scrollLeft = from.scrollLeft;
  }

  const scrolls = size.inner > size.outer + 1;
  return (
    <>
      <div className="hn-st-scroll sticky-bar" ref={body} onScroll={() => sync(body.current, bar.current)}>
        {children}
      </div>
      {scrolls ? (
        <div
          className={pin ? "hn-st-hbar pinned" : "hn-st-hbar"}
          ref={bar}
          style={pin ? { left: pin.left, width: pin.width } : undefined}
          onScroll={() => sync(bar.current, body.current)}
          aria-hidden
        >
          <div style={{ width: size.inner }} />
        </div>
      ) : null}
    </>
  );
}
