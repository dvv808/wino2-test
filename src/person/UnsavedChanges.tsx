import type { StammdatenAreaId } from "./stammdaten";

/** Warns before leaving the Stammdaten workflow with unsaved drafts. */
export function UnsavedChanges({
  areas,
  onCancel,
  onOpenArea,
  onSaveDraft,
  onLeave,
}: {
  areas: { id: StammdatenAreaId; label: string }[];
  onCancel: () => void;
  onOpenArea: (id: StammdatenAreaId) => void;
  onSaveDraft: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="wmodal" role="dialog" aria-label="Ungespeicherte Änderungen">
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onCancel} />

      <div className="wmodal-body unsaved">
        <h2>Ungespeicherte Änderungen</h2>
        <p>Du hast noch nicht gespeicherte Daten in:</p>
        <ul className="wmodal-areas">
          {areas.map((area) => (
            <li key={area.id}>
              <button type="button" className="wmodal-area" onClick={() => onOpenArea(area.id)}>
                {area.label}
              </button>
            </li>
          ))}
        </ul>
        <p>Diese gehen verloren wenn du den Tab schliesst.</p>

        <footer className="wmodal-foot unsaved">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <div className="footer-actions">
            <button type="button" className="btn-secondary" onClick={onSaveDraft}>
              Entwurf speichern
            </button>
            <button type="button" className="btn-primary" onClick={onLeave}>
              Ohne Speichern schließen
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
