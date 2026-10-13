import { useEffect } from "react";
import * as a from "../assets/index";
import { formatDay, monthLabel, servicePeriod } from "../lib/honorar/format";
import type { Fee, Partner } from "../types/honorar";
import { Icon } from "../ui";

export const INVOICE_FILE = "honorar_rechnung20301023.pdf";
const INVOICE_NUMBER = "20301023";

function money(value: number) {
  const [whole, frac] = value.toFixed(2).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${frac}`;
}

type Line = { text: string; x: number; y: number; size: number; bold?: boolean };

function invoiceData(fee: Fee, partner: Partner | undefined, today: string) {
  const [street, ...rest] = (partner?.address ?? "").split(",");
  return {
    name: partner?.name ?? "",
    street: street?.trim() ?? "",
    city: rest.join(",").trim(),
    date: formatDay(`${today}T12:00:00`),
    period: servicePeriod(fee.month),
    month: monthLabel(fee.month),
    due: formatDay(`${fee.dueDate}T12:00:00`),
    tariff: fee.tariff,
    amount: money(fee.amount),
    method: fee.paymentMethod,
  };
}

function pdfText(value: string) {
  let out = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (char === "(" || char === ")" || char === "\\") out += `\\${char}`;
    else if (code > 255) out += "?";
    else if (code > 127) out += `\\${code.toString(8).padStart(3, "0")}`;
    else out += char;
  }
  return out;
}

/** A single-page dummy invoice, written by hand so no PDF library is needed. */
function buildPdf(lines: Line[]) {
  const content = lines
    .map((line) => `BT /${line.bold ? "F2" : "F1"} ${line.size} Tf ${line.x} ${line.y} Td (${pdfText(line.text)}) Tj ET`)
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(body.length);
  for (let i = 0; i < body.length; i += 1) bytes[i] = body.charCodeAt(i) & 255;
  return new Blob([bytes], { type: "application/pdf" });
}

function downloadInvoice(fee: Fee, partner: Partner | undefined, today: string) {
  const d = invoiceData(fee, partner, today);
  const lines: Line[] = [
    { text: "Honorarrechnung", x: 56, y: 770, size: 22, bold: true },
    { text: `Rechnungsnummer ${INVOICE_NUMBER}`, x: 56, y: 744, size: 11 },
    { text: `Datum ${d.date}`, x: 56, y: 728, size: 11 },
    { text: d.name, x: 56, y: 680, size: 12, bold: true },
    { text: d.street, x: 56, y: 664, size: 11 },
    { text: d.city, x: 56, y: 650, size: 11 },
    { text: `Leistungszeitraum ${d.period}`, x: 56, y: 600, size: 11 },
    { text: "Position", x: 56, y: 560, size: 11, bold: true },
    { text: "Betrag", x: 470, y: 560, size: 11, bold: true },
    { text: `Honorar ${d.month}, Tarif ${d.tariff}`, x: 56, y: 540, size: 11 },
    { text: d.amount, x: 470, y: 540, size: 11 },
    { text: "Gesamtbetrag", x: 56, y: 504, size: 12, bold: true },
    { text: d.amount, x: 470, y: 504, size: 12, bold: true },
    { text: `Zahlungsziel ${d.due}`, x: 56, y: 460, size: 11 },
    { text: `Zahlart ${d.method}`, x: 56, y: 444, size: 11 },
    { text: "Dies ist eine Beispielrechnung.", x: 56, y: 80, size: 9 },
  ];
  const url = URL.createObjectURL(buildPdf(lines));
  const link = document.createElement("a");
  link.href = url;
  link.download = INVOICE_FILE;
  link.click();
  URL.revokeObjectURL(url);
}

export function InvoiceModal({
  fee,
  partner,
  today,
  onClose,
}: {
  fee: Fee;
  partner: Partner | undefined;
  today: string;
  onClose: () => void;
}) {
  const d = invoiceData(fee, partner, today);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="wmodal" role="dialog" aria-label="Rechnungsdokument">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onClose} />
      <div className="hn-invoice-modal">
        <header className="review-titlebar">
          <span className="review-titlebar-label">
            <img src={a.pdf} alt="" width={12} height={14} />
            {INVOICE_FILE}
          </span>
          <button type="button" className="review-titlebar-close" aria-label="Schließen" onClick={onClose}>
            <img src={a.iconCloseDark} alt="" width={12} height={12} />
          </button>
        </header>
        <div className="hn-invoice-scroll">
          <article className="hn-invoice-sheet">
            <h2>Honorarrechnung</h2>
            <p className="hn-invoice-meta">
              Rechnungsnummer {INVOICE_NUMBER}
              <br />
              Datum {d.date}
            </p>
            <p className="hn-invoice-to">
              <strong>{d.name}</strong>
              <br />
              {d.street}
              <br />
              {d.city}
            </p>
            <p className="hn-invoice-meta">Leistungszeitraum {d.period}</p>
            <div className="hn-invoice-table">
              <div className="head">
                <span>Position</span>
                <span>Betrag</span>
              </div>
              <div>
                <span>
                  Honorar {d.month}, Tarif {d.tariff}
                </span>
                <span>{d.amount}</span>
              </div>
              <div className="total">
                <span>Gesamtbetrag</span>
                <span>{d.amount}</span>
              </div>
            </div>
            <p className="hn-invoice-meta">
              Zahlungsziel {d.due}
              <br />
              Zahlart {d.method}
            </p>
            <small>Dies ist eine Beispielrechnung.</small>
          </article>
        </div>
        <footer className="hn-invoice-foot">
          <button type="button" className="btn-primary" onClick={() => downloadInvoice(fee, partner, today)}>
            <Icon src={a.download} size={16} />
            Herunterladen
          </button>
        </footer>
      </div>
    </div>
  );
}
