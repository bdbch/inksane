import { describe, expect, it, vi } from "vite-plus/test";
import { resolveExtensionsOnEditor } from "./resolveExtensionsOnEditor.ts";
import type { Editor } from "../Editor.ts";
import type { Extension } from "../types/extensions.ts";

describe("resolveExtensionsOnEditor", () => {
  const editor = {} as Editor;

  it("returns an empty list when no extensions are configured", () => {
    expect(resolveExtensionsOnEditor(editor, [])).toEqual([]);
  });

  it("keeps root extensions in their configured order", () => {
    const first: Extension = { name: "first" };
    const second: Extension = { name: "second" };

    expect(resolveExtensionsOnEditor(editor, [first, second])).toEqual([first, second]);
  });

  it("resolves child extensions into a flat list", () => {
    const grandchild: Extension = { name: "grandchild" };
    const child: Extension = {
      name: "child",
      addExtensions: () => [grandchild],
    };
    const parent: Extension = {
      name: "parent",
      addExtensions: () => [child],
    };

    expect(resolveExtensionsOnEditor(editor, [parent])).toEqual([parent, child, grandchild]);
  });

  it("passes the editor to child extension hooks", () => {
    const addExtensions = vi.fn(() => []);
    const extension: Extension = { name: "test", addExtensions };

    resolveExtensionsOnEditor(editor, [extension]);

    expect(addExtensions).toHaveBeenCalledOnce();
    expect(addExtensions).toHaveBeenCalledWith({ editor });
  });

  it("resolves the same extension object only once", () => {
    const shared: Extension = { name: "shared" };
    const first: Extension = {
      name: "first",
      addExtensions: () => [shared],
    };
    const second: Extension = {
      name: "second",
      addExtensions: () => [shared],
    };

    expect(resolveExtensionsOnEditor(editor, [first, second])).toEqual([first, shared, second]);
  });

  it("throws when two different extensions have the same name", () => {
    const first: Extension = { name: "duplicate" };
    const second: Extension = { name: "duplicate" };

    expect(() => resolveExtensionsOnEditor(editor, [first, second])).toThrow(
      "Duplicate extension name detected: duplicate",
    );
  });

  it("throws when child extensions create a cycle", () => {
    const first: Extension = {
      name: "first",
      addExtensions: () => [second],
    };
    const second: Extension = {
      name: "second",
      addExtensions: () => [first],
    };

    expect(() => resolveExtensionsOnEditor(editor, [first])).toThrow(
      "Cycle detected in extension graph involving extension: first",
    );
  });

  it("resolves complicated extension graphs correctly", () => {
    const grandchild1: Extension = { name: "grandchild1" };
    const grandchild2: Extension = { name: "grandchild2" };
    const child1: Extension = {
      name: "child1",
      addExtensions: () => [grandchild1],
    };
    const child2: Extension = {
      name: "child2",
      addExtensions: () => [grandchild2],
    };
    const parent1: Extension = {
      name: "parent1",
      addExtensions: () => [child1, child2, grandchild2], // grandchild2 is intentionally added here to test deduplication
    };
    const parent2: Extension = {
      name: "parent2",
      addExtensions: () => [child1],
    };

    expect(resolveExtensionsOnEditor(editor, [parent1, parent2])).toEqual([
      parent1,
      child1,
      grandchild1,
      child2,
      grandchild2,
      parent2,
    ]);
  });
});
