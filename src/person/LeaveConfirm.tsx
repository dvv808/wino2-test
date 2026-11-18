import * as a from "../assets/index";

/** Asks before leaving a create dialog: what was entered is lost unless saved as Entwurf. */
export function LeaveConfirm({
  onStay,
  onLeave,
  onDraft,
}: {
  onStay: () => void;
  onLeave: () => void;
  onDraft?: () => void;
}) {
  return (
    <div className="wmodal leave-confirm" role="dialog" aria-label="Fenster verlassen">
      <button type="button" className="wmodal-scrim" aria-label="Zurück zum Formular" onClick={onStay} />

      <div className="wmodal-body">
        <button type="button" className="wmodal-close" aria-label="Zurück zum Formular" onClick={onStay}>
          <img src={a.iconCloseDark} alt="" width={16} height={16} />
        </button>

        <h2>Fenster wirklich verlassen?</h2>
        <p>
          Deine Eingaben gehen verloren.{onDraft ? " Speichere sie als Entwurf, wenn du später weitermachen willst." : ""}
        </p>

        <footer className="wmodal-foot centered">
          <button type="button" className="btn-secondary" onClick={onStay}>
            Abbrechen
          </button>
          {onDraft ? (
            <button type="button" className="btn-secondary" onClick={onDraft}>
              Entwurf speichern
            </button>
          ) : null}
          <button type="button" className="btn-primary" onClick={onLeave}>
            Verlassen
          </button>
        </footer>
      </div>
    </div>
  );
}
