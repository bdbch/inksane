---
"@inksane/core": minor
"@inksane/extension-collaboration": patch
---

Added the `editable` option and `editor.setEditable()` to control read-only mode. Read-only editors keep rendering, selection, and scrolling while a transaction filter blocks local edits. Commands and `canRun()` return false while read-only. Programmatic content setters and remote collaboration updates still work.
