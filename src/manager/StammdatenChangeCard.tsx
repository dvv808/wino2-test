import { useState } from "react";
import * as a from "../assets/index";
import { Icon } from "../ui";
import type { StammdatenDiff, StammdatenDiffIcon } from "./stammdatenDiff";

const FIELD_ICON: Record<Exclude<StammdatenDiffIcon, "maps">, string> = {
  phone: a.phone,
  mail: a.mail,
};

function FieldIcon({ name }: { name?: StammdatenDiffIcon }) {
  if (!name) return null;
  if (name === "maps") {
    return (
      <span className="sd-change-maps">
        <img src={a.googleMaps} alt="" width={9.3913} height={13.5} />
      </span>
    );
  }
  return <Icon src={FIELD_ICON[name]} size={18} />;
}

export function StammdatenChangeCard({ diff }: { diff: StammdatenDiff }) {
  const [open, setOpen] = useState(() => {
    const preset = diff.versions.filter((version) => version.open).map((version) => version.number);
    return new Set(preset.length ? preset : [diff.versions[0]?.number]);
  });

  function toggle(number: number) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }

  return (
    <article className="sd-change">
      <header className="sd-change-head">
        <span className="sd-change-title">
          <Icon src={a.clientBlank} size={22} />
          <Icon src={a.checkGreen} size={20} />
          {diff.headline}
        </span>
        <span className="sd-change-menu" aria-hidden="true">
          <Icon src={a.contextMenu} size={18} />
        </span>
      </header>

      {diff.versions.map((version) => {
        const expanded = open.has(version.number);
        return (
          <section className="sd-change-version" key={version.number}>
            <button
              type="button"
              className="sd-change-version-head"
              aria-expanded={expanded}
              onClick={() => toggle(version.number)}
            >
              <span>
                <span className="sd-change-badge">{version.number}</span>
                {version.title}
              </span>
              <Icon
                src={a.chevronDark}
                size={18}
                className={expanded ? "sd-change-chevron open" : "sd-change-chevron"}
              />
            </button>

            {expanded && version.sections.length ? (
              <div className="sd-change-body">
                <div className="sd-change-pills" aria-hidden="true">
                  <span />
                  <span className="sd-change-pill left">{diff.leftLabel}</span>
                  <span className="sd-change-pill right">{diff.rightLabel}</span>
                </div>

                {version.sections.map((section) => (
                  <div className="sd-change-section" key={`${section.caption}-${section.stamp}`}>
                    <p className="sd-change-caption">{section.caption}</p>
                    <p className="sd-change-stamp">{section.stamp}</p>
                    {section.fields.map((field) => (
                      <div className="sd-change-row" key={field.label}>
                        <span className="sd-change-label">
                          <FieldIcon name={field.icon} />
                          {field.label}
                        </span>
                        <span className="sd-change-old">{field.left}</span>
                        <span className={field.rightLink ? "sd-change-new link" : "sd-change-new"}>
                          {field.right}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </article>
  );
}
