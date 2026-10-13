---
"@inksane/core": patch
---

Only show the open-link icon for links that have a real, safe URL. Footnote
references, task checkboxes, and wiki links are parsed as links even though they
have no URL, which previously rendered a broken open-link control pointing at an
empty `href`. These links now render without the icon.
