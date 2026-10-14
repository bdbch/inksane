import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Editor } from "@inksane/core";
import { BaseKit } from "@inksane/core/extensions/base-kit";
import { BoldExtension } from "@inksane/core/extensions/bold";
import { StrikethroughExtension } from "@inksane/core/extensions/strikethrough";
import { TaskListExtension } from "@inksane/core/extensions/task-list";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(await readFile(join(packageDir, "package.json"), "utf8"));
const subpaths = Object.keys(pkg.exports).filter((path) => path.startsWith("./extensions/"));
assert.equal(subpaths.length, 16);
for (const path of subpaths) {
  const extension = await import(`@inksane/core/${path.slice(2)}`);
  assert.ok(Object.keys(extension).length > 0, path);
}

for (const [extensions, commands] of [
  [[], ["insertContent"]],
  [[BoldExtension], ["insertContent", "toggleBold"]],
  [[StrikethroughExtension], ["setStrike", "removeStrike", "toggleStrike"]],
  [[TaskListExtension], ["setTaskList", "removeTaskList", "toggleTaskList"]],
  [
    [BaseKit()],
    ["insertContent", "toggleBold", "toggleItalic", "toggleStrike", "toggleTaskList", "setLink"],
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
  'import { Editor } from "@inksane/core";\nimport { TaskListExtension } from "@inksane/core/extensions/task-list";\nconst editor = new Editor({ extensions: [TaskListExtension] });\neditor.commands.setTaskList();\neditor.commands.removeTaskList({ pos: 0 });\neditor.chain().toggleTaskList().run();\n// @ts-expect-error TaskList does not provide bold commands.\neditor.commands.toggleBold();',
  'import { Editor } from "@inksane/core";\nimport { StrikethroughExtension } from "@inksane/core/extensions/strikethrough";\nconst editor = new Editor({ extensions: [StrikethroughExtension] });\neditor.commands.setStrike();\neditor.commands.removeStrike({ pos: 0 });\neditor.chain().toggleStrike().run();\n// @ts-expect-error Strikethrough does not provide bold commands.\neditor.commands.toggleBold();',
  'import { Editor } from "@inksane/core";\nconst editor = new Editor({});\neditor.commands.insertContent({ content: "text", from: 0 });\n// @ts-expect-error Bold requires an extension import.\neditor.commands.toggleBold();',
  'import { Editor } from "@inksane/core";\nimport { BoldExtension } from "@inksane/core/extensions/bold";\nconst editor = new Editor({ extensions: [BoldExtension] });\neditor.commands.toggleBold();\n// @ts-expect-error Bold does not provide italic commands.\neditor.commands.toggleItalic();',
  'import { Editor } from "@inksane/core";\nimport { BaseKit } from "@inksane/core/extensions/base-kit";\nconst editor = new Editor({ extensions: [BaseKit({ link: { onLinkRequest: () => null } })] });\neditor.commands.setHeading({ level: 1 });\neditor.commands.insertHorizontalRule();\neditor.chain().toggleBold().toggleItalic().run();',
];
const directory = await mkdtemp(join(tmpdir(), "inksane-exports-"));
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
