---
"@inksane/core": patch
---

Extensions that register an already registered command name now log a warning. The higher-priority extension keeps its command, and the colliding command from the lower-priority extension is skipped.
