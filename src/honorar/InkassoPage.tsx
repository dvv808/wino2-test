import { useState } from "react";
import type { CorrectionKind } from "../types/honorar";
import { money, openItemStatusLabel } from "../lib/honorar/format";
import { partnerOf } from "../lib/honorar/queries";
import { useWorkflow } from "../workflow";
import { PartnerHistory } from "./HistoryDrawer";
import { useHonorar } from "./store";
import { ConfirmModal, RequiredCommentModal } from "./ui";

export function InkassoPage() {
  const { state, startCorrection, submitCorrection, resetCorrection, patchCorrection, approveCorrection } = useHonorar();
  const { finanzenPartnerId } = useWorkflow();
  const partner = partnerOf(state, finanzenPartnerId);
  const items = state.openItems.filter((item) => item.partnerId === finanzenPartnerId);
  const corrections = state.corrections.filter((entry) => entry.partnerId === finanzenPartnerId);
  const [start, setStart] = useState(false);
  const [kind, setKind] = useState<CorrectionKind>("Teilerlass");
  const [amount, setAmount] = useState("100");
  const [justification, setJustification] = useState("");
  const [openItemId, setOpenItemId] = useState(items[0]?.id ?? "");
  const [resetId, setResetId] = useState<string | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [history, setHistory] = useState(false);

  if (!partner) return <section className="freigaben hn-panel">Partner nicht gefunden.</section>;

  return (
    <section className="freigaben hn-panel">
      <h1 className="freigaben-title">Inkasso · {partner.name}</h1>
      <button type="button" className="btn-primary" onClick={() => setStart(true)}>
        Korrektur starten
      </button>

      <h2 className="hn-h2">Offene Posten</h2>
      <ul className="hn-list">
        {items.map((item) => (
          <li key={item.id}>
            {money(item.openAmount)} · {openItemStatusLabel(item.status, item.reminderSentAt)}
          </li>
        ))}
      </ul>

      <h2 className="hn-h2">Korrekturen</h2>
      <ul className="hn-list">
        {corrections.map((entry) => (
          <li key={entry.id}>
            <strong>
              {entry.kind} {money(entry.amount)}
            </strong>
            <span>
              {entry.status === "in_approval"
                ? "in Freigabe"
                : entry.status === "reset"
                  ? "Zurückgesetzt"
                  : entry.status === "approved"
                    ? "Freigegeben"
                    : "Entwurf"}
            </span>
            {entry.comment ? <p>Kommentar: {entry.comment}</p> : null}
            {entry.status === "draft" || entry.status === "reset" ? (
              <>
                {entry.status === "reset" ? (
                  <input
                    value={entry.justification}
                    onChange={(event) => patchCorrection(entry.id, { justification: event.target.value })}
                  />
                ) : null}
                <button type="button" className="start-btn" onClick={() => submitCorrection(entry.id)}>
                  Zur Freigabe
                </button>
              </>
            ) : null}
            {entry.status === "in_approval" && state.role === "approver" ? (
              <>
                <button type="button" className="start-btn" onClick={() => setApproveId(entry.id)}>
                  Freigeben
                </button>
                <button type="button" className="export-btn" onClick={() => setResetId(entry.id)}>
                  Zurücksetzen
                </button>
              </>
            ) : null}
          </li>
        ))}
      </ul>

      <button type="button" className="hn-link" onClick={() => setHistory(true)}>
        Verlauf
      </button>

      {start ? (
        <div className="wmodal" role="dialog" aria-label="Korrektur starten">
          <button type="button" className="wmodal-scrim" onClick={() => setStart(false)} />
          <div className="wmodal-body">
            <h2>Korrektur starten</h2>
            <label>
              Art
              <select value={kind} onChange={(event) => setKind(event.target.value as CorrectionKind)}>
                <option>Gutschrift</option>
                <option>Zahlungserlass</option>
                <option>Teilerlass</option>
                <option>Ratenzahlung</option>
              </select>
            </label>
            <label>
              Betrag
              <input value={amount} onChange={(event) => setAmount(event.target.value)} />
            </label>
            <label>
              Begründung
              <textarea value={justification} onChange={(event) => setJustification(event.target.value)} />
            </label>
            <label>
              Offener Posten
              <select value={openItemId} onChange={(event) => setOpenItemId(event.target.value)}>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {money(item.openAmount)}
                  </option>
                ))}
              </select>
            </label>
            <footer className="wmodal-foot centered">
              <button type="button" className="btn-secondary" onClick={() => setStart(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!justification.trim() || !Number(amount) || !openItemId}
                onClick={() => {
                  startCorrection(partner.id, openItemId, kind, Number(amount), justification);
                  setStart(false);
                  setJustification("");
                }}
              >
                Zur Freigabe
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {resetId ? (
        <RequiredCommentModal
          title="Zurücksetzen?"
          confirmLabel="Zurücksetzen"
          onCancel={() => setResetId(null)}
          onConfirm={(comment) => {
            resetCorrection(resetId, comment);
            setResetId(null);
          }}
        />
      ) : null}

      {approveId ? (
        <ConfirmModal
          title="Freigeben?"
          text="Die Vereinbarung wird übernommen."
          confirmLabel="Freigeben"
          onCancel={() => setApproveId(null)}
          onConfirm={() => {
            approveCorrection(approveId);
            setApproveId(null);
          }}
        />
      ) : null}

      {history ? <PartnerHistory partnerId={partner.id} onClose={() => setHistory(false)} /> : null}
    </section>
  );
}
