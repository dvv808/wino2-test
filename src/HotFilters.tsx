import { StatCard } from "./manager/FreigabenPanel";

export type HotFilter<Id extends string> = {
  id: Id;
  label: string;
  value: number;
  icon: string;
  /** Small word under the number (default "gesamt"). */
  unit?: string;
};

/**
 * Hot filters: the stat cards above a table (Offen / Zurückgesetzt / Abgeschl. look). A click filters the table to
 * that card, a second click shows everything again (`active` = null). Reuse this for every table that needs quick
 * filters, e.g. Verknüpft / Nicht verknüpft.
 */
export function HotFilters<Id extends string>({
  items,
  active,
  onChange,
  label = "Schnellfilter",
}: {
  items: HotFilter<Id>[];
  active: Id | null;
  onChange: (next: Id | null) => void;
  label?: string;
}) {
  return (
    <div className="freigaben-stats hot-filters" role="group" aria-label={label}>
      {items.map((item) => (
        <StatCard
          key={item.id}
          label={item.label}
          value={item.value}
          icon={item.icon}
          unit={item.unit}
          active={active === item.id}
          onClick={() => onChange(active === item.id ? null : item.id)}
        />
      ))}
    </div>
  );
}
