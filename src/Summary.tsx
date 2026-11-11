import * as a from "./assets/index";
import { EditLink, Icon } from "./ui";
import { clausesOf, useWorkflow, type CommsPick } from "./workflow";
import { useGueltigkeit } from "./steps/Gueltigkeit";
import { ddmmyyyy, euro } from "./lib/maklervereinbarung/gueltigkeit";

type Card = "contact" | "honorar" | "terms";

function ContactCard() {
  const { commsChoice, openStammdaten } = useWorkflow();
  return (
    <>
      <div className="card-head">
        <h3>Zentrale Kontaktdaten</h3>
        <EditLink onClick={() => openStammdaten("kontakte", commsChoice.phone?.cardId ?? commsChoice.mail?.cardId)} />
      </div>
      <div className="person-row">
        <div className="person-meta">
          <span className="stack-icon" style={{ width: 32, height: 32 }}>
            <img src={a.avatarBg} alt="" width={32} height={32} />
            <img src={a.personSmall} alt="" width={21} height={21} style={{ inset: 5 }} />
          </span>
          <div className="person-copy">
            <span className="chip">Interessent</span>
            <strong>Julia Aktinson</strong>
            <small>12.09.1988</small>
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label="In neuem Tab öffnen">
          <Icon src={a.openTab} size={16} />
        </button>
      </div>
      <div className="contact-box">
        <div className="notice-head">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="stack-icon" style={{ width: 36, height: 36 }}>
              <img src={a.badgeCircle} alt="" width={36} height={36} />
              <img src={a.commsMainContact} alt="" width={22.5} height={22.5} style={{ left: 6.75, top: 6.75 }} />
            </span>
            <p>
              <span className="notice-kicker">Zentraler Kontakt</span>
              <br />
              <span className="notice-text">Diese Kontaktdaten dienen als zentraler Kontakt</span>
            </p>
          </div>
          <span className="stack-icon" style={{ width: 20, height: 20 }}>
            <img src={a.infoRing} alt="" width={20} height={20} />
            <img src={a.info} alt="" width={8} height={12} style={{ left: 6, top: 4 }} />
          </span>
        </div>
        <div className="kv">
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon src={a.commsPhone} size={18} />
            Telefon
          </span>
          <ChoiceValue pick={commsChoice.phone} />
          <span />
        </div>
        <div className="kv">
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon src={a.commsMail} size={18} />
            Mail
          </span>
          <ChoiceValue pick={commsChoice.mail} />
          <span />
        </div>
      </div>
      <div className="address-row">
        <span>Adresse</span>
        {commsChoice.post ? (
          <strong>
            {commsChoice.post.value}
            {commsChoice.post.second ? (
              <>
                <br />
                {commsChoice.post.second}
              </>
            ) : null}
          </strong>
        ) : (
          <em className="summary-missing">Noch nicht ausgewählt</em>
        )}
      </div>
      {commsChoice.post ? (
        <div className="post-pill">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="stack-icon" style={{ width: 36, height: 36 }}>
              <img src={a.badgeCircle} alt="" width={36} height={36} />
              <img src={a.commsHouse} alt="" width={22.5} height={22.5} style={{ left: 6.75, top: 6.75 }} />
            </span>
            <p>
              <span className="notice-kicker">Postadresse</span>
              <br />
              <span className="notice-text">
                {commsChoice.post.cardTitle} – für die Maklervereinbarung als Postadresse gewählt
              </span>
            </p>
          </div>
          <Icon src={a.openTabLg} size={24} />
        </div>
      ) : null}
    </>
  );
}

/** A picked value; from another contact than the partner's own (e.g. the husband) it names that contact. */
function ChoiceValue({ pick }: { pick?: CommsPick }) {
  if (!pick) return <em className="summary-missing">Noch nicht ausgewählt</em>;
  return (
    <strong className="summary-choice">
      {pick.value}
      <small>{pick.cardTitle}</small>
    </strong>
  );
}

export function HonorarCard({ onEdit }: { onEdit?: () => void } = {}) {
  const {
    model,
    modelLabel,
    selectedPartner,
    customNote,
    billing,
    day,
    month,
    year,
    dueDay,
    dueMonth,
    payment,
    selectedBank,
    paymentTerm,
    invoiceNote,
    delivery,
    commsChoice,
  } = useWorkflow();
  const g = useGueltigkeit();

  return (
    <>
      <div className="card-head">
        <h3>Honorar Modell</h3>
        <EditLink onClick={onEdit} />
      </div>
      <div className="model-row">
        <div className="model-meta">
          <span className="model-icon">
            <Icon src={a.privat} size={34} />
          </span>
          <div className="model-copy">
            <strong>{modelLabel}</strong>
            {model === "privat" && (
              <small>
                € 120 <span>/Jahr</span>
              </small>
            )}
          </div>
        </div>
        <Icon src={a.openTab} size={16} />
      </div>
      <dl className="dl">
        {model === "partner" && (
          <>
            <dt>Verknüpfte Partner</dt>
            <dd>{selectedPartner ? selectedPartner.name : "Auswählen"}</dd>
          </>
        )}
        {model === "custom" && customNote && (
          <>
            <dt>Notiz</dt>
            <dd>{customNote}</dd>
          </>
        )}
        {model === "privat" && (
          <>
        <dt>Gültig ab</dt>
        <dd>{g.gueltig ? ddmmyyyy(g.gueltig) : "Letzte Unterschrift (ausstehend)"}</dd>
        <dt>Erstmalige Verrechnung des Honorars</dt>
        <dd>
          {g.verrechnung ? ddmmyyyy(g.verrechnung.ab) : billing === "custom" ? "Individuelles Datum" : "Nächste Monatserste"}
        </dd>
        {g.verrechnung?.rumpfjahr ? (
          <>
            <dt>Rumpfjahr (aliquot)</dt>
            <dd>
              {euro(g.verrechnung.betrag)} bis {ddmmyyyy(g.verrechnung.bis)}
            </dd>
          </>
        ) : null}
        {billing === "custom" && (
          <>
            <dt>Individuelles Datum</dt>
            <dd>
              {day}.{month}.{year}
            </dd>
          </>
        )}
        <dt>Hauptfälligkeit</dt>
        <dd>
          {dueDay}.{dueMonth}.
        </dd>
        <dt>Zahlart</dt>
        <dd>{payment === "debit" ? "SEPA-Lastschrift" : "Überweisung"}</dd>
        {payment === "debit" && (
          <>
            <dt>Bankverbindung für Abbuchung</dt>
            <dd>
              {selectedBank.name}
              <br />
              {selectedBank.bank}
              <br />
              {selectedBank.iban}
            </dd>
          </>
        )}
        {payment === "invoice" && (
          <>
            <dt>Zahlungsziel (Tage nach Rechnungserhalt)</dt>
            <dd>{paymentTerm}</dd>
            {invoiceNote && (
              <>
                <dt>Notiz</dt>
                <dd>{invoiceNote}</dd>
              </>
            )}
          </>
        )}
        <dt>Rechnungsversand</dt>
        <dd>{delivery === "email" ? "E-Mail" : "Post"}</dd>
        {delivery === "email" && (
          <>
            <dt>E-Mail für Rechnungsversand</dt>
            <dd>{commsChoice.mail?.value ?? "Noch nicht ausgewählt"}</dd>
          </>
        )}
        {delivery === "post" && (
          <>
            <dt>Postadresse für Rechnungsversand</dt>
            <dd>
              {commsChoice.post ? (
                <>
                  {commsChoice.post.value}
                  {commsChoice.post.second ? (
                    <>
                      <br />
                      {commsChoice.post.second}
                    </>
                  ) : null}
                </>
              ) : (
                "Noch nicht ausgewählt"
              )}
            </dd>
          </>
        )}
          </>
        )}
      </dl>
    </>
  );
}

function TermsCard() {
  const { termsText, termsOn } = useWorkflow();

  return (
    <>
      <div className="card-head">
        <h3>Individuelle Vereinbarungen</h3>
        <EditLink />
      </div>
      <div className="terms-preview">
        <span className="notice-kicker">Vereinbarungen</span>
        {!termsOn ? (
          <p>Keine individuelle Vereinbarung</p>
        ) : clausesOf(termsText).length ? (
          // One block per clause, with a rule in between (as in the agreement text).
          clausesOf(termsText).map((clause, index) => (
            <div key={index} className="terms-clause">
              {index > 0 ? <hr /> : null}
              <p>{clause}</p>
            </div>
          ))
        ) : (
          <p>-</p>
        )}
      </div>
    </>
  );
}

export function WicoDeviationBox() {
  const { wicoDeviationOn, wicoDeviationNote, openStammdaten } = useWorkflow();
  if (!wicoDeviationOn) return null;
  const note = wicoDeviationNote.trim();
  return (
    <button
      type="button"
      className="wico-deviation-box"
      onClick={() => openStammdaten("wirtschaftsdaten")}
    >
      <span className="wico-deviation-kicker">Abweichende Daten · WICO</span>
      {note ? <strong>{note}</strong> : null}
      <small>In Stammdaten öffnen</small>
    </button>
  );
}

export function Summary({ cards }: { cards: Card[] }) {
  const { setPdfOpen } = useWorkflow();
  const highlight = cards[cards.length - 1];

  return (
    <aside className="summary">
      <div className="summary-head">
        <div>
          <h2>Zusammenfassung</h2>
          <p>Die bisher erfassten Eingaben:</p>
        </div>
        <button type="button" className="pdf-btn" onClick={() => setPdfOpen(true)}>
          <span className="stack-icon" style={{ width: 18, height: 18 }}>
            <img src={a.pdf} alt="" width={18} height={18} />
            <img src={a.pdfLabel} alt="" width={18} height={18} style={{ inset: 0 }} />
          </span>
          PDF anzeigen
        </button>
      </div>

      {cards.map((card) => (
        <article className={`summary-card${card === highlight ? " highlight" : ""}`} key={card}>
          {card === "contact" && <ContactCard />}
          {card === "honorar" && <HonorarCard />}
          {card === "terms" && <TermsCard />}
        </article>
      ))}
    </aside>
  );
}
