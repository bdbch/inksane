# AGENTS.md

Project instructions for inksane. Read this before work.
Global and personal rules live in the shared AGENTS.md, not here.

## Git and pull requests

- Never push automatically. Leave `git push` to the user.
- Never create pull requests automatically. Write the description and stop, so the user can review and open it.
- Write commit messages as Conventional Commits, for example `fix(core): ...` or `feat(react): ...`.
- Write pull request titles in the same Conventional Commit style.
- Use the `unslop` skill on any text other people will read, such as PR descriptions, issue text, review replies, and comments.

## Releases: Bumpy, not Changesets

- This repo uses Bumpy, not Changesets. Never add `.changeset` files.
- Bump files live in `.bumpy/` as small markdown files.
- Create them directly by hand. Do not run the Bumpy CLI.
- Create a bump file only when a change actually changes a published package. Published packages are `@inksane/core`, `@inksane/react`, and `@inksane/extension-collaboration`.
- Do not create bump files for demo or playground-only changes. `@inksane/playground` is private and is never released.
- Name the file `YYYY_MM_DD-short_description_of_change.md`, for example `2026_10_13-add-react-bindings.md`.
- Pick the level by the change, not the amount of code:
  - `patch` for bug fixes and internal changes with no public API change.
  - `minor` for new backwards-compatible features or public API additions.
  - `major` for breaking changes to public API or behavior.
- The frontmatter maps each changed package to its level. The body is the changelog entry in plain language.

```markdown
---
"@inksane/core": minor
"@inksane/react": minor
---

Added the `@inksane/react` bindings and the new `mount` and `unmount` editor events.
```

- Keep the bump file in sync with the pull request. If the scope grows, update the level and message.
- One bump file per pull request is usually enough.
- Check the release metadata before opening a pull request:

```sh
pnpm release:check
pnpm release:status
```

See `.bumpy/README.md` and `CONTRIBUTING.md` for the full details.
