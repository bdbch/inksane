---
"@inksane/core": minor
---

Added the footnotes extension. It parses footnote references (`[^1]`) and definitions (`[^1]: note`), renders references as superscript markers, renders definitions as a distinct block with an identifier, and lets a reference click jump to its definition. It also converts pasted footnote HTML and is included in BaseKit. Pass `footnotes: false` to BaseKit to disable it.
