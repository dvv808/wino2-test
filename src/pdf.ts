import { useEffect, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** The Maklervereinbarung documents (public/docs), in the order of the document rail. */
export const DOC_FILES = ["maklervereinbarung.pdf", "sepa.pdf", "vollmacht-versicherung.pdf", "vollmacht-verhandlung.pdf"];

export const docUrl = (file: string) => `${import.meta.env.BASE_URL}docs/${file}`;

export type RenderedPdf = { pages: string[]; bytes: number };

const cache = new Map<string, Promise<RenderedPdf | null>>();

/** Renders every page of a PDF to an image (1.6× – sharp text, quick for the 16-page Maklervereinbarung). Null when the file is not there (yet). */
function render(url: string): Promise<RenderedPdf | null> {
  const hit = cache.get(url);
  if (hit) return hit;
  const job = (async () => {
    const response = await fetch(url);
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || type.includes("text/html")) return null;
    const data = new Uint8Array(await response.arrayBuffer());
    const bytes = data.byteLength;
    const doc = await pdfjs.getDocument({ data }).promise;
    const pages: string[] = [];
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
      pages.push(canvas.toDataURL("image/png"));
    }
    return { pages, bytes };
  })().catch(() => null);
  cache.set(url, job);
  return job;
}

/** The rendered pages of one document; `loading` while pdf.js works, `null` pdf when the file is missing. */
export function usePdf(file: string | undefined) {
  const [state, setState] = useState<{ file?: string; pdf: RenderedPdf | null; loading: boolean }>({ pdf: null, loading: true });
  useEffect(() => {
    if (!file) return;
    let live = true;
    setState({ file, pdf: null, loading: true });
    render(docUrl(file)).then((pdf) => live && setState({ file, pdf, loading: false }));
    return () => {
      live = false;
    };
  }, [file]);
  return state.file === file ? state : { pdf: null, loading: true };
}

/** "51,1 KB" */
export const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString("de-AT", { maximumFractionDigits: 2 })} MB`
    : `${(bytes / 1024).toLocaleString("de-AT", { maximumFractionDigits: 2 })} KB`;
