import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { Editor } from "./Editor.ts";
import type { EditorEvents } from "./types/editor.ts";
import type { Extension } from "./types/extensions.ts";

describe("extension event handlers", () => {
  let editor: Editor | undefined;

  afterEach(() => editor?.destroy());

  it("runs root and child handlers in priority order throughout the editor lifecycle", () => {
    const calls: string[] = [];
    const child: Extension = {
      name: "child",
      priority: 10,
      beforeCreate: () => calls.push("child:beforeCreate"),
      create: () => calls.push("child:create"),
      mount: () => calls.push("child:mount"),
      update: () => calls.push("child:update"),
      selectionUpdate: () => calls.push("child:selectionUpdate"),
      unmount: () => calls.push("child:unmount"),
      destroy: () => calls.push("child:destroy"),
    };
    const parent: Extension = {
      name: "parent",
      addExtensions: () => [child],
      beforeCreate: () => calls.push("parent:beforeCreate"),
      create: () => calls.push("parent:create"),
    };

    editor = new Editor({ extensions: [parent] });
    editor.mount(document.createElement("div"));
    editor.view.dispatch({ changes: { from: 0, insert: "hello" } });
    editor.view.dispatch({ selection: { anchor: 2 } });
    editor.destroy();

    expect(calls).toEqual([
      "child:beforeCreate",
      "parent:beforeCreate",
      "child:create",
      "parent:create",
      "child:mount",
      "child:update",
      "child:selectionUpdate",
      "child:unmount",
      "child:destroy",
    ]);
  });

  it.each([
    "beforeCreate",
    "create",
    "mount",
    "unmount",
    "update",
    "selectionUpdate",
    "beforeTransaction",
    "transaction",
    "focus",
    "blur",
    "destroy",
  ] satisfies (keyof EditorEvents)[])(
    "passes context and payload to %s and removes the handler on destroy",
    (event) => {
      const handler = vi.fn();
      editor = new Editor({ extensions: [{ name: "events", [event]: handler }] });
      handler.mockClear();
      const payload = {
        editor,
        transaction: editor.state.update({}),
        selection: editor.state.selection,
      };

      editor.emit(event, payload);

      expect(handler).toHaveBeenCalledExactlyOnceWith({ editor }, payload);

      editor.destroy();
      handler.mockClear();
      editor.emit(event, payload);

      expect(handler).not.toHaveBeenCalled();
    },
  );
});
