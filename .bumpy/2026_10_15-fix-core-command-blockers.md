---
"@inksane/core": patch
---

Fixed `cutContent` so it moves content to the correct range instead of throwing. Made `cutContent` and `deleteContent` chainable by returning the chain type like the other commands. Allowed the `focus` command to run in read-only editors.
