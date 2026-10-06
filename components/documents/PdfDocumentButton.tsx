"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function PdfDocumentButton({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const [document, setDocument] = useState<{ url: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const alive = useRef(true);
  const loading = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!document) return;
    dialog.current?.showModal();
    return () => { URL.revokeObjectURL(document.url); };
  }, [document]);
  async function open() {
    if (loading.current) return;
    loading.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(href, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "Your session has expired. Sign in again to view this document." : "We couldn’t open this document. Please try again.");
      if (!response.headers.get("content-type")?.includes("application/pdf")) throw new Error("We couldn’t open this document. Please try again.");
      const blob = await response.blob();
      if (!alive.current) return;
      const name = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] || "document.pdf";
      setDocument({ url: URL.createObjectURL(blob), name });
    } catch (failure) {
      if (alive.current) setError(failure instanceof Error ? failure.message : "We couldn’t open this document. Please try again.");
    } finally {
      loading.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return <>
    <button type="button" className={className} onClick={open} disabled={busy} aria-busy={busy}>{busy ? "Opening…" : children}</button>
    {error ? <p role="alert" className="col-span-full text-sm font-semibold text-red-700 dark:text-red-300">{error}</p> : null}
    {document ? <dialog ref={dialog} aria-label="Document preview" onCancel={() => setDocument(null)} className="fixed inset-0 m-auto h-[90dvh] w-[95vw] max-w-4xl rounded-2xl border border-slate-200 bg-white p-0 text-slate-950 shadow-xl backdrop:bg-black/60">
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <h2 className="font-bold">Document preview</h2>
          <button type="button" autoFocus onClick={() => setDocument(null)} className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold">Close preview</button>
        </div>
        <div className="flex flex-wrap gap-3 border-b border-slate-200 px-4 py-3 text-sm font-semibold">
          <a href={document.url} download={document.name} className="rounded-lg bg-teal-700 px-4 py-3 text-white">Download PDF</a>
          <a href={document.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-4 py-3">Open for printing</a>
        </div>
        <iframe title="PDF document" src={document.url} className="min-h-0 w-full flex-1 border-0" />
      </div>
    </dialog> : null}
  </>;
}
