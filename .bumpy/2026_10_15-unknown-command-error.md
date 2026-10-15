---
"@inksane/core": patch
---

Calling a command that is not registered, such as `editor.commands.unknown()`, now throws the same `Command "unknown" is not registered.` error as `editor.canRun` and `editor.chain()`.
