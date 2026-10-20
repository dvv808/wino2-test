import * as a from "../assets/index";

/** Confirms deleting a Stammdaten card, or dissolving a Verknüpfung. */
export function DeleteCard({
  title,
  name,
  action = "löschen",
  onCancel,
  onConfirm,
}: {
  title: string;
  name?: string;
  action?: "löschen" | "auflösen";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const unlink = action === "auflösen";
  const verb = unlink ? "auflösen" : "löschen";
  return (
    <div className="wmodal" role="dialog" aria-label={unlink ? "Verknüpfung auflösen" : "Eintrag löschen"}>
      <button type="button" className="wmodal-scrim" aria-label="Schließen" onClick={onCancel} />

      <div className="wmodal-body">
        <button type="button" className="wmodal-close" aria-label="Schließen" onClick={onCancel}>
          <img src={a.iconCloseDark} alt="" width={16} height={16} />
        </button>

        <h2>Achtung! {title} wirklich {verb}?</h2>
        <p>
          {unlink
            ? `Die Verknüpfung${name ? ` mit ${name}` : ""} wird aufgelöst.`
            : "Der Eintrag wird aus den Stammdaten entfernt. Du kannst die Daten danach nur durch erneutes Anlegen wiederherstellen."}
        </p>

        <footer className="wmodal-foot centered">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm}>
            {unlink ? "Auflösen" : "Löschen"}
          </button>
        </footer>
      </div>
    </div>
  );
}
