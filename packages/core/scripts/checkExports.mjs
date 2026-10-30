import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Editor } from "@inksane/core";
import { BaseKit } from "@inksane/core/extensions/base-kit";
import { BoldExtension } from "@inksane/core/extensions/bold";
import { DefinitionListExtension } from "@inksane/core/extensions/definition-list";
import { FootnoteExtension } from "@inksane/core/extensions/footnotes";
import { FrontmatterExtension } from "@inksane/core/extensions/frontmatter";
import { StrikethroughExtension } from "@inksane/core/extensions/strikethrough";
import { TaskListExtension } from "@inksane/core/extensions/task-list";
import { WikiLinkExtension } from "@inksane/core/extensions/wiki-link";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(await readFile(join(packageDir, "package.json"), "utf8"));
const subpaths = Object.keys(pkg.exports).filter((path) => path.startsWith("./extensions/"));
assert.equal(subpaths.length, 23);
for (const path of subpaths) {
  const extension = await import(`@inksane/core/${path.slice(2)}`);
  assert.ok(Object.keys(extension).length > 0, path);
}

for (const [extensions, commands] of [
  [[], ["insertContent"]],
  [[BoldExtension], ["insertContent", "toggleBold"]],
  [[DefinitionListExtension], ["insertContent"]],
  [[FootnoteExtension], ["insertContent"]],
  [[FrontmatterExtension], ["insertContent"]],
  [[StrikethroughExtension], ["setStrikethrough", "removeStrikethrough", "toggleStrikethrough"]],
  [[TaskListExtension], ["insertTaskList", "removeTaskList", "toggleTaskList"]],
  [[WikiLinkExtension()], ["insertWikiLink", "openWikiLink"]],
  [
    [BaseKit()],
    [
      "insertContent",
      "toggleBold",
      "toggleItalic",
      "toggleStrikethrough",
      "toggleTaskList",
      "setLink",
      "insertWikiLink",
    ],
  ],
]) {
  const editor = new Editor({ extensions });
  try {
    for (const command of commands) assert.ok(command in editor.commands, command);
    if (extensions.length === 0) assert.ok(!("toggleBold" in editor.commands));
    if (extensions[0] === BoldExtension) assert.ok(!("toggleItalic" in editor.commands));
  } finally {
    editor.destroy();
  }
}

const fixtures = [
  'import { Editor } from "@inksane/core";\nimport { TaskListExtension } from "@inksane/core/extensions/task-list";\nconst editor = new Editor({ extensions: [TaskListExtension] });\neditor.commands.insertTaskList();\neditor.commands.removeTaskList({ pos: 0 });\neditor.chain().toggleTaskList().run();\n// @ts-expect-error TaskList does not provide bold commands.\neditor.commands.toggleBold();',
  'import { Editor } from "@inksane/core";\nimport { FootnoteExtension } from "@inksane/core/extensions/footnotes";\nconst editor = new Editor({ extensions: [FootnoteExtension] });\n// @ts-expect-error Footnotes does not provide bold commands.\neditor.commands.toggleBold();',
  'import { Editor } from "@inksane/core";\nimport { WikiLinkExtension, type WikiLinkOptions } from "@inksane/core/extensions/wiki-link";\nconst options: WikiLinkOptions = { resolveTarget: (target) => console.log(target) };\nconst editor = new Editor({ extensions: [WikiLinkExtension(options)] });\neditor.commands.insertWikiLink({ target: "Note", label: "My note" });\neditor.commands.openWikiLink({ pos: 0 });\n// @ts-expect-error Wiki links do not provide bold commands.\neditor.commands.toggleBold();',
  'import { Editor } from "@inksane/core";\nimport { StrikethroughExtension } from "@inksane/core/extensions/strikethrough";\nconst editor = new Editor({ extensions: [StrikethroughExtension] });\neditor.commands.setStrikethrough();\neditor.commands.removeStrikethrough({ pos: 0 });\neditor.chain().toggleStrikethrough().run();\n// @ts-expect-error Strikethrough does not provide bold commands.\neditor.commands.toggleBold();',
  'import { Editor } from "@inksane/core";\nconst editor = new Editor({});\neditor.commands.insertContent({ content: "text", from: 0 });\n// @ts-expect-error Bold requires an extension import.\neditor.commands.toggleBold();',
  'import { Editor } from "@inksane/core";\nimport { BoldExtension } from "@inksane/core/extensions/bold";\nconst editor = new Editor({ extensions: [BoldExtension] });\neditor.commands.toggleBold();\n// @ts-expect-error Bold does not provide italic commands.\neditor.commands.toggleItalic();',
  'import { Editor } from "@inksane/core";\nimport { BaseKit } from "@inksane/core/extensions/base-kit";\nconst editor = new Editor({ extensions: [BaseKit({ link: { onLinkRequest: () => null } })] });\neditor.commands.insertHeading({ level: 1 });\neditor.commands.insertHorizontalRule();\neditor.chain().toggleBold().toggleItalic().run();',
  'import { Editor } from "@inksane/core";\nimport { CodeExtension, codeHighlightStyle, defaultCodeLanguages } from "@inksane/core/extensions/code";\nconst editor = new Editor({ extensions: [CodeExtension({ languages: defaultCodeLanguages, highlightStyle: codeHighlightStyle })] });\neditor.commands.toggleCodeBlock();\neditor.chain().insertCodeBlock({ lang: "ts" }).run();',
  'import { Editor } from "@inksane/core";\nimport { FrontmatterExtension, getYaml } from "@inksane/core/extensions/frontmatter";\nimport type { FrontmatterData, FrontmatterValue } from "@inksane/core/extensions/frontmatter";\nconst editor = new Editor({ content: "---\\ntitle: Hi\\n---", extensions: [FrontmatterExtension] });\nconst yaml: FrontmatterData | null = getYaml(editor);\nconst value: FrontmatterValue | undefined = yaml?.title;\nvoid value;',
];
const directory = await mkdtemp(join(tmpdir(), "inksane-exports-"));
for (const [path, name] of [
  ["highlight", "Highlight"],
  ["subscript", "Subscript"],
  ["superscript", "Superscript"],
]) {
  fixtures.push(`import { Editor } from "@inksane/core";
import { ${name}Extension } from "@inksane/core/extensions/${path}";
const editor = new Editor({ extensions: [${name}Extension] });
editor.commands.toggle${name}();
editor.chain().toggle${name}({ pos: 0 }).run();
// @ts-expect-error This extension does not provide bold commands.
editor.commands.toggleBold();`);
}
try {
  await mkdir(join(directory, "node_modules/@inksane"), { recursive: true });
  await symlink(packageDir, join(directory, "node_modules/@inksane/core"), "dir");
  const compiler = join(packageDir, "node_modules/typescript/bin/tsc");
  for (const [index, fixture] of fixtures.entries()) {
    const path = join(directory, `consumer-${index}.mts`);
    await writeFile(path, fixture);
    execFileSync(
      process.execPath,
      [
        compiler,
        "--ignoreConfig",
        "--noEmit",
        "--strict",
        "--module",
        "nodenext",
        "--target",
        "esnext",
        "--skipLibCheck",
        path,
      ],
      { stdio: "inherit" },
    );
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
console.log("All extension imports and isolated consumer command types passed.");
