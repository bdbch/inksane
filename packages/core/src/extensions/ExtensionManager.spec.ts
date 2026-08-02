import { EditorState, StateField } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { describe, expect, it } from "vite-plus/test";
import type { Editor } from "../editor/Editor.ts";
import { ExtensionManager } from "./ExtensionManager.ts";
import type { InkwellExtension } from "./types.ts";

describe("ExtensionManager", () => {
  const editor = {} as Editor;

  it("exposes resolved extensions", () => {
    const child: InkwellExtension = { name: "child" };
    const parent: InkwellExtension = {
      name: "parent",
      addExtensions: () => [child],
    };

    const manager = new ExtensionManager(editor, [parent]);

    expect(manager.resolvedExtensions).toEqual([parent, child]);
  });

  it("creates working CodeMirror extensions in priority order", () => {
    const calls: string[] = [];
    const highPriorityField = StateField.define<number>({
      create: () => 10,
      update: (value) => value,
    });
    const lowPriorityField = StateField.define<number>({
      create: () => 0,
      update: (value) => value,
    });
    const lowPriorityExtension: InkwellExtension = {
      name: "low-priority",
      addCodeMirrorExtensions: () => {
        calls.push("low-priority");
        return [lowPriorityField];
      },
    };
    const highPriorityExtension: InkwellExtension = {
      name: "high-priority",
      priority: 10,
      addCodeMirrorExtensions: () => {
        calls.push("high-priority");
        return [highPriorityField];
      },
    };

    const manager = new ExtensionManager(editor, [lowPriorityExtension, highPriorityExtension]);
    const state = EditorState.create({ extensions: manager.cmExtensions });

    expect(calls).toEqual(["high-priority", "low-priority"]);
    expect(state.field(highPriorityField)).toBe(10);
    expect(state.field(lowPriorityField)).toBe(0);
  });

  it("creates a valid CodeMirror keymap from extensions", () => {
    const binding = {
      key: "Mod-Shift-k",
      run: () => true,
    };
    const extension: InkwellExtension = {
      name: "keybindings",
      addKeybinds: () => [binding],
    };

    const manager = new ExtensionManager(editor, [extension]);
    const state = EditorState.create({ extensions: manager.cmExtensions });

    expect(state.facet(keymap)).toContainEqual([binding]);
  });
});
