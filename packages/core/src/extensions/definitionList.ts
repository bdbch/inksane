import type { BlockParser, MarkdownConfig } from "@lezer/markdown";
import type { Extension } from "../types/index.ts";

const DEFINITION_LINE = /^(:[ \t]+)([^\n]+)$/;

const definitionListParser: BlockParser = {
  name: "DefinitionList",
  before: "SetextHeading",
  parse(cx, line) {
    if (line.pos !== 0) return false;

    const from = cx.lineStart;
    const term = line.text;
    const termTo = from + term.length;
    const children = [cx.elt("DefinitionTerm", from, termTo, cx.parser.parseInline(term, from))];
    let definitionFrom = termTo + 1;
    const definitions: { text: string; from: number }[] = [];
    let nextLine = cx.peekLine();

    while (DEFINITION_LINE.test(nextLine)) {
      cx.nextLine();
      definitions.push({ text: nextLine, from: definitionFrom });
      definitionFrom += nextLine.length + 1;
      nextLine = cx.peekLine();
    }

    if (definitions.length === 0) return false;

    for (const { text, from: start } of definitions) {
      const definitionMatch = DEFINITION_LINE.exec(text)!;
      const contentFrom = start + definitionMatch[1].length;
      const definitionTo = start + text.length;
      children.push(
        cx.elt("Definition", start, definitionTo, [
          cx.elt("DefinitionMark", start, contentFrom),
          ...cx.parser.parseInline(definitionMatch[2], contentFrom),
        ]),
      );
    }

    cx.nextLine();

    const lastDefinition = definitions[definitions.length - 1];
    cx.addElement(
      cx.elt("DefinitionList", from, lastDefinition.from + lastDefinition.text.length, children),
    );
    return true;
  },
};

const definitionListSyntax: MarkdownConfig = {
  defineNodes: [
    { name: "DefinitionList", block: true },
    { name: "DefinitionTerm", block: true },
    { name: "Definition", block: true },
    "DefinitionMark",
  ],
  parseBlock: [definitionListParser],
};

/** Adds Markdown definition lists and converts pasted HTML definition lists. */
export const DefinitionListExtension: Extension = {
  name: "definitionList",

  addMarkdownSyntax() {
    return [definitionListSyntax];
  },

  addMarkdownDecorations() {
    return [
      { nodeName: "DefinitionTerm", className: "inksane-definition-term" },
      {
        nodeName: "Definition",
        className: "inksane-definition",
        hideSyntax: true,
        markup: ["DefinitionMark"],
      },
    ];
  },

  addHtmlConverters() {
    return [
      {
        block: true,
        match: (element) => element.tagName.toLowerCase() === "dl",
        toMarkdown: (element, { renderChildren }) => {
          const groups: { terms: string[]; definitions: string[] }[] = [];
          let terms: string[] = [];
          let definitions: string[] = [];

          const saveGroup = () => {
            if (terms.length && definitions.length) groups.push({ terms, definitions });
            terms = [];
            definitions = [];
          };

          for (const child of Array.from(element.children)) {
            const tag = child.tagName.toLowerCase();
            if (tag === "dt") {
              if (definitions.length) saveGroup();
              terms.push(
                renderChildren(child)
                  .trim()
                  .replace(/\\?\n+/g, " "),
              );
            } else if (tag === "dd" && terms.length) {
              definitions.push(
                ...renderChildren(child)
                  .trim()
                  .split(/\n+/)
                  .map((line) => line.replace(/\\$/, "").trim())
                  .filter(Boolean),
              );
            }
          }

          saveGroup();
          return groups
            .flatMap(({ terms: groupTerms, definitions: groupDefinitions }) =>
              groupTerms.map((term) => {
                const markdownDefinitions = groupDefinitions
                  .map((definition) => `: ${definition}`)
                  .join("\n");
                return `${term}\n${markdownDefinitions}`;
              }),
            )
            .join("\n\n");
        },
      },
    ];
  },
};
