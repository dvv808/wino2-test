import * as a from "../assets/index";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";
import { VerlaufCaption } from "../chrome";
import { DataCard } from "./cards";
import type { Card, Row } from "./stammdaten";

/**
 * Inkasso in the profile. The card carries the same data as the Honorar card in the
 * Zusammenfassung of the Maklervereinbarung, shown like every other Profil card.
 */
export function InkassoMain() {
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
    goTo,
    openMakler,
    openVersionHistory,
  } = useWorkflow();

  /** Edits happen in the Maklervereinbarung, on the Honorar step. */
  function editHonorar() {
    goTo("fee");
    openMakler();
  }

  const rows: Row[] = [];
  if (model === "partner") {
    rows.push({ label: "Verknüpfte Partner", value: selectedPartner ? selectedPartner.name : "Auswählen" });
  }
  if (model === "custom" && customNote) rows.push({ label: "Notiz", value: customNote });
  rows.push({
    label: "Erstmalige Verrechnung des Honorars",
    value: billing === "custom" ? "Individuelles Datum" : "Nächste Monatserste",
  });
  if (billing === "custom") rows.push({ label: "Individuelles Datum", value: `${day}.${month}.${year}` });
  rows.push({ label: "Hauptfälligkeit", value: `${dueDay}.${dueMonth}.` });
  rows.push({ label: "Zahlart", value: payment === "debit" ? "Abbuchung" : "Rechnung" });
  if (payment === "debit") {
    rows.push({
      label: "Bankverbindung für Abbuchung",
      value: `${selectedBank.name}\n${selectedBank.bank}\n${selectedBank.iban}`,
    });
  } else {
    rows.push({ label: "Zahlungsziel (Tage nach Rechnungserhalt)", value: String(paymentTerm) });
    if (invoiceNote) rows.push({ label: "Notiz", value: invoiceNote });
  }
  rows.push({ label: "Rechnungsversand", value: delivery === "email" ? "E-Mail" : "Post" });
  rows.push(
    delivery === "email"
      ? { label: "E-Mail für Rechnungsversand", value: "julia.atkinson@gmail.at" }
      : { label: "Postadresse für Rechnungsversand", value: "Mondseestrasse 32\nA-5310 Mondsee" },
  );

  const card: Card = {
    id: "inkasso-honorar",
    icon: a.privat,
    title: "Honorar Modell",
    blocks: [
      {
        kind: "badge",
        icon: a.privat,
        text: model === "privat" ? `${modelLabel} · € 120 /Jahr` : modelLabel,
      },
      { kind: "rows", rows },
    ],
  };

  return (
    <main className="pp-main">
      <header className="fg-head pp-main-head">
        <span className="pp-main-title">
          <Icon src={a.tickList} size={24} />
          Inkasso
        </span>
        <span className="fg-head-actions">
          <button type="button" className="btn-secondary fg-verlauf-btn" onClick={openVersionHistory}>
            <Icon src={a.history} size={18} />
            <VerlaufCaption />
          </button>
        </span>
      </header>

      <section className="pp-section" id="inkasso-honorar">
        <header className="pp-section-head">
          <span className="pp-section-title">
            <Icon src={a.tickList} size={32} />
            Honorar &amp; Zahlungsziel
          </span>
          <button type="button" className="btn-primary pp-edit" onClick={editHonorar}>
            Editieren
          </button>
        </header>
        <div className="pp-cards">
          <DataCard card={card} onEdit={editHonorar} />
        </div>
      </section>
    </main>
  );
}
