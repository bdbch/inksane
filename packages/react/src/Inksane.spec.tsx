import type { Editor } from "@inksane/core";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { Inksane } from "./Inksane.tsx";
import { InksaneProvider } from "./InksaneProvider.tsx";
import { useInksaneContext } from "./useInksaneContext.ts";
import { useInksaneSelection } from "./useInksaneSelection.ts";
import type { InksaneSelection } from "./useInksaneSelection.ts";

afterEach(cleanup);

describe("InksaneProvider", () => {
  it("exposes the editor through context", async () => {
    const seen: { current: Editor | null } = { current: null };

    function Probe() {
      seen.current = useInksaneContext();
      return null;
    }

    render(
      <InksaneProvider>
        <Probe />
      </InksaneProvider>,
    );

    await waitFor(() => expect(seen.current).not.toBeNull());
  });

  it("destroys the editor on unmount", async () => {
    const seen: { current: Editor | null } = { current: null };

    function Probe() {
      seen.current = useInksaneContext();
      return null;
    }

    const { unmount } = render(
      <InksaneProvider>
        <Probe />
        <Inksane />
      </InksaneProvider>,
    );

    await waitFor(() => expect(seen.current).not.toBeNull());

    const editor = seen.current;
    if (!editor) throw new Error("editor was not created");

    unmount();

    expect(editor.isMounted).toBe(false);
  });
});

describe("Inksane", () => {
  it("mounts the editor into its element", async () => {
    const { container } = render(
      <InksaneProvider content="# Hi">
        <Inksane />
      </InksaneProvider>,
    );

    await waitFor(() => {
      expect(container.querySelector(".inksane-editor")).not.toBeNull();
    });
  });

  it("shows the initial content", async () => {
    const seen: { current: Editor | null } = { current: null };

    function Probe() {
      seen.current = useInksaneContext();
      return null;
    }

    render(
      <InksaneProvider content="# Hi">
        <Probe />
        <Inksane />
      </InksaneProvider>,
    );

    await waitFor(() => expect(seen.current?.content).toBe("# Hi"));
  });

  it("updates content passed after mount", async () => {
    function App({ content }: { content: string }) {
      return (
        <InksaneProvider content={content}>
          <Inksane />
        </InksaneProvider>
      );
    }

    const { container, rerender } = render(<App content="first" />);

    await waitFor(() => expect(container.textContent).toContain("first"));

    rerender(<App content="second" />);

    await waitFor(() => expect(container.textContent).toContain("second"));
  });
});

describe("useInksaneSelection", () => {
  it("tracks the editor selection", async () => {
    const editorRef: { current: Editor | null } = { current: null };
    const seen: { current: InksaneSelection | null } = { current: null };

    function Probe() {
      editorRef.current = useInksaneContext();
      seen.current = useInksaneSelection();
      return null;
    }

    render(
      <InksaneProvider content="hello">
        <Probe />
        <Inksane />
      </InksaneProvider>,
    );

    await waitFor(() => expect(editorRef.current).not.toBeNull());

    const editor = editorRef.current;
    if (!editor) throw new Error("editor was not created");

    await waitFor(() => expect(seen.current).not.toBeNull());

    act(() => {
      editor.view.dispatch({ selection: { anchor: 1, head: 4 } });
    });

    await waitFor(() => {
      expect(seen.current?.main.from).toBe(1);
      expect(seen.current?.main.to).toBe(4);
    });
  });
});
