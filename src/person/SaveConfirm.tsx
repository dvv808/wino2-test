import * as a from "../assets/index";

/** Asks before publishing Stammdaten changes into Wino and the Verlauf. */
export function SaveConfirm({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="wmodal" role="dialog" aria-label="Änderungen speichern">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onCancel} />

      <div className="wmodal-body">
        <button type="button" className="wmodal-close" aria-label="Schließen" onClick={onCancel}>
          <img src={a.iconCloseDark} alt="" width={16} height={16} />
        </button>

        <h2>Änderungen wirklich speichern?</h2>
        <p>
          Die Daten werden in Wino übernommen und erscheinen im Verlauf. Du bleibst danach in den
          Stammdaten.
        </p>

        <footer className="wmodal-foot centered">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            Speichern
          </button>
        </footer>
      </div>
    </div>
  );
}
