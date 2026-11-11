import * as a from "../assets/index";
import { Summary } from "../Summary";
import { EditLink, EntityIcon, Icon, InfoBox, RadioRow, TarifLine, WarnBox } from "../ui";
import { BANKS, PARTNERS, useWorkflow } from "../workflow";
import { commsOptions } from "../person/stammdaten";
import { CommsSelect, FIELDS } from "./CommsStep";
import { GueltigkeitInfo } from "./Gueltigkeit";

/** Erstmalige Verrechnung on an individual date: a 1st of a month after today. */
function futureMonth(month: string, year: string) {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12 || !/^\d{4}$/.test(year)) return false;
  return new Date(y, m - 1, 1) > new Date();
}

export function HonorarStep() {
  const {
    model,
    chooseModel,
    openMenu,
    toggleMenu,
    setOpenMenu,
    partners,
    setPartners,
    partnerId,
    setPartnerId,
    selectedPartner,
    bankId,
    setBankId,
    selectedBank,
    amount,
    billing,
    setBilling,
    month,
    setMonth,
    year,
    setYear,
    dueDay,
    setDueDay,
    dueMonth,
    setDueMonth,
    payment,
    setPayment,
    delivery,
    setDelivery,
    paymentTerm,
    setPaymentTerm,
    invoiceNote,
    setInvoiceNote,
    customNote,
    setCustomNote,
    sections,
    commsChoice,
    setCommsChoice,
    openStammdaten,
  } = useWorkflow();

  return (
    <>
      <section>
        <div className="page-title">
          <h1>Honorar</h1>
          <p>Wähle einen passenden Honorar-Tarif für diese Maklervereinbarung.</p>
        </div>
        <div className="section-kicker">
          <h2>Honorar Modell erstellen</h2>
          <p>Bitte wähle ein Modell aus:</p>
        </div>

        <div className="form-col">
          <div className="radio-stack">
            <RadioRow selected={model === "privat"} onSelect={() => chooseModel("privat")}>
              Honorartarif: Privat
            </RadioRow>
            <RadioRow selected={model === "partner"} onSelect={() => chooseModel("partner")}>
              bei anderem Partner mit umfasst
            </RadioRow>
            <RadioRow selected={model === "custom"} onSelect={() => chooseModel("custom")}>
              Individuell
            </RadioRow>
          </div>

          {model === "partner" && (
            <div className="block">
              <div className="label-row">
                <span className="field-label">Verknüpfte Partner</span>
                <EditLink onClick={() => openStammdaten("verknuepfung")} />
              </div>
              <div className="dropdown">
                <button
                  type="button"
                  className={`entity-card${openMenu === "partner" ? " open" : ""}`}
                  onClick={() => toggleMenu("partner")}
                  aria-expanded={openMenu === "partner"}
                >
                  <EntityIcon src={a.partnerAbo} />
                  {selectedPartner ? (
                    <span className="partner-copy">
                      <TarifLine tariff={selectedPartner.tariff} ok={selectedPartner.ok} />
                      <strong>{selectedPartner.name}</strong>
                    </span>
                  ) : (
                    <span className="copy placeholder">Auswählen</span>
                  )}
                  <Icon src={a.selectCaret} size={16} />
                </button>
                {openMenu === "partner" &&
                  (partners.length === 0 ? (
                    <div className="dropdown-menu empty">
                      <div className="empty-menu">
                        <Icon src={a.noResults} size={32} />
                        <p>
                          <strong>Keine Treffer gefunden.</strong>
                          Bitte ergänze die fehlenden Daten in den Stammdaten.
                        </p>
                        <button
                          type="button"
                          className="empty-link"
                          onClick={() => setPartners(PARTNERS)}
                        >
                          + Daten ergänzen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="dropdown-menu">
                      {partners.map((partner, index) => (
                        <div key={partner.id}>
                        {index === 0 || partners[index - 1].group !== partner.group ? (
                          <p className="menu-group">{partner.group}</p>
                        ) : null}
                        <button
                          type="button"
                          className={`menu-item${partner.id === partnerId ? " selected" : ""}`}
                          onClick={() => {
                            setPartnerId(partner.id);
                            setOpenMenu(null);
                          }}
                        >
                          <span className="menu-item-main">
                            <EntityIcon src={a.partnerAbo} />
                            <span className="partner-copy">
                              <TarifLine tariff={partner.tariff} ok={partner.ok} />
                              <strong>{partner.name}</strong>
                              <small className="menu-relation">{partner.relation === partner.group ? partner.group : `${partner.group} · ${partner.relation}`}</small>
                            </span>
                          </span>
                          <Icon src={partner.id === partnerId ? a.confirmOn : a.confirmOff} size={18} />
                        </button>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
              {!selectedPartner && partners.length === 0 && (
                <WarnBox>Achtung! In Stammdaten Verknüpfungen sind keine Partner hinterlegt.</WarnBox>
              )}
              {selectedPartner && !selectedPartner.ok && (
                <WarnBox>
                  Achtung! Der Partner ist verknüpft, hat aber noch kein passenden Honorartarif. Du
                  kannst diese Maklervereinbarung erst abschließen, sobald dieser Partner einen
                  korrekten Honorartarif hat.
                </WarnBox>
              )}
            </div>
          )}

          {model === "custom" && (
            <div className="block">
              <InfoBox>
                Zwischen den Vertragspartnern wird individuell vereinbart, dass für die Erbringung
                der unselbständigen Nebenleistungen kein gesondertes Honorar geschuldet wird.
              </InfoBox>
              {/* Pflichtfeld: why no Honorar is charged has to be documented. */}
              <span className="field-label">Notiz*</span>
              <textarea
                className={customNote.trim() ? "textarea" : "textarea invalid"}
                aria-required="true"
                aria-invalid={!customNote.trim()}
                placeholder="Begründung, warum kein gesondertes Honorar verrechnet wird"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
              />
              {customNote.trim() ? null : <p className="field-error">Bitte eine Notiz angeben – bei Individuell ist sie Pflicht.</p>}
            </div>
          )}

          {model === "privat" && (
            <div className="block">
              <h3>Zahlungsinformationen</h3>
              <div className="label-row">
                <span className="field-label">Honorarbetrag jährlich</span>
              </div>
              <button type="button" className="select-field">
                {amount}
                <Icon src={a.caret} size={16} />
              </button>
              <InfoBox>
                Für Kunden bis zum 25 oder ab dem 65 Lebensjahr ist der Honorarbetrag um 50%
                reduziert.
              </InfoBox>
            </div>
          )}

          {/* Bei anderem Partner / Individuell: only the content above (Figma 21698:125815–125820). */}
          {model === "privat" && (
            <>
          <div className="block">
            <span className="field-label">Erstmalige Verrechnung</span>
            <div className="radio-stack">
              <RadioRow tall selected={billing === "next"} onSelect={() => setBilling("next")}>
                Nächste Monatserste nach Abschluss der Vereinbarung
              </RadioRow>
              <RadioRow selected={billing === "custom"} onSelect={() => setBilling("custom")}>
                Individuelles Datum
              </RadioRow>
            </div>
          </div>

          {billing === "custom" && (
            <div className="block">
              <span className="field-label">Individuelles Datum</span>
              {/* Figma 21232:21127: always the 1st of a month (day locked), month and year open, only future values. */}
              <div className="date-row">
                <span className="date-box locked" title="Verrechnung immer zum Monatsersten">
                  01
                </span>
                <input
                  className="date-box open"
                  aria-label="Monat"
                  inputMode="numeric"
                  maxLength={2}
                  value={month}
                  onChange={(e) => setMonth(e.target.value.replace(/\D/g, ""))}
                />
                <input
                  className="date-box year"
                  aria-label="Jahr"
                  inputMode="numeric"
                  maxLength={4}
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
                />
                <button type="button" className="cal-btn" aria-label="Kalender">
                  <Icon src={a.calendar} size={16} />
                </button>
              </div>
              {futureMonth(month, year) ? null : (
                <p className="field-error">Nur ein Monatserster in der Zukunft ist möglich.</p>
              )}
              <InfoBox>Hier sind nur Werte in der Zukunft zulässig. Alles davor ist gesperrt und nicht auswählbar.</InfoBox>
            </div>
          )}

          <div className="block">
            <span className="field-label">Hauptfälligkeit</span>
            <div className="date-row">
              <span className="am-label">Am</span>
              <input className="date-box" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
              <input
                className="date-box"
                value={dueMonth}
                onChange={(e) => setDueMonth(e.target.value)}
              />
            </div>
            {/* Gültig ab der letzten Unterschrift; Rumpfjahr aliquot bis zur nächsten Hauptfälligkeit. */}
            <GueltigkeitInfo />
          </div>

          <div className="block">
            <span className="field-label">Zahlart</span>
            <div className="radio-stack">
              <RadioRow
                selected={payment === "debit"}
                onSelect={() => {
                  setPayment("debit");
                  setOpenMenu(null);
                }}
              >
                SEPA-Lastschrift
              </RadioRow>
              <RadioRow
                selected={payment === "invoice"}
                onSelect={() => {
                  setPayment("invoice");
                  setOpenMenu(null);
                }}
              >
                Überweisung
              </RadioRow>
            </div>
          </div>

          {payment === "debit" && (
            <div className="block">
              <div className="label-row">
                <span className="field-label">Bankverbindung für Abbuchung</span>
                <EditLink />
              </div>
              <div className="dropdown">
                <button
                  type="button"
                  className={`entity-card${openMenu === "bank" ? " open" : ""}`}
                  onClick={() => toggleMenu("bank")}
                  aria-expanded={openMenu === "bank"}
                >
                  <EntityIcon src={a.bank} />
                  <span className="copy">
                    {selectedBank.name}
                    <br />
                    {selectedBank.bank} {selectedBank.iban}
                  </span>
                  <Icon src={a.selectCaret} size={16} />
                </button>
                {openMenu === "bank" && (
                  <div className="dropdown-menu">
                    {BANKS.map((bank) => (
                      <button
                        key={bank.id}
                        type="button"
                        className={`menu-item${bank.id === bankId ? " selected" : ""}`}
                        onClick={() => {
                          setBankId(bank.id);
                          setOpenMenu(null);
                        }}
                      >
                        <span className="menu-item-main">
                          <EntityIcon src={a.bank} />
                          <span className="menu-item-copy">
                            {bank.name}
                            <br />
                            {bank.bank}
                            <br />
                            {bank.iban}
                          </span>
                        </span>
                        <span className="menu-item-side">
                          {bank.hint ? <span className="hint">{bank.hint}</span> : null}
                          <Icon src={bank.id === bankId ? a.confirmOn : a.confirmOff} size={18} />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <InfoBox>
                Für die Abbuchung wird ein SEPA-Lastschriftmandat benötigt. Dieses Formular wurde
                bereits erzeugt. Du kannst es im Schritt "Signaturen" unterzeichnen lassen.
              </InfoBox>
            </div>
          )}

          {payment === "invoice" && (
            <>
              <div className="block">
                <span className="field-label">Zahlungsziel (Tage nach Rechnungserhalt)</span>
                <input
                  className="text-field"
                  value={paymentTerm}
                  onChange={(e) => setPaymentTerm(e.target.value)}
                />
              </div>
              <div className="block">
                <span className="field-label">Notiz</span>
                <textarea
                  className="textarea"
                  placeholder="z.B. Zahlung erfolgt Ende April, weil ..."
                  value={invoiceNote}
                  onChange={(e) => setInvoiceNote(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="block">
            <span className="field-label">Rechnungsversand</span>
            <div className="radio-stack">
              <RadioRow selected={delivery === "email"} onSelect={() => setDelivery("email")}>
                E-Mail
              </RadioRow>
              <RadioRow selected={delivery === "post"} onSelect={() => setDelivery("post")}>
                Post
              </RadioRow>
            </div>
          </div>

          {/* The address or mail picked in Kommunikationsdaten; changing it here changes it there too (Figma 21698:125830). */}
          {delivery === "email" && (
            <CommsSelect
              field={{ ...FIELDS[1], label: "E-Mail für Rechnungsversand" }}
              help="E-Mail aus Schritt Kommunikationsdaten — Rechnungen werden an diese Adresse versendet."
              groups={commsOptions(sections, "mail")}
              value={commsChoice.mail}
              onPick={(pick) => setCommsChoice({ mail: pick })}
              onEdit={() => openStammdaten("kontakte", commsChoice.mail?.cardId)}
            />
          )}

          {delivery === "post" && (
            <CommsSelect
              field={{ ...FIELDS[2], label: "Postadresse für Rechnungsversand" }}
              help="Postadresse aus Schritt Kommunikationsdaten — Rechnungen werden an diese Adresse versendet."
              groups={commsOptions(sections, "post")}
              value={commsChoice.post}
              onPick={(pick) => setCommsChoice({ post: pick })}
              onEdit={() => openStammdaten("adressen", commsChoice.post?.cardId)}
            />
          )}
            </>
          )}
        </div>
      </section>

      <Summary cards={["contact", "honorar"]} />
    </>
  );
}
