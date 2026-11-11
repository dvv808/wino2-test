import { useRef, useState } from "react";
import * as a from "../../assets/index";
import { Icon, Segmented } from "../../ui";
import { MONTHS, addDays, duration, parseIso, weekDays } from "./calendarData";
import { MiniMonth } from "./MiniMonth";
import { CommentOverlay, TimeInput, useOutside } from "./HomeofficeUI";
import { nextBlock, sollzeit, total, validate, type HomeofficeBlock } from "./homeoffice";
import { defaultBlocks, type ArbeitszeitBlock } from "./arbeitszeit";

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

type Mode = "woche" | "tag";

const toEdit = (blocks: ArbeitszeitBlock[], day: string): HomeofficeBlock[] =>
  blocks.map((b, i) => ({ key: `${day}-${i}`, start: b.start, end: b.end, kommentar: b.kommentar ?? "" }));

/** "11 - 15 Nov. 2026" */
function rangeLabel(days: string[]) {
  const first = parseIso(days[0]);
  const last = parseIso(days[days.length - 1]);
  const month = (d: Date) => MONTHS[d.getMonth()];
  return first.getMonth() === last.getMonth()
    ? `${first.getDate()} - ${last.getDate()} ${month(last)} ${last.getFullYear()}`
    : `${first.getDate()} ${month(first)} - ${last.getDate()} ${month(last)} ${last.getFullYear()}`;
}

/** One day: head, Soll/Ist, the time blocks with Beginn / Ende, comment and remove, "+ Zeit hinzufügen". */
function DayColumn({
  day,
  today,
  holiday,
  blocks,
  onChange,
  showLabels,
}: {
  day: string;
  today: string;
  holiday: boolean;
  blocks: HomeofficeBlock[];
  onChange: (blocks: HomeofficeBlock[]) => void;
  showLabels: boolean;
}) {
  const [comment, setComment] = useState<string | null>(null);
  const counter = useRef(0);
  const d = parseIso(day);
  const errors = validate(blocks);
  const update = (key: string, patch: Partial<HomeofficeBlock>) => onChange(blocks.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  return (
    <div className={`kal-az-col${showLabels ? " labels" : ""}`}>
      <div className="kal-hom-day kal-az-day">
        <strong>
          {day === today ? <i /> : null}
          {WEEKDAYS[d.getDay()]}
          {day === today ? <small>heute</small> : null}
        </strong>
        <span>
          {d.getDate()} {MONTHS[d.getMonth()]}
        </span>
      </div>
      <dl className="kal-hom-times">
        <dt>Sollzeit:</dt>
        <dd>{duration(holiday ? 0 : sollzeit(day))}</dd>
        <dt>Istzeit:</dt>
        <dd>{duration(holiday ? 0 : total(blocks))}</dd>
      </dl>
      {holiday ? (
        <p className="kal-hom-blocked">Feiertag</p>
      ) : (
        <>
          {blocks.map((b) => {
            const error = errors[b.key];
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
                  <button
                    type="button"
                    className="kal-hom-remove"
                    aria-label="Zeit entfernen"
                    onClick={() => onChange(blocks.filter((x) => x.key !== b.key))}
                  >
                    <img src={a.iconCloseDark} alt="" width={10} height={10} />
                  </button>
                </div>
                <TimeInput label="Beginn" value={b.start} onChange={(v) => update(b.key, { start: v })} />
                <TimeInput label="Ende" value={b.end} onChange={(v) => update(b.key, { end: v })} />
                {error ? <p className="kal-hom-error">{error}</p> : null}
              </div>
            );
          })}
          <button
            type="button"
            className="kal-hom-add kal-az-add"
            onClick={() => {
              counter.current += 1;
              onChange([...blocks, nextBlock(blocks, `${day}-n${counter.current}`)]);
            }}
          >
            <span aria-hidden>+</span> Zeit hinzufügen
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Arbeitszeit erfassen (Figma 21495:97817): the working week Mo–Fr (or one day) with time blocks per day.
 * Saved days become the green strokes in the calendar.
 */
export function ArbeitszeitModal({
  today,
  start,
  holidays,
  blocksFor,
  onClose,
  onSave,
}: {
  today: string;
  start: string;
  holidays: Set<string>;
  /** Saved or demo blocks of a day (default for a day without any: the Figma times). */
  blocksFor: (day: string) => ArbeitszeitBlock[] | null;
  onClose: () => void;
  onSave: (days: Record<string, ArbeitszeitBlock[]>) => void;
}) {
  const [mode, setMode] = useState<Mode>("woche");
  const [day, setDay] = useState(start);
  const [edits, setEdits] = useState<Record<string, HomeofficeBlock[]>>({});
  const [pick, setPick] = useState(false);
  const pickRef = useOutside(pick, () => setPick(false));

  const days = mode === "woche" ? weekDays(day).slice(0, 5) : [day];
  const blocksOf = (d: string) => edits[d] ?? toEdit(blocksFor(d) ?? defaultBlocks(d), d);
  const allErrors = days.some((d) => !holidays.has(d) && Object.keys(validate(blocksOf(d))).length > 0);
  const label =
    mode === "woche"
      ? `${weekDays(day).includes(today) ? "Diese Woche: " : ""}${rangeLabel(weekDays(day))}`
      : `${day === today ? "Heute: " : ""}${WEEKDAYS[parseIso(day).getDay()]}, ${parseIso(day).getDate()}. ${MONTHS[parseIso(day).getMonth()]} ${parseIso(day).getFullYear()}`;
  const step = (n: number) => setDay((d) => addDays(d, mode === "woche" ? 7 * n : n));

  function save() {
    // Every day that was shown is saved as it is now; days not touched keep what they had.
    const out: Record<string, ArbeitszeitBlock[]> = {};
    for (const [d, blocks] of Object.entries(edits)) {
      out[d] = blocks
        .filter((b) => b.start !== null && b.end !== null && b.end > b.start)
        .map((b) => ({ start: b.start!, end: b.end!, kommentar: b.kommentar || undefined }));
    }
    for (const d of days) if (!(d in out) && !holidays.has(d)) out[d] = blocksOf(d).map((b) => ({ start: b.start!, end: b.end!, kommentar: b.kommentar || undefined }));
    onSave(out);
  }

  return (
    <div className="prompt-modal" role="dialog" aria-label="Arbeitszeit">
      <button type="button" className="prompt-scrim" aria-label="Schließen" onClick={onClose} />
      <div className="prompt-body kal-hom kal-az">
        <header className="kal-hom-head">
          <span>
            <i className="kal-az-dot" /> Arbeitszeit
          </span>
          <button type="button" aria-label="Schließen" onClick={onClose}>
            <img src={a.iconCloseDark} alt="" width={8} height={8} />
          </button>
        </header>

        <div className="kal-hom-date" ref={pickRef}>
          <button type="button" className="kal-hom-step" aria-label={mode === "woche" ? "Vorige Woche" : "Voriger Tag"} onClick={() => step(-1)}>
            <Icon src={a.chevronDark} size={14} className="kal-prev" />
          </button>
          <button type="button" className="kal-hom-step" aria-label={mode === "woche" ? "Nächste Woche" : "Nächster Tag"} onClick={() => step(1)}>
            <Icon src={a.chevronDark} size={14} className="kal-next" />
          </button>
          <button type="button" className="kal-hom-pick" aria-expanded={pick} onClick={() => setPick(!pick)}>
            <img src={a.calendar} alt="" width={23} height={22} />
            {label}
            <Icon src={a.chevronDown} size={14} className={pick ? "kal-open" : undefined} />
          </button>
          <Segmented
            className="kal-az-mode"
            value={mode}
            onChange={setMode}
            options={[
              { id: "woche", label: "Woche" },
              { id: "tag", label: "Tag" },
            ]}
          />
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
          <div className={`kal-az-grid ${mode}`}>
            {days.map((d) => (
              <DayColumn
                key={d}
                day={d}
                today={today}
                holiday={holidays.has(d)}
                blocks={blocksOf(d)}
                showLabels={mode === "tag"}
                onChange={(next) => setEdits((current) => ({ ...current, [d]: next }))}
              />
            ))}
          </div>
        </div>

        <footer className="kal-hom-foot">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary kal-az-save" disabled={allErrors} onClick={save}>
            <img src={a.save} alt="" width={24} height={24} />
            Speichern
          </button>
        </footer>
      </div>
    </div>
  );
}
