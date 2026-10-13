---
"@inksane/core": patch
---

Fixed extension event handlers so root and child extensions receive editor events in priority order. Handlers are removed when the editor is destroyed.
