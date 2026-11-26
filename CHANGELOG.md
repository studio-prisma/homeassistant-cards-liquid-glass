# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

## [Unreleased]

### Added

- Cards `lg-hero`, `lg-headline`, `lg-now`, `lg-rooms`, `lg-room`, `lg-list`, `lg-stat` and `lg-nav`.
- `size: large` on every card for wall displays.
- Rules for chips and rows: `when` (state, state_not, above, below) and time windows (`after`, `before`, `weekdays`).
- Visual editor for every card: shows the values in effect including defaults, edits lists (chips, rows, areas, navigation items) with their rules and time windows, and keeps unknown keys.
- `lg-agenda`: upcoming calendar events grouped by day.
- `lg-energy`: energy today, week and month with same-point trends and the largest consumer.
- `lg-list`: `zero_text` per row, `warn` state with banner and amber card, `mode_entity` label.
- `lg-idle`: calm view after inactivity, tap to return, dimming at night, limited to chosen users.
- `lg-column`: tall glass panel for desktop layouts, fills to the bottom of the window and docks cards at the bottom.
- `all_off` on `lg-rooms`, `show_header` on `lg-now`, chips next to the title in `lg-headline`.
- Interface texts in English and German.
- Build without third-party tools (`tools/build.mjs`), lint (`tools/lint.mjs`), unit tests and a DOM boot test.

[Unreleased]: https://github.com/studio-prisma/homeassistant-cards-liquid-glass/commits/main
