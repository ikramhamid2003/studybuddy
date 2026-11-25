import { fireEvent, render, screen } from "@testing-library/react";
import DocumentPicker from "./DocumentPicker";

const docs = [
  { id: 1, title: "Biology notes", status: "ready", chunk_count: 4, page_count: 2, file_size: 2048 },
  { id: 2, title: "Draft paper", status: "processing" },
];

function setup(overrides = {}) {
  const library = {
    documents: docs,
    readyDocuments: [docs[0]],
    readyCount: 1,
    isLoading: false,
    selectedIds: new Set(),
    toggleDoc: vi.fn(),
    clearSelection: vi.fn(),
    selectAllReady: vi.fn(),
    uploadProgress: null,
    isUploading: false,
    upload: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
  render(<DocumentPicker library={library} />);
  fireEvent.click(screen.getByRole("button", { name: /My documents/ }));
  return library;
}

test("documents are real checkboxes that toggle from the keyboard-reachable input", () => {
  const library = setup();
  const box = screen.getByRole("checkbox", { name: /Biology notes/ });
  fireEvent.click(box);
  expect(library.toggleDoc).toHaveBeenCalledWith(1);
});

test("documents that are still processing cannot be selected", () => {
  setup();
  expect(screen.getByRole("checkbox", { name: /Draft paper/ })).toBeDisabled();
});

test("selected documents report as checked", () => {
  setup({ selectedIds: new Set([1]) });
  expect(screen.getByRole("checkbox", { name: /Biology notes/ })).toBeChecked();
});

test("delete asks first and returns focus to the toggle", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  const library = setup();
  fireEvent.click(screen.getByRole("button", { name: "Delete Biology notes" }));
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Biology notes"));
  expect(library.remove).toHaveBeenCalledWith(1);
  expect(screen.getByRole("button", { name: /My documents/ })).toHaveFocus();
  confirm.mockRestore();
});

test("declining the confirmation keeps the document", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const library = setup();
  fireEvent.click(screen.getByRole("button", { name: "Delete Biology notes" }));
  expect(library.remove).not.toHaveBeenCalled();
  confirm.mockRestore();
});

test("Escape closes the panel and returns focus to the toggle", () => {
  setup();
  const toggle = screen.getByRole("button", { name: /My documents/ });
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(toggle).toHaveFocus();
  expect(screen.queryByRole("group", { name: "My documents" })).not.toBeInTheDocument();
});
