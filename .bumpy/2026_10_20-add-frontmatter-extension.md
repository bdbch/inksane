---
"@inksane/core": minor
---

Added the frontmatter extension. It recognizes a leading YAML block, renders it as a collapsible properties table, reveals the YAML source while the selection is inside the block, and exposes `getYaml(editor)` for reading the parsed values.

Adding or removing a closing fence also updates the opening block in long documents.
