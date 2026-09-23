import { useState, type ReactNode } from "react";
import * as a from "../assets/index";
import { Icon } from "../ui";
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
