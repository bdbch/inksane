import { StateEffect } from "@codemirror/state";
import type { Transaction, TransactionSpec } from "@codemirror/state";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "./Editor.ts";

describe("transaction events", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({ element: document.createElement("div"), content: "hello" });
  });

  afterEach(() => editor.destroy());

  const effect = StateEffect.define<string>();
  const cases: [string, TransactionSpec][] = [
    ["document", { changes: { from: 0, insert: "new " } }],
    ["selection", { selection: { anchor: 2 } }],
    ["effect", { effects: effect.of("value") }],
    ["empty", {}],
  ];

  it.each(cases)("emits before and after a %s transaction with the same payload", (_, spec) => {
    const transaction = editor.state.update(spec);
    const events: string[] = [];
    editor.on("beforeTransaction", (payload) => {
      expect(payload.editor).toBe(editor);
      expect(payload.transaction).toBe(transaction);
      expect(editor.state).toBe(transaction.startState);
      events.push("beforeTransaction");
    });
    editor.on("transaction", (payload) => {
      expect(payload.editor).toBe(editor);
      expect(payload.transaction).toBe(transaction);
      expect(editor.state).toBe(transaction.state);
      events.push("transaction");
    });

    editor.view.dispatch(transaction);

    expect(events).toEqual(["beforeTransaction", "transaction"]);
  });

  it("emits both events for every transaction in a batch without splitting the update", () => {
    const first = editor.state.update({ changes: { from: 0, insert: "a" } });
    const second = first.state.update({ changes: { from: 0, insert: "b" } });
    const before: Transaction[] = [];
    const after: Transaction[] = [];
    let updates = 0;
    editor.on("beforeTransaction", ({ transaction }) => {
      expect(editor.state).toBe(first.startState);
      before.push(transaction);
    });
    editor.on("transaction", ({ transaction }) => {
      expect(editor.state).toBe(second.state);
      after.push(transaction);
    });
    editor.on("update", () => updates++);

    editor.view.dispatch([first, second]);

    expect(before).toEqual([first, second]);
    expect(after).toEqual([first, second]);
    expect(updates).toBe(1);
    expect(editor.content).toBe("bahello");
  });

  it("emits transaction events for commands", () => {
    const events: string[] = [];
    editor.on("beforeTransaction", () => events.push("beforeTransaction"));
    editor.on("transaction", () => events.push("transaction"));

    expect(editor.commands.clearContent()).toBe(true);

    expect(events).toEqual(["beforeTransaction", "transaction"]);
    expect(editor.content).toBe("");
  });
});
