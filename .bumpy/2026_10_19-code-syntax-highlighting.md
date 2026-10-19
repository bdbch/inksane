---
"@inksane/core": major
---

Fenced code blocks now get syntax highlighting. Most language parsers load on demand through a dynamic import, so only fences that use a language fetch its parser. HTML, CSS, and JavaScript are already part of the base Markdown language. Markdown fences reuse the editor parser.

`CodeExtension` is now a factory. Register `CodeExtension()` instead of `CodeExtension`. It accepts a `languages` list and a `highlightStyle`. The default list covers the common languages: JavaScript, TypeScript, TSX, HTML, CSS, JSON, YAML, TOML, Shell, Python, SQL, XML, Go, Rust, Java, C/C++, PHP, Diff, Dockerfile, and Markdown.

Fence info matches aliases exactly. Unknown languages stay plain text. `BaseKit` accepts a `code` option object with the same settings. `BaseKit({ code: { languages: [] } })` keeps code editing but turns parsing and highlighting off.

Extensions can contribute code fence languages through the new `addMarkdownCodeLanguages` hook.
