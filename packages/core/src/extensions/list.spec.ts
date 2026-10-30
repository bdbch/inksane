import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";
import { BaseKit } from "./baseKit.ts";
import { ListExtension } from "./list.ts";
import { TaskListExtension } from "./taskList.ts";

const select = (editor: Editor, from: number, to: number) => {
  editor.view.dispatch({ selection: { anchor: from, head: to } });
};

describe("list commands", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "first\nsecond",
      extensions: [ListExtension],
    });
  });

  afterEach(() => editor.destroy());

  it("toggles a bullet list across a multi-line selection", () => {
    select(editor, 0, editor.content.length);

    expect(editor.commands.toggleBulletList()).toBe(true);
    expect(editor.content).toBe("- first\n- second");

    expect(editor.commands.toggleBulletList()).toBe(true);
    expect(editor.content).toBe("first\nsecond");
  });

  it("toggles an ordered list across a multi-line selection", () => {
    select(editor, 0, editor.content.length);

    expect(editor.commands.toggleOrderedList()).toBe(true);
    expect(editor.content).toBe("1. first\n2. second");

    expect(editor.commands.toggleOrderedList()).toBe(true);
    expect(editor.content).toBe("first\nsecond");
  });

  it("keeps nested indentation when removing list markers", () => {
    editor.setMarkdown("- parent\n  - child");
    select(editor, 12, 12);

    expect(editor.commands.toggleBulletList()).toBe(true);
    expect(editor.content).toBe("- parent\n  child");
  });

  it("strips task markers when converting to a plain list", () => {
    editor.setMarkdown("- [ ] first\n- [x] second");
    select(editor, 0, editor.content.length);

    expect(editor.commands.toggleOrderedList()).toBe(true);
    expect(editor.content).toBe("1. first\n2. second");
  });

  it("keeps code blocks and nesting when converting a wide list item", () => {
    editor.setMarkdown("-     code\n\n  - child");
    select(editor, 0, 0);

    expect(editor.commands.toggleOrderedList()).toBe(true);
    expect(editor.content).toBe("1.     code\n\n   - child");
  });

  it("converts between list types and preserves item text", () => {
    editor.setMarkdown("- one\n  - nested\n- two");
    select(editor, 0, editor.content.length);

    expect(editor.commands.toggleListType()).toBe(true);
    expect(editor.content).toBe("1. one\n   2. nested\n3. two");

    expect(editor.commands.toggleListType()).toBe(true);
    expect(editor.content).toBe("- one\n  - nested\n- two");
  });

  it("keeps task syntax when converting list types", () => {
    editor.setMarkdown("- [ ] open\n- [x] done");
    select(editor, 0, editor.content.length);

    expect(editor.commands.toggleListType()).toBe(true);
    expect(editor.content).toBe("1. [ ] open\n2. [x] done");

    expect(editor.commands.toggleListType()).toBe(true);
    expect(editor.content).toBe("- [ ] open\n- [x] done");
  });

  it("returns false when a list type command has no list items", () => {
    expect(editor.commands.toggleListType()).toBe(false);
  });

  it("leaves list-like lines inside code blocks alone", () => {
    editor.setMarkdown("```\n- one\n```\n\n- two");
    select(editor, 0, editor.content.length);

    expect(editor.commands.toggleListType()).toBe(true);
    expect(editor.content).toBe("```\n- one\n```\n\n1. two");
  });

  it("keeps nested tabs when converting list types", () => {
    editor.setMarkdown("1. one\n\t- child");
    select(editor, 0, 0);

    expect(editor.commands.toggleListType()).toBe(true);
    expect(editor.content).toBe("- one\n   - child");
  });

  it("converts lists inside blockquotes", () => {
    editor.setMarkdown("> - one\n> - two");
    select(editor, 0, editor.content.length);

    expect(editor.commands.toggleListType()).toBe(true);
    expect(editor.content).toBe("> 1. one\n> 2. two");

    expect(editor.commands.toggleListType()).toBe(true);
    expect(editor.content).toBe("> - one\n> - two");
  });

  it("keeps a contained blockquote inside its parent item", () => {
    editor.setMarkdown("- parent\n  > - child");
    select(editor, 0, 0);

    expect(editor.commands.toggleListType()).toBe(true);
    expect(editor.content).toBe("1. parent\n   > - child");

    expect(editor.commands.toggleListType()).toBe(true);
    expect(editor.content).toBe("- parent\n  > - child");
  });

  it("keeps nesting when a tab absorbs the marker width change", () => {
    editor.setMarkdown("1.\tparent\n    - child");
    select(editor, 0, 0);

    expect(editor.commands.toggleListType()).toBe(true);
    expect(editor.content).toBe("-\tparent\n    - child");
  });

  it("merges indentation shifts across nested quote levels", () => {
    editor.setMarkdown("- parent\n  > - child\n  >   - grand");
    select(editor, 0, editor.content.length);

    expect(editor.commands.toggleListType()).toBe(true);
    expect(editor.content).toBe("1. parent\n   > 2. child\n   >    3. grand");

    expect(editor.commands.toggleListType()).toBe(true);
    expect(editor.content).toBe("- parent\n  > - child\n  >   - grand");
  });

  it("counts a tab after a quote prefix from the prefix column", () => {
    editor.setMarkdown("> - parent\n> \t  - child");
    select(editor, 0, 0);

    expect(editor.commands.toggleListType()).toBe(true);
    expect(editor.content).toBe("> 1. parent\n>      - child");
  });

  it("keeps a partial selection while toggling twice", () => {
    select(editor, 2, 9);

    expect(editor.commands.toggleBulletList()).toBe(true);
    expect(editor.content).toBe("- first\n- second");

    expect(editor.commands.toggleBulletList()).toBe(true);
    expect(editor.content).toBe("first\nsecond");
    expect(editor.state.selection.main.from).toBe(2);
    expect(editor.state.selection.main.to).toBe(9);
  });
});

describe("list indentation commands", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "- one\n- two",
      extensions: [ListExtension],
    });
  });

  afterEach(() => editor.destroy());

  it("sinks a list item under its previous sibling", () => {
    select(editor, 6, 6);

    expect(editor.commands.sinkListItem()).toBe(true);
    expect(editor.content).toBe("- one\n  - two");
  });

  it("lifts a nested list item back to the parent level", () => {
    editor.setMarkdown("- one\n  - two");
    select(editor, 8, 8);

    expect(editor.commands.liftListItem()).toBe(true);
    expect(editor.content).toBe("- one\n- two");
  });

  it("sinks every selected sibling", () => {
    editor.setMarkdown("- one\n- two\n- three");
    select(editor, 6, editor.content.length);

    expect(editor.commands.sinkListItem()).toBe(true);
    expect(editor.content).toBe("- one\n  - two\n  - three");
  });

  it("uses the ordered marker width for nesting", () => {
    editor.setMarkdown("1. one\n2. two");
    select(editor, 7, 7);

    expect(editor.commands.sinkListItem()).toBe(true);
    expect(editor.content).toBe("1. one\n   2. two");
  });

  it("lifts the whole item block, including nested items", () => {
    editor.setMarkdown("- one\n  - two\n    - three");
    select(editor, 12, 12);

    expect(editor.commands.liftListItem()).toBe(true);
    expect(editor.content).toBe("- one\n- two\n  - three");
  });

  it("counts tabs by column width when lifting", () => {
    editor.setMarkdown("- one\n  - two\n\t- three");
    select(editor, 8, 8);

    expect(editor.commands.liftListItem()).toBe(true);
    expect(editor.content).toBe("- one\n- two\n  - three");
  });

  it("sinks list items inside a blockquote", () => {
    editor.setMarkdown("> - one\n> - two");
    select(editor, 12, 12);

    expect(editor.commands.sinkListItem()).toBe(true);
    expect(editor.content).toBe("> - one\n>   - two");
  });

  it("lifts list items inside a blockquote", () => {
    editor.setMarkdown("> - one\n>   - two");
    select(editor, 14, 14);

    expect(editor.commands.liftListItem()).toBe(true);
    expect(editor.content).toBe("> - one\n> - two");
  });

  it("keeps blockquotes inside a list item attached to the item", () => {
    editor.setMarkdown("- one\n- two\n  > quote");
    select(editor, 8, 8);

    expect(editor.commands.sinkListItem()).toBe(true);
    expect(editor.content).toBe("- one\n  - two\n    > quote");
  });

  it("caps wide spacing after a marker when sinking", () => {
    editor.setMarkdown("-     one\n- two");
    select(editor, 12, 12);

    expect(editor.commands.sinkListItem()).toBe(true);
    expect(editor.content).toBe("-     one\n  - two");
  });

  it("sinks task list items", () => {
    editor.destroy();
    editor = new Editor({
      element: document.createElement("div"),
      content: "- [ ] one\n- [ ] two",
      extensions: [ListExtension, TaskListExtension],
    });
    select(editor, 10, 10);

    expect(editor.commands.sinkListItem()).toBe(true);
    expect(editor.content).toBe("- [ ] one\n  - [ ] two");
  });

  it("returns false when the item cannot move deeper", () => {
    select(editor, 0, 0);
    expect(editor.commands.sinkListItem()).toBe(false);
  });

  it("returns false when the item cannot move shallower", () => {
    expect(editor.commands.liftListItem()).toBe(false);
  });

  it("is available through BaseKit", () => {
    editor.destroy();
    editor = new Editor({
      element: document.createElement("div"),
      content: "- one\n- two",
      extensions: [BaseKit()],
    });
    select(editor, 6, 6);

    expect(editor.commands.sinkListItem()).toBe(true);
    expect(editor.content).toBe("- one\n  - two");
  });
});
