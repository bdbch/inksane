import type { Editor } from "@inksane/core";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { EditorContent } from "./EditorContent.tsx";
import { EditorProvider } from "./EditorProvider.tsx";
import { useCurrentEditor } from "./useCurrentEditor.ts";

afterEach(cleanup);

describe("EditorProvider", () => {
  it("exposes the editor through context", async () => {
    let seen: Editor | null = null;

    function Probe() {
      seen = useCurrentEditor();
      return null;
    }

    render(
      <EditorProvider>
        <Probe />
      </EditorProvider>,
    );

    await waitFor(() => expect(seen).not.toBeNull());
  });

  it("destroys the editor on unmount", async () => {
    const seen: { current: Editor | null } = { current: null };

    function Probe() {
      seen.current = useCurrentEditor();
      return null;
    }

    const { unmount } = render(
      <EditorProvider>
        <Probe />
        <EditorContent />
      </EditorProvider>,
    );

    await waitFor(() => expect(seen.current).not.toBeNull());

    const editor = seen.current;
    if (!editor) throw new Error("editor was not created");

    unmount();

    expect(editor.isMounted).toBe(false);
  });
});

describe("EditorContent", () => {
  it("mounts the editor into its element", async () => {
    const { container } = render(
      <EditorProvider content="# Hi">
        <EditorContent />
      </EditorProvider>,
    );

    await waitFor(() => {
      expect(container.querySelector(".inksane-editor")).not.toBeNull();
    });
  });

  it("shows the initial content", async () => {
    const { container } = render(
      <EditorProvider content="# Hi">
        <EditorContent />
      </EditorProvider>,
    );

    await waitFor(() => {
      expect(container.textContent).toContain("# Hi");
    });
  });

  it("updates content passed after mount", async () => {
    function App({ content }: { content: string }) {
      return (
        <EditorProvider content={content}>
          <EditorContent />
        </EditorProvider>
      );
    }

    const { container, rerender } = render(<App content="first" />);

    await waitFor(() => expect(container.textContent).toContain("first"));

    rerender(<App content="second" />);

    await waitFor(() => expect(container.textContent).toContain("second"));
  });
});
