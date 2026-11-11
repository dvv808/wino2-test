import { useState } from "react";
import * as a from "../assets/index";
import { Summary } from "../Summary";
import { EntityIcon, Icon } from "../ui";
import { CLAUSE_SEPARATOR, TEXT_BLOCKS, clausesOf, useWorkflow } from "../workflow";

type Align = "left" | "center" | "right";

export function TermsStep() {
  const { openMenu, toggleMenu, setOpenMenu, setTextBlock, termsText, setTermsText, termsOn, setTermsOn } =
    useWorkflow();
  const [bold, setBold] = useState(false);
  const [align, setAlign] = useState<Align>("left");

  const clauseOf = (block: (typeof TEXT_BLOCKS)[number]) => `${block.title}\n${block.text}`;
  const join = (parts: string[]) => parts.join(CLAUSE_SEPARATOR);

  /**
   * Adds the clause (title + text), or takes it out again when it is already in. The list stays open, so any
   * number of Textbausteine can be added; a line separates them in the agreement.
   */
  function toggleBlock(block: (typeof TEXT_BLOCKS)[number]) {
    setTextBlock(block.title);
    setTermsText((current) => {
      const parts = clausesOf(current);
      const has = parts.some((part) => part.startsWith(block.title));
      return join(has ? parts.filter((part) => !part.startsWith(block.title)) : [...parts, clauseOf(block)]);
    });
  }

  /** "Alle Textbausteine einfügen": adds the ones that are not in yet. */
  function addAll() {
    setTermsText((current) => {
      const parts = clausesOf(current);
      const missing = TEXT_BLOCKS.filter((block) => !parts.some((part) => part.startsWith(block.title))).map(clauseOf);
      return join([...parts, ...missing]);
    });
    setOpenMenu(null);
  }

  function prefixLine(marker: string) {
    setTermsText((current) => {
      const lines = current.split("\n");
      const index = lines.length - 1;
      lines[index] = `${marker}${lines[index]}`;
      return lines.join("\n");
    });
  }

  return (
    <>
      <section>
        <div className="page-title">
          <h1>Individuelle Vereinbarung</h1>
          <p>
            Formuliere passende Vereinbarungen. Du kannst entweder eigene Vereinbarungen definieren
            oder vorhandene Textbausteine einfüge. Dieser Schritt ist optional.
          </p>
        </div>

        <div className="panel-card">
          {/* On by default, above the title. Off: no individual agreement, the step is Fertig. */}
          <div className="block terms-switch">
            <div className="sw-switch-row">
              <span>Individuelle Vereinbarung erstellen</span>
              <button
                type="button"
                role="switch"
                className={termsOn ? "sw-switch on" : "sw-switch"}
                aria-checked={termsOn}
                aria-label="Individuelle Vereinbarung erstellen"
                onClick={() => setTermsOn(!termsOn)}
              >
                <span className="sw-switch-knob" />
              </button>
            </div>
          </div>

          {termsOn ? (
          <>
          <h2>Individuelle Vereinbarungen</h2>
          <div className="block">
            <span className="field-label small">Textbausteine einfügen</span>
            <div className="dropdown">
              <button
                type="button"
                className={`select-field${openMenu === "textblock" ? " open" : ""}`}
                onClick={() => toggleMenu("textblock")}
                aria-expanded={openMenu === "textblock"}
              >
                {/* Figma: the field keeps saying "Auswählen"; added clauses are ticked in the list. */}
                Auswählen
                <Icon src={a.selectCaret} size={16} />
              </button>
              {openMenu === "textblock" && (
                <div className="dropdown-menu textblock-menu">
                  <button type="button" className="menu-item textblock-all" onClick={addAll}>
                    <Icon src={a.plusCircle} size={16} />
                    Alle Textbausteine einfügen
                  </button>
                  {TEXT_BLOCKS.map((block) => {
                    const added = clausesOf(termsText).some((part) => part.startsWith(block.title));
                    return (
                      <button
                        key={block.title}
                        type="button"
                        className={`menu-item textblock-item${added ? " selected" : ""}`}
                        title={`${block.title}\n${block.text}`}
                        onClick={() => toggleBlock(block)}
                      >
                        <span className="menu-item-main">
                          <EntityIcon src={a.textbaustein} />
                          <span className="textblock-copy">
                            <strong>{block.title}</strong>
                            <span>{block.text}</span>
                          </span>
                        </span>
                        {added ? <Icon src={a.confirmOn} size={18} /> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="editor">
            <div className="editor-bar">
              <span className="editor-select">Courier New</span>
              <span className="editor-select narrow">14</span>
              <button
                type="button"
                className={`editor-btn bold${bold ? " active" : ""}`}
                onClick={() => setBold((current) => !current)}
                aria-pressed={bold}
                aria-label="Fett"
              >
                B
              </button>
              {(["left", "center", "right"] as Align[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`editor-btn align ${option}${align === option ? " active" : ""}`}
                  onClick={() => setAlign(option)}
                  aria-pressed={align === option}
                  aria-label={`Ausrichtung ${option}`}
                >
                  <i />
                  <i />
                  <i />
                </button>
              ))}
              <button
                type="button"
                className="editor-btn list bullet"
                onClick={() => prefixLine("• ")}
                aria-label="Aufzählung"
              >
                <i />
                <i />
                <i />
              </button>
              <button
                type="button"
                className="editor-btn list numbered"
                onClick={() => prefixLine("1. ")}
                aria-label="Nummerierte Liste"
              >
                <i />
                <i />
                <i />
              </button>
            </div>
            <textarea
              className="editor-area"
              placeholder="Vereinbarung definieren..."
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              style={{ textAlign: align, fontWeight: bold ? 600 : 400 }}
            />
          </div>
          </>
          ) : null}
        </div>
      </section>

      <Summary cards={["contact", "honorar", "terms"]} />
    </>
  );
}
