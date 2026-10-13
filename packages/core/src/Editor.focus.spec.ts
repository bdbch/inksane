import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Editor } from "./Editor.ts";

describe("focus events", () => {
  let editor: Editor;
  let mount: HTMLDivElement;

  beforeEach(() => {
    mount = document.createElement("div");
    document.body.append(mount);
  });

  afterEach(() => {
    editor?.destroy();
    mount.remove();
  });

  it.each([true, false])("emits focus and blur with editable=%s", (editable) => {
    editor = new Editor({ element: mount, content: "hello", editable });
    const focus = vi.fn(() => expect(editor.focused).toBe(true));
    const blur = vi.fn(() => expect(editor.focused).toBe(false));
    editor.on("focus", focus);
    editor.on("blur", blur);

    editor.view.focus();

    expect(focus).toHaveBeenCalledExactlyOnceWith({ editor });
    expect(blur).not.toHaveBeenCalled();

    editor.view.focus();
    editor.view.contentDOM.dispatchEvent(new FocusEvent("focus"));
    editor.view.dispatch({ selection: { anchor: 2 } });
    editor.setMarkdown("updated");

    expect(focus).toHaveBeenCalledTimes(1);
    expect(blur).not.toHaveBeenCalled();

    editor.view.contentDOM.blur();

    expect(blur).toHaveBeenCalledExactlyOnceWith({ editor });

    editor.view.contentDOM.dispatchEvent(new FocusEvent("blur"));
    editor.view.dispatch({ selection: { anchor: 1 } });
    expect(blur).toHaveBeenCalledTimes(1);

    editor.view.focus();
    expect(focus).toHaveBeenCalledTimes(2);
  });

  it("does not emit focus events before mount or on an unfocused mount", () => {
    editor = new Editor({});
    const focus = vi.fn();
    const blur = vi.fn();
    editor.on("focus", focus);
    editor.on("blur", blur);

    editor.setMarkdown("hello");
    editor.mount(mount);

    expect(editor.focused).toBe(false);
    expect(focus).not.toHaveBeenCalled();
    expect(blur).not.toHaveBeenCalled();

    editor.view.focus();
    expect(focus).toHaveBeenCalledExactlyOnceWith({ editor });

    editor.off("blur", blur);
    editor.view.contentDOM.blur();
    expect(editor.focused).toBe(false);
    expect(blur).not.toHaveBeenCalled();
  });
});
