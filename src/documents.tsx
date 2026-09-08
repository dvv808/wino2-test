import * as a from "./assets/index";
import { Icon, Segmented } from "./ui";
import { DOCUMENTS, useWorkflow } from "./workflow";

const PAGES = [a.docPage1, a.docPage2, a.docPage1, a.docPage2, a.docPage1, a.docPage2];

export function DocumentRail({ title }: { title: string }) {
  const { activeDoc, setActiveDoc } = useWorkflow();

  return (
    <aside className="doc-rail">
      <div className="doc-rail-head">
        <span className="stack-icon" style={{ width: 42, height: 42 }}>
          <img src={a.docBadgeBg} alt="" width={42} height={42} />
          <img src={a.docWhite} alt="" width={16} height={21} style={{ left: 13, top: 11 }} />
        </span>
        <p>
          <strong>{title}</strong>
          <small>{DOCUMENTS.length} Dokumente</small>
        </p>
      </div>
      <ul className="doc-list">
        {DOCUMENTS.map((doc, index) => (
          <li key={doc}>
            <button
              type="button"
              className={`doc-item${index === activeDoc ? " active" : ""}`}
              onClick={() => setActiveDoc(index)}
            >
              <Icon src={a.docList} size={14} />
              {doc}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function ViewerBar({ fileName }: { fileName: string }) {
  return (
    <header className="pdf-bar">
      <p className="pdf-file">
        {fileName ? (
          <>
            <strong>{fileName}</strong>
            <small>PDF · 12,22 KB</small>
          </>
        ) : null}
      </p>
      <div className="pdf-zoom">
        <button type="button" aria-label="Verkleinern">
          <Icon src={a.zoomOut} size={14} />
        </button>
        <span>100%</span>
        <button type="button" aria-label="Vergrößern">
          <Icon src={a.zoomIn} size={14} />
        </button>
      </div>
      <button type="button" className="pdf-action">
        <Icon src={a.eye} size={16} />
        Vorschau
      </button>
      <button type="button" className="pdf-action">
        Weitere Aktionen
        <Icon src={a.chevronDown} size={14} />
      </button>
      <button type="button" className="pdf-round" aria-label="Suchen">
        <Icon src={a.magnifier} size={16} />
      </button>
    </header>
  );
}

export function PdfViewer({
  fileName,
  signature,
}: {
  fileName?: string;
  signature?: string | null;
}) {
  const { activeDoc, setActiveDoc } = useWorkflow();
  /* The bar names the document that is currently selected in the rail. */
  const title = fileName ?? DOCUMENTS[activeDoc] ?? DOCUMENTS[0];

  return (
    <div className="pdf-frame">
      <ViewerBar fileName={title} />
      <div className="pdf-body">
        <div className="pdf-thumbs">
          {PAGES.map((page, index) => (
            <button
              key={index}
              type="button"
              className={`pdf-thumb${index === activeDoc ? " active" : ""}`}
              onClick={() => setActiveDoc(index)}
            >
              <img src={page} alt="" />
              <span>{index + 1}</span>
            </button>
          ))}
        </div>
        <div className="pdf-pages">
          {PAGES.slice(0, 2).map((page, index) => (
            <div className="pdf-page" key={index}>
              <img src={page} alt={`Seite ${index + 1}`} />
              {signature && index === 1 ? (
                <img className="pdf-page-signature" src={signature} alt="Unterschrift" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Nothing has been uploaded yet, so the bar carries no document name. */
export function PdfEmptyViewer({ fileName = "" }: { fileName?: string }) {
  return (
    <div className="pdf-frame">
      <ViewerBar fileName={fileName} />
      <div className="pdf-empty">
        <span className="pdf-empty-art">
          <Icon src={a.docList} size={34} />
        </span>
        <strong>Dokumenten vorschau</strong>
        <span>Sobald ein Dokument hochgeladen wurde, wird es hier angezeigt.</span>
      </div>
    </div>
  );
}

/** Right-hand panel of the Signaturen step: original / signed switch above the viewer. */
export function SignedDocumentPanel() {
  const { previewTab, setPreviewTab, signMode, signFile, signature } = useWorkflow();
  /**
   * "Original Dokument" always shows what step 5 released. The signed tab has
   * nothing to show on the upload path until a file arrives, while the digital
   * path signs those same documents, so they are already there.
   */
  const showViewer =
    previewTab === "original" || signMode === "digital" || Boolean(signFile);

  return (
    <section className="doc-viewer">
      <Segmented
        className="preview-switch"
        value={previewTab}
        onChange={setPreviewTab}
        options={[
          { id: "original", label: "Original Dokument" },
          { id: "signed", label: "Unterzeichnetes Dokument" },
        ]}
      />
      {showViewer ? (
        <PdfViewer
          signature={previewTab === "signed" && signMode === "digital" ? signature : null}
        />
      ) : (
        <PdfEmptyViewer />
      )}
    </section>
  );
}

export function PdfModal() {
  const { pdfOpen, setPdfOpen } = useWorkflow();
  if (!pdfOpen) return null;

  return (
    <div className="pdf-modal" role="dialog" aria-label="PDF Vorschau">
      <button type="button" className="pdf-modal-scrim" aria-label="Schließen" onClick={() => setPdfOpen(false)} />
      <div className="pdf-modal-body">
        <button type="button" className="pdf-modal-close" aria-label="Schließen" onClick={() => setPdfOpen(false)}>
          <img src={a.iconCloseDark} alt="" width={18} height={18} />
        </button>
        <PdfViewer />
      </div>
    </div>
  );
}
