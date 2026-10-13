import { useEffect, useState } from "react";
import * as a from "../assets/index";

export function MailAddressModal({
  partnerName,
  current,
  onCancel,
  onSend,
}: {
  partnerName: string;
  current: string;
  onCancel: () => void;
  onSend: (email: string) => void;
}) {
  const [email, setEmail] = useState(current);
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="wmodal" role="dialog" aria-label="E-Mail Adresse ändern">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onCancel} />
      <div className="wmodal-body send-ask hn-mail-modal">
        <button type="button" className="wmodal-close" aria-label="Schließen" onClick={onCancel}>
          <img src={a.iconCloseDark} alt="" width={16} height={16} />
        </button>
        <h2>E-Mail Adresse ändern</h2>
        <p>
          Die neue Adresse gilt nur für diese Rechnung an {partnerName}. Die Stammdaten bleiben unverändert.
        </p>
        <label className="hn-mail-field">
          E-Mail Adresse
          <input
            type="email"
            value={email}
            autoFocus
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && valid) onSend(email.trim());
            }}
          />
        </label>
        <footer className="wmodal-foot send-ask">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary" disabled={!valid} onClick={() => onSend(email.trim())}>
            Senden
          </button>
        </footer>
      </div>
    </div>
  );
}
