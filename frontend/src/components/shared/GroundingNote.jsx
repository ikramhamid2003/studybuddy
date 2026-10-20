import { FileText } from "lucide-react";
import { useLibrary } from "../../context/DocumentLibraryContext";

// Shown under a page's input only while documents are selected, so students
// know the next generation reads their own material instead of general knowledge.
export default function GroundingNote() {
  const { selectedIds } = useLibrary();
  if (selectedIds.size === 0) return null;
  return (
    <p className="-mt-4 mb-6 flex items-center gap-1.5 text-xs text-indigo-600">
      <FileText size={13} className="flex-shrink-0" />
      The output will be based on the selected document{selectedIds.size > 1 ? "s" : ""}.
    </p>
  );
}
