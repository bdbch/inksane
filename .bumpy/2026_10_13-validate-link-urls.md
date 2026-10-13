---
"@inksane/core": patch
"@inksane/playground": none
---

`insertLink` and `setLink` now reject empty and unsafe URLs such as
`javascript:` and `data:`, matching the validation already applied by
`insertImage`. Unsafe URLs return `false` and leave the document unchanged.

The New Issue playground example now inserts a safe placeholder URL so its
Link toolbar button keeps working.
