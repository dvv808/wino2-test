import * as a from "./assets/index";
import { EditLink, Icon } from "./ui";
import { useWorkflow } from "./workflow";

type Card = "contact" | "honorar" | "terms";

function ContactCard() {
  return (
    <>
      <div className="card-head">
        <h3>Zentrale Kontaktdaten</h3>
        <EditLink />
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
              <img src={a.contactBadge} alt="" width={22} height={22} style={{ inset: 7 }} />
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
            <Icon src={a.phone} size={18} />
            Telefon
          </span>
          <strong>+43 3810 393 112 3</strong>
          <button type="button" className="icon-btn" aria-label="Kommentar">
            <span className="comment-btn">
              <img src={a.comment} alt="" width={18} height={18} />
            </span>
          </button>
        </div>
        <div className="kv">
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon src={a.mail} size={18} />
            Mail
          </span>
          <strong>julia.atkinson@mail.at</strong>
          <span />
        </div>
      </div>
      <div className="address-row">
        <span>Adresse</span>
        <strong>
          Mondseestrasse 32
          <br />
          A-5310 Mondseet
        </strong>
      </div>
      <div className="post-pill">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="stack-icon" style={{ width: 36, height: 36 }}>
            <img src={a.badgeCircle} alt="" width={36} height={36} />
            <img src={a.house} alt="" width={22} height={22} style={{ inset: 7 }} />
          </span>
          <p>
            <span className="notice-kicker">Postadresse</span>
            <br />
            <span className="notice-text">Diese Adresse ist die Postadresse</span>
          </p>
        </div>
        <Icon src={a.openTabLg} size={24} />
      </div>
    </>
  );
}

function HonorarCard() {
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
  } = useWorkflow();

  return (
    <>
      <div className="card-head">
        <h3>Honoroar Modell</h3>
        <EditLink />
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
        <dt>Erstmalige Verrechnung des Honorars</dt>
        <dd>{billing === "custom" ? "Individuelles Datum" : "Nächste Monatserste"}</dd>
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
        <dd>{payment === "debit" ? "Abbuchung" : "Rechnung"}</dd>
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
            <dd>julia.atkinson@gmail.at</dd>
          </>
        )}
        {delivery === "post" && (
          <>
            <dt>Postadresse für Rechnungsversand</dt>
            <dd>
              Mondseestrasse 32
              <br />
              A-5310 Mondseet
            </dd>
          </>
        )}
      </dl>
    </>
  );
}

function TermsCard() {
  const { termsText } = useWorkflow();

  return (
    <>
      <div className="card-head">
        <h3>Individuelle Vereinbarungen</h3>
        <EditLink />
      </div>
      <div className="terms-preview">
        <span className="notice-kicker">Vereinbarungen</span>
        <p>{termsText.trim() ? termsText : "-"}</p>
      </div>
    </>
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
