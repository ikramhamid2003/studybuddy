import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { MAX_SELECTED_DOCS, RAG_ACCEPT, RAG_MAX_MB } from "./documentLibrary";

export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export function StatusBadge({ status }) {
  const map = {
    pending:    { icon: Clock,        label: "Pending",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
    processing: { icon: Loader2,      label: "Processing", cls: "bg-blue-50 text-blue-700 border-blue-200", spin: true },
    ready:      { icon: CheckCircle2, label: "Ready",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    error:      { icon: AlertCircle,  label: "Error",      cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const { icon: Icon, label, cls, spin } = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cls}`}>
      <Icon size={11} className={spin ? "animate-spin" : ""} />
      {label}
    </span>
  );
}

function DocumentCard({ doc, selected, onToggle, onDelete }) {
  return (
    <div
      className={`group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer
        ${selected
          ? "border-indigo-300 bg-indigo-50 shadow-sm shadow-indigo-100"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
        }`}
      onClick={() => doc.status === "ready" && onToggle(doc.id)}
      title={doc.status !== "ready" ? "Document is not ready yet" : ""}
    >
      <div
        className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors
          ${doc.status === "ready"
            ? selected
              ? "bg-indigo-600 border-indigo-600"
              : "border-slate-300 bg-white group-hover:border-indigo-400"
            : "border-slate-200 bg-slate-100 cursor-not-allowed"
          }`}
      >
        {selected && <div className="w-2 h-2 bg-white rounded-sm" />}
      </div>

      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
        <FileText size={15} className="text-indigo-500" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <StatusBadge status={doc.status} />
          {doc.status === "ready" && (
            <span className="text-xs text-slate-400">
              {doc.chunk_count} chunks · {doc.page_count}p · {formatBytes(doc.file_size)}
            </span>
          )}
          {doc.status === "error" && (
            <span className="text-xs text-red-500 truncate max-w-[200px]" title={doc.error_message}>
              {doc.error_message}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex-shrink-0"
        title="Delete document"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

/**
 * The Ask-My-Docs toolbar, reusable on any page: an upload button (click to
 * browse, or drop files straight onto it) beside a dropdown that lists the
 * uploaded documents, their indexing status, and the selection that becomes
 * `document_ids` on a generation request.
 */
export default function DocumentPicker({
  library,
  title = "My documents",
  hint = "the answer comes from the model alone",
}) {
  const {
    documents,
    readyDocuments,
    readyCount,
    isLoading,
    selectedIds,
    toggleDoc,
    clearSelection,
    selectAllReady,
    uploadProgress,
    isUploading,
    upload,
    remove,
  } = library;

  const fileInputRef = useRef(null);
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  // The dropdown is a popover over page content, so clicks anywhere else —
  // or Escape — dismiss it.
  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    [...(e.dataTransfer?.files ?? [])].forEach((file) => upload(file));
  }, [upload]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const handleDragLeave = useCallback(() => setDragging(false), []);

  function handleFileInput(e) {
    [...(e.target.files ?? [])].forEach((file) => upload(file));
    e.target.value = "";
  }

  const processingCount = documents.filter(
    (doc) => doc.status === "pending" || doc.status === "processing",
  ).length;

  const selectedDocuments = documents.filter((doc) => selectedIds.has(doc.id));

  return (
    <div ref={rootRef} className="relative mb-6 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={isUploading}
        title={`PDF, TXT, or MD · up to ${RAG_MAX_MB} MB`}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all motion-reduce:transition-none
          ${dragging ? "bg-indigo-700 ring-2 ring-indigo-300" : "bg-indigo-600 hover:bg-indigo-700"}
          ${isUploading ? "cursor-wait opacity-80" : ""}
        `}
      >
        {isUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
        {isUploading
          ? `Uploading${uploadProgress != null ? ` · ${uploadProgress}%` : "…"}`
          : dragging
            ? "Drop to upload"
            : "Upload documents"}
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="true"
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all motion-reduce:transition-none
            ${open
              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
              : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
            }
          `}
        >
          <BookOpen size={15} className="text-indigo-500" />
          My documents
          {readyCount > 0 && (
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
              {readyCount} ready
            </span>
          )}
          {selectedIds.size > 0 && (
            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
              {selectedIds.size} selected
            </span>
          )}
          {processingCount > 0 && !isUploading && (
            <Loader2 size={13} className="animate-spin text-blue-500" />
          )}
          <ChevronDown size={15} className={`text-slate-400 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-30 mt-2 flex w-[min(26rem,calc(100vw-2.5rem))] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-700">
                <BookOpen size={14} className="flex-shrink-0 text-slate-400" />
                <span className="truncate">{title}</span>
              </h3>
              {selectedIds.size > 0 ? (
                <button
                  onClick={clearSelection}
                  className="flex flex-shrink-0 items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                >
                  <X size={11} /> Clear
                </button>
              ) : (
                readyCount > 1 && (
                  <button
                    onClick={() => selectAllReady(readyDocuments.map((d) => d.id))}
                    className="flex-shrink-0 text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    Select all ready
                  </button>
                )
              )}
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                <FileText size={26} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No documents yet</p>
                <p className="mt-1 text-xs">PDF, TXT, or MD · up to {RAG_MAX_MB} MB</p>
              </div>
            ) : (
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    selected={selectedIds.has(doc.id)}
                    onToggle={toggleDoc}
                    onDelete={remove}
                  />
                ))}
              </div>
            )}

            {selectedIds.size > 0 && (
              <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-2.5 py-1.5 border border-indigo-100">
                Grounded in <strong>{selectedIds.size}</strong> selected document
                {selectedIds.size > 1 ? "s" : ""}
                {selectedIds.size >= MAX_SELECTED_DOCS ? ` (max ${MAX_SELECTED_DOCS})` : ""}
              </p>
            )}
            {selectedIds.size === 0 && (
              <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-2.5 py-1.5">
                {readyCount > 0
                  ? `Nothing selected — ${hint}.`
                  : "Upload a document and wait for it to finish indexing."}
              </p>
            )}
          </div>
        )}
      </div>

      {selectedDocuments.length > 0 && (
        <p className="w-full rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-1.5 text-[13px] text-slate-600">
          Selected document :{" "}
          <span className="font-semibold text-indigo-700">
            {selectedDocuments.map((doc) => doc.title).join(", ")}
          </span>
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={RAG_ACCEPT}
        multiple
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  );
}
