---
"@inksane/core": patch
---

Pressing Enter now always inserts a plain newline, including at the end of a
list item or blockquote. The Markdown language keymap took over Enter at high
precedence and injected list or quote markup instead, so pressing Enter twice
could not add two new lines.
