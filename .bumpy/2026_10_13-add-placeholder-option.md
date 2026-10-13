---
"@inksane/core": minor
"@inksane/playground": none
---

Added a `placeholder` editor option. Passing a string shows that text while the
document is empty and hides it once content exists. The placeholder is generated
content on the empty line, not document content, so it never appears in
`getMarkdown()`. It is exposed through the `inksane-placeholder` class so themes
can style it.
