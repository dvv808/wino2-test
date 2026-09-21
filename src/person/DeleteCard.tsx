import * as a from "../assets/index";

/** Confirms deleting a Stammdaten card from the record. */
export function DeleteCard({
  title,
  onCancel,
  onConfirm,
}: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="wmodal" role="dialog" aria-label="Eintrag löschen">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onCancel} />

      <div className="wmodal-body">
        <button type="button" className="wmodal-close" aria-label="Schließen" onClick={onCancel}>
          <img src={a.iconCloseDark} alt="" width={16} height={16} />
        </button>

        <h2>Achtung! {title} wirklich löschen?</h2>
        <p>
          Der Eintrag wird aus den Stammdaten entfernt. Du kannst die Daten danach nur durch erneutes
          Anlegen wiederherstellen.
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
