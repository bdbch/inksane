import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/**
 * Default token colors for fenced code blocks.
 *
 * The colors read CSS variables so themes can override them without
 * replacing the style. The fallbacks target light backgrounds.
 */
export const codeHighlightStyle = HighlightStyle.define([
  {
    tag: tags.comment,
    color: "var(--inksane-code-comment, #6e7781)",
    fontStyle: "italic",
  },
  {
    tag: tags.keyword,
    color: "var(--inksane-code-keyword, #cf222e)",
  },
  {
    tag: tags.string,
    color: "var(--inksane-code-string, #0a3069)",
  },
  {
    tag: [tags.number, tags.bool, tags.atom],
    color: "var(--inksane-code-number, #0550ae)",
  },
  {
    tag: [tags.typeName, tags.className, tags.namespace, tags.tagName],
    color: "var(--inksane-code-type, #953800)",
  },
  {
    tag: [tags.propertyName, tags.attributeName, tags.labelName, tags.macroName],
    color: "var(--inksane-code-property, #116329)",
  },
  {
    tag: tags.function(tags.variableName),
    color: "var(--inksane-code-function, #8250df)",
  },
  {
    tag: [tags.operator, tags.punctuation],
    color: "var(--inksane-code-operator, #57606a)",
  },
  {
    tag: tags.meta,
    color: "var(--inksane-code-meta, #6e7781)",
  },
  {
    tag: [tags.invalid, tags.deleted],
    color: "var(--inksane-code-invalid, #cf222e)",
  },
  {
    tag: tags.inserted,
    color: "var(--inksane-code-inserted, #116329)",
  },
]);
