import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import type { InlineParser, MarkdownConfig } from "@lezer/markdown";
import { insertContent } from "../commands/index.ts";
import { resolveFromTo } from "../helpers/resolveFromTo.ts";
import type { Extension, MarkupRange, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      /**
       * Inserts a `[[target]]` or `[[target|label]]` wiki link. Selected text
       * becomes the label when no label is given.
       * @param options - The target, optional label, and optional position or range.
       * @returns False for an empty target or one that contains link syntax.
       */
      insertWikiLink: (options: { target: string; label?: string; pos?: PosOrRange }) => ReturnType;

      /**
       * Resolves the wiki link at the selection, or a given target, through the
       * extension's `resolveTarget` handler.
       * @param options - An optional target and position or range.
       * @returns False when there is no wiki link or no resolver.
       */
      openWikiLink: (options?: { target?: string; pos?: PosOrRange }) => ReturnType;
    };
  }
}

const WIKI_LINK_CLASS = "inksane-mark-wiki-link";
const OPEN_BRACKET = "[".charCodeAt(0);
const WIKI_LINK = /^\[\[([^[\]\n|]+)(?:\|([^[\]\n]+))?\]\]/;
const INVALID_TARGET = /[[\]|\n\r]/;
const INVALID_LABEL = /[[\]\n\r]/;

/** Options for the wiki link extension. */
export type WikiLinkOptions = {
  /**
   * Called when a wiki link is activated with Mod-click or through the
   * `openWikiLink` command. The host decides what a target maps to, so it can
   * open a note, follow a route, or offer to create a missing target.
   *
   * Without this handler, wiki links render and edit but do nothing on click.
   */
  resolveTarget?: (target: string) => void;
};

const wikiLinkParser: InlineParser = {
  name: "WikiLink",
  before: "Link",
  parse(cx, next, pos) {
    if (next !== OPEN_BRACKET) return -1;

    const match = WIKI_LINK.exec(cx.slice(pos, cx.end));
    if (!match) return -1;

    const target = match[1];
    const label = match[2];
    const to = pos + match[0].length;
    const targetFrom = pos + 2;
    const targetTo = targetFrom + target.length;
    const closeFrom = to - 2;
    const children = [
      cx.elt("WikiLinkMark", pos, targetFrom),
      cx.elt("WikiLinkTarget", targetFrom, targetTo),
    ];

    if (label !== undefined) {
      children.push(
        cx.elt("WikiLinkMark", targetTo, targetTo + 1),
        cx.elt("WikiLinkLabel", targetTo + 1, closeFrom),
      );
    }

    children.push(cx.elt("WikiLinkMark", closeFrom, to));

    return cx.addElement(cx.elt("WikiLink", pos, to, children));
  },
};

const wikiLinkSyntax: MarkdownConfig = {
  defineNodes: ["WikiLink", "WikiLinkMark", "WikiLinkTarget", "WikiLinkLabel"],
  parseInline: [wikiLinkParser],
};

/** Reads the target text of a wiki link node. */
const getTarget = (node: SyntaxNode, state: EditorState): string => {
  const target = node.getChild("WikiLinkTarget");
  return target ? state.doc.sliceString(target.from, target.to).trim() : "";
};

/** Finds the innermost wiki link containing a document position. */
const findWikiLink = (state: EditorState, pos: number): SyntaxNode | null => {
  if (pos < 0 || pos > state.doc.length) return null;

  const tree = syntaxTree(state);
  for (const inner of [tree.resolveInner(pos, -1), tree.resolveInner(pos, 1)]) {
    let node: SyntaxNode | null = inner;
    while (node) {
      if (node.name === "WikiLink") return node;
      node = node.parent;
    }
  }

  return null;
};

/**
 * Hides the brackets while the syntax is hidden. A labeled link also hides its
 * target and pipe, leaving only the label visible.
 */
const getMarkupRanges = (node: SyntaxNode): MarkupRange[] => {
  const ranges: MarkupRange[] = [];
  const hasLabel = node.getChild("WikiLinkLabel") !== null;

  for (let child = node.firstChild; child; child = child.nextSibling) {
    const isHiddenMark = child.name === "WikiLinkMark";
    const isHiddenTarget = hasLabel && child.name === "WikiLinkTarget";
    if (isHiddenMark || isHiddenTarget) ranges.push({ from: child.from, to: child.to });
  }

  return ranges;
};

/**
 * Adds `[[target]]` and `[[target|label]]` parsing, decoration, commands, and
 * an optional click resolver.
 *
 * @example
 * ```ts
 * new Editor({
 *   extensions: [
 *     WikiLinkExtension({
 *       resolveTarget: (target) => router.push(`/notes/${target}`),
 *     }),
 *   ],
 * });
 * ```
 */
export function WikiLinkExtension(options: WikiLinkOptions = {}): Extension {
  const { resolveTarget } = options;

  return {
    name: "wikiLink",

    addMarkdownSyntax() {
      return [wikiLinkSyntax];
    },

    addMarkdownDecorations() {
      return [
        {
          nodeName: "WikiLink",
          className: WIKI_LINK_CLASS,
          markup: getMarkupRanges,
          hideSyntax: true,
        },
      ];
    },

    addStateQueries() {
      return [{ name: "wikiLink", nodeNames: ["WikiLink"] }];
    },

    addCommands() {
      return {
        insertWikiLink:
          (ctx) =>
          ({ target, label, pos }) => {
            const trimmedTarget = target.trim();
            if (!trimmedTarget || INVALID_TARGET.test(trimmedTarget)) return false;

            const { from, to } = resolveFromTo(ctx.state, pos);
            const rawLabel = label ?? (from === to ? undefined : ctx.state.sliceDoc(from, to));
            const resolvedLabel = rawLabel?.trim();
            if (
              resolvedLabel !== undefined &&
              (!resolvedLabel || INVALID_LABEL.test(resolvedLabel))
            ) {
              return false;
            }
            const content =
              resolvedLabel === undefined
                ? `[[${trimmedTarget}]]`
                : `[[${trimmedTarget}|${resolvedLabel}]]`;

            return insertContent(ctx)({ content, from, to });
          },

        openWikiLink:
          (ctx) =>
          ({ target, pos } = {}) => {
            if (!resolveTarget) return false;

            if (target !== undefined) {
              const givenTarget = target.trim();
              if (!givenTarget) return false;
              if (!ctx.isSpeculative) resolveTarget(givenTarget);
              return true;
            }

            const node = findWikiLink(ctx.state, resolveFromTo(ctx.state, pos).from);
            if (!node) return false;

            const linkTarget = getTarget(node, ctx.state);
            if (!linkTarget) return false;

            if (!ctx.isSpeculative) resolveTarget(linkTarget);
            return true;
          },
      };
    },

    addCodeMirrorExtensions({ editor }) {
      if (!resolveTarget) return [];

      return [
        EditorView.domEventHandlers({
          click(event, view) {
            if (!event.metaKey && !event.ctrlKey) return false;

            const coords = view.posAtCoords({ x: event.clientX, y: event.clientY });
            let pos = coords;

            if (pos === null) {
              try {
                pos = view.posAtDOM(event.target as Node, 0);
              } catch {
                return false;
              }
            }

            if (!editor.commands.openWikiLink({ pos })) return false;
            event.preventDefault();
            return true;
          },
        }),
      ];
    },
  };
}
