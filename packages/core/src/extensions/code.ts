import type { EditorState } from "@codemirror/state";
import { insertContent } from "../commands/index.ts";
import type { InkwellExtension, PosOrRange } from "../types/index.ts";

declare module "@inkwell/core" {
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

const fenceFor = (lang?: string) => (lang ? `\`\`\`${lang}` : "```");

const resolveFromTo = (state: EditorState, pos?: PosOrRange): { from: number; to: number } => {
  const from = typeof pos === "number" ? pos : (pos?.from ?? state.selection.main.from);
  const to = typeof pos === "number" ? pos : (pos?.to ?? state.selection.main.to);
  return { from, to };
};

export const CodeExtension: InkwellExtension = {
  name: "code",

  addMarkdownDecorations() {
    return [
      {
        nodeName: "InlineCode",
        className: "inkwell-mark-inline-code",
        hideSyntax: true,
      },
      {
        nodeName: "FencedCode",
        lineClass: "inkwell-code-block",
        hideSyntax: true,
        markup: ["CodeMark", "CodeInfo"],
      },
      {
        nodeName: "CodeBlock",
        lineClass: "inkwell-code-block",
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
        const fence = fenceFor(options?.lang);
        return insertContent(ctx)({ content: `${fence}\n${selectedText}\n\`\`\``, from, to });
      },

      toggleCodeBlock: (ctx) => (options) => {
        const { from, to } = resolveFromTo(ctx.state, options?.pos);
        const selectedText = ctx.state.sliceDoc(from, to);
        const match = isAlreadyCodeBlock(selectedText);

        if (match) {
          return insertContent(ctx)({ content: match[1], from, to });
        } else {
          const fence = fenceFor(options?.lang);
          return insertContent(ctx)({ content: `${fence}\n${selectedText}\n\`\`\``, from, to });
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
