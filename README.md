# Liquid Glass Cards

Dashboard cards for Home Assistant in a calm glass style: a clock header, an "up next" list, area tiles that switch a whole room, rows for departures or system facts, one number with a sparkline, and a navigation bar.

Deutsche Fassung: [README.de.md](README.de.md)

One file, no build tools on your side, no third-party libraries at runtime. The cards work with any theme and read their glass colours from theme variables when a theme provides them.

## Cards

| Card | Purpose |
|---|---|
| `custom:lg-hero` | Clock, date, current weather, status chips |
| `custom:lg-headline` | Greeting by time of day, or a one-line status ("All quiet. One thing is open.") |
| `custom:lg-now` | Rows that appear only when a rule matches, each with one action button |
| `custom:lg-rooms` | Grid of area tiles. A tap switches all lights of the area, press and hold opens the area |
| `custom:lg-room` | A single tile for an area or one entity |
| `custom:lg-list` | Glass card with rows: split from one entity state, or one row per entity |
| `custom:lg-stat` | One number with a history sparkline |
| `custom:lg-nav` | Bottom bar on phones, pill row on wide screens |
| `custom:lg-agenda` | Upcoming calendar events grouped by day (today, tomorrow, …) |
| `custom:lg-energy` | Energy today, this week and this month, each against the previous period up to the same point; today's curve over yesterday's; largest consumer |
| `custom:lg-parcels` | Parcels from the Parcel integration: one sentence on what is going on, a four-step track per parcel, history on tap, adding a parcel in place |
| `custom:lg-idle` | No visible card: opens a calm view after inactivity, a tap returns, dims the screen at night |
| `custom:lg-column` | Tall glass panel holding other cards; on wide screens it reaches the bottom of the window and docks its last cards at the bottom |

## Requirements

- Home Assistant 2025.1 or newer. Developed and tested on 2026.10 and 2026.11.
- A sections view is recommended. The cards also work in other view types.
- Areas (and optionally floors) set up in Home Assistant for the room tiles.

## Installation

**HACS / Marketplace (custom repository)**

1. Add `https://github.com/studio-prisma/homeassistant-cards-liquid-glass` as a custom repository of type *Dashboard*.
2. Install *Liquid Glass Cards*. The resource is registered for you.
3. Reload the browser.

**Manual**

1. Download `liquid-glass-cards.js` from the latest release.
2. Copy it to `config/www/liquid-glass-cards/`.
3. Add the resource `/local/liquid-glass-cards/liquid-glass-cards.js?v=<version>` with type *JavaScript module* under *Settings → Dashboards → Resources*.
4. Reload the browser. After an update, change the `?v=` value, otherwise browsers keep the old file for up to 31 days.

Check: open the card picker and search for "Liquid Glass". If nothing shows, the resource did not load. The browser console prints `LIQUID-GLASS-CARDS <version>` once the file runs.

## Configuration

Every card has a full form in the dashboard editor. It shows the values that are in effect, defaults included, and it does not write a value that equals its default. Lists (chips, rows, areas, navigation items) are edited as lists with add, reorder and delete; rules and time windows are fields of each entry. The list editors use the object selector of recent Home Assistant versions; where it is missing, edit lists in the code editor. Keys the form does not know stay untouched, for example `data` and `target` of a button.

### Shared options

| Option | Cards | Meaning |
|---|---|---|
| `size: large` | all | Larger type, tiles and buttons for wall displays |
| `when` | chips, rows | Show only when the entity matches: `state`, `state_not` (one value or a list), `above`, `below` |
| `after`, `before`, `weekdays` | chips, rows | Show only in a time window. `HH:MM`, may cross midnight. Weekdays as `mon` … `sun` |
| `{state}`, `{name}` | labels, titles, subtitles | Replaced by the formatted state and the entity name |

Time windows use the clock of the device that shows the dashboard.

### lg-hero

```yaml
type: custom:lg-hero
size: large
weather: weather.home
chips:
  - entity: alarm_control_panel.home
    label: "Alarm {state}"
  - entity: binary_sensor.waste_collection_tomorrow
    label: Bin tomorrow
    color: amber            # amber, orange, green, blue, red; default is neutral
    when: { state: "on" }
  - entity: sensor.next_departure
    label: "Train {state}"
    color: blue
    after: "05:30"
    before: "10:00"
    weekdays: [mon, tue, wed, thu, fri]
```

A chip opens the entity's details. Add `tap` to change that, with the same keys as a `button` in `lg-now`. `show_date: false` hides the date.

### lg-headline

```yaml
type: custom:lg-headline
mode: greeting              # or: status
name: Alex
weather: weather.home
watch:                      # status mode: counted when they match
  - entity: binary_sensor.waste_collection_tomorrow
    when: { state: "on" }
chips: []                   # same as in lg-hero
```

### lg-now

```yaml
type: custom:lg-now
title: Up next              # default follows the language
max: 3                      # at most this many rows, in the order written
hint: changes with the time of day
items:
  - title: Lights still on
    subtitle: "{state}"
    entity: light.all_lights
    when: { state: "on" }
    after: "22:00"
    before: "05:00"
    button:
      label: All off
      tone: warm
      service: light.turn_off      # target defaults to the row's entity
  - title: Water the plants
    entity: sensor.plants_due
    when: { above: 0 }
    button: { label: Open, action: navigate, path: /lovelace/household }
```

Button actions: `service` (with optional `data` and `target`), `action: toggle`, `action: navigate` with `path`, or none for the entity's details. A row without `button` is information only.

### lg-rooms and lg-room

```yaml
type: custom:lg-rooms
floor: ground_floor         # every area of this floor, in name order
areas:                      # listed areas come first, in this order
  - living_room
  - area: kitchen
    name: Cooking
    icon: mdi:stove
    exclude: [light.kitchen_status_led]
extra:                      # single entities as tiles, shown in blue
  - entity: switch.media_rack
    name: Devices
    icon: mdi:power-plug
columns: 2
```

How a tile decides:

- It collects the `light` entities of the area, directly or through their device. Hidden, diagnostic and configuration entities are skipped.
- A light group is left out when all of its members are in the same area, so lights are not counted twice.
- If any light is on, a tap turns all of them off. Otherwise it turns all of them on.
- Press and hold opens the area page. Change the target with `hold_path`.
- Below 460 px width the icons are hidden so that names stay readable.

### lg-list

```yaml
type: custom:lg-list
title: To the main station
icon: mdi:train
entity: sensor.next_trips                 # state: "07:29 07:56 S9 (27 min) · 07:35 08:07 S8 (32 min)"
separator: " · "
pattern: '^(\S+) (\S+) (.+) \((.+)\)$'    # optional: split each part into columns
columns: ["{1} → {2}", "{3}", "{4}"]
note:                                     # shown top right in orange
  entity: sensor.disruption_text
  when: { state_not: [none, unknown, unavailable] }
items:                                    # additional rows, one per entry
  - label: Last backup
    entity: sensor.backup_last_successful
  - label: System
    value: "84 · good"
    tone: green                           # green, orange, red
  - lead: "09:00"
    label: Weekly
```

### lg-stat

```yaml
type: custom:lg-stat
entity: sensor.energy_today
label: Used today
digits: 1
hours: 24        # history shown in the sparkline, 1 to 168
graph: true
```

### lg-nav

```yaml
type: custom:lg-nav
items:
  - { label: Today, icon: mdi:home, path: /my-dashboard/today }
  - { label: Rooms, icon: mdi:lightbulb, path: /my-dashboard/rooms }
```

Place it as the last card of a view. On phones it is fixed to the bottom edge and reserves the space it covers. From 870 px width it becomes a row of pills in the normal flow. Paths must be local and start with `/`.

### lg-agenda

```yaml
type: custom:lg-agenda
entities: [calendar.personal, calendar.work]
days: 2                      # today and tomorrow
max: 8
exclude: '^Private appointment$'   # hide events whose title matches
```

All-day events come first in each day. Finished events of today are left out. Events are read through the calendar API of Home Assistant every five minutes.

### lg-energy

```yaml
type: custom:lg-energy
statistics: [sensor.kitchen_energy, sensor.office_energy]   # optional
```

Without `statistics` the card adds up the top-level devices of the energy settings (devices not included in another one); without those it uses the grid meter. Trends compare with yesterday up to the same time, the previous week up to the same weekday and time, and the previous month up to the same day. Statistics are read every ten minutes.

`lg-list` also has `zero_text` per row (text instead of "0 parcels") and `warn: {entity, when, text, label}`: when the rule matches, the card turns amber, shows the text as a banner and the label at the top right. With `mode_entity` the top right shows `mode_label` (default "direct") otherwise.

### lg-parcels

```yaml
type: custom:lg-parcels
entity: sensor.parcel_raw_shipment_data     # raw shipment data sensor of the Parcel integration
device_id: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4  # optional: Parcel device, shows the + button for adding
keep_days: 2                                # delivered parcels stay this many days, faded
max: 3                                      # more parcels sit behind "Show N more"
hide_empty: false                           # true: no card when there is nothing to show
```

Needs the [Parcel](https://github.com/jmdevita/parcel-ha) integration. The card reads the `deliveries` attribute of the raw shipment data sensor. Instead of a count it writes one or two sentences ("Shoes are announced. Books arrived yesterday."). Parcels out for delivery are amber, missed deliveries, pick-ups and problems orange. A tap on a parcel opens its last events. The + button opens two fields in the card; the carrier is detected while typing (`parcelapp.detect_carrier`) and the parcel is added with `parcelapp.add_parcel`. Adding needs Parcel Premium, which allows about 20 additions a day; a refusal is shown under the button. Event texts come from the carrier in its own language; common phrases of the larger carriers (Amazon, DHL, DPD, Hermes, GLS, UPS, Poste Italiane) are shown in German or English, the original stays on hover, unknown texts are shown as sent. Nothing is sent to a translation service.

### lg-idle (wall displays)

```yaml
# on the main view
type: custom:lg-idle
after: 120                  # seconds without touch, mouse or keys
path: /my-dashboard/calm
users: [Wall tablet]        # user name or id; empty = everyone
---
# on the calm view
type: custom:lg-idle
tap_path: /my-dashboard/main   # the first tap anywhere goes back and does nothing else
dim_after: "22:00"
dim_before: "06:00"
dim_opacity: 0.55
```

The card itself is invisible; put it last in a section. Dimming is an overlay, the display backlight is not changed.

### lg-column (desktop layouts)

```yaml
type: custom:lg-column
dock: 1                      # the last card sits at the bottom of the panel
cards:
  - type: custom:lg-agenda
    entities: [calendar.personal]
  - type: weather-forecast
    entity: weather.home
```

Put one column in each section of a three-column sections view. From 870 px width the panel reaches down to the bottom of the window, so the columns of one row end on the same line, and the cards inside lose their own glass. Below that width the panel disappears and each card keeps its glass. `visibility` of the cards inside works as in a section. `fill: false` keeps the natural height. The cards inside are edited with the card list of Home Assistant below the form.

Other options added for this layout: `all_off: true` on `lg-rooms` (button "All lights off" in the header), `show_header: false` on `lg-now` and `lg-agenda`, `chips_position: below` on `lg-headline` (default is next to the title on wide screens).

## Theme variables

Optional. Without them the cards use their own values.

| Variable | Used for |
|---|---|
| `--glass-bg` | card and tile background |
| `--glass-blur` | `backdrop-filter` value |
| `--glass-solid` | background when the system asks for reduced transparency |
| `--primary-text-color`, `--primary-color` | text and focus ring |
| `--ha-font-family-body` | typeface |

## Accessibility

- Tiles, chips, rows with an action and navigation entries are real buttons and links: reachable by keyboard, with a visible focus ring.
- Tiles announce their on/off state (`aria-pressed`).
- `prefers-reduced-motion` removes the press animation. `prefers-reduced-transparency` replaces glass with a solid surface.

## Known limits

- Room tiles switch lights only. Covers, climate and media are not part of a tile.
- Colours are tuned for dark themes. Light themes work but have not been checked for contrast.
- The interface texts exist in English and German. Other languages fall back to English.
- The clock follows the Home Assistant time zone; time windows follow the device clock.
- `lg-nav` is fixed to the viewport. Inside a container that sets a CSS transform it will be positioned relative to that container.
- Not tested: Safari older than 16 (container queries), the Android and iOS companion apps in every version.

## Development

```bash
npm ci --ignore-scripts   # test dependency only
npm run lint
npm test                  # builds first
```

The sources are in `src/`, one file per card. `tools/build.mjs` joins them into `dist/liquid-glass-cards.js`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT, see [LICENSE](LICENSE).
