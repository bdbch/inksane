import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { Editor } from "../Editor.ts";
import type { Extension } from "../types/index.ts";
import { LinkExtension, type LinkOptions } from "./link.ts";

const pressModK = (editor: Editor) => {
  editor.view.contentDOM.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
  );
};

describe("link Mod-k keybinding", () => {
  let editor: Editor | undefined;

  afterEach(() => {
    if (editor) {
      editor.view.dom.parentElement?.remove();
      editor.destroy();
      editor = undefined;
    }
  });

  const createEditor = (
    content: string,
    selection: { anchor: number; head: number },
    extensions?: Extension[],
  ) => {
    editor = new Editor({
      element: document.createElement("div"),
      content,
      ...(extensions ? { extensions } : {}),
    });
    editor.view.dispatch({ selection });
    return editor;
  };

  const linkOptions = (options: LinkOptions): Extension[] => [LinkExtension(options)];

  it("leaves Mod-k unbound without an onLinkRequest handler", () => {
    const instance = createEditor("Hello world", { anchor: 0, head: 5 });

    pressModK(instance);

    expect(instance.content).toBe("Hello world");
  });

  it("wraps the selection in a link once a URL is supplied", () => {
    const onLinkRequest = vi.fn(() => "https://example.com");
    const instance = createEditor(
      "Hello world",
      { anchor: 0, head: 5 },
      linkOptions({ onLinkRequest }),
    );

    pressModK(instance);

    expect(instance.content).toBe("[Hello](https://example.com) world");
    expect(onLinkRequest).toHaveBeenCalledWith({ text: "Hello" });
  });

  it("does not mutate the document when the request is cancelled", () => {
    const onLinkRequest = vi.fn(() => null);
    const instance = createEditor(
      "Hello world",
      { anchor: 0, head: 5 },
      linkOptions({ onLinkRequest }),
    );

    pressModK(instance);

    expect(instance.content).toBe("Hello world");
    expect(onLinkRequest).toHaveBeenCalledTimes(1);
  });

  it("treats a blank URL as a cancellation", () => {
    const onLinkRequest = vi.fn(() => "   ");
    const instance = createEditor(
      "Hello world",
      { anchor: 0, head: 5 },
      linkOptions({ onLinkRequest }),
    );

    pressModK(instance);

    expect(instance.content).toBe("Hello world");
  });

  it("removes an existing link without requesting a URL", () => {
    const onLinkRequest = vi.fn(() => "https://example.com");
    const instance = createEditor(
      "[Hello](https://example.com) world",
      { anchor: 0, head: "[Hello](https://example.com)".length },
      linkOptions({ onLinkRequest }),
    );

    pressModK(instance);

    expect(instance.content).toBe("Hello world");
    expect(onLinkRequest).not.toHaveBeenCalled();
  });
});
