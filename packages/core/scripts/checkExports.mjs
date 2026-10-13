import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Editor } from "@inksane/core";
import { BaseKit } from "@inksane/core/extensions/base-kit";
import { BoldExtension } from "@inksane/core/extensions/bold";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(await readFile(join(packageDir, "package.json"), "utf8"));
const subpaths = Object.keys(pkg.exports).filter((path) => path.startsWith("./extensions/"));
assert.equal(subpaths.length, 14);
for (const path of subpaths) {
  const extension = await import(`@inksane/core/${path.slice(2)}`);
  assert.ok(Object.keys(extension).length > 0, path);
}

for (const [extensions, commands] of [
  [[], ["insertContent"]],
  [[BoldExtension], ["insertContent", "toggleBold"]],
  [[BaseKit()], ["insertContent", "toggleBold", "toggleItalic", "setLink"]],
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
