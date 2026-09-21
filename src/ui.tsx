import { useEffect, useRef, useState, type ReactNode } from "react";
import * as a from "./assets/index";

export type ContextItem = {
  label: string;
  icon: string;
  danger?: boolean;
  onSelect: () => void;
};

/**
 * The three-dot button with its drop-down card, used on comment bubbles and on
 * table rows. The corner nearest the button stays square so the card reads as
 * hanging off it, the way the Figma frame draws it.
 */
export function ContextMenu({ items, label = "Weitere Aktionen" }: { items: ContextItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function away(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="ctx" ref={wrapRef}>
      <button
        type="button"
        className="ctx-btn"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon src={a.contextMenu} size={18} />
      </button>

      {open ? (
        <ul className="ctx-pop">
          {items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                className={item.danger ? "danger" : undefined}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                <Icon src={item.icon} size={17} />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function Icon({
  src,
  size,
  alt = "",
  className,
}: {
  src: string;
  size: number;
  alt?: string;
  className?: string;
}) {
  return (
    <span className={className ? `icon ${className}` : "icon"} style={{ width: size, height: size }}>
      <img src={src} alt={alt} width={size} height={size} />
    </span>
  );
}

export function EntityIcon({ src }: { src: string }) {
  return (
    <span className="stack-icon" style={{ width: 32, height: 32 }}>
      <img src={a.avatarBg} alt="" width={32} height={32} />
      <img src={src} alt="" width={21} height={21} style={{ inset: 5 }} />
    </span>
  );
}

/** The Figma ID-card glyph is assembled from three separate vector layers. */
export function IdCardIcon() {
  return (
    <span className="id-card">
      <img className="frame" src={a.idCard} alt="" />
      <img className="avatar" src={a.idCardAvatar} alt="" />
      <img className="lines" src={a.idCardLines} alt="" />
    </span>
  );
}

export function RadioRow({
  selected,
  onSelect,
  children,
  tall,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  tall?: boolean;
}) {
  return (
    <button
      type="button"
      className={`radio-row${selected ? " selected" : ""}${tall ? " tall" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <Icon src={selected ? a.radioOn : a.radioOff} size={24} />
      <span>{children}</span>
    </button>
  );
}

export function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="info-box">
      <Icon src={a.infoFull} size={24} />
      <p>{children}</p>
    </div>
  );
}

export function WarnBox({ children }: { children: ReactNode }) {
  return (
    <div className="warn-box">
      <Icon src={a.attention} size={24} />
      <p>{children}</p>
    </div>
  );
}

export function EditLink({ label = "anpassen" }: { label?: string }) {
  return (
    <button type="button" className="edit-link">
      <Icon src={a.edit} size={20} />
      {label}
    </button>
  );
}

export function TarifLine({ tariff, ok }: { tariff: string; ok: boolean }) {
  return (
    <span className="tarif">
      <Icon src={ok ? a.confirmOn : a.confirmOff} size={12} />
      <span>
        Honorar <strong>{tariff}</strong>
      </span>
    </span>
  );
}

/** Success toast. Undo is optional — a save confirmation does not need it. */
export function Snackbar({
  message,
  onUndo,
  onClose,
}: {
  message: string;
  onUndo?: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const timer = window.setTimeout(() => closeRef.current(), 7000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="snackbar" role="status">
      <div className="snackbar-card">
        <span className="snackbar-icon">
          <img src={a.snackConfirm} alt="" width={36} height={36} />
        </span>
        <div className="snackbar-copy">
          <p>{message}</p>
          {onUndo ? (
            <button type="button" className="snackbar-undo" onClick={onUndo}>
              <img src={a.snackUndo} alt="" width={18} height={18} />
              Rückgängig machen
            </button>
          ) : null}
        </div>
      </div>
      <button type="button" className="snackbar-close" aria-label="Schließen" onClick={onClose}>
        <img src={a.iconCloseDark} alt="" width={10} height={10} />
      </button>
    </div>
  );
}

export function Notice({
  tone,
  title,
  children,
  comment,
  commentBy = "Bestandsmanager",
}: {
  tone: "pending" | "success" | "error";
  title: string;
  children?: ReactNode;
  /** A note from the other side of the Freigabe, shown inside the status box. */
  comment?: string;
  commentBy?: string;
}) {
  const glyph = tone === "success" ? a.checkGreen : tone === "error" ? a.attention : a.onhold;

  return (
    <div className={`notice ${tone}`}>
      <div className="notice-line">
        <Icon src={glyph} size={18} />
        <p>
          <strong>{title}</strong>
          {children ? <span>{children}</span> : null}
        </p>
      </div>
      {comment ? (
        <div className="rev-comment">
          <strong>Kommentar {commentBy}</strong>
          {comment}
        </div>
      ) : null}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
  className,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (next: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={className ? `segmented ${className}` : "segmented"}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`segment${value === option.id ? " active" : ""}`}
          onClick={() => onChange(option.id)}
          disabled={disabled}
          aria-pressed={value === option.id}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function DateField({
  day,
  month,
  year,
  onDay,
  onMonth,
  onYear,
  disabled,
  prefix,
}: {
  day: string;
  month: string;
  year: string;
  onDay: (value: string) => void;
  onMonth: (value: string) => void;
  onYear: (value: string) => void;
  disabled?: boolean;
  prefix?: string;
}) {
  return (
    <div className="date-row editable">
      {prefix ? <span className="am-label">{prefix}</span> : null}
      <input className="date-box" value={day} disabled={disabled} onChange={(e) => onDay(e.target.value)} />
      <input
        className="date-box"
        value={month}
        disabled={disabled}
        onChange={(e) => onMonth(e.target.value)}
      />
      <input
        className="date-box year"
        value={year}
        disabled={disabled}
        onChange={(e) => onYear(e.target.value)}
      />
      <button type="button" className="cal-btn small" aria-label="Kalender" disabled={disabled}>
        <Icon src={a.calendar} size={16} />
      </button>
    </div>
  );
}

export function PersonSelect({
  name,
  meta,
  disabled,
  locked,
}: {
  name: string;
  meta?: string;
  disabled?: boolean;
  /** Read-only: the person was already defined in an earlier step. */
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      className={locked ? "entity-card locked" : "entity-card"}
      disabled={disabled || locked}
    >
      <EntityIcon src={a.personSmall} />
      <span className="copy">
        {name}
        {meta ? (
          <>
            <br />
            <small>{meta}</small>
          </>
        ) : null}
      </span>
      <Icon src={a.selectCaret} size={16} />
    </button>
  );
}
