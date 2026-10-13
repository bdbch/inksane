import { syntaxTree } from "@codemirror/language";
import {
  type EditorState,
  type Extension,
  type Range,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type WidgetType,
} from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import type {
  AttachmentWidget,
  MarkdownDecorationConfig,
  MarkdownNodeWidget,
  MarkupRange,
  ReplacementWidget,
} from "./types/extensions.ts";
import { editorFocusField } from "./editorFocus.ts";

/**
 * Resolves which parts of a syntax node count as markdown markup.
 * Defaults to the node's direct `*Mark` children.
 */
function resolveMarkupRanges(
  config: MarkdownDecorationConfig,
  node: SyntaxNode,
  state: EditorState,
): MarkupRange[] {
  if (typeof config.markup === "function") {
    return config.markup(node, state);
  }

  const names = config.markup;
  const ranges: MarkupRange[] = [];

  for (let child = node.firstChild; child; child = child.nextSibling) {
    const matches = names ? names.includes(child.name) : child.name.endsWith("Mark");
    if (matches) ranges.push({ from: child.from, to: child.to });
  }

  return ranges;
}

/** Resolves a widget type from a value or a per-node factory. */
function resolveWidgetType(
  type: WidgetType | ((node: SyntaxNode, state: EditorState) => WidgetType | null),
  node: SyntaxNode,
  state: EditorState,
): WidgetType | null {
  return typeof type === "function" ? type(node, state) : type;
}

type DecorationRanges = Range<Decoration>[];

function addLineClassDecorations(
  ranges: DecorationRanges,
  state: EditorState,
  node: SyntaxNode,
  className: string,
): void {
  const start = state.doc.lineAt(node.from).number;
  const end = state.doc.lineAt(node.to).number;
  for (let number = start; number <= end; number++) {
    ranges.push(Decoration.line({ class: className }).range(state.doc.line(number).from));
  }
}

function addReplacementWidgetDecorations(
  ranges: DecorationRanges,
  widget: ReplacementWidget,
  node: SyntaxNode,
  state: EditorState,
  markupRanges: MarkupRange[],
  hidden: boolean,
): void {
  if (!hidden) return;

  const type = resolveWidgetType(widget.type, node, state);
  if (!type) return;

  for (const { from, to } of markupRanges) {
    ranges.push(Decoration.replace({ widget: type, block: widget.block }).range(from, to));
  }
}

function addAttachmentWidgetDecoration(
  ranges: DecorationRanges,
  widget: AttachmentWidget,
  node: SyntaxNode,
  state: EditorState,
  hidden: boolean,
): void {
  const shouldRender = widget.onlyWhenVisible ? !hidden : widget.onlyWhenHidden === false || hidden;
  if (!shouldRender) return;

  const pos =
    typeof widget.position === "function"
      ? widget.position(node, state)
      : widget.position === "before"
        ? node.from
        : node.to;
  const type = resolveWidgetType(widget.type, node, state);
  if (!type) return;

  const side = widget.position === "before" ? -1 : 1;
  ranges.push(
    Decoration.widget({
      widget: type,
      side,
      block: widget.block,
    }).range(pos),
  );
}

function addWidgetDecorations(
  ranges: DecorationRanges,
  widgets: readonly MarkdownNodeWidget[] | undefined,
  node: SyntaxNode,
  state: EditorState,
  markupRanges: MarkupRange[],
  hidden: boolean,
): void {
  if (!widgets) return;

  for (const widget of widgets) {
    switch (widget.kind) {
      case "replace":
        addReplacementWidgetDecorations(ranges, widget, node, state, markupRanges, hidden);
        break;
      case "attach":
        addAttachmentWidgetDecoration(ranges, widget, node, state, hidden);
        break;
    }
  }
}

/** Decorations plus the node starts that are currently revealed. */
type DecorationState = {
  decorations: DecorationSet;
  revealed: Set<number>;
};

/** True while a mouse button is held, so a reveal can latch during a drag. */
let pointerDown = false;

/** Re-evaluates reveals after a drag ends. */
const resetReveal = StateEffect.define<null>();

/** Watches pointer state so reveals can latch while dragging. */
const pointerWatcher = ViewPlugin.define((view) => {
  const onDown = () => {
    pointerDown = true;
  };
  const onUp = () => {
    if (!pointerDown) return;
    pointerDown = false;
    view.dispatch({ effects: resetReveal.of(null) });
  };
  const win = view.dom.ownerDocument.defaultView;

  view.contentDOM.addEventListener("mousedown", onDown);
  win?.addEventListener("mouseup", onUp);

  return {
    destroy() {
      pointerDown = false;
      view.contentDOM.removeEventListener("mousedown", onDown);
      win?.removeEventListener("mouseup", onUp);
    },
  };
});

function buildDecorations(
  state: EditorState,
  entriesByNodeName: Map<string, { config: MarkdownDecorationConfig; mark: Decoration | null }[]>,
  previouslyRevealed: Set<number>,
): DecorationState {
  const ranges: Range<Decoration>[] = [];
  const revealed = new Set<number>();
  const { from: selFrom, to: selTo } = state.selection.main;
  const isFocused = state.field(editorFocusField);

  syntaxTree(state).iterate({
    from: 0,
    to: state.doc.length,
    enter: (node) => {
      const entries = entriesByNodeName.get(node.name);
      if (!entries) return;

      for (const { config, mark } of entries) {
        if (mark) ranges.push(mark.range(node.from, node.to));

        if (config.lineClass) addLineClassDecorations(ranges, state, node.node, config.lineClass);

        let hidden = false;
        if (config.hideSyntax === true) {
          const overlaps = node.from <= selTo && node.to >= selFrom;
          // Keep a block revealed for the rest of the drag. Revealing changes
          // the layout, which would otherwise push the selection back outside
          // and flip the block on every mouse move.
          const keepRevealed = pointerDown && previouslyRevealed.has(node.from);
          hidden = !isFocused || (!overlaps && !keepRevealed);
          if (!hidden) revealed.add(node.from);
        }

        const markupRanges = resolveMarkupRanges(config, node.node, state);
        addWidgetDecorations(ranges, config.widgets, node.node, state, markupRanges, hidden);

        if (hidden && !config.widgets?.some((w) => w.kind === "replace")) {
          for (const { from, to } of markupRanges) {
            ranges.push(Decoration.replace({}).range(from, to));
          }
        }
      }
    },
  });

  return { decorations: Decoration.set(ranges, true), revealed };
}

/** Creates decorations from syntax-tree node names declared by extensions. */
export function createMarkdownDecorations(configs: readonly MarkdownDecorationConfig[]): Extension {
  const entriesByNodeName = new Map<
    string,
    { config: MarkdownDecorationConfig; mark: Decoration | null }[]
  >();
  const hasSelectionDependent = configs.some(
    (config) => config.hideSyntax || (config.widgets?.length ?? 0) > 0,
  );

  for (const config of configs) {
    const mark = config.className ? Decoration.mark({ class: config.className }) : null;
    const entries = entriesByNodeName.get(config.nodeName) ?? [];
    entries.push({ config, mark });
    entriesByNodeName.set(config.nodeName, entries);
  }

  const field = StateField.define<DecorationState>({
    create: (state) => buildDecorations(state, entriesByNodeName, new Set()),
    update: (value, transaction) => {
      const focusChanged =
        transaction.startState.field(editorFocusField) !==
        transaction.state.field(editorFocusField);
      const revealReset = transaction.effects.some((effect) => effect.is(resetReveal));
      if (
        transaction.docChanged ||
        focusChanged ||
        (hasSelectionDependent && transaction.selection) ||
        revealReset
      ) {
        return buildDecorations(transaction.state, entriesByNodeName, value.revealed);
      }
      return {
        decorations: value.decorations.map(transaction.changes),
        revealed: value.revealed,
      };
    },
    provide: (self) => EditorView.decorations.from(self, (value) => value.decorations),
  });

  return [field, pointerWatcher];
}
