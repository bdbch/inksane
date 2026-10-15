import { syntaxTree } from "@codemirror/language";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Editor } from "../Editor.ts";
import { BaseKit } from "./baseKit.ts";
import { ListExtension } from "./list.ts";
import { TaskListExtension } from "./taskList.ts";

describe("taskList", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      element: document.createElement("div"),
      content: "buy milk",
      extensions: [TaskListExtension],
    });
  });

  afterEach(() => editor.destroy());

  it("parses task list items and renders a checkbox instead of raw brackets", () => {
    editor.setMarkdown("- [ ] buy milk\n- [x] walk dog");
    const listItem = syntaxTree(editor.state).topNode.firstChild?.firstChild;
    expect(listItem?.name).toBe("ListItem");
    expect(listItem?.getChild("Task")?.firstChild?.name).toBe("TaskMarker");

    const checkboxes =
      editor.view.contentDOM.querySelectorAll<HTMLInputElement>(".inksane-task-checkbox");
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]?.checked).toBe(false);
    expect(checkboxes[1]?.checked).toBe(true);
    expect(editor.view.contentDOM.textContent).toBe("buy milkwalk dog");
    expect(editor.getMarkdown()).toBe("- [ ] buy milk\n- [x] walk dog");
  });

  it("renders uppercase [X] as checked and toggles it to [ ]", () => {
    editor.setMarkdown("- [X] done");
    const checkbox =
      editor.view.contentDOM.querySelector<HTMLInputElement>(".inksane-task-checkbox");
    expect(checkbox?.checked).toBe(true);

    checkbox?.click();
    expect(editor.content).toBe("- [ ] done");
  });

  it("toggles the document state when clicking the checkbox", () => {
    editor.setMarkdown("- [ ] buy milk\n- [x] walk dog");
    const first =
      editor.view.contentDOM.querySelectorAll<HTMLInputElement>(".inksane-task-checkbox")[0];
    expect(first?.checked).toBe(false);

    first?.click();
    expect(editor.content).toBe("- [x] buy milk\n- [x] walk dog");

    const updatedFirst =
      editor.view.contentDOM.querySelectorAll<HTMLInputElement>(".inksane-task-checkbox")[0];
    expect(updatedFirst?.checked).toBe(true);

    updatedFirst?.click();
    expect(editor.content).toBe("- [ ] buy milk\n- [x] walk dog");
  });

  it("toggles the right item after earlier lines change", () => {
    editor.setMarkdown("intro\n\n- [ ] task");
    editor.commands.insertContent({ content: "longer ", from: 0 });

    const checkbox =
      editor.view.contentDOM.querySelector<HTMLInputElement>(".inksane-task-checkbox");
    checkbox?.click();
    expect(editor.content).toBe("longer intro\n\n- [x] task");
  });

  it("does not toggle checkboxes when the editor is read-only", () => {
    editor.setMarkdown("- [ ] locked");
    editor.setEditable(false);

    const checkbox =
      editor.view.contentDOM.querySelector<HTMLInputElement>(".inksane-task-checkbox");
    checkbox?.click();
    expect(editor.content).toBe("- [ ] locked");
  });

  it("reveals raw task syntax while editing the task item", () => {
    editor.setMarkdown("- [ ] buy milk");
    editor.view.dispatch({ selection: { anchor: 6 } });
    editor.view.contentDOM.dispatchEvent(new FocusEvent("focus"));

    expect(editor.view.contentDOM.textContent).toBe("- [ ] buy milk");
    expect(editor.view.contentDOM.querySelector(".inksane-task-checkbox")).toBeNull();
  });

  it("does not render a duplicate bullet marker alongside ListExtension", () => {
    editor.destroy();
    editor = new Editor({
      element: document.createElement("div"),
      content: "- [ ] task\n- bullet",
      extensions: [ListExtension, TaskListExtension],
    });

    expect(editor.view.contentDOM.querySelectorAll(".inksane-task-checkbox")).toHaveLength(1);
    expect(editor.view.contentDOM.querySelectorAll(".inksane-list-marker--bullet")).toHaveLength(1);
    expect(editor.view.contentDOM.textContent).toBe("task•bullet");
  });

  it("toggles a plain line into a task item and back", () => {
    expect(editor.commands.toggleTaskList()).toBe(true);
    expect(editor.content).toBe("- [ ] buy milk");
    expect(editor.isActive("taskList")).toBe(true);
    expect(editor.isActive("taskList", { checked: false })).toBe(true);
    expect(editor.isActive("taskList", { checked: true })).toBe(false);

    expect(editor.commands.toggleTaskList()).toBe(true);
    expect(editor.content).toBe("buy milk");
    expect(editor.isActive("taskList")).toBe(false);
  });

  it("sets and updates task items with insertTaskList and removeTaskList", () => {
    expect(editor.commands.insertTaskList()).toBe(true);
    expect(editor.content).toBe("- [ ] buy milk");
    expect(editor.commands.insertTaskList()).toBe(false);

    expect(editor.commands.insertTaskList({ checked: true })).toBe(true);
    expect(editor.content).toBe("- [x] buy milk");
    expect(editor.isActive("taskList", { checked: true })).toBe(true);
    expect(editor.commands.insertTaskList({ checked: true })).toBe(false);

    expect(editor.commands.removeTaskList()).toBe(true);
    expect(editor.content).toBe("buy milk");
    expect(editor.commands.removeTaskList()).toBe(false);
  });

  it("converts bullet and ordered list items without stacking markers", () => {
    editor.destroy();
    editor = new Editor({
      element: document.createElement("div"),
      content: "- item",
      extensions: [ListExtension, TaskListExtension],
    });

    expect(editor.commands.toggleTaskList()).toBe(true);
    expect(editor.content).toBe("- [ ] item");

    expect(editor.commands.toggleOrderedList()).toBe(true);
    expect(editor.content).toBe("1. item");

    expect(editor.commands.insertTaskList()).toBe(true);
    expect(editor.content).toBe("- [ ] item");

    expect(editor.commands.toggleBulletList()).toBe(true);
    expect(editor.content).toBe("- item");
  });

  it("applies commands across a multi-line selection", () => {
    editor.setMarkdown("first\nsecond");
    editor.view.dispatch({ selection: { anchor: 0, head: editor.content.length } });

    expect(editor.commands.toggleTaskList()).toBe(true);
    expect(editor.content).toBe("- [ ] first\n- [ ] second");

    expect(editor.commands.toggleTaskList({ pos: { from: 0, to: editor.content.length } })).toBe(
      true,
    );
    expect(editor.content).toBe("first\nsecond");
  });

  it("uses projected state in chains", () => {
    expect(
      editor.chain().setContent("ship it").insertTaskList({ checked: true }).toggleTaskList().run(),
    ).toBe(true);
    expect(editor.content).toBe("ship it");
  });

  it("converts pasted HTML task lists even without ListExtension", () => {
    editor.view.dispatch({ selection: { anchor: 0, head: editor.content.length } });
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        getData: (type: string) =>
          type === "text/html"
            ? '<ul><li><input type="checkbox" checked> Done</li><li><input type="checkbox"> Todo</li></ul>'
            : "",
      },
    });
    editor.view.contentDOM.dispatchEvent(event);

    expect(editor.content).toBe("- [x] Done\n- [ ] Todo");
  });

  it("is included in BaseKit and can be disabled", () => {
    editor.destroy();
    editor = new Editor({
      element: document.createElement("div"),
      content: "- [x] done",
      extensions: [BaseKit()],
    });
    expect(editor.commands).toHaveProperty("toggleTaskList");
    expect(editor.commands).toHaveProperty("insertTaskList");
    expect(editor.view.contentDOM.querySelector(".inksane-task-checkbox")).not.toBeNull();
    expect(editor.view.contentDOM.querySelector(".inksane-mark-link-open")).toBeNull();

    editor.destroy();
    editor = new Editor({
      element: document.createElement("div"),
      content: "- [ ] done",
      extensions: [BaseKit({ taskList: false })],
    });
    expect(editor.commands).not.toHaveProperty("toggleTaskList");
    expect(editor.isActive("taskList")).toBe(false);
    expect(editor.view.contentDOM.querySelector(".inksane-task-checkbox")).toBeNull();
    expect(editor.view.contentDOM.textContent).toBe("•[ ] done");
  });
});
