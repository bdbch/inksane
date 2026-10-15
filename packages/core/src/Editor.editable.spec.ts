import { afterEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "./Editor.ts";
import { BaseKit } from "./extensions/baseKit.ts";
import { CommandChain, type CommandRegistry } from "./CommandChain.ts";

describe("read-only mode", () => {
  let editor: Editor;

  afterEach(() => editor?.destroy());

  it("rejects direct transactions without moving the selection or emitting updates", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "hello",
      editable: false,
    });
    editor.view.dispatch({ selection: { anchor: 2 } });
    let updates = 0;
    editor.on("update", () => updates++);
    editor.view.dispatch({
      changes: { from: 0, insert: "new" },
      selection: { anchor: 3 },
    });

    expect(editor.content).toBe("hello");
    expect(editor.state.selection.main.anchor).toBe(2);
    expect(updates).toBe(0);
  });

  it("blocks custom keybindings without requiring a read-only check", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "hello",
      editable: false,
      extensions: [
        {
          name: "customInput",
          addKeybinds: () => [
            {
              key: "Mod-j",
              run(view) {
                view.dispatch({ changes: { from: 0, insert: "new" } });
                return true;
              },
            },
          ],
        },
      ],
    });
    editor.view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", { key: "j", ctrlKey: true, bubbles: true }),
    );
    expect(editor.content).toBe("hello");
  });

  it("renders and selects read-only content without editing it", () => {
    editor = new Editor({
      extensions: [BaseKit()],
      element: document.createElement("div"),
      content: "hello",
      editable: false,
    });

    expect(editor.view.contentDOM.getAttribute("contenteditable")).toBe("false");
    expect(editor.view.contentDOM.tabIndex).toBe(0);
    expect(editor.view.contentDOM.textContent).toBe("hello");
    editor.view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", ctrlKey: true, bubbles: true }),
    );
    expect(editor.state.selection.main.to).toBe(5);
    editor.view.dispatch({ scrollIntoView: true });
    expect(editor.content).toBe("hello");
  });

  it("rejects commands, chains and capability checks while read-only", () => {
    editor = new Editor({
      extensions: [BaseKit()],
      element: document.createElement("div"),
      content: "hello",
      editable: false,
    });
    expect(editor.canRun("toggleBold")).toBe(false);
    expect(editor.commands.toggleBold()).toBe(false);
    expect(editor.chain().clearContent().insertContent({ content: "new", from: 0 }).run()).toBe(
      false,
    );
    expect(editor.content).toBe("hello");
  });

  it("keeps commands that do not change the document available while read-only", () => {
    const mount = document.createElement("div");
    document.body.append(mount);
    editor = new Editor({
      extensions: [BaseKit()],
      element: mount,
      content: "hello",
      editable: false,
    });

    expect(editor.canRun("focus")).toBe(true);
    expect(editor.commands.focus()).toBe(true);
    expect(editor.focused).toBe(true);
    expect(editor.content).toBe("hello");

    mount.remove();
  });

  it("rejects document-changing commands before mount instead of throwing", () => {
    editor = new Editor({ content: "hello", editable: false });

    expect(editor.commands.clearContent()).toBe(false);
    expect(editor.content).toBe("hello");
  });

  it("runs selection-only commands with an empty change array while read-only", () => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "hello",
      editable: false,
    });

    const registry: CommandRegistry = {
      selectEnd: (ctx) => () => {
        ctx.dispatch({ changes: [], selection: { anchor: ctx.state.doc.length } });
        return true;
      },
    };
    const chain = CommandChain.create(editor, registry) as unknown as {
      selectEnd: () => { run: () => boolean };
    };

    expect(chain.selectEnd().run()).toBe(true);
    expect(editor.state.selection.main.anchor).toBe(5);
    expect(editor.content).toBe("hello");
  });

  it("toggles at runtime and evaluates queued chains against the current mode", () => {
    editor = new Editor({ element: document.createElement("div"), content: "hello" });
    expect(editor.state.readOnly).toBe(false);
    const chain = editor.chain().clearContent();

    editor.setEditable(false);
    expect(editor.options.editable).toBe(false);
    expect(editor.state.readOnly).toBe(true);
    expect(editor.canRun("clearContent")).toBe(false);
    expect(editor.view.contentDOM.getAttribute("contenteditable")).toBe("false");
    expect(chain.run()).toBe(false);
    expect(editor.content).toBe("hello");

    editor.setEditable(true);
    expect(editor.options.editable).toBe(true);
    expect(editor.state.readOnly).toBe(false);
    expect(editor.view.contentDOM.getAttribute("contenteditable")).toBe("true");
    expect(editor.canRun("clearContent")).toBe(true);
    expect(editor.commands.clearContent()).toBe(true);
    expect(editor.content).toBe("");
  });

  it("toggles before mount and still allows programmatic content loading", () => {
    editor = new Editor({ content: "old", editable: false });
    expect(editor.canRun("clearContent")).toBe(false);
    editor.setEditable(true);
    expect(editor.state.readOnly).toBe(false);
    editor.setEditable(false);
    editor.setMarkdown("loaded");
    editor.mount(document.createElement("div"));

    expect(editor.state.readOnly).toBe(true);
    expect(editor.view.contentDOM.getAttribute("contenteditable")).toBe("false");
    expect(editor.content).toBe("loaded");
    editor.setMarkdown("updated");
    expect(editor.content).toBe("updated");
  });

  it.each([
    ["Tab", false],
    ["Tab", true],
    [".", false],
    ["Enter", false],
    ["Backspace", false],
  ])("blocks editing with %s, shift %s", (key, shiftKey) => {
    editor = new Editor({
      extensions: [BaseKit()],
      element: document.createElement("div"),
      content: "  hello",
      editable: false,
    });
    editor.view.dispatch({ selection: { anchor: 3 } });
    editor.view.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        shiftKey,
        ctrlKey: key === ".",
        bubbles: true,
      }),
    );
    expect(editor.content).toBe("  hello");
  });

  it.each(["text/html", "text/plain"])("blocks %s paste", (type) => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "hello",
      editable: false,
    });
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: (format: string) => (format === type ? "<b>new</b>" : "") },
    });
    editor.view.contentDOM.dispatchEvent(event);
    expect(editor.content).toBe("hello");
  });
});
