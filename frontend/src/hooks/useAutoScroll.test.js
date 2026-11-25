import { renderHook } from "@testing-library/react";
import useAutoScroll from "./useAutoScroll";

function setup(initial) {
  const scrollIntoView = vi.fn();
  const bottomRef = { current: { scrollIntoView } };
  const view = renderHook((props) => useAutoScroll({ bottomRef, ...props }), {
    initialProps: initial,
  });
  // Pretend the container is 1000px tall with a 400px viewport.
  const container = { scrollHeight: 1000, clientHeight: 400, scrollTop: 600 };
  view.result.current.scrollRef.current = container;
  return { ...view, scrollIntoView, container };
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

test("follows new content while the reader is at the bottom", () => {
  const { rerender, scrollIntoView } = setup({ changeKey: "1", lastIsUser: false });
  scrollIntoView.mockClear();

  rerender({ changeKey: "2", lastIsUser: false });

  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
});

test("does not yank the reader back down after they scroll up", () => {
  const { result, rerender, scrollIntoView, container } = setup({
    changeKey: "1",
    lastIsUser: false,
  });
  container.scrollTop = 100; // 500px from the bottom
  result.current.onScroll();
  scrollIntoView.mockClear();

  rerender({ changeKey: "2", lastIsUser: false });

  expect(scrollIntoView).not.toHaveBeenCalled();
});

test("sending a message always jumps back to the bottom", () => {
  const { result, rerender, scrollIntoView, container } = setup({
    changeKey: "1",
    lastIsUser: false,
  });
  container.scrollTop = 100;
  result.current.onScroll();
  scrollIntoView.mockClear();

  rerender({ changeKey: "2", lastIsUser: true });

  expect(scrollIntoView).toHaveBeenCalledTimes(1);
});

test("skips smooth scrolling when the user prefers reduced motion", () => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true });
  const { rerender, scrollIntoView } = setup({ changeKey: "1", lastIsUser: false });
  scrollIntoView.mockClear();

  rerender({ changeKey: "2", lastIsUser: false });

  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto" });
});
