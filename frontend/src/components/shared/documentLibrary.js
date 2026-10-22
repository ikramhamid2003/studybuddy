import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  // The provider lives above the routes, so it survives a sign-out and a
  // different account signing in. Stored ids belong to whoever was here before:
  // none of them are ready for the new user, so a request made before the list
  // loads would be refused. Ref-initialized so a reload keeps the selection.
  const ownerRef = useRef(user?.id);
  useEffect(() => {
    if (ownerRef.current === user?.id) return;
    ownerRef.current = user?.id;
    setSelectedIds(new Set());
  }, [user?.id]);

  // Drop stored ids whose documents were deleted since the last visit, and
  // enforce the cap on a selection saved by an older build: the serializer
  // refuses more than MAX_SELECTED_DOCS ids, so a stale over-cap workspace has
  // to shrink here rather than 400 the next generation. Walking `documents`
  // keeps the newest ids, matching selectAllReady.
  // isFetched (not isLoading) because the query stays disabled until auth
  // restores, and an unfetched list must not wipe the stored selection.
  useEffect(() => {
    if (!isFetched) return;
    setSelectedIds((prev) => {
      const kept = documents
        .filter((doc) => prev.has(doc.id))
        .slice(0, MAX_SELECTED_DOCS)
        .map((doc) => doc.id);
      if (kept.length === prev.size) return prev;
      return new Set(kept);
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

  // Unticking is always allowed; ticking past the cap is refused here rather than
  // sent and rejected by the serializer's unlabeled max-length 400.
  const toggleDoc = useCallback(
    (id) => {
      if (!selectedIds.has(id) && selectedIds.size >= MAX_SELECTED_DOCS) {
        toast(`A generation can use at most ${MAX_SELECTED_DOCS} documents`);
        return;
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    },
    [selectedIds]
  );

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
