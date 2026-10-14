import type { Extension } from "../types/extensions.ts";
import { BlockquoteExtension } from "./blockquote.ts";
import { BoldExtension } from "./bold.ts";
import { CodeExtension } from "./code.ts";
import { HeadingExtension } from "./heading.ts";
import { HistoryExtension } from "./history.ts";
import { HorizontalRuleExtension } from "./horizontalRule.ts";
import { HtmlExtension } from "./html.ts";
import { ImageExtension } from "./image.ts";
import { ItalicExtension } from "./italic.ts";
import { DefaultKeymapExtension, KeybindExtension } from "./keybinds.ts";
import { LinkExtension } from "./link.ts";
import type { LinkOptions } from "./link.ts";
import { ListExtension } from "./list.ts";
import { PlaceholderExtension } from "./placeholder.ts";
import { StrikethroughExtension } from "./strikethrough.ts";

// Kit imports must also load the command types declared by its children.
import "./blockquote.ts";
import "./bold.ts";
import "./code.ts";
import "./heading.ts";
import "./horizontalRule.ts";
import "./image.ts";
import "./italic.ts";
import "./list.ts";
import "./strikethrough.ts";

/** Standard editor features. All are enabled unless set to false. */
export type BaseKitOptions = {
  /** Enable blockquotes. */
  blockquote?: boolean;
  /** Enable bold text. */
  bold?: boolean;
  /** Enable inline code and code blocks. */
  code?: boolean;
  /** Enable standard editing and search shortcuts. */
  defaultKeymap?: boolean;
  /** Enable headings. */
  heading?: boolean;
  /** Enable undo and redo. Disable when another extension owns history. */
  history?: boolean;
  /** Enable horizontal rules. */
  horizontalRule?: boolean;
  /** Enable HTML rendering. */
  html?: boolean;
  /** Enable images. */
  image?: boolean;
  /** Enable italic text. */
  italic?: boolean;
  /** Enable Tab indentation using the editor's tabSize option. */
  keybinds?: boolean;
  /** Enable links, configure their URL handler, or disable them. */
  link?: boolean | LinkOptions;
  /** Enable bullet and ordered lists. */
  list?: boolean;
  /** Enable the editor's placeholder option. */
  placeholder?: boolean;
  /** Enable strikethrough text. */
  strikethrough?: boolean;
};

/**
 * Bundles the standard Markdown features, history, and editing shortcuts.
 * Disable a feature here before registering a replacement separately.
 *
 * @param options - Features to disable or configure.
 * @example
 * new Editor({ extensions: [BaseKit({ history: false })] });
 */
export function BaseKit(options: BaseKitOptions = {}): Extension {
  return {
    name: "baseKit",
    addExtensions() {
      const extensions: [keyof BaseKitOptions, Extension][] = [
        ["history", HistoryExtension],
        ["bold", BoldExtension],
        ["italic", ItalicExtension],
        ["strikethrough", StrikethroughExtension],
        ["link", LinkExtension(typeof options.link === "object" ? options.link : {})],
        ["placeholder", PlaceholderExtension],
        ["heading", HeadingExtension],
        ["horizontalRule", HorizontalRuleExtension],
        ["html", HtmlExtension],
        ["image", ImageExtension],
        ["code", CodeExtension],
        ["blockquote", BlockquoteExtension],
        ["list", ListExtension],
        ["keybinds", KeybindExtension],
        ["defaultKeymap", DefaultKeymapExtension],
      ];
      return extensions
        .filter(([name]) => options[name] !== false)
        .map(([, extension]) => extension);
    },
  };
}
