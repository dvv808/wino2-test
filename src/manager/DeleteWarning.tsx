import * as a from "../assets/index";
import type { RequestRow } from "./requests";

/**
 * Confirms deleting a workflow from the list. The list has one entry per
 * Maklervereinbarung, so this takes both of its Freigaben with it.
 */
export function DeleteWarning({
  row,
  onCancel,
  onConfirm,
}: {
  row: RequestRow;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="wmodal" role="dialog" aria-label="Freigabeanforderung löschen">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onCancel} />

      <div className="wmodal-body">
        <button type="button" className="wmodal-close" aria-label="Schließen" onClick={onCancel}>
          <img src={a.iconCloseDark} alt="" width={16} height={16} />
        </button>

        <h2>Achtung! Freigabeanforderung wirklich löschen?</h2>
        <p>
          Die {row.art} von {row.partner.name} wird mit allen ihren Freigaben aus der Liste
          entfernt. Der Berater muss die Freigaben danach erneut anfordern. Kommentare und Verlauf
          gehen verloren.
        </p>

        <footer className="wmodal-foot centered">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm}>
            Löschen
          </button>
        </footer>
      </div>
    </div>
  );
}
