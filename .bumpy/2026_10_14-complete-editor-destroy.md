---
"@inksane/core": patch
---

Fixed editor destruction to release DOM references, pending state, and event listeners. Repeated destruction is safe. Destroyed editors cannot mount again, but a new editor can reuse the same element.
