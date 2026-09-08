import * as a from "../assets/index";
import { Summary } from "../Summary";
import { EditLink, EntityIcon, Icon, InfoBox, RadioRow, TarifLine, WarnBox } from "../ui";
import { BANKS, PARTNERS, useWorkflow } from "../workflow";

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
    day,
    setDay,
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
                <EditLink />
              </div>
              <div className="dropdown">
                <button
                  type="button"
                  className={`entity-card${openMenu === "partner" ? " open" : ""}`}
                  onClick={() => toggleMenu("partner")}
                  aria-expanded={openMenu === "partner"}
                >
                  <EntityIcon src={a.personSmall} />
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
                      {partners.map((partner) => (
                        <button
                          key={partner.id}
                          type="button"
                          className={`menu-item${partner.id === partnerId ? " selected" : ""}`}
                          onClick={() => {
                            setPartnerId(partner.id);
                            setOpenMenu(null);
                          }}
                        >
                          <span className="menu-item-main">
                            <EntityIcon src={a.personSmall} />
                            <span className="partner-copy">
                              <TarifLine tariff={partner.tariff} ok={partner.ok} />
                              <strong>{partner.name}</strong>
                            </span>
                          </span>
                          <Icon src={partner.id === partnerId ? a.confirmOn : a.confirmOff} size={18} />
                        </button>
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
              <span className="field-label">Notiz</span>
              <textarea
                className="textarea"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
              />
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
              <div className="date-row">
                <input className="date-box" value={day} onChange={(e) => setDay(e.target.value)} />
                <input className="date-box" value={month} onChange={(e) => setMonth(e.target.value)} />
                <input
                  className="date-box year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
                <button type="button" className="cal-btn" aria-label="Kalender">
                  <Icon src={a.calendar} size={16} />
                </button>
              </div>
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
            <InfoBox>
              Das zum {day}.{month}.{year} fällige Honorar wird aliquot für den Zeitraum {day}.
              {month}.{year} bis 31.12.{year} berechnet und beträgt € 500,00.
            </InfoBox>
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
                Abbuchung
              </RadioRow>
              <RadioRow
                selected={payment === "invoice"}
                onSelect={() => {
                  setPayment("invoice");
                  setOpenMenu(null);
                }}
              >
                Rechnung
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

          {delivery === "email" && (
            <div className="block">
              <div className="label-row">
                <span className="field-label">E-Mail für Rechnungsversand</span>
                <EditLink />
              </div>
              <p className="field-help">
                E-Mail aus Schritt Kommunikationsdaten — Rechnungen werden an diese Adresse
                versendet.
              </p>
              <button type="button" className="entity-card">
                <EntityIcon src={a.mail} />
                <span className="copy">julia.atkinson@mail.at</span>
                <Icon src={a.selectCaret} size={16} />
              </button>
            </div>
          )}

          {delivery === "post" && (
            <div className="block">
              <div className="label-row">
                <span className="field-label">Postadresse für Rechnungsversand</span>
                <EditLink />
              </div>
              <p className="field-help">
                Postadresse aus Schritt Kommunikationsdaten — Rechnungen werden an diese Adresse
                versendet.
              </p>
              <button type="button" className="entity-card">
                <EntityIcon src={a.house} />
                <span className="copy">
                  Mondseestrasse 32
                  <br />
                  A-5310 Mondseet
                </span>
                <Icon src={a.selectCaret} size={16} />
              </button>
            </div>
          )}
        </div>
      </section>

      <Summary cards={["contact", "honorar"]} />
    </>
  );
}
