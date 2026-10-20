import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteDocument,
  listDocuments,
  uploadDocument,
  validateRagFile,
} from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

export const RAG_MAX_MB = 20;
export const RAG_ACCEPT = ".pdf,.txt,.md";

// The backend caps how many documents one generation may be grounded in.
export const MAX_SELECTED_DOCS = 25;

const SELECTED_IDS_KEY = "studybuddy.selectedDocumentIds";

function readStoredSelection() {
  try {
    const raw = JSON.parse(localStorage.getItem(SELECTED_IDS_KEY) ?? "[]");
    return Array.isArray(raw) ? new Set(raw.filter((id) => Number.isInteger(id))) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Turn a selection Set into the `document_ids` option every tool accepts.
 * An empty selection sends nothing, which leaves the tool ungrounded —
 * unlike the old dedicated RAG search, where "nothing selected" meant
 * "search everything".
 */
export const docIdsOption = (selectedIds) =>
  selectedIds && selectedIds.size ? { document_ids: [...selectedIds] } : {};

/**
 * Owns the document library once per page: the list (with indexing poll),
 * upload, delete, and the selection set that gets sent as `document_ids`.
 * Shared by every tool page so they cannot drift apart.
 */
export function useDocumentLibrary() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(null);
  const [selectedIds, setSelectedIds] = useState(readStoredSelection);

  const { data: documents = [], isLoading, isFetched } = useQuery({
    queryKey: ["rag_documents"],
    queryFn: listDocuments,
    // The provider sits above the routes, including public ones.
    enabled: !!user,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((d) => d.status === "pending" || d.status === "processing")
        ? 2500
        : false,
  });

  // The selection is the workspace default: every page reads the same shared
  // instance, and storing it keeps that default across reloads too.
  useEffect(() => {
    localStorage.setItem(SELECTED_IDS_KEY, JSON.stringify([...selectedIds]));
  }, [selectedIds]);

  // Drop stored ids whose documents were deleted since the last visit.
  // isFetched (not isLoading) because the query stays disabled until auth
  // restores, and an unfetched list must not wipe the stored selection.
  useEffect(() => {
    if (!isFetched) return;
    const valid = new Set(documents.map((doc) => doc.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [documents, isFetched]);

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["rag_documents"] }),
    [queryClient]
  );

  const uploadMut = useMutation({
    mutationFn: ({ file }) =>
      uploadDocument(file, file.name, {
        onProgress: (pct) => setUploadProgress(pct),
      }),
    onSuccess: (doc) => {
      setUploadProgress(null);
      refresh();
      toast.success(`"${doc.title}" uploaded — indexing…`);
    },
    onError: (err) => {
      setUploadProgress(null);
      toast.error(err.message || "Upload failed");
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteDocument,
    onSuccess: (_data, docId) => {
      refresh();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
      toast.success("Document removed");
    },
    onError: (err) => toast.error(err.message || "Delete failed"),
  });

  const enqueueUpload = useCallback(
    (file) => {
      const err = validateRagFile(file, RAG_MAX_MB);
      if (err) {
        toast.error(err);
        return;
      }
      setUploadProgress(0);
      uploadMut.mutate({ file });
    },
    [uploadMut]
  );

  const toggleDoc = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectAllReady = useCallback(
    (readyIds) => {
      if (readyIds.length > MAX_SELECTED_DOCS) {
        toast(`Using the ${MAX_SELECTED_DOCS} most recent documents`);
      }
      setSelectedIds(new Set(readyIds.slice(0, MAX_SELECTED_DOCS)));
    },
    []
  );

  const readyDocuments = useMemo(
    () => documents.filter((d) => d.status === "ready"),
    [documents]
  );

  return {
    documents,
    readyDocuments,
    readyCount: readyDocuments.length,
    isLoading,
    selectedIds,
    toggleDoc,
    clearSelection,
    selectAllReady,
    uploadProgress,
    isUploading: uploadMut.isPending,
    upload: enqueueUpload,
    remove: (id) => deleteMut.mutate(id),
  };
}
