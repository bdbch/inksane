---
"@inksane/core": minor
---

Added selection state queries to the editor. `isActive(name, attrs?)` reports whether a mark or block node is active at the current selection, `getMarkRange(name?)` returns the range of the active mark, and `canRun(command, ...args)` reports whether a command would succeed without running it.

Extensions declare their query names and syntax nodes through the new `addStateQueries` hook.
