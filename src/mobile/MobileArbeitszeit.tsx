import { useEffect, useRef, useState } from "react";
import * as a from "../assets/index";
import { addDays, duration, hhmm, seedWeek } from "../home/calendar/calendarData";
import { defaultBlocks, loadArbeitszeiten, saveArbeitszeiten } from "../home/calendar/arbeitszeit";
import { loadAntraege, sollzeit } from "../home/calendar/homeoffice";
import { MiniMonth } from "../home/calendar/MiniMonth";
import { homeofficeHit, workMinutes } from "../home/calendar/overlap";
import { QUARTERS, longDate } from "./termine";

/** Arbeitszeit hinzufügen on mobile (Figma 22757:333935). Saves into the same store as the desktop overlay. */
type Block = { key: string; start: number; end: number; ort: string; kommentar: string };
const ORTE = ["Schladming", "Kapfenberg", "Homeoffice", "Beim Kunden"];
const PAUSEN = [0, 15, 30, 45, 60, 90];

function blocksOf(day: string): Block[] {
  const saved = loadArbeitszeiten()[day];
  return (saved?.length ? saved : defaultBlocks(day)).map((b, i) => ({
    key: `b${i}`,
    start: b.start,
    end: b.end,
    ort: b.ort ?? "Schladming",
    kommentar: b.kommentar ?? "",
  }));
}

function TimeSelect({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="m-row">
      <span>{label}</span>
      <span className="m-select">
        <select value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label}>
          {QUARTERS.map((q) => (
            <option key={q} value={q}>
              {hhmm(q)} Uhr
            </option>
          ))}
        </select>
        <img src={a.chevronDown} alt="" width={14} height={14} />
      </span>
    </label>
  );
}

export function MobileArbeitszeit({ day: startDay, today, onBack, onSaved }: { day: string; today: string; onBack: () => void; onSaved: (day: string) => void }) {
  const [day, setDay] = useState(startDay);
  const [blocks, setBlocks] = useState<Block[]>(() => blocksOf(startDay));
  const [picker, setPicker] = useState(false);
  const [comment, setComment] = useState<{ key: string; text: string } | null>(null);
  const [tried, setTried] = useState(false);
  const counter = useRef(0);

  useEffect(() => {
    setBlocks(blocksOf(day));
    setTried(false);
  }, [day]);

  const update = (key: string, patch: Partial<Block>) => setBlocks((list) => list.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const { weekday, date } = longDate(day);
  const holiday = seedWeek(today).holidays.has(day);
  const soll = holiday ? 0 : sollzeit(day);
  const ist = workMinutes(blocks);

  function errorOf(block: Block, index: number) {
    if (block.end <= block.start) return "Ende muss nach dem Beginn liegen.";
    if (blocks.some((other, i) => i < index && other.end > block.start && other.start < block.end)) return "Überschneidet sich mit einer anderen Zeit.";
    if (homeofficeHit(loadAntraege(), day, [block]).length) return "In dieser Zeit ist bereits Homeoffice beantragt.";
    return null;
  }
  const errors = blocks.map(errorOf);
  const valid = blocks.length > 0 && errors.every((e) => !e);

  function save() {
    setTried(true);
    if (!valid) return;
    const sorted = [...blocks].sort((x, y) => x.start - y.start);
    saveArbeitszeiten({
      ...loadArbeitszeiten(),
      [day]: sorted.map((b) => ({ start: b.start, end: b.end, ort: b.ort, ...(b.kommentar ? { kommentar: b.kommentar } : {}) })),
    });
    onSaved(day);
  }

  return (
    <div className="m-form-screen">
      <header className="m-form-head">
        <button type="button" className="m-back" aria-label="Zurück" onClick={onBack}>
          <img src={a.arrowRight} alt="" width={18} height={18} className="m-flip" />
        </button>
        <span>
          <i className="m-dot arbeit" /> Arbeitszeit
        </span>
      </header>

      <div className="m-form-body">
        <div className="m-az-date">
          <button type="button" className="m-az-date-btn" aria-expanded={picker} onClick={() => setPicker(!picker)}>
            <img src={a.calendar} alt="" width={18} height={17} />
            {weekday}, {date}
          </button>
          <span>
            <button type="button" aria-label="Voriger Tag" onClick={() => setDay(addDays(day, -1))}>
              <img src={a.chevronDark} alt="" width={14} height={14} className="kal-prev" />
            </button>
            <button type="button" aria-label="Nächster Tag" onClick={() => setDay(addDays(day, 1))}>
              <img src={a.chevronDark} alt="" width={14} height={14} className="kal-next" />
            </button>
          </span>
          {picker ? (
            <div className="m-pop m-pop-monat inline">
              <MiniMonth
                day={day}
                today={today}
                onPick={(d) => {
                  setDay(d);
                  setPicker(false);
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="m-az-grid">
          <span className="m-az-label">Tag</span>
          <div className="m-az-col">
            <div className="m-az-day">
              <strong>{weekday}</strong>
              {date}
            </div>
            <dl className="m-az-times">
              <div>
                <dt>Sollzeit:</dt>
                <dd>{duration(soll)}</dd>
              </div>
              <div>
                <dt>Istzeit:</dt>
                <dd>{duration(ist)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {blocks.map((block, index) => {
          const error = tried || block.end !== block.start ? errors[index] : null;
          const next = blocks[index + 1];
          const pause = next ? next.start - block.end : 0;
          return (
            <div key={block.key}>
              <div className={error ? "m-az-block invalid" : "m-az-block"}>
                <div className="m-az-block-head">
                  <strong>Zeit</strong>
                  <span>
                    <button
                      type="button"
                      className={block.kommentar ? "m-icon-btn has" : "m-icon-btn"}
                      aria-label={block.kommentar ? "Kommentar bearbeiten" : "Kommentar hinzufügen"}
                      onClick={() => setComment({ key: block.key, text: block.kommentar })}
                    >
                      <img src={a.comment} alt="" width={14} height={14} />
                    </button>
                    <button type="button" className="m-icon-btn" aria-label="Zeit entfernen" onClick={() => setBlocks((list) => list.filter((b) => b.key !== block.key))}>
                      <img src={a.iconCloseDark} alt="" width={10} height={10} />
                    </button>
                  </span>
                </div>
                <TimeSelect label="Beginn" value={block.start} onChange={(v) => update(block.key, { start: v })} />
                <TimeSelect label="Ende" value={block.end} onChange={(v) => update(block.key, { end: v })} />
                <label className="m-row">
                  <span>Ort</span>
                  <span className="m-select">
                    <select value={block.ort} onChange={(event) => update(block.key, { ort: event.target.value })} aria-label="Ort">
                      {ORTE.map((ort) => (
                        <option key={ort}>{ort}</option>
                      ))}
                    </select>
                    <img src={a.chevronDown} alt="" width={14} height={14} />
                  </span>
                </label>
                {block.kommentar ? <p className="m-az-note">{block.kommentar}</p> : null}
                {error ? <p className="m-error">{error}</p> : null}
              </div>
              {next ? (
                <label className="m-row m-az-pause">
                  <span>Pause</span>
                  <span className="m-select">
                    <select
                      value={pause}
                      aria-label="Pause"
                      onChange={(event) => {
                        const start = block.end + Number(event.target.value);
                        update(next.key, { start, end: Math.max(next.end, start + 15) });
                      }}
                    >
                      {[...new Set([...PAUSEN, pause])]
                        .filter((p) => p >= 0)
                        .sort((x, y) => x - y)
                        .map((p) => (
                          <option key={p} value={p}>
                            {p}min
                          </option>
                        ))}
                    </select>
                    <img src={a.chevronDown} alt="" width={14} height={14} />
                  </span>
                </label>
              ) : null}
            </div>
          );
        })}

        <button
          type="button"
          className="m-az-add"
          onClick={() => {
            counter.current += 1;
            const last = blocks[blocks.length - 1];
            const start = last ? Math.min(last.end + 30, 23 * 60) : 8 * 60;
            setBlocks((list) => [...list, { key: `n${counter.current}`, start, end: Math.min(start + 240, 24 * 60 - 15), ort: last?.ort ?? "Schladming", kommentar: "" }]);
          }}
        >
          <span aria-hidden>+</span> Zeit hinzufügen
        </button>
        {tried && blocks.length === 0 ? <p className="m-error">Bitte mindestens eine Zeit angeben.</p> : null}

        <div className="m-form-foot">
          <button type="button" className="m-primary" onClick={save}>
            <img src={a.save} alt="" width={16} height={16} className="m-invert" />
            Speichern &amp; Eintragen
          </button>
        </div>
      </div>

      {comment ? (
        <div className="m-modal-wrap" role="dialog" aria-label="Anmerkung verfassen">
          <div className="m-modal">
            <button type="button" className="m-modal-x" aria-label="Schließen" onClick={() => setComment(null)}>
              <img src={a.iconCloseDark} alt="" width={10} height={10} />
            </button>
            <h2>
              Anmerkung verfassen
              <br />({weekday.slice(0, 2)}. {date})
            </h2>
            <label>
              Anmerkung
              <textarea value={comment.text} onChange={(event) => setComment({ ...comment, text: event.target.value })} autoFocus />
            </label>
            <div className="m-modal-foot">
              <button type="button" className="m-secondary" onClick={() => setComment(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="m-primary"
                onClick={() => {
                  update(comment.key, { kommentar: comment.text.trim() });
                  setComment(null);
                }}
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
