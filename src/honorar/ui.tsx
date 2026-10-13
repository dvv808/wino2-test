import { useEffect, useRef, useState, type ReactNode } from "react";
import * as a from "../assets/index";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import type { OpenItemStatus, PaymentStatus } from "../types/honorar";

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
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
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
