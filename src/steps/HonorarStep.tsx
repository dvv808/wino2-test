import * as a from "../assets/index";
import { Summary } from "../Summary";
import { EditLink, EntityIcon, Icon, InfoBox, RadioRow, TarifLine, WarnBox } from "../ui";
import { PARTNERS, useWorkflow } from "../workflow";
import { commsOptions } from "../person/stammdaten";
import { CommsSelect, FIELDS } from "./CommsStep";
import { GueltigkeitInfo, useGueltigkeit } from "./Gueltigkeit";
import { useFilePerson } from "../chrome";
import { amountOf, ddmmyyyy, euro } from "../lib/maklervereinbarung/gueltigkeit";
import {
  FREQUENCY_ADJ,
  FREQUENCY_LABEL,
  MINDESTBETRAG,
  ZAHLWEISE_AB,
  companyErsteVerrechnung,
  zahlweise,
} from "../lib/maklervereinbarung/zahlweise";
import type { Frequency } from "../workflow";

/** Julia's fixed Bankverbindungen (workflow BANKS) → their Stammdaten cards. */
const BANK_CARD: Record<string, string> = { julia: "bank-neon" };

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
    banks,
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
    businessAmount,
    setBusinessAmount,
    frequency,
    setFrequency,
  } = useWorkflow();
  // Unternehmen get the Business Honorar (Figma 21095:72749): own amount, Zahlweise, Abbuchung / Rechnung.
  const { isCompany } = useFilePerson();
  const jahresbetrag = amountOf(businessAmount);
  const tooLow = jahresbetrag < MINDESTBETRAG;
  const withZahlweise = jahresbetrag >= ZAHLWEISE_AB;
  const freq: Frequency = withZahlweise ? frequency : "yearly";
  // Unternehmen: the infos under Hauptfälligkeit follow the Erstmalige Verrechnung directly (Figma 21165:30293,
  // 21232:21124): Individuelles Datum, or the next 1st after Abschluss.
  const g = useGueltigkeit();
  const ab = companyErsteVerrechnung(billing, month, year, g.gueltig);
  const zw = ab ? zahlweise(ab, jahresbetrag, Number(dueMonth), freq) : null;

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
              Honorartarif: {isCompany ? "Business" : "Privat"}
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
                <span className={isCompany ? "info-lead" : undefined}>
                  Zwischen den Vertragspartnern wird individuell vereinbart, dass für die Erbringung
                  der unselbständigen Nebenleistungen kein gesondertes Honorar geschuldet wird.
                </span>
                {/* Unternehmen only; Privatkunden keep the first paragraph (Figma 21107:76134). */}
                {isCompany && (
                  <>
                    <br />
                    <br />
                    <span>
                      Für die Dauer dieser Honorarvereinbarung wird zu weiteren Personen oder Unternehmen innerhalb
                      der Sphäre des Kunden kein gesondertes Honorar verrechnet, sofern deren Einbeziehung bei
                      Abschluss dieser Maklervereinbarung individuell vereinbart wurde. Nachträgliche Änderungen des
                      einbezogenen Personen- oder Unternehmenskreises sowie sonstige wesentliche Änderungen der
                      Verhältnisse des Kunden, die den Betreuungsaufwand beeinflussen, können eine Anpassung des
                      vereinbarten Honorars erforderlich machen.
                    </span>
                  </>
                )}
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

          {model === "privat" && isCompany && (
            <>
              <div className="block">
                <h3>Zahlungsinformationen</h3>
                <div className="label-row">
                  <span className="field-label">Honorarbetrag jährlich</span>
                </div>
                <input
                  className={tooLow ? "text-field invalid" : "text-field"}
                  aria-label="Honorarbetrag jährlich"
                  aria-invalid={tooLow}
                  value={businessAmount}
                  onChange={(e) => setBusinessAmount(e.target.value)}
                  onBlur={() => setBusinessAmount(euro(jahresbetrag).replace("€", "EUR"))}
                />
                {tooLow && <p className="field-error">Der Honorarbetrag muss mindestens EUR 300,00 betragen.</p>}
                <InfoBox>Mindestbetrag EUR 300,00</InfoBox>
              </div>
              {/* Zahlweise only from EUR 1.000,00 a year; below that the Honorar is billed yearly (Figma 21107:75550). */}
              {withZahlweise && (
                <div className="block">
                  <span className="field-label">Zahlweise</span>
                  <div className="radio-stack">
                    {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => (
                      <RadioRow key={f} selected={frequency === f} onSelect={() => setFrequency(f)}>
                        {FREQUENCY_LABEL[f]}
                      </RadioRow>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {model === "privat" && !isCompany && (
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
              {isCompany ? (
                <InfoBox>
                  Individuelles Datum festgelegt. Bitte beachte, dass die Maklervereinbarung vor diesem Datum
                  unterzeichnet werden muss.
                </InfoBox>
              ) : (
                <InfoBox>Hier sind nur Werte in der Zukunft zulässig. Alles davor ist gesperrt und nicht auswählbar.</InfoBox>
              )}
            </div>
          )}

          <div className="block">
            <span className="field-label">Hauptfälligkeit</span>
            <div className="date-row">
              <span className="am-label">Am</span>
              {isCompany ? (
                // Unternehmen: the day is always the 1st, only the month can change (Figma 21165:30087).
                <span className="date-box locked" title="Hauptfälligkeit immer zum Monatsersten">
                  01
                </span>
              ) : (
                <input className="date-box" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
              )}
              <input
                className={isCompany ? "date-box open" : "date-box"}
                aria-label="Monat der Hauptfälligkeit"
                inputMode="numeric"
                maxLength={2}
                value={dueMonth}
                onChange={(e) => setDueMonth(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            {isCompany ? (
              <ZahlweiseInfo zw={zw} freq={freq} />
            ) : (
              /* Gültig ab der letzten Unterschrift; Rumpfjahr aliquot bis zur nächsten Hauptfälligkeit. */
              <GueltigkeitInfo />
            )}
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
                {isCompany ? "Abbuchung" : "SEPA-Lastschrift"}
              </RadioRow>
              <RadioRow
                selected={payment === "invoice"}
                onSelect={() => {
                  setPayment("invoice");
                  setOpenMenu(null);
                }}
              >
                {isCompany ? "Rechnung" : "Überweisung"}
              </RadioRow>
            </div>
          </div>

          {payment === "debit" && (
            <div className="block">
              <div className="label-row">
                <span className="field-label">Bankverbindung für Abbuchung</span>
                {/* Stammdaten workflow on Bankverbindung, on the picked account's card (Julia's seed bank = bank-neon). */}
                <EditLink
                  onClick={() =>
                    openStammdaten(
                      "bankverbindungen",
                      selectedBank ? (BANK_CARD[selectedBank.id] ?? (selectedBank.id.startsWith("bank-") ? selectedBank.id : undefined)) : undefined,
                    )
                  }
                />
              </div>
              <div className="dropdown">
                <button
                  type="button"
                  className={`entity-card${openMenu === "bank" ? " open" : ""}`}
                  onClick={() => toggleMenu("bank")}
                  aria-expanded={openMenu === "bank"}
                >
                  <EntityIcon src={a.bank} />
                  {selectedBank ? (
                    <span className="copy">
                      {selectedBank.name}
                      <br />
                      {selectedBank.bank} {selectedBank.iban}
                    </span>
                  ) : (
                    <span className="copy placeholder">Auswahl</span>
                  )}
                  <Icon src={a.selectCaret} size={16} />
                </button>
                {/* No Bankverbindung in the Stammdaten: empty state with a link there (Figma 21165:30468). */}
                {openMenu === "bank" && banks.length === 0 && (
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
                        onClick={() => {
                          setOpenMenu(null);
                          openStammdaten("bankverbindungen");
                        }}
                      >
                        + Daten ergänzen
                      </button>
                    </div>
                  </div>
                )}
                {openMenu === "bank" && banks.length > 0 && (
                  <div className="dropdown-menu">
                    {banks.map((bank) => (
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
              {/* Zahlungsziel only exists for Unternehmen; 14 days is the standard (Figma 21107:75156). */}
              {isCompany && (
                <div className="block">
                  <span className="field-label">Zahlungsziel (Tage nach Rechnungserhalt)</span>
                  <input
                    className="text-field"
                    inputMode="numeric"
                    value={paymentTerm}
                    onChange={(e) => setPaymentTerm(e.target.value.replace(/\D/g, ""))}
                  />
                  {paymentTerm !== "14" && (
                    <InfoBox>
                      Standard sind 14 Tage. Ein abweichendes Zahlungsziel muss je nach Rolle freigegeben werden.
                    </InfoBox>
                  )}
                </div>
              )}
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
              // Unternehmen: the Versand mail from Kommunikationsdaten (e.g. office@…), Privat: the central mail.
              value={isCompany ? commsChoice.versandMail : commsChoice.mail}
              onPick={(pick) => setCommsChoice(isCompany ? { versandMail: pick } : { mail: pick })}
              onEdit={() => openStammdaten("kontakte", (isCompany ? commsChoice.versandMail : commsChoice.mail)?.cardId)}
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

/** Under Hauptfälligkeit for Unternehmen: the cycle and the first (aliquot) billing (Figma 21232:21124). */
function ZahlweiseInfo({ zw, freq }: { zw: ReturnType<typeof zahlweise> | null; freq: Frequency }) {
  if (!zw) {
    return <InfoBox>Sobald die erstmalige Verrechnung feststeht, siehst du hier die Fälligkeiten und den Betrag.</InfoBox>;
  }
  const termine = zw.termine;
  const list =
    termine.length > 2 ? (
      <>
        <strong>{termine.slice(0, -1).join(", ")}</strong> und zum <strong>{termine.at(-1)}</strong>
      </>
    ) : (
      <strong>{termine.join(", ")}</strong>
    );
  return (
    <>
      {freq !== "yearly" && (
        <InfoBox>
          Das Honorar wird ab dem <strong>{ddmmyyyy(zw.ab)}</strong> verrechnet. In der Folge wird das Honorar
          jeweils zum {list} eines jeden Jahres fällig. Das {FREQUENCY_ADJ[freq]} Honorar beträgt{" "}
          {euro(zw.rate).replace("€", "EUR")}.
        </InfoBox>
      )}
      <InfoBox>
        {zw.monate > 0 ? (
          <>
            Das zum <strong>{ddmmyyyy(zw.ab)}</strong> fällige Honorar wird aliquot für den Zeitraum{" "}
            <strong>{ddmmyyyy(zw.ab)}</strong> bis <strong>{ddmmyyyy(zw.bis)}</strong> berechnet und beträgt{" "}
            <strong>{euro(zw.betrag)}</strong>.
          </>
        ) : (
          <>
            Das zum <strong>{ddmmyyyy(zw.ab)}</strong> fällige Honorar beträgt <strong>{euro(zw.betrag)}</strong>.
          </>
        )}
      </InfoBox>
    </>
  );
}
