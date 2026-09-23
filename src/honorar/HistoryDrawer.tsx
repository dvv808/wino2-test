import { formatDate } from "../lib/honorar/format";
import { partnerHistory } from "../lib/honorar/queries";
import type { HistoryEntry } from "../types/honorar";
import { useHonorar } from "./store";

export function HistoryDrawer({
  title,
  entries,
  onClose,
}: {
  title: string;
  entries: HistoryEntry[];
  onClose: () => void;
}) {
  return (
    <aside className="hn-history" aria-label="Verlauf">
      <header>
        <h2>Verlauf</h2>
        <button type="button" className="icon-btn" onClick={onClose}>
          Schließen
        </button>
      </header>
      <p className="hn-history-kicker">{title}</p>
      <ol>
        {entries.length === 0 ? <li>Noch keine Einträge.</li> : null}
        {entries.map((entry) => (
          <li key={entry.id}>
            <strong>{entry.action}</strong>
            <small>
              {formatDate(entry.timestamp)} · {entry.user}
            </small>
            {entry.comment ? <p>{entry.comment}</p> : null}
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function PartnerHistory({ partnerId, onClose }: { partnerId: string; onClose: () => void }) {
  const { state } = useHonorar();
  const partner = state.partners.find((entry) => entry.id === partnerId);
  return <HistoryDrawer title={partner?.name ?? "Verlauf"} entries={partnerHistory(state, partnerId)} onClose={onClose} />;
}
