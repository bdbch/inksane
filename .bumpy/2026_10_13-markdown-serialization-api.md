---
"@inksane/core": minor
---

Added `getMarkdown()` and `setMarkdown()` as the primary document serialization API, plus `textJSON` for CodeMirror's raw line array. Deprecated the `json` getter and setter, which returned that line array under a misleading name. They now alias `textJSON` and will be removed in a future major release.
