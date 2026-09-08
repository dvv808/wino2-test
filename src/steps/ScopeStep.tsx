import * as a from "../assets/index";
import { Icon } from "../ui";

export function ScopeStep() {
  return (
    <div className="empty-step">
      <span className="empty-step-art">
        <Icon src={a.noResults} size={44} />
      </span>
      <h1>Leistungsumfang</h1>
      <p>
        Dieser Schritt wird gerade noch gestaltet. Sobald das Figma-Design vorliegt, wird der
        Leistungsumfang hier ergänzt.
      </p>
    </div>
  );
}
