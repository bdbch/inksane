import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import type { WidgetType } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { TaskList } from "@lezer/markdown";
import { insertContent } from "../commands/index.ts";
import { htmlWidget } from "../helpers/htmlWidget.ts";
import { resolveFromTo } from "../helpers/resolveFromTo.ts";
import type { NamedCommand } from "../types/commands.ts";
import type { Extension, MarkupRange, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
  interface Commands<ReturnType> {
    taskList: {
      /**
       * Converts the line or selection into a task list item.
       * @param options - Optional checked state and position or range. Defaults to an unchecked item at the selection.
       * @returns False when every target line is already a task list item with the requested state.
       */
      setTaskList: (options?: { checked?: boolean; pos?: PosOrRange }) => ReturnType;
      /**
       * Removes task list syntax from the line or selection.
       * @param options - Optional position or range. Defaults to the selection.
       * @returns False when no target line is a task list item.
       */
      removeTaskList: (options?: { pos?: PosOrRange }) => ReturnType;
      /**
       * Toggles task list syntax on the line or selection.
       * @param options - Optional position or range. Defaults to the selection.
       */
      toggleTaskList: (options?: { pos?: PosOrRange }) => ReturnType;
    };
  }
}

const TASK_CHECKBOX_CLASS = "inksane-task-checkbox";
const TASK_MARKER_CLASS = "inksane-list-marker inksane-list-marker--task";

const taskItemPattern = /^(\s*)(?:[-*+]|\d+[.)])\s+\[([ xX])\](?:[ \t](.*))?$/;
const listItemPattern = /^(\s*)(?:[-*+]|\d+[.)])(?:[ \t]+(.*))?$/;

const isCheckedMarker = (text: string): boolean => /^\[[xX]\]$/.test(text);

const isTaskChecked = (taskNode: SyntaxNode, state: EditorState): boolean => {
  const marker = taskNode.getChild("TaskMarker");
  return marker ? isCheckedMarker(state.doc.sliceString(marker.from, marker.to)) : false;
};

/** Finds the markup range covering a task item's list mark, task marker, and following space. */
const taskMarkupRanges = (node: SyntaxNode, state: EditorState): MarkupRange[] => {
  const listMark = node.getChild("ListMark");
  const task = node.getChild("Task");
  const taskMarker = task?.getChild("TaskMarker");
  if (!listMark || !task || !taskMarker) return [];

  let to = taskMarker.to;
  while (to < task.to && /[ \t]/.test(state.doc.sliceString(to, to + 1))) to += 1;
  return [{ from: listMark.from, to }];
};

/** Locates the `TaskMarker` on the line containing the given document position. */
const findTaskMarkerAt = (state: EditorState, pos: number): { from: number; to: number } | null => {
  const clamped = Math.min(Math.max(0, pos), state.doc.length);
  const line = state.doc.lineAt(clamped);
  let match: { from: number; to: number } | null = null;

  syntaxTree(state).iterate({
    from: line.from,
    to: line.to,
    enter(node) {
      if (node.name === "TaskMarker" && node.from >= line.from && node.to <= line.to) {
        match = { from: node.from, to: node.to };
        return false;
      }
    },
  });

  return match;
};

/** Builds a clickable checkbox widget that toggles a task item between `[ ]` and `[x]`. */
const createTaskCheckboxWidget = (checked: boolean, fallbackFrom: number): WidgetType => {
  return htmlWidget(
    `<input class="${TASK_CHECKBOX_CLASS}" type="checkbox"${checked ? " checked" : ""} aria-label="Task item checkbox">`,
    {
      className: TASK_MARKER_CLASS,
      onRender: (element, view) => {
        const checkbox = element.querySelector<HTMLInputElement>("input");
        const preventMouseDown = (event: MouseEvent) => {
          event.preventDefault();
        };
        const handleToggle = (event: MouseEvent) => {
          event.preventDefault();
          if (view.state.readOnly) return;

          let pos = fallbackFrom;
          try {
            pos = view.posAtDOM(element);
          } catch {
            // Fall back to the initial marker position if the node is not in the tile tree.
          }

          const marker = findTaskMarkerAt(view.state, pos);
          if (!marker) return;

          const currentChecked = isCheckedMarker(
            view.state.doc.sliceString(marker.from, marker.to),
          );
          view.dispatch({
            changes: {
              from: marker.from,
              to: marker.to,
              insert: currentChecked ? "[ ]" : "[x]",
            },
          });
        };

        checkbox?.addEventListener("mousedown", preventMouseDown);
        checkbox?.addEventListener("click", handleToggle);
        element.addEventListener("mousedown", preventMouseDown);
        element.addEventListener("click", (event) => {
          if (event.target === element) handleToggle(event);
        });
      },
    },
  );
};

const isListTag = (tag: string): boolean => tag === "ul" || tag === "ol";

const isTaskCheckboxElement = (element: Element): boolean =>
  element.tagName.toLowerCase() === "input" &&
  element.getAttribute("type")?.trim().toLowerCase() === "checkbox" &&
  element.closest("li") !== null;

/** Prefixes the first line with a list marker and indents continuation lines. */
const indentListItem = (content: string, marker: string): string => {
  const [first = "", ...rest] = content.split("\n");
  const pad = " ".repeat(marker.length);
  return [marker + first, ...rest.map((line) => (line.length ? pad + line : ""))].join("\n");
};

const toTaskItemLine = (text: string, checked = false): string => {
  const box = checked ? "[x]" : "[ ]";
  const taskMatch = taskItemPattern.exec(text);
  if (taskMatch) {
    return `${taskMatch[1]}- ${box} ${taskMatch[3] ?? ""}`;
  }

  const listMatch = listItemPattern.exec(text);
  if (listMatch) {
    return `${listMatch[1]}- ${box} ${listMatch[2] ?? ""}`;
  }

  const [, indent = "", body = ""] = /^(\s*)(.*)$/.exec(text) ?? [];
  return `${indent}- ${box} ${body}`;
};

const fromTaskItemLine = (text: string): string | null => {
  const match = taskItemPattern.exec(text);
  if (!match) return null;
  return `${match[1]}${match[3] ?? ""}`;
};

const getTargetLines = (state: EditorState, from: number, to: number) => {
  const startLine = state.doc.lineAt(from);
  const endLine = state.doc.lineAt(to);
  const lines: string[] = [];

  for (let number = startLine.number; number <= endLine.number; number++) {
    lines.push(state.doc.line(number).text);
  }

  return { startLine, endLine, lines };
};

/** Adds GFM task list parsing, interactive checkboxes, HTML pasting, and task list commands. */
export const TaskListExtension: Extension = {
  name: "taskList",

  addMarkdownSyntax() {
    return [TaskList];
  },

  addMarkdownDecorations() {
    return [
      {
        nodeName: "ListItem",
        hideSyntax: true,
        markup: taskMarkupRanges,
        widgets: [
          {
            kind: "replace",
            type: (node, state) => {
              const task = node.getChild("Task");
              const taskMarker = task?.getChild("TaskMarker");
              if (!task || !taskMarker) return null;
              return createTaskCheckboxWidget(isTaskChecked(task, state), taskMarker.from);
            },
          },
        ],
      },
    ];
  },

  addStateQueries() {
    return [
      {
        name: "taskList",
        kind: "node",
        nodeNames: ["Task"],
        attrs: (node, state) => ({ checked: isTaskChecked(node, state) }),
      },
    ];
  },

  addHtmlConverters() {
    return [
      {
        match: isTaskCheckboxElement,
        toMarkdown: (element) => (element.hasAttribute("checked") ? "[x] " : "[ ] "),
      },
      {
        block: true,
        match: (element) =>
          isListTag(element.tagName.toLowerCase()) &&
          element.querySelector('li input[type="checkbox"]') !== null,
        toMarkdown: (element, { renderChildren }) => {
          const ordered = element.tagName.toLowerCase() === "ol";
          const start = Number.parseInt(element.getAttribute("start") ?? "1", 10);
          let index = Number.isNaN(start) ? 1 : start;
          const items: string[] = [];

          for (const child of Array.from(element.children)) {
            if (child.tagName.toLowerCase() !== "li") continue;
            const marker = ordered ? `${index++}. ` : "- ";
            items.push(indentListItem(renderChildren(child).trim(), marker));
          }

          return items.join("\n");
        },
      },
    ];
  },

  addCommands() {
    const setTaskList: NamedCommand<"setTaskList"> = (ctx) => (options) => {
      const { from, to } = resolveFromTo(ctx.state, options?.pos);
      if (from < 0 || from > to || to > ctx.state.doc.length) return false;

      const { startLine, endLine, lines } = getTargetLines(ctx.state, from, to);
      const isLineAlreadyMatching = (line: string): boolean => {
        const match = taskItemPattern.exec(line);
        if (!match) return false;
        if (options?.checked === undefined) return true;
        return (match[2].toLowerCase() === "x") === options.checked;
      };

      if (lines.every(isLineAlreadyMatching)) return false;

      const content = lines
        .map((line) =>
          isLineAlreadyMatching(line) ? line : toTaskItemLine(line, options?.checked ?? false),
        )
        .join("\n");

      return insertContent(ctx)({ content, from: startLine.from, to: endLine.to });
    };

    const removeTaskList: NamedCommand<"removeTaskList"> = (ctx) => (options) => {
      const { from, to } = resolveFromTo(ctx.state, options?.pos);
      if (from < 0 || from > to || to > ctx.state.doc.length) return false;

      const { startLine, endLine, lines } = getTargetLines(ctx.state, from, to);
      if (!lines.some((line) => taskItemPattern.test(line))) return false;

      const content = lines.map((line) => fromTaskItemLine(line) ?? line).join("\n");
      return insertContent(ctx)({ content, from: startLine.from, to: endLine.to });
    };

    return {
      setTaskList,
      removeTaskList,
      toggleTaskList: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        if (from < 0 || from > to || to > ctx.state.doc.length) return false;

        const { lines } = getTargetLines(ctx.state, from, to);
        if (lines.every((line) => taskItemPattern.test(line))) {
          return removeTaskList(ctx)(options);
        }
        return setTaskList(ctx)(options);
      },
    };
  },
};
