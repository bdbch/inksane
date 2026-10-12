import { afterEach, describe, expect, it } from "vite-plus/test";
import { Editor, type Extension } from "@inksane/core";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { CollaborationExtension } from "./CollaborationExtension.ts";

const editors: Editor[] = [];

function mount(content: string, extensions: Extension[]) {
  const editor = new Editor({ element: document.createElement("div"), content, extensions });
  editors.push(editor);
  return editor;
}

/** Mirrors the update exchange a network provider performs between two clients. */
function linkDocuments(a: Y.Doc, b: Y.Doc) {
  a.on("update", (update, origin) => {
    if (origin !== a) Y.applyUpdate(b, update, a);
  });
  b.on("update", (update, origin) => {
    if (origin !== b) Y.applyUpdate(a, update, b);
  });
}

/** Mirrors the awareness exchange a network provider performs between two clients. */
function linkAwareness(a: Awareness, b: Awareness) {
  const relay = (from: Awareness, to: Awareness) => (_changed: unknown, origin: unknown) => {
    if (origin === "remote") return;
    const clients = [...from.getStates().keys()];
    applyAwarenessUpdate(to, encodeAwarenessUpdate(from, clients), "remote");
  };
  a.on("update", relay(a, b));
  b.on("update", relay(b, a));
}

afterEach(() => {
  for (const editor of editors) {
    editor.view.dom.parentElement?.remove();
    editor.destroy();
  }
  editors.length = 0;
});

describe("CollaborationExtension", () => {
  it("seeds an empty shared text from the editor content", () => {
    const ydoc = new Y.Doc();

    mount("# Hello", [CollaborationExtension({ ydoc })]);

    expect(ydoc.getText("content").toJSON()).toBe("# Hello");
  });

  it("keeps an existing shared text instead of seeding over it", () => {
    const ydoc = new Y.Doc();
    ydoc.getText("content").insert(0, "shared");

    mount("", [CollaborationExtension({ ydoc })]);

    expect(ydoc.getText("content").toJSON()).toBe("shared");
  });

  it("syncs edits from one editor to another", () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    linkDocuments(docA, docB);
    docA.getText("content").insert(0, "hello");

    const editorA = mount("hello", [CollaborationExtension({ ydoc: docA })]);
    const editorB = mount("hello", [CollaborationExtension({ ydoc: docB })]);

    editorA.view.dispatch({ changes: { from: 0, to: 0, insert: "X" } });

    expect(editorB.content).toBe("Xhello");
    expect(docB.getText("content").toJSON()).toBe("Xhello");
  });

  it("announces the configured user on awareness", () => {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);

    mount("", [
      CollaborationExtension({
        ydoc,
        awareness,
        user: { name: "Alice", color: "#ff0000" },
      }),
    ]);

    expect(awareness.getLocalState()?.user).toMatchObject({
      name: "Alice",
      color: "#ff0000",
      colorLight: "#ff000033",
    });
  });

  it("relays awareness so each client can see the other user", () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const awarenessA = new Awareness(docA);
    const awarenessB = new Awareness(docB);
    linkAwareness(awarenessA, awarenessB);

    mount("", [
      CollaborationExtension({ ydoc: docA, awareness: awarenessA, user: { name: "Alice" } }),
    ]);
    mount("", [
      CollaborationExtension({ ydoc: docB, awareness: awarenessB, user: { name: "Bob" } }),
    ]);

    expect(awarenessB.getStates().get(awarenessA.clientID)?.user?.name).toBe("Alice");
  });
});
