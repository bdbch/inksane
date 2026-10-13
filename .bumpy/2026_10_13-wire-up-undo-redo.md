---
"@inksane/core": patch
---

Wire up undo and redo. The editor now registers CodeMirror's history extension and history keybindings by default, so Mod-Z undoes and Mod-Shift-Z / Mod-Y redo for both typing and command-based edits.
