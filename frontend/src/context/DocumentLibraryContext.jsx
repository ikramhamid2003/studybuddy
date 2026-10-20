import { createContext, useContext } from "react";
import { useDocumentLibrary } from "../components/shared/documentLibrary";

const DocumentLibraryContext = createContext(null);

// One library instance for the whole workspace so a selection made on any
// page is the selection every other page grounds its requests in.
export function DocumentLibraryProvider({ children }) {
  const library = useDocumentLibrary();
  return (
    <DocumentLibraryContext.Provider value={library}>
      {children}
    </DocumentLibraryContext.Provider>
  );
}

export function useLibrary() {
  const library = useContext(DocumentLibraryContext);
  if (!library) {
    throw new Error("useLibrary must be used inside <DocumentLibraryProvider>");
  }
  return library;
}
