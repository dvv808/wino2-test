import { useState } from "react";
import * as a from "../assets/index";
import { hhmm, parseIso } from "../home/calendar/calendarData";
import { FILE_PARTNERS } from "../person/partners";
import { TERMINARTEN, type MobileTermin, type Teilnehmer } from "./termine";

/** Overlay of a calendar entry (Figma 22761:367180): one card, built per Terminart. */
const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const PARTNER_NAMES = new Set(Object.values(FILE_PARTNERS).map((p) => p.name));

const longDay = (day: string) => {
  const d = parseIso(day);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const STATUS_ICON = { ja: a.mOvOk, offen: a.mOvPending, nein: a.mOvDeclined };

function People({ icon, label, people }: { icon: string; label: string; people: Teilnehmer[] }) {
  return (
    <div className="m-ov-row people">
      <img src={icon} alt="" width={26} height={26} />
      <div>
        <strong>{label}</strong>
        <ul>
          {people.map((p) => (
            <li key={p.name} className={p.status}>
              <img src={STATUS_ICON[p.status]} alt={p.status === "ja" ? "Zugesagt" : p.status === "nein" ? "Abgesagt" : "Offen"} width={16} height={16} />
              {p.name}
              {p.host ? " (Host)" : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Reisezeit Assistent: Abfahrt, this Termin, Ankunft and the trip figures (same as in the Termin form). */
export function ReiseAssistent({ t }: { t: MobileTermin }) {
  if (t.abfahrt === undefined || t.ankunft === undefined) return null;
  const reiseMin = Math.max(t.start - t.abfahrt, 0) + Math.max(t.ankunft - t.end, 0);
  const km = Math.round((reiseMin / 60) * 75);
  const diaeten = (Math.ceil((t.ankunft - t.abfahrt) / 60) * 2.02).toFixed(2).replace(".", ",");
  return (
    <section className="m-reise in-overlay">
      <h3>Reisezeit Assistent</h3>
      <ol>
        <li>
          <span>{hhmm(t.abfahrt)} Uhr</span>
          <span>
            <u>Abfahrt {t.abfahrtOrt}</u>
          </span>
        </li>
        <li className="now">
          <span>
            <b>
              {hhmm(t.start)} - {hhmm(t.end)} Uhr
            </b>
            <small>Dieser Termin</small>
          </span>
          <span>
            <b>
              <u>{t.title}</u>
              {t.ort.split(", ").map((line) => (
                <u key={line}>{line}</u>
              ))}
            </b>
          </span>
        </li>
        <li>
          <span>{hhmm(t.ankunft)} Uhr</span>
          <span>
            <u>Ankunft {t.ankunftOrt}</u>
          </span>
        </li>
      </ol>
      <dl>
        <div>
          <dt>Reisezeit Gesamt:</dt>
          <dd>{(reiseMin / 60).toLocaleString("de-AT", { maximumFractionDigits: 2 })} Stunden</dd>
        </div>
        <div>
          <dt>Kilometer:</dt>
          <dd>{km}km</dd>
        </div>
        <div>
          <dt>Diäten:</dt>
          <dd>EUR {diaeten}</dd>
        </div>
        <div>
          <dt>Fahrzeug:</dt>
          <dd>VW - GB 3312 AG</dd>
        </div>
      </dl>
    </section>
  );
}

export function MobileOverlay({
  termin: t,
  reise = false,
  onClose,
  onDelete,
  onEdit,
}: {
  termin: MobileTermin;
  /** Opened from the trip (blue bar or chip): the Reise overlay. */
  reise?: boolean;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const baseArt = t.art.replace(/ \(Entwurf\)$/, "");
  const tone = TERMINARTEN.find((x) => x.label === baseArt)?.tone ?? "termin";
  const mitBeratung = baseArt.startsWith("Termin - mit Beratung");
  const privat = baseArt === "Privater Termin";
  const weiterbildung = baseArt === "Weiterbildung";
  const hasReise = t.abfahrt !== undefined && t.ankunft !== undefined;
  const [tab, setTab] = useState<"info" | "reise">("info");
  const isPartner = PARTNER_NAMES.has(t.title);

  const title = reise ? "Reise" : mitBeratung ? "Termin - mit Beratung" : baseArt.replace("Termin - ohne Beratung", "Termin - Ohne Beratung");

  return (
    <div className="m-ov-wrap" role="dialog" aria-label={`${title}: ${t.title}`}>
      <button type="button" className="m-ov-scrim" aria-label="Schließen" onClick={onClose} />
      <article className="m-ov">
        <button type="button" className="m-ov-x" aria-label="Schließen" onClick={onClose}>
          <img src={a.iconCloseDark} alt="" width={10} height={10} />
        </button>
        <header className="m-ov-head">
          <span>
            <i className={`m-dot ${reise ? "reise" : tone}`} />
            <strong>{title}</strong>
          </span>
          <p>{isPartner ? <u>{t.title}</u> : t.title}</p>
          {privat ? null : (
            <button type="button" className="m-link center">
              {weiterbildung ? "IDD Stunden eintragen" : "Beratungsoberfläche öffnen"}
            </button>
          )}
        </header>

        {mitBeratung && hasReise && !reise ? (
          <div className="m-ov-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "info"} className={tab === "info" ? "on" : ""} onClick={() => setTab("info")}>
              Termin-Info
            </button>
            <button type="button" role="tab" aria-selected={tab === "reise"} className={tab === "reise" ? "on" : ""} onClick={() => setTab("reise")}>
              Reisezeit
            </button>
          </div>
        ) : null}

        <div className="m-ov-body">
          {reise || tab === "reise" ? (
            <ReiseAssistent t={t} />
          ) : (
            <>
              {t.beschreibung ? (
                <div className="m-ov-row">
                  <img src={a.info} alt="" width={22} height={22} />
                  <span className="clamp">{t.beschreibung}</span>
                </div>
              ) : null}
              <div className="m-ov-row">
                <img src={a.mOvCalendar} alt="" width={26} height={26} />
                <span>
                  {longDay(t.day)}
                  <br />
                  {hhmm(t.start)} - {hhmm(t.end)}
                </span>
              </div>
              {mitBeratung && t.dokuOffen ? (
                <div className="m-ov-row alert">
                  <img src={a.mOvDocMissing} alt="" width={26} height={26} />
                  <u>Status: Dokum. nicht abgeschlossen</u>
                </div>
              ) : null}
              {t.ort ? (
                <div className="m-ov-row">
                  <img src={a.mOvLocation} alt="" width={26} height={26} />
                  <u className="ellipsis">{t.ort}</u>
                </div>
              ) : null}
              {t.teams && !privat ? (
                <div className="m-ov-row">
                  <img src={a.mOvVideo} alt="" width={26} height={26} />
                  <u>Teams Event #{t.id.replace(/\D/g, "").slice(-6).padStart(6, "3")}</u>
                </div>
              ) : null}
              {privat ? (
                t.extern?.length ? <People icon={a.mOvGroup} label="Teilnehmer" people={t.extern} /> : null
              ) : (
                <>
                  {t.winter?.length ? <People icon={a.mOvWinter} label="Teilnehmer Winter" people={t.winter} /> : null}
                  {t.extern?.length ? <People icon={a.mOvGroup} label="Teilnehmer Extern" people={t.extern} /> : null}
                </>
              )}
            </>
          )}
        </div>

        {mitBeratung || reise ? null : (
          <footer className="m-ov-foot">
            <button type="button" onClick={onEdit}>
              <img src={a.edit} alt="" width={18} height={18} />
              Bearbeiten
            </button>
            <button type="button" className="danger" onClick={onDelete}>
              <img src={a.trash} alt="" width={18} height={18} />
              Löschen
            </button>
          </footer>
        )}
      </article>
    </div>
  );
}
