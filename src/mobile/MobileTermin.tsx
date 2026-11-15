import { useState } from "react";
import * as a from "../assets/index";
import { hhmm, iso, parseIso } from "../home/calendar/calendarData";
import { MiniMonth } from "../home/calendar/MiniMonth";
import { TEAM } from "../manager/hrmTeam";
import { FILE_PARTNERS } from "../person/partners";
import { QUARTERS, TERMINARTEN, loadTermine, saveTermine } from "./termine";

/** Termin hinzufügen on mobile (Figma 19074:464695). */
const ORTE = ["Büro Schladming", "Büro Kapfenberg", "Beim Kunden", "Eigene Adresse", "Telefontermin (Kein Ort)"] as const;
const BUERO: Record<string, string> = {
  "Büro Schladming": "Makler Winter, Salzburgerstraße 304, 8970 Schladming",
  "Büro Kapfenberg": "Makler Winter, Wiener Straße 35, 8605 Kapfenberg",
};
const REISE_ORTE = ["Zu Hause", "Büro Schladming", "Büro Kapfenberg"];
const FAHRZEUGTYPEN = ["Firmen PKW", "Privater PKW", "Kein PKW (Zug oder mitgefahren)"];
const FIRMEN_PKW = ["GB 3312 AG", "LI 204 WV", "BM 771 KS"];
const PARTNERS = Object.values(FILE_PARTNERS);
const mail = (name: string, domain: string) => `${name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@${domain}`;

function Radios({ options, value, onChange, label }: { options: readonly string[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="m-radios" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button type="button" role="radio" key={option} aria-checked={value === option} className={value === option ? "on" : ""} onClick={() => onChange(option)}>
          <img src={value === option ? a.radioOn : a.radioOff} alt="" width={24} height={24} />
          {option}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button type="button" className={on ? "sw-switch on" : "sw-switch"} aria-pressed={on} aria-label={label} onClick={() => onChange(!on)}>
      <span className="sw-switch-knob" />
    </button>
  );
}

function Select({ value, options, onChange, label }: { value: string | number; options: { value: string | number; text: string }[]; onChange: (v: string) => void; label: string }) {
  return (
    <span className="m-select">
      <select value={value} aria-label={label} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.text}
          </option>
        ))}
      </select>
      <img src={a.chevronDown} alt="" width={14} height={14} />
    </span>
  );
}

const TIMES = QUARTERS.map((q) => ({ value: q, text: hhmm(q) }));

/** A small list to pick from, under a "… suchen" button. */
function Picker({ label, options, onPick }: { label: string; options: string[]; onPick: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="m-picker">
      <button type="button" className="m-grey-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label}
      </button>
      {open ? (
        <ul className="m-picker-list" role="listbox">
          {options.length ? (
            options.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    onPick(option);
                    setOpen(false);
                  }}
                >
                  {option}
                </button>
              </li>
            ))
          ) : (
            <li className="empty">Keine weiteren Einträge</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

export function MobileTerminForm({ day: startDay, art, onBack, onSaved }: { day: string; art: string; onBack: () => void; onSaved: (day: string, message: string) => void }) {
  const today = iso(new Date());
  const tone = TERMINARTEN.find((t) => t.label === art)?.tone ?? "termin";
  const [partner, setPartner] = useState("");
  const [day, setDay] = useState(startDay);
  const [picker, setPicker] = useState(false);
  const [start, setStart] = useState(13 * 60);
  const [end, setEnd] = useState(17 * 60);
  const [ortArt, setOrtArt] = useState<string>("Beim Kunden");
  const [ortText, setOrtText] = useState("");
  const [teams, setTeams] = useState(false);
  const [winter, setWinter] = useState<string[]>(["Lucy Dallon"]);
  const [extern, setExtern] = useState<string[]>([]);
  const [reise, setReise] = useState(true);
  const [abfahrt, setAbfahrt] = useState(10 * 60);
  const [abfahrtOrt, setAbfahrtOrt] = useState("Zu Hause");
  const [ankunft, setAnkunft] = useState(20 * 60);
  const [ankunftOrt, setAnkunftOrt] = useState("Zu Hause");
  const [stops, setStops] = useState<{ zeit: number; ort: string }[]>([]);
  const [diaeten, setDiaeten] = useState("Ja");
  const [fahrzeugtyp, setFahrzeugtyp] = useState("Firmen PKW");
  const [fahrzeug, setFahrzeug] = useState("GB 3312 AG");
  const [tried, setTried] = useState(false);

  const d = parseIso(day);
  const partnerFile = PARTNERS.find((p) => p.name === partner);
  /* The Ort follows the choice: an office, the customer's address, or typed freely. */
  const autoOrt =
    ortArt === "Beim Kunden" && partnerFile?.address ? `${partnerFile.name}, ${partnerFile.address.join(", ")}` : BUERO[ortArt] ?? "";
  const ort = ortArt === "Telefontermin (Kein Ort)" ? "" : ortText || autoOrt;
  const needsOrt = ortArt !== "Telefontermin (Kein Ort)";

  const errors = {
    partner: !partner ? "Bitte einen Partner wählen." : "",
    zeit: end <= start ? "Ende muss nach dem Beginn liegen." : "",
    ort: needsOrt && !ort ? "Bitte einen Ort angeben." : "",
    reise: reise && (abfahrt > start || ankunft < end) ? "Abfahrt muss vor dem Termin, Ankunft danach liegen." : "",
  };
  const valid = Object.values(errors).every((e) => !e);

  const reiseMin = reise ? Math.max(start - abfahrt, 0) + Math.max(ankunft - end, 0) : 0;
  /* Demo figures for the Reisezeit Assistent: 75 km per travel hour, Diäten 2,02 € per started hour away. */
  const km = Math.round((reiseMin / 60) * 75);
  const diaetenSum = diaeten === "Ja" ? (Math.ceil((ankunft - abfahrt) / 60) * 2.02).toFixed(2).replace(".", ",") : "-";

  function save(entwurf: boolean) {
    setTried(true);
    if (!valid) return;
    saveTermine([
      ...loadTermine(),
      {
        id: `t${Date.now()}`,
        day,
        start,
        end,
        art: entwurf ? `${art} (Entwurf)` : art,
        title: partner,
        ort,
        ...(reise ? { abfahrt, ankunft, abfahrtOrt, ankunftOrt } : {}),
      },
    ]);
    onSaved(day, entwurf ? "Termin als Entwurf gespeichert" : "Termin gespeichert und gesendet");
  }

  const err = (text: string) => (tried && text ? <p className="m-error">{text}</p> : null);

  return (
    <div className="m-form-screen">
      <header className="m-form-head">
        <button type="button" className="m-back" aria-label="Zurück" onClick={onBack}>
          <img src={a.arrowRight} alt="" width={18} height={18} className="m-flip" />
        </button>
        <span className="m-form-title">
          <i className={`m-dot ${tone}`} /> {art}
        </span>
      </header>

      <div className="m-form-body m-termin">
        <h2>Termin-Details</h2>
        <div className="m-field">
          <span className="m-label">Partner*</span>
          <div className="m-box">{partner ? <><b>Kundentermin:</b> {partner}</> : <em>Noch kein Partner gewählt</em>}</div>
          <Picker
            label="Partner Suchen"
            options={PARTNERS.map((p) => p.name)}
            onPick={(name) => {
              setPartner(name);
              setOrtText("");
              setExtern((list) => (list.includes(name) ? list : [name, ...list]));
            }}
          />
          {err(errors.partner)}
        </div>

        <div className="m-field">
          <span className="m-label">Datum*</span>
          <div className="m-date-row">
            <span>Am</span>
            <b>{String(d.getDate()).padStart(2, "0")}</b>
            <b>{String(d.getMonth() + 1).padStart(2, "0")}</b>
            <b>{d.getFullYear()}</b>
            <button type="button" className="m-date-btn" aria-label="Datum wählen" aria-expanded={picker} onClick={() => setPicker(!picker)}>
              <img src={a.calendar} alt="" width={18} height={17} />
            </button>
          </div>
          {picker ? (
            <div className="m-pop m-pop-monat inline">
              <MiniMonth
                day={day}
                today={today}
                onPick={(next) => {
                  setDay(next);
                  setPicker(false);
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="m-field">
          <span className="m-label">Uhrzeit*</span>
          <label className="m-row">
            <span>Beginn</span>
            <Select label="Beginn" value={start} options={TIMES} onChange={(v) => setStart(Number(v))} />
          </label>
          <label className="m-row">
            <span>Ende</span>
            <Select label="Ende" value={end} options={TIMES} onChange={(v) => setEnd(Number(v))} />
          </label>
          {err(errors.zeit)}
        </div>

        <hr />
        <h2>Ort</h2>
        <div className="m-field">
          <span className="m-label">Ort des Termins*</span>
          <Radios
            label="Ort des Termins"
            options={ORTE}
            value={ortArt}
            onChange={(v) => {
              setOrtArt(v);
              setOrtText("");
            }}
          />
        </div>
        {needsOrt ? (
          <div className="m-field">
            <span className="m-label">
              Ort*
              <button type="button" className="m-link">
                Google Maps öffnen
              </button>
            </span>
            <input className="m-input" value={ort} placeholder="Adresse" aria-label="Ort" onChange={(event) => setOrtText(event.target.value)} />
            {ort ? (
              <div className="m-maps">
                <img src={a.googleMaps} alt="" width={18} height={18} />
                <span>
                  <u>Google Maps</u> Ort Status:
                </span>
                <b>
                  <img src={a.checkGreen} alt="" width={16} height={16} /> Gefunden
                </b>
              </div>
            ) : null}
            {err(errors.ort)}
          </div>
        ) : null}
        <div className="m-field">
          <span className="m-label">
            Microsoft Teams Meeting
            <Toggle on={teams} onChange={setTeams} label="Microsoft Teams Meeting" />
          </span>
          {teams ? (
            <div className="m-teams">
              <img src={a.calTeams} alt="" width={18} height={18} />
              <u>Teams Event #341442</u>
            </div>
          ) : null}
        </div>

        <hr />
        <h2>Teilnehmer</h2>
        <div className="m-field">
          <span className="m-label">Teilnehmer Winter</span>
          <div className="m-chips">
            {winter.map((name) => (
              <button type="button" key={name} title="Entfernen" onClick={() => setWinter((list) => list.filter((n) => n !== name))}>
                {name} - {mail(name, "winter.at")}
              </button>
            ))}
            {winter.length === 0 ? <em>Keine Teilnehmer</em> : null}
          </div>
          <Picker label="Personen suchen" options={TEAM.map((m) => m.name).filter((n) => !winter.includes(n))} onPick={(name) => setWinter((list) => [...list, name])} />
        </div>
        <div className="m-field">
          <span className="m-label">Teilnehmer Extern</span>
          <div className="m-chips">
            {extern.map((name) => (
              <button type="button" key={name} className={name === partner ? "main" : ""} title="Entfernen" onClick={() => setExtern((list) => list.filter((n) => n !== name))}>
                {name}
              </button>
            ))}
            {extern.length === 0 ? <em>Keine Teilnehmer</em> : null}
          </div>
          <Picker label="Personen suchen" options={PARTNERS.map((p) => p.name).filter((n) => !extern.includes(n))} onPick={(name) => setExtern((list) => [...list, name])} />
        </div>

        <hr />
        <h2 className="m-h2-row">
          Fahrzeug &amp; Reise
          <Toggle on={reise} onChange={setReise} label="Fahrzeug & Reise" />
        </h2>
        {reise ? (
          <>
            <div className="m-field">
              <span className="m-label">Abfahrt*</span>
              <label className="m-row">
                <span>Uhrzeit</span>
                <Select label="Abfahrt Uhrzeit" value={abfahrt} options={TIMES} onChange={(v) => setAbfahrt(Number(v))} />
              </label>
              <label className="m-row">
                <span>Ort</span>
                <Select label="Abfahrt Ort" value={abfahrtOrt} options={REISE_ORTE.map((o) => ({ value: o, text: o }))} onChange={setAbfahrtOrt} />
              </label>
            </div>
            {stops.map((stop, index) => (
              <div className="m-field" key={index}>
                <span className="m-label">
                  Zwischenstopp {index + 1}
                  <button type="button" className="m-link" onClick={() => setStops((list) => list.filter((_, i) => i !== index))}>
                    entfernen
                  </button>
                </span>
                <label className="m-row">
                  <span>Uhrzeit</span>
                  <Select label="Zwischenstopp Uhrzeit" value={stop.zeit} options={TIMES} onChange={(v) => setStops((list) => list.map((s, i) => (i === index ? { ...s, zeit: Number(v) } : s)))} />
                </label>
                <label className="m-row">
                  <span>Ort</span>
                  <input className="m-input" value={stop.ort} placeholder="Adresse" aria-label="Zwischenstopp Ort" onChange={(event) => setStops((list) => list.map((s, i) => (i === index ? { ...s, ort: event.target.value } : s)))} />
                </label>
              </div>
            ))}
            <div className="m-field">
              <span className="m-label">Ankunft*</span>
              <label className="m-row">
                <span>Uhrzeit</span>
                <Select label="Ankunft Uhrzeit" value={ankunft} options={TIMES} onChange={(v) => setAnkunft(Number(v))} />
              </label>
              <label className="m-row">
                <span>Ort</span>
                <Select label="Ankunft Ort" value={ankunftOrt} options={REISE_ORTE.map((o) => ({ value: o, text: o }))} onChange={setAnkunftOrt} />
              </label>
              <div className="m-picker">
                <button type="button" className="m-grey-btn" onClick={() => setStops((list) => [...list, { zeit: end, ort: "" }])}>
                  <img src={a.plusCircle} alt="" width={14} height={14} /> Zwischenstopp hinzufügen
                </button>
              </div>
              {err(errors.reise)}
            </div>
            <div className="m-field">
              <span className="m-label">Diäten*</span>
              <Radios label="Diäten" options={["Ja", "Nein"]} value={diaeten} onChange={setDiaeten} />
            </div>
            <div className="m-field">
              <span className="m-label">Fahrzeugtyp*</span>
              <Radios label="Fahrzeugtyp" options={FAHRZEUGTYPEN} value={fahrzeugtyp} onChange={setFahrzeugtyp} />
            </div>
            {fahrzeugtyp === "Firmen PKW" ? (
              <div className="m-field">
                <span className="m-label">Fahrzeug wählen*</span>
                <div className="m-box">
                  <u>{fahrzeug}</u>
                </div>
                <Picker label="Firmen PKW suchen" options={FIRMEN_PKW} onPick={setFahrzeug} />
              </div>
            ) : null}

            <section className="m-reise">
              <h3>Reisezeit Assistent</h3>
              <ol>
                <li>
                  <span>{hhmm(abfahrt)} Uhr</span>
                  <span>Abfahrt {abfahrtOrt}</span>
                </li>
                <li className="now">
                  <span>
                    <b>
                      {hhmm(start)} - {hhmm(end)} Uhr
                    </b>
                    <small>Dieser Termin</small>
                  </span>
                  <span>
                    <b>{ort ? ort.split(", ").map((line) => <span key={line}>{line}</span>) : partner || "-"}</b>
                  </span>
                </li>
                <li>
                  <span>{hhmm(ankunft)} Uhr</span>
                  <span>Ankunft {ankunftOrt}</span>
                </li>
              </ol>
              <dl>
                <div>
                  <dt>Reisezeit Gesamt:</dt>
                  <dd>
                    {(reiseMin / 60).toLocaleString("de-AT", { maximumFractionDigits: 2 })} {reiseMin === 60 ? "Stunde" : "Stunden"}
                  </dd>
                </div>
                <div>
                  <dt>Kilometer:</dt>
                  <dd>{fahrzeugtyp.startsWith("Kein") ? "-" : `${km}km`}</dd>
                </div>
                <div>
                  <dt>Diäten:</dt>
                  <dd>{diaetenSum === "-" ? "-" : `EUR ${diaetenSum}`}</dd>
                </div>
                <div>
                  <dt>Fahrzeug:</dt>
                  <dd>{fahrzeugtyp === "Firmen PKW" ? `VW - ${fahrzeug}` : fahrzeugtyp}</dd>
                </div>
              </dl>
            </section>
          </>
        ) : null}

        {tried && !valid ? <p className="m-error">Bitte die markierten Angaben ergänzen.</p> : null}
        <div className="m-termin-foot">
          <button type="button" className="m-primary wide" onClick={() => save(false)}>
            Speichern &amp; Senden
          </button>
          <button type="button" className="m-secondary wide" onClick={() => save(true)}>
            Als Entwurf speichern
          </button>
        </div>
      </div>
    </div>
  );
}
