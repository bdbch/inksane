---
"@inksane/core": major
---

Removed the deprecated `editor.json` accessor. Use `editor.getMarkdown()` to read the document, or `editor.textJSON` for the raw CodeMirror line array.
