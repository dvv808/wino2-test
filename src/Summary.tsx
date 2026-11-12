import * as a from "./assets/index";
import { EditLink, Icon } from "./ui";
import { clausesOf, useWorkflow, type CommsPick, type Frequency } from "./workflow";
import { useGueltigkeit } from "./steps/Gueltigkeit";
import { amountOf, ddmmyyyy, euro } from "./lib/maklervereinbarung/gueltigkeit";
import { FREQUENCY_LABEL, ZAHLWEISE_AB, companyErsteVerrechnung, zahlweise } from "./lib/maklervereinbarung/zahlweise";
import { FilePersonChip, useFilePerson } from "./chrome";

type Card = "contact" | "versand" | "honorar" | "terms";

function ContactCard() {
  const { commsChoice, openStammdaten } = useWorkflow();
  const person = useFilePerson();
  const rep = person.isCompany ? commsChoice.rep : undefined;
  return (
    <>
      <div className="card-head">
        <h3>{person.isCompany ? "Zentraler Kontakt der Firma" : "Zentrale Kontaktdaten"}</h3>
        <EditLink onClick={() => openStammdaten("kontakte", commsChoice.phone?.cardId ?? commsChoice.mail?.cardId ?? commsChoice.rep?.cardId)} />
      </div>
      <div className="person-row">
        {/* Unternehmen: the Vertretungsbefugte Person is the central contact (Figma 21023:48040). */}
        {person.isCompany && rep ? (
          <div className="person-meta">
            <span className="stack-icon" style={{ width: 32, height: 32 }}>
              <img src={a.avatarBg} alt="" width={32} height={32} />
              <img src={a.personSmall} alt="" width={21} height={21} style={{ inset: 5 }} />
            </span>
            <div className="person-copy">
              <strong>{rep.value}</strong>
              <small>{rep.cardTitle}</small>
            </div>
          </div>
        ) : person.isCompany ? (
          <div className="person-meta">
            <span className="stack-icon" style={{ width: 32, height: 32 }}>
              <img src={a.avatarBg} alt="" width={32} height={32} />
              <img src={a.personSmall} alt="" width={21} height={21} style={{ inset: 5 }} />
            </span>
            <div className="person-copy">
              <em className="summary-missing">Vertretungsbefugte Person noch nicht ausgewählt</em>
            </div>
          </div>
        ) : (
        <div className="person-meta">
          <span className="stack-icon" style={{ width: 32, height: 32 }}>
            <img src={a.avatarBg} alt="" width={32} height={32} />
            <img src={person.isCompany ? a.companyBlank : a.personSmall} alt="" width={21} height={21} style={{ inset: 5 }} />
          </span>
          <div className="person-copy">
            <FilePersonChip />
            <strong>{person.personName}</strong>
            {person.isCompany ? (person.file.fn ? <small>FN {person.file.fn}</small> : null) : person.born ? <small>{person.born}</small> : null}
          </div>
        </div>
        )}
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
      {person.isCompany ? null : <PostBlock />}
    </>
  );
}

/** Unternehmen: Versand von Nachrichten, Dokumente und Erklärungen (Figma 21023:48084). */
function VersandCard() {
  const { commsChoice, openStammdaten } = useWorkflow();
  const mail = commsChoice.versandMail;
  return (
    <>
      <div className="card-head">
        <h3>Versand von Nachrichten, Dokumente und Erklärungen</h3>
        <EditLink onClick={() => openStammdaten("adressen", commsChoice.post?.cardId)} />
      </div>
      <PostBlock />
      <div className="contact-box">
        <div className="notice-head">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="stack-icon" style={{ width: 36, height: 36 }}>
              <img src={a.badgeCircle} alt="" width={36} height={36} />
              <img src={a.commsMailSent} alt="" width={22.5} height={22.5} style={{ left: 6.75, top: 6.75 }} />
            </span>
            <p>
              <span className="notice-kicker">Nachrichten, Dokumente und Erklärungen</span>
              <br />
              <span className="notice-text">Diese Mail dient als Versand von Nachrichten, Dokumente und Erklärungen</span>
            </p>
          </div>
          <Icon src={a.openTabLg} size={24} />
        </div>
        <div className="kv">
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon src={a.commsMail} size={18} />
            Mail
          </span>
          <ChoiceValue pick={mail} />
          <span />
        </div>
      </div>
    </>
  );
}

/** Adresse and the Postadresse pill (Privat: in Zentrale Kontaktdaten; Unternehmen: in Versand). */
function PostBlock() {
  const { commsChoice } = useWorkflow();
  return (
    <>
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
    goTo,
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
    businessAmount,
    frequency,
  } = useWorkflow();
  const g = useGueltigkeit();
  // Unternehmen: Business amount, Zahlweise and Abbuchung / Rechnung (Figma 21095:72749).
  const { isCompany } = useFilePerson();
  const jahresbetrag = amountOf(businessAmount);
  const freq: Frequency = jahresbetrag >= ZAHLWEISE_AB ? frequency : "yearly";
  const companyAb = isCompany ? companyErsteVerrechnung(billing, month, year, g.gueltig) : null;
  const zw = companyAb ? zahlweise(companyAb, jahresbetrag, Number(dueMonth), freq) : null;

  return (
    <>
      <div className="card-head">
        <h3>Honorar Modell</h3>
        {/* Not a Stammdaten value: anpassen goes back to the Honorar step. */}
        <EditLink onClick={onEdit ?? (() => goTo("fee"))} />
      </div>
      <div className="model-row">
        <div className="model-meta">
          <span className="model-icon">
            <Icon src={isCompany && model === "privat" ? a.subBusiness : a.privat} size={34} />
          </span>
          <div className="model-copy">
            <strong>{modelLabel}</strong>
            {model === "privat" && (
              <small>
                € {isCompany ? jahresbetrag.toLocaleString("de-DE") : 120} <span>/Jahr</span>
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
        {isCompany ? null : (
          <>
            <dt>Gültig ab</dt>
            <dd>{g.gueltig ? ddmmyyyy(g.gueltig) : "Letzte Unterschrift (ausstehend)"}</dd>
          </>
        )}
        <dt>Erstmalige Verrechnung des Honorars</dt>
        <dd>
          {isCompany
            ? zw
              ? ddmmyyyy(zw.ab)
              : "Noch nicht festgelegt"
            : g.verrechnung
              ? ddmmyyyy(g.verrechnung.ab)
              : billing === "custom"
                ? "Individuelles Datum"
                : "Nächste Monatserste"}
        </dd>
        {isCompany ? (
          zw && zw.monate > 0 ? (
            <>
              <dt>Aliquot</dt>
              <dd>
                {euro(zw.betrag)} bis {ddmmyyyy(zw.bis)}
              </dd>
            </>
          ) : null
        ) : g.verrechnung?.rumpfjahr ? (
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
        {isCompany && (
          <>
            <dt>Zahlweise</dt>
            <dd>{FREQUENCY_LABEL[freq]}</dd>
          </>
        )}
        <dt>Zahlart</dt>
        <dd>{payment === "debit" ? (isCompany ? "Abbuchung" : "SEPA-Lastschrift") : isCompany ? "Rechnung" : "Überweisung"}</dd>
        {payment === "debit" && (
          <>
            <dt>Bankverbindung für Abbuchung</dt>
            <dd>
              {selectedBank ? (
                <>
                  {selectedBank.name}
                  <br />
                  {selectedBank.bank}
                  <br />
                  {selectedBank.iban}
                </>
              ) : (
                "-"
              )}
            </dd>
          </>
        )}
        {payment === "invoice" && (
          <>
            {isCompany && (
              <>
                <dt>Zahlungsziel (Tage nach Rechnungserhalt)</dt>
                <dd>{paymentTerm}</dd>
              </>
            )}
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
            <dd>{(isCompany ? commsChoice.versandMail : commsChoice.mail)?.value ?? "Noch nicht ausgewählt"}</dd>
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
  const { termsText, termsOn, goTo } = useWorkflow();

  return (
    <>
      <div className="card-head">
        <h3>Individuelle Vereinbarungen</h3>
        <EditLink onClick={() => goTo("terms")} />
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
          {/* Graphic_PDF (Figma 20978:54833): the page and the red PDF band at their own sizes. */}
          <span className="pdf-graphic" aria-hidden="true">
            <img src={a.pdf} alt="" width={14.67} height={18} />
            <img src={a.pdfLabel} alt="" width={14.71} height={6.02} />
          </span>
          PDF anzeigen
        </button>
      </div>

      {cards.map((card) => (
        <article className={`summary-card${card === highlight ? " highlight" : ""}`} key={card}>
          {card === "contact" && <ContactCard />}
          {card === "versand" && <VersandCard />}
          {card === "honorar" && <HonorarCard />}
          {card === "terms" && <TermsCard />}
        </article>
      ))}
    </aside>
  );
}
