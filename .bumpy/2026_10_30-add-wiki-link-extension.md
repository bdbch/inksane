---
"@inksane/core": minor
---

Added the wiki link extension with `[[target]]` and `[[target|label]]` parsing, a distinct rendered style, `insertWikiLink` and `openWikiLink` commands, and a `resolveTarget` hook for host-defined navigation. BaseKit includes wiki links by default and accepts the `wikiLink` option.

Command contexts now report `isSpeculative` while `canRun()` evaluates a command, so commands can skip navigation, dialogs, and other external side effects.
