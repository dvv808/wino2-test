import * as a from "./assets/index";

/**
 * Shown before the comment prompt when the advisor never ticked the consent
 * switch on the Signaturen step. It warns, but it does not block.
 */
export function ConsentWarning({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div
      className="wmodal"
      role="dialog"
      aria-label="Zustimmung zu sensiblen Daten nicht erteilt"
    >
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onBack} />

      <div className="wmodal-body">
        <button
          type="button"
          className="wmodal-close"
          aria-label="Schließen"
          onClick={onBack}
        >
          <img src={a.iconCloseDark} alt="" width={16} height={16} />
        </button>

        <h2>Achtung! Zustimmung zu sensiblen Daten nicht erteilt.</h2>
        <p>
          Dies kann zur Folge haben, dass bestimmte Aufgaben des Maklers nicht erledigt werden
          können (z. B. Personenversicherungen).
        </p>

        <footer className="wmodal-foot">
          <button type="button" className="btn-secondary consent-back" onClick={onBack}>
            Zurück
          </button>
          <button type="button" className="btn-primary consent-continue" onClick={onContinue}>
            Ohne Zustimmung fortfahren
          </button>
        </footer>
      </div>
    </div>
  );
}
