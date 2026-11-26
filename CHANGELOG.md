# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

## [Unreleased]

### Added

- `lg-parcels`: parcels from the Parcel integration with a summary sentence instead of a count, a four-step track per parcel, the history on tap, and adding a parcel in place with carrier detection.
- `lg-parcels`: at most `max` parcels (default 3), the rest behind "Show N more"; expanded rows are compact and fold back after two minutes without input.
- `lg-parcels`: common carrier event texts translated to German or English (original on hover); dates in words without a year (Amazon) read correctly; dates without a time show no time.
- `lg-parcels`: carrier picker when adding (usual carriers in Germany first); DHL Paket numbers (`JJD…`, `JVGL…`, `00340…`) that Parcel does not detect are preselected; Parcel's carrier refusal is shown in plain words.
- `lg-parcels`: postcode field for carriers that need it (DPD Germany, PostNL); left empty, the Parcel integration's default postcode applies. Needs a Parcel integration whose `add_parcel` accepts `postcode`.

## [0.2.0-rc.1] - 2026-11-26

First pre-release. In daily use on one installation; options may still change before 0.2.0.

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

[Unreleased]: https://github.com/studio-prisma/homeassistant-cards-liquid-glass/compare/v0.2.0-rc.1...HEAD
[0.2.0-rc.1]: https://github.com/studio-prisma/homeassistant-cards-liquid-glass/releases/tag/v0.2.0-rc.1
