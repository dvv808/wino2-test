import { useEffect, useRef, useState } from "react";
import * as a from "../../assets/index";
import { Icon } from "../../ui";
import { addDays, hhmm, parseIso } from "./calendarData";
import { GENEHMIGER, type HomeofficeAntrag } from "./homeoffice";

/**
 * Kalender Aktivitäten (Figma 17586:114121) and Beantragungen (Figma 22647:286332): they replace the body of
 * the Kalender side nav. Homeoffice requests come from the live list; the other requests are demo data.
 */

const pad = (n: number) => String(n).padStart(2, "0");
const dmy = (day: string) => {
  const d = parseIso(day);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

type Beantragung = {
  id: string;
  title: string;
  lines: [string, string];
  status: "offen" | "genehmigt" | "info";
  /** Homeoffice: the request behind the card. */
  antrag?: HomeofficeAntrag;
  /** Info (abgelehnt / Rückfrage): what has to be done, and the link that does it. */
  info?: string;
  action?: string;
};

function demo(today: string): Beantragung[] {
  return [
    {
      id: "dv-sonstiges",
      title: "DV Sonstiges",
      lines: [`${dmy(addDays(today, 7))} - ${dmy(addDays(today, 9))}`, "08:00 - 12:00 Uhr"],
      status: "offen",
    },
    {
      id: "dv-arzt",
      title: "DV Arzt",
      lines: [dmy(addDays(today, -6)), "1 Tag"],
      status: "info",
      info: "Der Bericht des DV-Arztes ist nicht aktuell und entspricht nicht dem angegebenen Datum. Bitte aktuellen Bericht nachreichen.",
      action: "DV Arzt editieren",
    },
    {
      id: "pflegeurlaub",
      title: "Pflegeurlaub",
      lines: [`${dmy(addDays(today, 20))} - ${dmy(addDays(today, 26))}`, "7 Tage"],
      status: "offen",
    },
    {
      id: "urlaub",
      title: "Urlaub",
      lines: [`${dmy(addDays(today, 40))} - ${dmy(addDays(today, 44))}`, "5 Tage"],
      status: "genehmigt",
    },
  ];
}

export function beantragungen(antraege: HomeofficeAntrag[], today: string): Beantragung[] {
  const homeoffice = [...antraege]
    .sort((x, y) => x.day.localeCompare(y.day) || x.start - y.start)
    .map<Beantragung>((x) => ({
      id: x.id,
      title: "Homeoffice",
      lines: [dmy(x.day), `${hhmm(x.start)} - ${hhmm(x.end)}`],
      status: x.status === "zurueckgesetzt" ? "info" : x.status,
      antrag: x,
      info:
        x.status === "zurueckgesetzt"
          ? `Zurückgesetzt von ${x.entschiedenVon ?? GENEHMIGER.name}${x.entscheidNotiz ? `: „${x.entscheidNotiz}“` : "."} Bitte neu beantragen.`
          : undefined,
      action: x.status === "zurueckgesetzt" ? "Homeoffice neu beantragen" : undefined,
    }));
  return [...homeoffice, ...demo(today)];
}

/** Numbers for the Aktivitäten entry and the Beantragungen row: infos need action, open ones wait. */
export function counts(antraege: HomeofficeAntrag[], today: string) {
  const list = beantragungen(antraege, today);
  const info = list.filter((x) => x.status === "info").length;
  const offen = list.filter((x) => x.status === "offen").length;
  return { info, offen, aktivitaeten: info + 1 /* Termineinladung */ };
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="kal-akt-back" onClick={onClick}>
      <span>
        <Icon src={a.chevronDark} size={12} className="kal-prev" />
      </span>
      <u>Zurück</u>
    </button>
  );
}

const Badge = ({ n }: { n: number }) => (n > 0 ? <span className="kal-akt-badge">{n}</span> : null);

export function AktivitaetenPanel({
  antraege,
  today,
  shared,
  onBack,
  onBeantragungen,
}: {
  antraege: HomeofficeAntrag[];
  today: string;
  shared: number;
  onBack: () => void;
  onBeantragungen: () => void;
}) {
  const c = counts(antraege, today);
  const month = parseIso(today).toLocaleDateString("de-AT", { month: "long", year: "numeric" });
  return (
    <div className="kal-akt">
      <Back onClick={onBack} />
      <h2 className="kal-akt-title">
        <img src={a.calBell} alt="" width={20} height={20} />
        <Badge n={c.aktivitaeten} />
        Kalender Aktivitäten
      </h2>

      <section className="kal-akt-konto">
        <header>
          <span className="kal-akt-ico">
            <img src={a.aktClock} alt="" width={18} height={18} />
          </span>
          <strong>Zeitkontostand {dmy(today)}</strong>
        </header>
        <div className="kal-akt-konto-body">
          <p>
            <span>Resturlaub</span>
            <span>12,00 / 21,00</span>
          </p>
          <i className="kal-akt-bar">
            <i style={{ width: `${(12 / 21) * 100}%` }} />
          </i>
          <p>
            <span>Zeitkonto</span>
            <span className="neg">-17:00</span>
          </p>
          <p>
            <span>Überstunden</span>
            <span className="pos">+11:00</span>
          </p>
        </div>
        <div className="kal-akt-row pink">
          <span className="kal-akt-ico">
            <img src={a.aktTimeConfirm} alt="" width={18} height={18} />
          </span>
          <span className="kal-akt-text">
            <strong>Monatsabschluss</strong>
            <small>{month}</small>
          </span>
          <u>Ausstehend</u>
        </div>
      </section>

      <button type="button" className="kal-akt-row" onClick={onBeantragungen}>
        <span className="kal-akt-ico">
          <img src={a.aktRequest} alt="" width={18} height={18} />
        </span>
        <span className="kal-akt-text">
          <strong>
            <Badge n={c.info} />
            Beantragungen
          </strong>
          <small>
            {c.info} Info · {c.offen} Offen
          </small>
        </span>
        <u>Ansehen</u>
      </button>
      <div className="kal-akt-row">
        <span className="kal-akt-ico">
          <img src={a.aktMailSent} alt="" width={18} height={18} />
        </span>
        <span className="kal-akt-text">
          <strong>
            <Badge n={1} />
            Termineinladungen
          </strong>
          <small>1 Neue</small>
        </span>
        <u>Ansehen</u>
      </div>
      <div className="kal-akt-row">
        <span className="kal-akt-ico">
          <img src={a.aktCalShared} alt="" width={18} height={18} />
        </span>
        <span className="kal-akt-text">
          <strong>Geteilte Kalender</strong>
          <small>{shared} geteilte</small>
        </span>
        <u>Ansehen</u>
      </div>
    </div>
  );
}

export function BeantragungenPanel({
  antraege,
  today,
  onBack,
  onOpen,
  onEdit,
  highlight,
}: {
  antraege: HomeofficeAntrag[];
  today: string;
  /** Homeoffice request to highlight (and scroll to). Its tab opens. */
  highlight: string | null;
  onBack: () => void;
  /** A Homeoffice card: show it in the calendar. */
  onOpen: (antrag: HomeofficeAntrag) => void;
  /** "Homeoffice bearbeiten" on a rejected one: open the modal on its day. */
  onEdit: (antrag: HomeofficeAntrag) => void;
}) {
  const target = antraege.find((x) => x.id === highlight);
  const [tab, setTab] = useState<"offen" | "genehmigt">(target?.status === "genehmigt" ? "genehmigt" : "offen");
  const marked = useRef<HTMLElement>(null);
  useEffect(() => {
    marked.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);
  const list = beantragungen(antraege, today).filter((x) => (tab === "offen" ? x.status !== "genehmigt" : x.status === "genehmigt"));
  return (
    <div className="kal-akt">
      <Back onClick={onBack} />
      <h2 className="kal-akt-title">
        <img src={a.aktRequest} alt="" width={18} height={18} />
        Beantragungen
      </h2>
      <div className="kal-akt-tabs" role="tablist">
        {(["offen", "genehmigt"] as const).map((t) => (
          <button type="button" role="tab" key={t} aria-selected={tab === t} className={tab === t ? "active" : undefined} onClick={() => setTab(t)}>
            {t === "offen" ? "Offen" : "Genehmigt"}
          </button>
        ))}
      </div>
      {list.length === 0 ? <p className="kal-akt-empty">Keine {tab === "offen" ? "offenen" : "genehmigten"} Beantragungen.</p> : null}
      {list.map((x) => {
        const open = x.antrag ? () => onOpen(x.antrag!) : undefined;
        return (
          <article
            key={x.id}
            ref={x.id === highlight ? marked : undefined}
            className={`kal-akt-card ${x.status}${open ? " clickable" : ""}${x.id === highlight ? " highlight" : ""}`}
          >
            <div className="kal-akt-card-main" onClick={open} role={open ? "button" : undefined} tabIndex={open ? 0 : undefined}>
              <span className="kal-akt-ico">
                {x.antrag ? <img src={a.hoDot} alt="" width={11} height={11} /> : <i className="kal-akt-dot" />}
              </span>
              <span className="kal-akt-text">
                <strong>{x.title}</strong>
                <small>
                  {x.lines[0]}
                  <br />
                  {x.lines[1]}
                </small>
              </span>
              <span className="kal-akt-state">
                {x.status === "offen" ? (
                  <>
                    <img src={a.hoOnhold} alt="" width={18} height={18} />
                    Offen
                  </>
                ) : x.status === "genehmigt" ? (
                  <>
                    <img src={a.calHomeofficeApproved} alt="" width={22} height={17} />
                    Genehmigt
                  </>
                ) : (
                  <>
                    <img src={a.calUrlaubRejected} alt="" width={22} height={17} />
                    {x.antrag ? "Zurückgesetzt" : "Abgelehnt"}
                  </>
                )}
              </span>
            </div>
            {x.info ? (
              <div className="kal-akt-info">
                <p>{x.info}</p>
                <button type="button" onClick={() => (x.antrag ? onEdit(x.antrag) : undefined)}>
                  {x.action}
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
