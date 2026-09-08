import { useState } from "react";
import * as a from "./assets/index";

/**
 * The small "add a message" dialog shared by both sides of a Freigabe:
 * the advisor's note when requesting, the manager's note when deciding.
 */
export function CommentPrompt({
  title,
  confirmLabel,
  tone = "dark",
  onCancel,
  onConfirm,
}: {
  title: string;
  confirmLabel: string;
  tone?: "dark" | "danger";
  onCancel: () => void;
  onConfirm: (comment: string) => void;
}) {
  const [comment, setComment] = useState("");

  return (
    <div className="prompt-modal" role="dialog" aria-label={title}>
      <button type="button" className="prompt-scrim" aria-label="Schließen" onClick={onCancel} />

      <div className="prompt-body">
        <header className="review-titlebar">
          <span className="review-titlebar-label">{title}</span>
          <button
            type="button"
            className="review-titlebar-close"
            aria-label="Schließen"
            onClick={onCancel}
          >
            <img src={a.iconCloseDark} alt="" width={12} height={12} />
          </button>
        </header>

        <div className="prompt-main">
          <label className="field-label" htmlFor="prompt-comment">
            Kommentar
          </label>
          <textarea
            id="prompt-comment"
            className="prompt-input"
            placeholder="Begründung oder Hinweis hinzufügen..."
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            autoFocus
          />
        </div>

        <footer className="prompt-foot">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button
            type="button"
            className={tone === "danger" ? "btn-danger" : "btn-primary"}
            onClick={() => onConfirm(comment.trim())}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
