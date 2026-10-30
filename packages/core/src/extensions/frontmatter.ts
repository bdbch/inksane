import type { EditorState } from "@codemirror/state";
import type { EditorView, WidgetType } from "@codemirror/view";
import type { Input, SyntaxNode } from "@lezer/common";
import type { BlockContext, BlockParser, MarkdownConfig, MarkdownParser } from "@lezer/markdown";
import type { Editor } from "../Editor.ts";
import { findFrontmatter, isFrontmatterOpening, parseFrontmatter } from "../helpers/frontmatter.ts";
import type { FrontmatterData } from "../helpers/frontmatter.ts";
import { renderFrontmatterError, renderFrontmatterTable } from "../helpers/frontmatterTable.ts";
import { htmlWidget } from "../helpers/htmlWidget.ts";
import type { Extension } from "../types/index.ts";

export type { FrontmatterData, FrontmatterValue } from "../helpers/frontmatter.ts";

/** Lezer keeps the parse input private, but the closing fence must be found before lines are consumed. */
type LookaheadContext = BlockContext & { input?: Input };

/**
 * Reads the parsed YAML values from a document's leading frontmatter block.
 *
 * @param editor - The editor whose current Markdown document to read.
 * @returns The parsed values, an empty object for an empty block, or null when
 * frontmatter is absent or the YAML is invalid.
 * @example
 * ```ts
 * const properties = getYaml(editor);
 * console.log(properties?.title);
 * ```
 */
export function getYaml(editor: Editor): FrontmatterData | null {
  return parseFrontmatter(editor.content).data;
}

/** Reads the whole parse input without moving the current line. */
function readSource(cx: BlockContext): string | null {
  const input = (cx as LookaheadContext).input;
  return input ? input.read(0, input.length) : null;
}

const frontmatterParser: BlockParser = {
  name: "Frontmatter",
  before: "HorizontalRule",
  parse(cx, line) {
    if (cx.depth !== 1 || cx.lineStart !== 0 || line.pos !== 0) return false;
    if (!isFrontmatterOpening(line.text)) return false;

    // A block without a closing fence keeps its normal Markdown meaning.
    const source = readSource(cx);
    if (!source) return false;
    const range = findFrontmatter(source);
    if (!range) return false;

    while (cx.prevLineEnd() < range.to && cx.nextLine()) {
      // Consume the block line by line.
    }

    const children = [cx.elt("FrontmatterMark", range.from, range.openingTo)];
    if (range.contentTo > range.contentFrom) {
      children.push(cx.elt("FrontmatterContent", range.contentFrom, range.contentTo));
    }
    children.push(cx.elt("FrontmatterMark", range.closingFrom, range.to));

    cx.addElement(cx.elt("Frontmatter", range.from, range.to, children));
    return true;
  },
};

function createFrontmatterSyntax(): MarkdownConfig {
  let parser: MarkdownParser | undefined;
  return {
    defineNodes: [{ name: "Frontmatter", block: true }, "FrontmatterMark", "FrontmatterContent"],
    parseBlock: [
      {
        ...frontmatterParser,
        parse(cx, line) {
          parser = cx.parser;
          return frontmatterParser.parse!(cx, line);
        },
      },
    ],
    wrap(inner, input, fragments, ranges) {
      const leading = fragments.find((fragment) => fragment.from === 0 && fragment.offset === 0);
      if (!leading || !parser) return inner;

      const previous = leading.tree.topNode.firstChild;
      const range = findFrontmatter(input.read(0, input.length));
      const previousEnd = previous?.name === "Frontmatter" ? previous.to : null;
      if (previousEnd === (range?.to ?? null)) return inner;

      // A distant fence edit can change the opening block outside the fragment gap.
      return parser.createParse(input, [], ranges);
    },
  };
}

/** Opens the block for editing, landing on a YAML line instead of a fence. */
function editFrontmatter(view: EditorView): void {
  const range = findFrontmatter(view.state.doc.toString());
  if (!range) return;

  view.focus();

  if (range.closingFrom > range.contentFrom) {
    view.dispatch({ selection: { anchor: range.contentFrom } });
    return;
  }

  // An empty block has no YAML line yet. Add one so typing cannot merge with a fence.
  view.dispatch({
    changes: { from: range.openingTo, insert: "\n" },
    selection: { anchor: range.openingTo + 1 },
  });
}

function togglePanel(element: HTMLElement, button: Element, view: EditorView): void {
  const panel = element.querySelector<HTMLElement>("[data-frontmatter-panel]");
  const body = panel?.querySelector<HTMLElement>(".inksane-frontmatter-body");
  if (!panel || !body) return;

  const expanded = panel.dataset.expanded !== "false";
  panel.dataset.expanded = String(!expanded);
  body.hidden = expanded;
  button.setAttribute("aria-expanded", String(!expanded));
  button.setAttribute("aria-label", expanded ? "Expand properties" : "Collapse properties");
  view.requestMeasure();
}

function toggleGroup(button: Element, view: EditorView): void {
  const item = button.closest(".inksane-frontmatter-item");
  const children = item?.querySelector<HTMLElement>(".inksane-frontmatter-children");
  if (!children) return;

  const expanded = !children.hidden;
  children.hidden = expanded;
  button.setAttribute("aria-expanded", String(!expanded));

  const key = button.parentElement?.querySelector(".inksane-frontmatter-key")?.textContent ?? "";
  button.setAttribute("aria-label", `${expanded ? "Expand" : "Collapse"} ${key}`.trim());
  view.requestMeasure();
}

/** Builds the properties table shown while the cursor is outside the block. */
function createFrontmatterWidget(node: SyntaxNode, state: EditorState): WidgetType {
  const { data, error } = parseFrontmatter(state.sliceDoc(node.from, node.to));
  const html = error ? renderFrontmatterError(error) : renderFrontmatterTable(data ?? {});

  return htmlWidget(html, {
    block: true,
    className: "inksane-frontmatter-widget cm-line",
    estimatedHeight: 96,
    onRender: (element, view) => {
      element.addEventListener("mousedown", (event) => event.preventDefault());
      element.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target : null;

        const panelButton = target?.closest("[data-frontmatter-panel-toggle]");
        if (panelButton) {
          togglePanel(element, panelButton, view);
          return;
        }

        const groupButton = target?.closest("[data-frontmatter-group-toggle]");
        if (groupButton) {
          toggleGroup(groupButton, view);
          return;
        }

        editFrontmatter(view);
      });
    },
  });
}

/**
 * Recognizes leading YAML frontmatter and renders it as a properties table.
 * Add this extension to the editor's `extensions` option. It takes no options.
 * The table reveals the YAML source when the cursor enters the block.
 * Use {@link getYaml} to read the parsed values.
 *
 * @example
 * ```ts
 * const editor = new Editor({
 *   content: "---\ntitle: Notes\n---\n\nBody",
 *   extensions: [FrontmatterExtension],
 * });
 * const properties = getYaml(editor);
 * ```
 * @see https://github.com/bdbch/inksane/blob/main/apps/docs/content/docs/extensions/blocks/frontmatter.mdx
 */
export const FrontmatterExtension: Extension = {
  name: "frontmatter",

  addMarkdownSyntax() {
    return [createFrontmatterSyntax()];
  },

  addMarkdownDecorations() {
    return [
      {
        nodeName: "Frontmatter",
        className: "inksane-frontmatter",
        lineClass: "inksane-frontmatter-line",
        hideSyntax: true,
        markup: (node) => [{ from: node.from, to: node.to }],
        widgets: [
          {
            kind: "replace",
            block: true,
            type: (node, state) => createFrontmatterWidget(node, state),
          },
        ],
      },
    ];
  },

  addStateQueries() {
    return [{ name: "frontmatter", kind: "node", nodeNames: ["Frontmatter"] }];
  },
};
