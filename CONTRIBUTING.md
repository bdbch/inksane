# Contributing to inksane

## Read This Before Contributing

### Community Rules

Follow GitHub's [Community Guidelines](https://docs.github.com/en/site-policy/github-terms/github-community-guidelines) and our [Code of Conduct](./CODE_OF_CONDUCT.md) in every project space. Be respectful, constructive, and professional when discussing issues, reviews, and pull requests.

### Code Responsibilities

Take ownership of the code you submit. Keep changes focused on the agreed issue, understand the code you change, and test the behavior yourself. Respond to review feedback and keep your branch up to date until the pull request is ready to merge.

### AI Usage

AI tools are welcome when used responsibly. We still expect every contribution to come from a human contributor who understands and stands behind the submitted work.

Automated or AI-driven spam pull requests will be closed, even when the code appears valid. We are looking for people who want to contribute to the project, not bots submitting changes without meaningful human involvement.

### Security Issues

Report known security vulnerabilities privately at [git@bdbch.com](mailto:git@bdbch.com). Do not open a public issue for a vulnerability before maintainers have had a chance to investigate and address it.

### Compensation

inksane is a free, open-source hobby project. We cannot currently offer monetary rewards for security reports or other contributions.

## Requirements

You need the following software to run, test, and build inksane:

- [Git](https://git-scm.com/) to clone the repository and contribute changes.
- [Node.js](https://nodejs.org/) version `22.12.0` or later.
- [pnpm](https://pnpm.io/) version `11.18.0`.

After cloning the repository, install dependencies and run the complete validation suite:

```sh
pnpm install
pnpm ready
```

`pnpm ready` runs type checks, tests, and the production build. Use `pnpm dev` to run the playground locally.

## How to Contribute

### Contribute Code

1. Find or create an issue for the work. Only pick up issues that are clear and ready to be worked on.
2. If the issue is unclear, discuss it with a maintainer before writing code.
3. Create a pull request that references the issue it addresses.
4. Test your changes and make sure all repository checks pass.
5. Write a clear pull request description that explains the problem, the change, and how you tested it.

### Contribute on Issues

If an issue is outdated, mention a maintainer and explain why it should be closed. We will close it when appropriate and credit you for identifying it.

### Moderation

If you see behavior that violates the community rules, call it out respectfully and mention a maintainer. For sensitive situations, report it privately using the contact in the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Releases and Publishing

inksane uses [Bumpy](https://bumpy.varlock.dev), a changeset-style release tool, to manage package versions and changelog entries. Bump files live in `.bumpy/` and describe the package version change and its release note.

For a change to a published package, create one bump file for the pull request:

```sh
pnpm run release:add
```

Choose the affected package, the version level (`patch`, `minor`, or `major`), and a concise changelog entry. Keep the bump file up to date if the scope of the pull request changes. For work that intentionally does not need a release, create an empty bump file:

```sh
pnpm exec bumpy add --empty --name "docs-update"
```

Check the release metadata before opening a pull request:

```sh
pnpm run release:check
pnpm run release:status
```

Every pull request runs Bumpy's strict release check. The check confirms that package changes have the required bump information.

Maintainers publish releases through GitHub Actions. After a successful push to `main`, Bumpy creates a version pull request when pending bump files exist. That pull request updates package versions and changelogs. After it is merged, the workflow builds the packages and publishes them to npm with provenance enabled. Contributors do not need to publish packages themselves.
