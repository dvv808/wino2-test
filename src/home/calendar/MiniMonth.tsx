import { useEffect, useState } from "react";
import * as a from "../../assets/index";
import { Icon } from "../../ui";
import { MONTHS, monthGrid, parseIso, weekDays } from "./calendarData";

/** The small month of the side nav (and of the date pick in the Homeoffice modal). */
export function MiniMonth({ day, today, onPick }: { day: string; today: string; onPick: (d: string) => void }) {
  const d = parseIso(day);
  const [cursor, setCursor] = useState({ y: d.getFullYear(), m: d.getMonth() });
  useEffect(() => setCursor({ y: d.getFullYear(), m: d.getMonth() }), [day]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = monthGrid(cursor.y, cursor.m);
  const week = new Set(weekDays(day));
  const step = (n: number) => setCursor((c) => ({ y: c.m + n < 0 ? c.y - 1 : c.m + n > 11 ? c.y + 1 : c.y, m: (c.m + n + 12) % 12 }));
  return (
    <div className="kal-mini">
      <div className="kal-mini-head">
        <strong>
          {MONTHS[cursor.m]} {cursor.y}
          <Icon src={a.chevronDown} size={14} />
        </strong>
        <span>
          <button type="button" aria-label="Voriger Monat" onClick={() => step(-1)}>
            <Icon src={a.chevronDark} size={14} className="kal-prev" />
          </button>
          <button type="button" aria-label="Nächster Monat" onClick={() => step(1)}>
            <Icon src={a.chevronDark} size={14} className="kal-next" />
          </button>
        </span>
      </div>
      <div className="kal-mini-grid" role="grid" aria-label={`${MONTHS[cursor.m]} ${cursor.y}`}>
        <span className="kal-mini-kw" />
        {["M", "D", "M", "D", "F", "S", "S"].map((l, i) => (
          <span key={i} className="kal-mini-wd">
            {l}
          </span>
        ))}
        {rows.map((row) => (
          <div key={row.kw + row.days[0].day} className={`kal-mini-row${row.days.some((x) => week.has(x.day)) ? " current" : ""}`} role="row">
            <span className="kal-mini-kw">{row.kw}</span>
            {row.days.map((x) => (
              <button
                type="button"
                key={x.day}
                className={`kal-mini-day${x.inMonth ? "" : " out"}${x.day === today ? " today" : ""}${x.day === day && x.day !== today ? " selected" : ""}`}
                aria-pressed={x.day === day}
                onClick={() => onPick(x.day)}
              >
                {parseIso(x.day).getDate()}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
