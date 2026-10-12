import { EditorSelection } from "@codemirror/state";
import type { Extension as CMExtension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { HtmlConverter } from "../types/index.ts";
import { htmlToMarkdown } from "./htmlToMarkdown.ts";

/**
 * Returns true when plain text looks like an HTML fragment.
 *
 * Pasting raw HTML source only carries `text/plain`, so this decides whether it
 * is worth converting. It requires a leading tag, a closing tag, and a trailing
 * `>`, which keeps ordinary prose that happens to contain a `<` untouched.
 */
function looksLikeHtml(text: string): boolean {
  const trimmed = text.trim();
  return (
    /^<[a-z][\w-]*(\s[^>]*)?>/i.test(trimmed) &&
    /<\/[a-z][\w-]*\s*>/i.test(trimmed) &&
    trimmed.endsWith(">")
  );
}

/**
 * Creates the paste handler that turns pasted HTML into Markdown.
 *
 * When the clipboard has HTML, it is converted with {@link htmlToMarkdown} and
 * inserted over the current selection. The converters come from the active
 * extensions, so only syntax that is loaded is produced. Plain text is checked
 * for an HTML fragment so pasted HTML source converts too. Text that is not
 * HTML and HTML that converts to nothing stay with the editor's default
 * handling.
 *
 * @param converters - The converters collected from the active extensions.
 * @returns A CodeMirror extension that handles paste events.
 */
export function htmlPasteHandler(converters: HtmlConverter[]): CMExtension {
  return EditorView.domEventHandlers({
    paste(event, view) {
      const clipboard = event.clipboardData;
      if (!clipboard) return false;

      const html = clipboard.getData("text/html");
      const source = html || clipboard.getData("text/plain");
      if (!source || (!html && !looksLikeHtml(source))) return false;

      const markdown = htmlToMarkdown(source, converters);
      if (!markdown) return false;

      event.preventDefault();
      const transaction = view.state.changeByRange((range) => ({
        changes: { from: range.from, to: range.to, insert: markdown },
        range: EditorSelection.cursor(range.from + markdown.length),
      }));
      view.dispatch(
        view.state.update(transaction, {
          scrollIntoView: true,
          userEvent: "input.paste",
        }),
      );
      return true;
    },
  });
}
