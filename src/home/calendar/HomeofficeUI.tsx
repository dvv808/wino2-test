import { useEffect, useRef, useState } from "react";
import * as a from "../../assets/index";
import { Icon } from "../../ui";
import { MONTHS, addDays, duration, hhmm, parseIso } from "./calendarData";
import { MiniMonth } from "./MiniMonth";
import {
  GENEHMIGER,
  STATUS_TEXT,
  blockedReason,
  nextBlock,
  parseTime,
  sollzeit,
  startBlocks,
  total,
  validate,
  type HomeofficeAntrag,
  type HomeofficeBlock,
  type HomeofficeStatus,
} from "./homeoffice";

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

/** "Montag, 11. Mai, 2027" (modal) and "Montag, 11. Mai 2027" (popover), as in Figma. */
const longDate = (day: string, comma = true) => {
  const d = parseIso(day);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}${comma ? "," : ""} ${d.getFullYear()}`;
};

/** Closes a popover on a click outside of it or on Escape. */
export function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

/** Beginn / Ende: typed freely ("8", "830", "8:30"), shown as 08:30 once the field is left. */
export function TimeInput({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(value === null ? "" : hhmm(value));
  useEffect(() => setText(value === null ? "" : hhmm(value)), [value]);
  return (
    <label className="kal-hom-row">
      <span>{label}</span>
      <span className="kal-hom-input">
        <input
          value={text}
          inputMode="numeric"
          placeholder="--:--"
          aria-label={label}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => {
            const v = parseTime(text);
            onChange(v);
            setText(v === null ? "" : hhmm(v));
          }}
          onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
        />
        {text ? (
          <button
            type="button"
            aria-label={`${label} leeren`}
            onClick={() => {
              setText("");
              onChange(null);
            }}
          >
            <img src={a.iconCloseDark} alt="" width={7} height={7} />
          </button>
        ) : null}
      </span>
    </label>
  );
}

/** The comment of one time block, in a small overlay next to the comment icon. */
export function CommentOverlay({ value, onSave, onClose }: { value: string; onSave: (v: string) => void; onClose: () => void }) {
  const [text, setText] = useState(value);
  const ref = useOutside(true, onClose);
  return (
    <div className="kal-hom-comment" role="dialog" aria-label="Kommentar" ref={ref}>
      <strong>Kommentar</strong>
      <textarea autoFocus rows={4} value={text} placeholder="z. B. Handwerker kommt am Vormittag" onChange={(event) => setText(event.target.value)} />
      <div>
        {value ? (
          <button type="button" className="kal-hom-link danger" onClick={() => onSave("")}>
            Entfernen
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="btn-secondary" onClick={onClose}>
          Abbrechen
        </button>
        <button type="button" className="btn-primary" onClick={() => onSave(text)}>
          Übernehmen
        </button>
      </div>
    </div>
  );
}

const STATUS_SHORT: Record<HomeofficeStatus, string> = { offen: "Beantragt", genehmigt: "Genehmigt", zurueckgesetzt: "Zurückgesetzt" };

/**
 * Homeoffice beantragen (Figma 22647:252180): one day, its time blocks with Beginn / Ende and a comment each,
 * Sollzeit and Istzeit (the sum of the blocks). Saving turns every block into its own open request.
 */
export function HomeofficeModal({
  today,
  start,
  antraege,
  holidays,
  onClose,
  onSave,
}: {
  today: string;
  start: string;
  antraege: HomeofficeAntrag[];
  holidays: Set<string>;
  onClose: () => void;
  onSave: (day: string, blocks: HomeofficeBlock[]) => void;
}) {
  // Opens on the first day Homeoffice can be asked for (not on a weekend or holiday).
  const first = useState(() => {
    for (let i = 0; i < 14; i += 1) if (!blockedReason(addDays(start, i), today, holidays)) return addDays(start, i);
    return start;
  })[0];
  const [day, setDayState] = useState(first);
  const [blocks, setBlocks] = useState<HomeofficeBlock[]>(() => startBlocks(first, antraege));
  const [comment, setComment] = useState<string | null>(null);
  const [pick, setPick] = useState(false);
  const [tried, setTried] = useState(false);
  const counter = useRef(0);
  const pickRef = useOutside(pick, () => setPick(false));

  const setDay = (d: string) => {
    setDayState(d);
    setBlocks(startBlocks(d, antraege));
    setComment(null);
    setTried(false);
  };
  const update = (key: string, patch: Partial<HomeofficeBlock>) => setBlocks((list) => list.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const blocked = blockedReason(day, today, holidays);
  const errors = validate(blocks);
  const valid = !blocked && blocks.length > 0 && Object.keys(errors).length === 0;
  const status = (b: HomeofficeBlock) => antraege.find((x) => x.id === b.id);
  const weekday = WEEKDAYS[parseIso(day).getDay()];

  return (
    <div className="prompt-modal" role="dialog" aria-label="Homeoffice">
      <button type="button" className="prompt-scrim" aria-label="Schließen" onClick={onClose} />
      <div className="prompt-body kal-hom">
        <header className="kal-hom-head">
          <span>
            <img src={a.hoDot} alt="" width={11} height={11} /> Homeoffice
          </span>
          <button type="button" aria-label="Schließen" onClick={onClose}>
            <img src={a.iconCloseDark} alt="" width={8} height={8} />
          </button>
        </header>

        <div className="kal-hom-date" ref={pickRef}>
          <button type="button" className="kal-hom-step" aria-label="Voriger Tag" onClick={() => setDay(addDays(day, -1))}>
            <Icon src={a.chevronDark} size={14} className="kal-prev" />
          </button>
          <button type="button" className="kal-hom-step" aria-label="Nächster Tag" onClick={() => setDay(addDays(day, 1))}>
            <Icon src={a.chevronDark} size={14} className="kal-next" />
          </button>
          <button type="button" className="kal-hom-pick" aria-expanded={pick} onClick={() => setPick(!pick)}>
            <img src={a.calendar} alt="" width={23} height={22} />
            {day === today ? "Heute: " : ""}
            {longDate(day)}
            <Icon src={a.chevronDown} size={14} className={pick ? "kal-open" : undefined} />
          </button>
          {pick ? (
            <div className="kal-hom-month">
              <MiniMonth
                day={day}
                today={today}
                onPick={(d) => {
                  setDay(d);
                  setPick(false);
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="kal-hom-main">
          <div className="kal-hom-col">
            <div className="kal-hom-day">
              <strong>
                <i />
                {weekday}
                {day === today ? <small>heute</small> : null}
              </strong>
              <span>
                {parseIso(day).getDate()} {MONTHS[parseIso(day).getMonth()]}
              </span>
            </div>
            <dl className="kal-hom-times">
              <dt>Sollzeit:</dt>
              <dd>{duration(holidays.has(day) ? 0 : sollzeit(day))}</dd>
              <dt>Istzeit:</dt>
              <dd>{duration(blocked ? 0 : total(blocks))}</dd>
            </dl>

            {blocked ? (
              <p className="kal-hom-blocked">{blocked}</p>
            ) : (
              <>
                {blocks.map((b) => {
                  const existing = status(b);
                  const error = tried || (b.start !== null && b.end !== null) ? errors[b.key] : undefined;
                  return (
                    <div key={b.key} className={`kal-hom-block${error ? " invalid" : ""}`}>
                      <div className="kal-hom-block-head">
                        <strong>Zeit</strong>
                        <span className="kal-hom-comment-wrap">
                          <button
                            type="button"
                            className={`kal-hom-comment-btn${b.kommentar ? " has" : ""}`}
                            aria-label={b.kommentar ? "Kommentar bearbeiten" : "Kommentar hinzufügen"}
                            title={b.kommentar || "Kommentar hinzufügen"}
                            onClick={() => setComment(comment === b.key ? null : b.key)}
                          >
                            <img src={a.comment} alt="" width={13} height={14} />
                          </button>
                          {comment === b.key ? (
                            <CommentOverlay
                              value={b.kommentar}
                              onClose={() => setComment(null)}
                              onSave={(v) => {
                                update(b.key, { kommentar: v.trim() });
                                setComment(null);
                              }}
                            />
                          ) : null}
                        </span>
                        {existing ? <em className={`kal-hom-tag ${existing.status}`}>{STATUS_SHORT[existing.status]}</em> : null}
                        <button
                          type="button"
                          className="kal-hom-remove"
                          aria-label="Zeit entfernen"
                          onClick={() => setBlocks((list) => list.filter((x) => x.key !== b.key))}
                        >
                          <img src={a.iconCloseDark} alt="" width={10} height={10} />
                        </button>
                      </div>
                      <TimeInput label="Beginn" value={b.start} onChange={(v) => update(b.key, { start: v })} />
                      <TimeInput label="Ende" value={b.end} onChange={(v) => update(b.key, { end: v })} />
                      {b.kommentar ? <p className="kal-hom-note">„{b.kommentar}“</p> : null}
                      {error ? <p className="kal-hom-error">{error}</p> : null}
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="kal-hom-add"
                  onClick={() => {
                    counter.current += 1;
                    setBlocks((list) => [...list, nextBlock(list, `n${counter.current}`)]);
                  }}
                >
                  <span aria-hidden>+</span> Zeit hinzufügen
                </button>
                {tried && blocks.length === 0 ? <p className="kal-hom-error">Bitte mindestens eine Zeit angeben.</p> : null}
              </>
            )}
          </div>
        </div>

        <footer className="kal-hom-foot">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!!blocked}
            onClick={() => {
              setTried(true);
              if (valid) onSave(day, blocks);
            }}
          >
            Speichern & Beantragen
          </button>
        </footer>
      </div>
    </div>
  );
}

const STATUS_ICON: Record<HomeofficeStatus, string> = { offen: a.calUrlaubPending, genehmigt: a.calHomeofficeApproved, zurueckgesetzt: a.calUrlaubRejected };

/** Click on a Homeoffice bar in the calendar (Figma 22647:285979): date, time, status, Bearbeiten / Löschen. */
export function HomeofficePopover({
  antrag,
  side,
  up,
  onClose,
  onEdit,
  onDelete,
  onDecide,
  onStatus,
}: {
  antrag: HomeofficeAntrag;
  side: "left" | "right";
  /** Afternoon blocks open upwards, so the popover stays inside the calendar. */
  up: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDecide: (status: "genehmigt" | "zurueckgesetzt") => void;
  /** Click on the status: show the request in Kalender Aktivitäten → Beantragungen. */
  onStatus: () => void;
}) {
  const ref = useOutside(true, onClose);
  const text =
    antrag.status === "offen" ? STATUS_TEXT.offen : antrag.status === "genehmigt"
        ? `Genehmigt von ${antrag.entschiedenVon ?? GENEHMIGER.name}`
        : `Zurückgesetzt von ${antrag.entschiedenVon ?? GENEHMIGER.name}`;
  return (
    <div className={`kal-hop ${side}${up ? " up" : ""}`} role="dialog" aria-label="Homeoffice" ref={ref} onClick={(event) => event.stopPropagation()}>
      <strong className="kal-hop-title">
        <img src={a.hoDot} alt="" width={11} height={11} /> Homeoffice
      </strong>
      <div className="kal-hop-row">
        <img src={a.calendar} alt="" width={20} height={19} />
        <span>
          {longDate(antrag.day, false)}
          <br />
          {hhmm(antrag.start)} - {hhmm(antrag.end)}
        </span>
      </div>
      <button
        type="button"
        className={`kal-hop-row status ${antrag.status}`}
        title="In Beantragungen ansehen"
        onClick={onStatus}
      >
        <img src={STATUS_ICON[antrag.status]} alt="" width={25} height={19} />
        <span>Status: {text}</span>
      </button>
      {antrag.entscheidNotiz ? (
        <div className="kal-hop-row note">
          <img src={a.comment} alt="" width={13} height={14} />
          <span>
            {antrag.entschiedenVon ?? GENEHMIGER.name}: {antrag.entscheidNotiz}
          </span>
        </div>
      ) : null}
      {antrag.kommentar ? (
        <div className="kal-hop-row note">
          <img src={a.comment} alt="" width={13} height={14} />
          <span>{antrag.kommentar}</span>
        </div>
      ) : null}
      <div className="kal-hop-actions">
        <button type="button" className="kal-hop-btn" onClick={onEdit}>
          <img src={a.hoEdit} alt="" width={18} height={18} /> Bearbeiten
        </button>
        <button type="button" className="kal-hop-btn danger" onClick={onDelete}>
          <img src={a.hoDelete} alt="" width={18} height={18} /> Löschen
        </button>
      </div>
      {antrag.status === "offen" ? (
        <div className="kal-hop-demo">
          <span>Simulation Sicht {GENEHMIGER.name}:</span>
          <button type="button" onClick={() => onDecide("genehmigt")}>
            Genehmigen
          </button>
          <button type="button" onClick={() => onDecide("zurueckgesetzt")}>
            Zurücksetzen
          </button>
        </div>
      ) : null}
    </div>
  );
}
