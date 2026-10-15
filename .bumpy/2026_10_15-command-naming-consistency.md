---
"@inksane/core": minor
---

Aligned command names with the mark and block rules.

Marks now use `setBold`, `setItalic`, `setCode`, `setLink`, and `setStrikethrough`. The removed `insertBold`, `insertItalic`, `insertCode`, and `insertLink` behavior is an optional `content` option on those `set` commands. Strikethrough uses the full name, so `setStrike` is now `setStrikethrough`, and `removeStrike` and `toggleStrike` follow.

Block features use the `insert` verb: `insertHeading`, `insertBlockquote`, `insertCodeBlock`, and `insertTaskList` replace `setHeading`, `setBlockquote`, `setCodeBlock`, and `setTaskList`.
