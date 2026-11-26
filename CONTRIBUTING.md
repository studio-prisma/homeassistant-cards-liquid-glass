# Contributing

This project is small and maintained in spare time. The rules below exist so a pull request can be reviewed in one sitting.

## Before you open a pull request

- Open an issue first for anything beyond a typo.
- One change per PR. A refactor bundled with a fix is two PRs.
- Security issues never go into a public PR or issue. See [SECURITY.md](SECURITY.md).

## Development setup

```bash
git clone https://github.com/studio-prisma/homeassistant-cards-liquid-glass.git
cd homeassistant-cards-liquid-glass
npm ci --ignore-scripts
```

Node 22 or newer. The only dependency is `jsdom`, used by the tests. Nothing from npm is part of the shipped file.

## Layout

| Path | Content |
|---|---|
| `src/core.js` | texts, colours, shared CSS, pure helpers, editor form helper |
| `src/base.js` | base class: render only when shown values changed, timers |
| `src/chips.js` | status chips shared by `lg-hero` and `lg-headline` |
| `src/<card>.js` | one file per card |
| `src/editor-spec.js` | what the visual editor shows per card, and the conversion between configuration and form data |
| `src/editor.js` | the editor element |
| `src/index.js` | registers the elements and the card picker entries |
| `tools/build.mjs` | joins `src/` into `dist/liquid-glass-cards.js` |
| `tools/lint.mjs` | syntax check and banned APIs |
| `tests/` | unit tests for the helpers, DOM boot test for the built file |

`dist/` is not committed. The release workflow builds it from the tag.

## What a change has to pass

```bash
npm run lint
npm test
```

CI runs the same on Node 22 and 24, plus a workflow lint, the central security scan and the HACS validation. The aggregating job is called **Gate**. A red pipeline is not mergeable. Until 0.2.0 the HACS validation is informational, because HACS ignores pre-releases; it joins the Gate with the first stable release.

## Code conventions

- Plain ES modules that import only from each other, with named imports on one line. The build depends on that form and fails on anything else.
- No runtime dependency. A new development dependency needs a reason in the PR description.
- Text from Home Assistant is written with `textContent` or as a text node. `tools/lint.mjs` rejects `innerHTML` and similar.
- No own network requests, no browser storage.
- Every interactive element is a `button` or an `a`, has a focus style and gives feedback on press.
- Respect `prefers-reduced-motion` and `prefers-reduced-transparency` in new styles.
- A new option gets a line in both READMEs, a field in `src/editor-spec.js` with labels in both languages, and a round-trip case in `tests/editor.test.mjs`.
- Comments explain why, not what.
- Example data uses neutral names (`light.kitchen`, `sensor.next_trips`). No real names, places or hosts.

## Release

1. Rename `## [Unreleased]` in `CHANGELOG.md` to `## [X.Y.Z] - YYYY-MM-DD` and add a new empty `Unreleased` block.
2. Set the version in `package.json` and in `VERSION` in `src/core.js`. The build fails if they differ.
3. `git commit -m "chore(release): vX.Y.Z"`
4. `git tag -a vX.Y.Z -m "vX.Y.Z"` and push the tag. Pre-releases use `vX.Y.Z-rc.N`.
5. The release workflow checks the version, runs lint and tests, builds and attaches `liquid-glass-cards.js`.
6. For 0.2.0 (first stable release): add `hacs` back to the `needs` of the Gate job in `validate.yml`.
