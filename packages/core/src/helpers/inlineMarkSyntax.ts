import type { MarkdownConfig } from "@lezer/markdown";

/** Parses paired inline markers, allowing spaces while leaving repeated marker runs literal. */
export function inlineMarkSyntax(nodeName: string, marker: string): MarkdownConfig {
  const mark = `${nodeName}Mark`;
  const delimiter = { resolve: nodeName, mark };
  const code = marker.charCodeAt(0);
  return {
    defineNodes: [nodeName, mark],
    parseInline: [
      {
        name: nodeName,
        parse(cx, next, pos) {
          if (next !== code || cx.slice(pos, pos + marker.length) !== marker) return -1;
          // Single tildes must not consume strikethrough delimiters.
          if (cx.char(pos - 1) === code || cx.char(pos + marker.length) === code) return -1;
          return cx.addDelimiter(delimiter, pos, pos + marker.length, true, true);
        },
      },
    ],
  };
}
