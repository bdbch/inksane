import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: {
      index: "src/index.ts",
      "extensions/base-kit": "src/extensions/baseKit.ts",
      "extensions/bold": "src/extensions/bold.ts",
      "extensions/italic": "src/extensions/italic.ts",
      "extensions/strikethrough": "src/extensions/strikethrough.ts",
      "extensions/highlight": "src/extensions/highlight.ts",
      "extensions/subscript": "src/extensions/subscript.ts",
      "extensions/superscript": "src/extensions/superscript.ts",
      "extensions/link": "src/extensions/link.ts",
      "extensions/placeholder": "src/extensions/placeholder.ts",
      "extensions/heading": "src/extensions/heading.ts",
      "extensions/horizontal-rule": "src/extensions/horizontalRule.ts",
      "extensions/html": "src/extensions/html.ts",
      "extensions/image": "src/extensions/image.ts",
      "extensions/code": "src/extensions/code.ts",
      "extensions/definition-list": "src/extensions/definitionList.ts",
      "extensions/blockquote": "src/extensions/blockquote.ts",
      "extensions/list": "src/extensions/list.ts",
      "extensions/footnotes": "src/extensions/footnotes.ts",
      "extensions/frontmatter": "src/extensions/frontmatter.ts",
      "extensions/task-list": "src/extensions/taskList.ts",
      "extensions/keybinds": "src/extensions/keybinds.ts",
      "extensions/history": "src/extensions/history.ts",
    },
    dts: {
      tsgo: true,
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
  test: {
    environment: "jsdom",
  },
});
