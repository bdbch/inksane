import { insertContent } from "../commands/index.ts";
import { resolveFromTo } from "../helpers/resolveFromTo.ts";
import type { Extension, PosOrRange } from "../types/index.ts";

declare module "@inksane/core" {
  interface Commands<ReturnType> {
    code: {
      /**
       * Inserts inline code syntax around the specified content in the document.
       * @param options An object containing the content, and optionally the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      insertCode: (options: { content: string; pos?: PosOrRange }) => ReturnType;

      /**
       * Wraps existing content with inline code syntax at the specified position or range, otherwise uses the current selection.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      setCode: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Removes inline code syntax from the specified position or range, otherwise uses the current selection.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      removeCode: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Toggles inline code syntax for the specified position or range in the document, otherwise uses the current selection.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      toggleCode: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Wraps existing content in a fenced code block at the specified position or range, otherwise uses the current selection.
       * @param options An object containing the optional language, and the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      setCodeBlock: (options?: { lang?: string; pos?: PosOrRange }) => ReturnType;

      /**
       * Removes a fenced code block for the specified position or range in the document, otherwise uses the current selection.
       * @param options An object containing the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      removeCodeBlock: (options?: { pos?: PosOrRange }) => ReturnType;

      /**
       * Toggles a fenced code block for the specified position or range in the document, otherwise uses the current selection.
       * @param options An object containing the optional language, and the position or range.
       * @returns A boolean indicating whether the command was executed successfully.
       */
      toggleCodeBlock: (options?: { lang?: string; pos?: PosOrRange }) => ReturnType;
    };
  }
}

const isAlreadyCode = (text: string) => /^`([^`]*)`$/.exec(text);

const isAlreadyCodeBlock = (text: string) => /^```[^\n]*\n([\s\S]*?)\n```$/.exec(text);

const fenceFor = (lang?: string, tickCount = 3) => `${"`".repeat(tickCount)}${lang ?? ""}`;

/** Length of the longest run of backticks in the text. */
const longestBacktickRun = (text: string) =>
  Math.max(0, ...[...text.matchAll(/`+/g)].map((match) => match[0].length));

/** Backtick count for a fenced code block: at least three, one more than the longest run. */
const fenceTickCount = (text: string) => Math.max(3, longestBacktickRun(text) + 1);

/** Backtick count for inline code: one more than the longest run inside. */
const inlineTickCount = (text: string) => longestBacktickRun(text) + 1;

/** Reads the language hint from a `language-*` or `lang-*` class. */
const languageFromClass = (element: Element): string => {
  const match = /(?:language|lang)-([\w-]+)/.exec(element.getAttribute("class") ?? "");
  return match ? match[1] : "";
};

export const CodeExtension: Extension = {
  name: "code",

  addMarkdownDecorations() {
    return [
      {
        nodeName: "InlineCode",
        className: "inksane-mark-inline-code",
        hideSyntax: true,
      },
      {
        nodeName: "FencedCode",
        lineClass: "inksane-code-block",
        hideSyntax: true,
        markup: ["CodeMark", "CodeInfo"],
      },
      {
        nodeName: "CodeBlock",
        lineClass: "inksane-code-block",
      },
    ];
  },

  addHtmlConverters() {
    return [
      {
        block: true,
        match: (element) => element.tagName.toLowerCase() === "pre",
        toMarkdown: (element) => {
          const code = element.querySelector("code");
          const body = ((code ?? element).textContent ?? "").replace(/\n$/, "");
          const tickCount = fenceTickCount(body);
          const fence = fenceFor(code ? languageFromClass(code) : "", tickCount);
          return `${fence}\n${body}\n${"`".repeat(tickCount)}`;
        },
      },
      {
        match: (element) => element.tagName.toLowerCase() === "code",
        toMarkdown: (element) => {
          const content = element.textContent ?? "";
          const fence = "`".repeat(inlineTickCount(content));
          const pad = content.startsWith("`") || content.endsWith("`") ? " " : "";
          return `${fence}${pad}${content}${pad}${fence}`;
        },
      },
    ];
  },

  addCommands() {
    return {
      insertCode:
        (ctx) =>
        ({ content, pos }) => {
          const { from, to } = resolveFromTo(ctx.state, pos);
          return insertContent(ctx)({ content: `\`${content}\``, from, to });
        },

      setCode: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);

        if (isAlreadyCode(selectedText)) {
          return false;
        } else {
          return insertContent(ctx)({ content: `\`${selectedText}\``, from, to });
        }
      },

      removeCode: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);
        const match = isAlreadyCode(selectedText);

        if (!match) {
          return false;
        } else {
          return insertContent(ctx)({ content: match[1], from, to });
        }
      },

      toggleCode: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);

        if (isAlreadyCode(selectedText)) {
          return ctx.editor.commands.removeCode({ pos: { from, to } });
        } else {
          return ctx.editor.commands.setCode({ pos: { from, to } });
        }
      },

      setCodeBlock: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);

        if (isAlreadyCodeBlock(selectedText)) {
          return false;
        }

        const tickCount = fenceTickCount(selectedText);
        const fence = fenceFor(options?.lang, tickCount);
        return insertContent(ctx)({
          content: `${fence}\n${selectedText}\n${"`".repeat(tickCount)}`,
          from,
          to,
        });
      },

      removeCodeBlock: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);
        const match = isAlreadyCodeBlock(selectedText);

        if (!match) {
          return false;
        }

        return insertContent(ctx)({ content: match[1], from, to });
      },

      toggleCodeBlock: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);

        if (isAlreadyCodeBlock(selectedText)) {
          return ctx.editor.commands.removeCodeBlock({ pos: { from, to } });
        } else {
          return ctx.editor.commands.setCodeBlock({ pos: { from, to }, lang: options?.lang });
        }
      },
    };
  },

  addKeybinds(ctx) {
    return [
      {
        key: "Mod-.",
        run(view) {
          const { from, to } = view.state.selection.main;
          if (from !== to) {
            return ctx.editor.commands.toggleCode();
          }
          view.dispatch({
            changes: { from, to, insert: "``" },
            selection: { anchor: from + 1, head: from + 1 },
          });
          return true;
        },
      },
      {
        key: "Mod-Shift-.",
        run() {
          return ctx.editor.commands.toggleCodeBlock();
        },
      },
      {
        key: "Mod-Shift->",
        run() {
          return ctx.editor.commands.toggleCodeBlock();
        },
      },
    ];
  },
};
