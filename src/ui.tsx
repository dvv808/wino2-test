import { type ReactNode } from "react";
import * as a from "./assets/index";

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
