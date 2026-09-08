import { useState } from "react";
import * as a from "../assets/index";
import { Summary } from "../Summary";
import { Icon } from "../ui";
import { TEXT_BLOCKS, useWorkflow } from "../workflow";

type Align = "left" | "center" | "right";

export function TermsStep() {
  const { openMenu, toggleMenu, setOpenMenu, textBlock, setTextBlock, termsText, setTermsText } =
    useWorkflow();
  const [bold, setBold] = useState(false);
  const [align, setAlign] = useState<Align>("left");

  function insertBlock(block: string) {
    setTextBlock(block);
    setOpenMenu(null);
    setTermsText((current) => (current.trim() ? `${current}\n\n${block}` : block));
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
                {textBlock ?? "Auswählen"}
                <Icon src={a.selectCaret} size={16} />
              </button>
              {openMenu === "textblock" && (
                <div className="dropdown-menu">
                  {TEXT_BLOCKS.map((block) => (
                    <button
                      key={block}
                      type="button"
                      className={`menu-item${block === textBlock ? " selected" : ""}`}
                      onClick={() => insertBlock(block)}
                    >
                      <span className="menu-item-copy">{block}</span>
                      <Icon src={block === textBlock ? a.confirmOn : a.confirmOff} size={18} />
                    </button>
                  ))}
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
        </div>
      </section>

      <Summary cards={["contact", "honorar", "terms"]} />
    </>
  );
}
