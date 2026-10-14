import * as a from "../assets/index";
import { Icon } from "../ui";
import { useWorkflow } from "../workflow";

/**
 * Dashboard of the Sammelfaktura (all years) or of one year. The content is not designed yet,
 * so it shows static skeleton blocks as a placeholder.
 */
export function SammelfakturaPage() {
  const { finanzenYear } = useWorkflow();

  return (
    <section className="freigaben hn-panel hn-status">
      <div className="hn-dash-head">
        <div>
          <h1 className="freigaben-title hn-kicker">Honorarverrechnung</h1>
          <p className="hn-month">{finanzenYear || "Alle Jahre"}</p>
          <h2 className="hn-h2 hn-status-title">Sammelfaktura</h2>
        </div>
        <button
          type="button"
          className="btn-secondary fg-verlauf-btn"
          onClick={() => window.dispatchEvent(new Event("honorar-verlauf"))}
        >
          <Icon src={a.history} size={18} />
          Verlauf
        </button>
      </div>

      <div className="hn-skel-cards" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <div className="hn-skel hn-skel-card" key={index} />
        ))}
      </div>

      <div className="hn-skel-block" aria-hidden>
        <div className="hn-skel hn-skel-line short" />
        {[0, 1, 2, 3, 4].map((index) => (
          <div className="hn-skel hn-skel-line" key={index} />
        ))}
      </div>
    </section>
  );
}
