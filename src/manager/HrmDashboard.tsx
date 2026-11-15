import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as a from "../assets/index";
import { addDays, parseIso, weekStart } from "../home/calendar/calendarData";
import { loadAntraege, onAntraegeChange } from "../home/calendar/homeoffice";
import { Icon } from "../ui";
import { homeofficeRows, useHrDemo, type Art, type HrAntrag } from "./hrmAntraege";
import { HOHER_RESTURLAUB, HOMEOFFICE_GRENZE, TEAM as ALL_TEAM, TERMINARTEN, teamTermine, todayIso, type TeamMember } from "./hrmTeam";
import { inAuswahl, inZeitpunkt, useAuswahl } from "./mitarbeiterAuswahl";

/**
 * Management → HRM → Dashboard (Figma 19056:77709). Anträge and Homeoffice are live (HRM Listen → Anträge,
 * Lucy's Kalender); Zeitkonto, Monatsabschluss, Gespräche and the team calendar are dummy data in `hrmTeam.ts`.
 */

const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
const tausend = (n: number) => Math.round(n).toLocaleString("de-DE");
const dmy = (day: string) => {
  const d = parseIso(day);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};

type Tone = "pink" | "yellow" | "green";

/** The small rounded badge with an up/down arrow and a number. */
function Trend({ value, up, tone }: { value: number; up: boolean; tone: Tone }) {
  return (
    <span className={`hd-trend ${tone}`}>
      <img className={up ? "" : "down"} src={a.hrmTrend} alt={up ? "gestiegen" : "gesunken"} width={10} height={5} />
      {pad(value)}
    </span>
  );
}

function Kpi({ icon, value, label, trend, note, flip }: { icon: string; value: string; label: string; trend: ReactNode; note: string; flip?: boolean }) {
  return (
    <div className={flip ? "hd-kpi flip" : "hd-kpi"}>
      <img className="hd-waves" src={a.hrmWaves} alt="" />
      <div className="hd-kpi-top">
        <span className="hd-bubble">
          <Icon src={icon} size={24} />
        </span>
        <strong>{value}</strong>
      </div>
      <p className="hd-kpi-label">{label}</p>
      <p className="hd-kpi-foot">
        {trend}
        {note}
      </p>
    </div>
  );
}

/** One of the three small counters (beantragt / abgelehnt / genehmigt look). */
function Counter({ value, label, icon, flip, onClick }: { value: number; label: string; icon: string; flip?: boolean; onClick?: () => void }) {
  return (
    <button type="button" className={flip ? "hd-counter flip" : "hd-counter"} onClick={onClick} disabled={!onClick}>
      <span className="hd-counter-copy">
        <strong>{pad(value)}</strong>
        <small>{label}</small>
      </span>
      <span className="hd-counter-icon">
        <Icon src={icon} size={16} />
      </span>
    </button>
  );
}

type Bar = { label: string; value: number; tone?: "pink" | "blue" };

/** Bars over a faint grid; heights are relative to the biggest bar. */
function Bars({ bars, wide }: { bars: Bar[]; wide?: boolean }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className={wide ? "hd-bars wide" : "hd-bars"} style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
      {bars.map((bar) => (
        <div className="hd-bar-col" key={bar.label}>
          <div className="hd-bar-area">
            <span className="hd-bar-value">{pad(bar.value)}</span>
            <span className={`hd-bar-track ${bar.tone ?? ""}`} style={{ height: `${Math.max(bar.value ? 14 : 4, (bar.value / max) * 151)}px` }}>
              <span className="hd-bar-fill" />
            </span>
          </div>
          <span className="hd-bar-label">{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

const ANTRAG_GROUPS: { id: string; label: string; icon: string; arts: Art[] }[] = [
  { id: "krank", label: "Krank", icon: a.mbSickness, arts: ["Krank"] },
  { id: "dv", label: "Dienstverhind.", icon: a.mbBlocked, arts: ["DV Arzt", "DV Sonstiges"] },
  { id: "urlaub", label: "Urlaub", icon: a.mbHoliday, arts: ["Urlaub"] },
  { id: "homeoffice", label: "Homeoffice", icon: a.house, arts: ["Homeoffice"] },
];
const TILES = 40;

/** Shares the 40 tiles between the groups by size (largest remainder), at least one tile per group with rows. */
function tilesOf(counts: number[]): number[] {
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (!total) return counts.map(() => 0);
  const exact = counts.map((n) => (n / total) * TILES);
  const tiles = exact.map((x, i) => (counts[i] ? Math.max(1, Math.floor(x)) : 0));
  let left = TILES - tiles.reduce((sum, n) => sum + n, 0);
  const order = exact.map((x, i) => [x - Math.floor(x), i]).sort((x, y) => y[0] - x[0]);
  for (let k = 0; left > 0; k++, left--) tiles[order[k % order.length][1]]++;
  for (let k = 0; left < 0; k++) {
    const i = tiles.indexOf(Math.max(...tiles));
    tiles[i]--;
    left++;
  }
  return tiles;
}

function exportCsv(rows: [string, string | number][], today: string) {
  const csv = ["Kennzahl;Wert", ...rows.map(([k, v]) => `${k};${v}`)].join("\n");
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `hrm-dashboard-${today}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const WORKFLOWS = [
  { person: ALL_TEAM[5], titel: "Onboarding", stand: "Schritt 3 von 5", offen: true },
  { person: ALL_TEAM[8], titel: "Wiedereingliederung", stand: "Wartet auf HR", offen: true },
  { person: ALL_TEAM[13], titel: "Probezeit-Ende", stand: "abgeschlossen", offen: false },
];

export function HrmDashboard({ onTab, exportSlot }: { onTab: (tab: string) => void; exportSlot?: (run: () => void) => ReactNode }) {
  const today = useMemo(todayIso, []);
  const [homeoffice, setHomeoffice] = useState(loadAntraege);
  useEffect(() => onAntraegeChange(setHomeoffice), []);
  const [demo] = useHrDemo();
  const [range, setRange] = useState<"woche" | "jahr">("woche");
  const [side, setSide] = useState<"gespraeche" | "workflows">("gespraeche");

  /* The Mitarbeiter side nav narrows everything: selected employees and the Zeitpunkt (Anträge by year). */
  const { selected, zeitpunkt } = useAuswahl();
  const TEAM = ALL_TEAM.filter((m) => inAuswahl(selected, m.name));
  const lucy = inAuswahl(selected, "Lucy Dallon");
  const workflows = WORKFLOWS.filter((w) => inAuswahl(selected, w.person.name));

  const antraege: HrAntrag[] = [...homeofficeRows(homeoffice), ...demo].filter((r) => inAuswahl(selected, r.person.name) && inZeitpunkt(zeitpunkt, r.day));
  const status = (s: HrAntrag["status"]) => antraege.filter((r) => r.status === s).length;
  const groups = ANTRAG_GROUPS.map((g) => ({ ...g, count: antraege.filter((r) => g.arts.includes(r.art)).length }));
  const tiles = tilesOf(groups.map((g) => g.count));

  /* Zeitübersicht: the team figures, plus Lucy's live Homeoffice hours (everything not zurückgesetzt). */
  const liveHomeoffice = !lucy ? 0 : homeoffice.filter((x) => x.status !== "zurueckgesetzt").reduce((sum, x) => sum + (x.end - x.start), 0) / 60;
  const sum = (pick: (m: TeamMember) => number) => TEAM.reduce((total, m) => total + pick(m), 0);
  const urlaub = sum((m) => m.urlaubVerbraucht);
  const hoherRest = TEAM.filter((m) => m.urlaubAnspruch - m.urlaubVerbraucht >= HOHER_RESTURLAUB).length;
  const homeofficeStunden = sum((m) => m.homeoffice) + liveHomeoffice;
  const homeofficeKnapp = TEAM.filter((m) => m.homeoffice / m.soll >= HOMEOFFICE_GRENZE).length;
  const krank = sum((m) => m.krank);
  const krankDelta = sum((m) => m.krankWoche) - sum((m) => m.krankVorwoche);
  const dv = sum((m) => m.dv);
  const dvDelta = sum((m) => m.dvWoche) - sum((m) => m.dvVorwoche);

  const abgeschlossen = TEAM.filter((m) => m.abschluss).length;
  const fehlerhaft = TEAM.filter((m) => m.fehler > 0).length;
  const positiv = TEAM.filter((m) => m.zeitkonto >= 0).length;
  const zeitGroups: { label: string; icon: string; bars: Bar[] }[] = [
    { label: "Monatsabschluss", icon: a.aktTimeConfirm, bars: [{ label: "abgesch.", value: abgeschlossen }, { label: "offen", value: TEAM.length - abgeschlossen, tone: "pink" }] },
    { label: "Eintragungsqualität", icon: a.edit, bars: [{ label: "gut", value: TEAM.length - fehlerhaft }, { label: "fehler", value: fehlerhaft, tone: "pink" }] },
    { label: "Zeitkonto", icon: a.aktClock, bars: [{ label: "positiv", value: positiv }, { label: "negativ", value: TEAM.length - positiv, tone: "pink" }] },
  ];

  /* Gespräche */
  const gespraeche = TEAM.filter((m) => m.gespraech)
    .map((m) => ({ person: m, ...m.gespraech!, day: addDays(today, -m.gespraech!.vorTagen) }))
    .sort((x, y) => y.day.localeCompare(x.day));
  const gOffen = gespraeche.filter((g) => g.status === "offen").length;
  const gFehlt = TEAM.length - gespraeche.length;
  const offeneWorkflows = workflows.filter((w) => w.offen).length;

  /* Termine, Reisen & Weiterbildungen */
  const alleTermine = useMemo(() => teamTermine(today), [today]);
  const termine = alleTermine.filter((t) => inAuswahl(selected, t.wer));
  const monday = weekStart(today);
  const lastMonday = addDays(monday, -7);
  const inRange = termine.filter((t) => (range === "woche" ? t.day >= monday : t.day <= today));
  const terminBars: Bar[] = TERMINARTEN.map((art, i) => ({ label: art, value: inRange.filter((t) => t.art === art).length, tone: i % 2 ? "blue" : undefined }));
  const side3 = (
    [
      { label: "Reisen", icon: a.mbCar, tab: "reisen", is: (t: (typeof termine)[number]) => t.reise },
      { label: "Externe Termine", icon: a.hrmOffice, tab: "zeit", is: (t: (typeof termine)[number]) => t.extern },
      { label: "Weiterbildungen", icon: a.mbEducation, tab: "weiterbildungen", is: (t: (typeof termine)[number]) => t.art === "Weiterbildung" },
    ] as const
  ).map((card) => {
    const list = termine.filter(card.is);
    const thisWeek = list.filter((t) => t.day >= monday).length;
    const lastWeek = list.filter((t) => t.day >= lastMonday && t.day < monday).length;
    return { ...card, total: list.filter((t) => t.day <= today).length, delta: thisWeek - lastWeek };
  });

  const runExport = () =>
    exportCsv(
      [
        ["Stand", dmy(today)],
        ["Urlaubstage verbraucht", urlaub],
        ["Homeoffice gesamt (h)", Math.round(homeofficeStunden)],
        ["Krankenstand (Tage)", krank],
        ["Dienstverhinderung gesamt (h)", dv],
        ...zeitGroups.flatMap((g) => g.bars.map((b) => [`${g.label} ${b.label}`, b.value] as [string, number])),
        ["Anträge beantragt", status("beantragt")],
        ["Anträge zurückgesetzt", status("zurueckgesetzt")],
        ["Anträge genehmigt", status("genehmigt")],
        ...groups.map((g) => [`Anträge ${g.label}`, g.count] as [string, number]),
        ["Gespräche offen", gOffen],
        ["Gespräche nicht vorhanden", gFehlt],
        ["Gespräche abgeschlossen", gespraeche.length - gOffen],
        ...side3.map((c) => [c.label, c.total] as [string, number]),
      ],
      today,
    );

  return (
    <div className="hd">
      {exportSlot?.(runExport)}
      <div className="hd-row top">
        <section className="hd-card hd-zeit" aria-label="Zeitübersicht">
          <header className="hd-card-head">
            <h2>Zeitübersicht (Stand: {dmy(today)})</h2>
            <button type="button" className="hd-all" onClick={() => onTab("zeit")}>
              Alle anzeigen
            </button>
          </header>
          <div className="hd-zeit-body">
            <div className="hd-kpis">
              <Kpi icon={a.mbHoliday} value={tausend(urlaub)} label="Urlaubstage verbraucht" trend={<Trend value={hoherRest} up={false} tone="pink" />} note="hoher Resturlaub" />
              <Kpi flip icon={a.house} value={`${tausend(homeofficeStunden)}h`} label="Homeoffice gesamt" trend={<Trend value={homeofficeKnapp} up tone="yellow" />} note="knapp/über 30%" />
              <Kpi icon={a.mbSickness} value={tausend(krank)} label="Krankenstand" trend={<Trend value={krankDelta} up={krankDelta > 0} tone={krankDelta > 0 ? "pink" : "green"} />} note="seit letzter Woche" />
              <Kpi flip icon={a.mbBlocked} value={`${tausend(dv)}h`} label="Dienstverhinderung gesamt" trend={<Trend value={dvDelta} up={dvDelta > 0} tone={dvDelta > 0 ? "yellow" : "green"} />} note="seit letzter Woche" />
            </div>
            <div className="hd-zeit-chart">
              {zeitGroups.map((group) => (
                <div className="hd-zeit-group" key={group.label}>
                  <Icon src={group.icon} size={24} />
                  <span className="hd-zeit-group-label">{group.label}</span>
                  <Bars bars={group.bars} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="hd-card hd-antraege" aria-label="Anträge">
          <header className="hd-card-head">
            <h2>Anträge</h2>
            <button type="button" className="hd-all" onClick={() => onTab("antraege")}>
              Alle anzeigen
            </button>
          </header>
          <div className="hd-counters">
            <Counter value={status("beantragt")} label="beantragt" icon={a.hoOnhold} onClick={() => onTab("antraege")} />
            <Counter flip value={status("zurueckgesetzt")} label="zurückgesetzt" icon={a.tarifCancelled} onClick={() => onTab("antraege")} />
            <Counter value={status("genehmigt")} label="genehmigt" icon={a.confirm} onClick={() => onTab("antraege")} />
          </div>
          <div className="hd-tiles" role="img" aria-label={groups.map((g) => `${g.count} ${g.label}`).join(", ")}>
            {groups.flatMap((g, gi) => Array.from({ length: tiles[gi] }, (_, i) => <span className={`hd-tile ${g.id}`} key={`${g.id}-${i}`} />))}
            {antraege.length ? null : Array.from({ length: TILES }, (_, i) => <span className="hd-tile empty" key={i} />)}
          </div>
          <ul className="hd-legend">
            {groups.map((g) => (
              <li key={g.id}>
                <span className={`hd-dot ${g.id}`} />
                <Icon src={g.icon} size={24} />
                {g.count} {g.label}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="hd-row bottom">
        <section className="hd-card hd-gespraeche" aria-label="Mitarbeitergespräche und Workflows">
          <div className="hd-side-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={side === "gespraeche"} className={side === "gespraeche" ? "active" : ""} onClick={() => setSide("gespraeche")}>
              Mitarb. Gespräche
            </button>
            <button type="button" role="tab" aria-selected={side === "workflows"} className={side === "workflows" ? "active" : ""} onClick={() => setSide("workflows")}>
              {offeneWorkflows ? <span className="hd-count">{offeneWorkflows}</span> : null}
              Workflows
            </button>
          </div>
          {side === "gespraeche" ? (
            <>
              <div className="hd-counters">
                <Counter value={gOffen} label="offen" icon={a.hoOnhold} />
                <Counter flip value={gFehlt} label="nicht vorhanden" icon={a.tarifCancelled} />
                <Counter value={gespraeche.length - gOffen} label="abgeschl." icon={a.confirm} />
              </div>
              <h3 className="hd-sub">Letzte Gespräche</h3>
              <ul className="hd-list">
                {gespraeche.slice(0, 3).map((g) => (
                  <li key={g.person.name} title={g.person.name}>
                    <span className="hd-avatar">
                      <img src={g.person.photo} alt={g.person.name} />
                      <img className="hd-avatar-dot" src={a.statusDot} alt="" />
                    </span>
                    <span className="hd-list-date">{dmy(g.day)}</span>
                    <strong>{g.art}</strong>
                    <span className="hd-list-status">
                      {g.status}
                      <Icon src={g.status === "offen" ? a.hoOnhold : a.confirm} size={16} />
                    </span>
                  </li>
                ))}
              </ul>
              <button type="button" className="hd-all center" onClick={() => onTab("gespraeche")}>
                Alle Gespräche anzeigen
              </button>
            </>
          ) : (
            <>
              <h3 className="hd-sub">HR Workflows</h3>
              <ul className="hd-list">
                {workflows.map((w) => (
                  <li key={w.titel} title={w.person.name}>
                    <span className="hd-avatar">
                      <img src={w.person.photo} alt={w.person.name} />
                      <img className="hd-avatar-dot" src={a.statusDot} alt="" />
                    </span>
                    <span className="hd-list-date wide">{w.person.name}</span>
                    <strong>{w.titel}</strong>
                    <span className="hd-list-status">
                      {w.stand}
                      <Icon src={w.offen ? a.hoOnhold : a.confirm} size={16} />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="hd-card hd-termine" aria-label="Termine, Reisen und Weiterbildungen">
          <header className="hd-card-head">
            <h2>Termine, Reisen &amp; Weiterbildungen</h2>
            <button type="button" className="hd-all" onClick={() => onTab("zeit")}>
              Alle anzeigen
            </button>
          </header>
          <div className="hd-termine-body">
            <div className="hd-termine-chart">
              <div className="hd-chart-head">
                <strong>Terminarten Verteilung</strong>
                <span className="hd-range">
                  <button type="button" className={range === "woche" ? "active" : ""} aria-pressed={range === "woche"} onClick={() => setRange("woche")}>
                    Diese Woche
                  </button>
                  <button type="button" className={range === "jahr" ? "active" : ""} aria-pressed={range === "jahr"} onClick={() => setRange("jahr")}>
                    Seit 01.01
                  </button>
                </span>
              </div>
              <Bars wide bars={terminBars} />
            </div>
            <div className="hd-side3">
              {side3.map((card) => (
                <button type="button" className="hd-side-card" key={card.label} onClick={() => onTab(card.tab)}>
                  <img className="hd-waves" src={a.hrmWaves} alt="" />
                  <span className="hd-side-main">
                    <span className="hd-kpi-top">
                      <span className="hd-bubble">
                        <Icon src={card.icon} size={24} />
                      </span>
                      <strong>{tausend(card.total)}</strong>
                    </span>
                    <span className="hd-side-label">{card.label}</span>
                  </span>
                  <span className="hd-side-trend">
                    <Trend value={card.delta} up={card.delta >= 0} tone={card.delta >= 0 ? "green" : "pink"} />
                    <small>seit letzter Woche</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
