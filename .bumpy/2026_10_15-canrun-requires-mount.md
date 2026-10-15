---
"@inksane/core": patch
---

`editor.canRun(name)` now returns `false` when the editor is not mounted, matching the fact that commands need the mounted view.
