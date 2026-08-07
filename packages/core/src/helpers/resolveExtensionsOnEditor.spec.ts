import { describe, expect, it, vi } from "vite-plus/test";
import { resolveExtensionsOnEditor } from "./resolveExtensionsOnEditor.ts";
import type { Editor } from "~/Editor.ts";
import type { InkwellExtension } from "~/types/extensions.ts";

describe("resolveExtensionsOnEditor", () => {
  const editor = {} as Editor;

  it("returns an empty list when no extensions are configured", () => {
    expect(resolveExtensionsOnEditor(editor, [])).toEqual([]);
  });

  it("keeps root extensions in their configured order", () => {
    const first: InkwellExtension = { name: "first" };
    const second: InkwellExtension = { name: "second" };

    expect(resolveExtensionsOnEditor(editor, [first, second])).toEqual([first, second]);
  });

  it("resolves child extensions into a flat list", () => {
    const grandchild: InkwellExtension = { name: "grandchild" };
    const child: InkwellExtension = {
      name: "child",
      addExtensions: () => [grandchild],
    };
    const parent: InkwellExtension = {
      name: "parent",
      addExtensions: () => [child],
    };

    expect(resolveExtensionsOnEditor(editor, [parent])).toEqual([parent, child, grandchild]);
  });

  it("passes the editor to child extension hooks", () => {
    const addExtensions = vi.fn(() => []);
    const extension: InkwellExtension = { name: "test", addExtensions };

    resolveExtensionsOnEditor(editor, [extension]);

    expect(addExtensions).toHaveBeenCalledOnce();
    expect(addExtensions).toHaveBeenCalledWith({ editor });
  });

  it("resolves the same extension object only once", () => {
    const shared: InkwellExtension = { name: "shared" };
    const first: InkwellExtension = {
      name: "first",
      addExtensions: () => [shared],
    };
    const second: InkwellExtension = {
      name: "second",
      addExtensions: () => [shared],
    };

    expect(resolveExtensionsOnEditor(editor, [first, second])).toEqual([first, shared, second]);
  });

  it("throws when two different extensions have the same name", () => {
    const first: InkwellExtension = { name: "duplicate" };
    const second: InkwellExtension = { name: "duplicate" };

    expect(() => resolveExtensionsOnEditor(editor, [first, second])).toThrow(
      "Duplicate extension name detected: duplicate",
    );
  });

  it("throws when child extensions create a cycle", () => {
    const first: InkwellExtension = {
      name: "first",
      addExtensions: () => [second],
    };
    const second: InkwellExtension = {
      name: "second",
      addExtensions: () => [first],
    };

    expect(() => resolveExtensionsOnEditor(editor, [first])).toThrow(
      "Cycle detected in extension graph involving extension: first",
    );
  });

  it("resolves complicated extension graphs correctly", () => {
    const grandchild1: InkwellExtension = { name: "grandchild1" };
    const grandchild2: InkwellExtension = { name: "grandchild2" };
    const child1: InkwellExtension = {
      name: "child1",
      addExtensions: () => [grandchild1],
    };
    const child2: InkwellExtension = {
      name: "child2",
      addExtensions: () => [grandchild2],
    };
    const parent1: InkwellExtension = {
      name: "parent1",
      addExtensions: () => [child1, child2, grandchild2], // grandchild2 is intentionally added here to test deduplication
    };
    const parent2: InkwellExtension = {
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
