import { locale, t } from './core.js';
import { parcelText } from './parcels-calc.js';

/**
 * What the visual editor shows for each card, and how a card configuration is
 * turned into form data and back.
 *
 * Two rules keep the YAML clean and the form honest:
 *   - the form always shows the value that is in effect, defaults included;
 *   - a value equal to its default is not written to the configuration.
 *
 * Nested blocks (`when`, `button`, `note`) are edited as flat fields and
 * rebuilt on save. Keys the form does not know are kept as they are.
 */

const LABELS = {
  en: {
    size: 'Size', weather: 'Weather entity', show_date: 'Show date', mode: 'Mode', name: 'Name',
    title: 'Title', hint: 'Hint next to the title', max: 'Maximum rows', show_period: 'Show time of day',
    empty_text: 'Text when empty', floor: 'Floor (adds all its areas)', areas: 'Areas', extra: 'Additional entity tiles',
    columns: 'Columns', show_header: 'Show header', area: 'Area', entity: 'Entity', icon: 'Icon',
    separator: 'Separator between rows', pattern: 'Pattern to split a row (regular expression)',
    label: 'Label', unit: 'Unit', hours: 'Hours of history', graph: 'Show graph', digits: 'Decimal places',
    chips: 'Status chips', watch: 'Counted as open when', items: 'Rows', color: 'Colour',
    show_state: 'Append the state', subtitle: 'Second line', value: 'Value (instead of the state)',
    lead: 'Leading text, for example a time', tone: 'Emphasis', path: 'Path, starting with /',
    hold_path: 'Path opened on press and hold', exclude: 'Lights to leave out',
    when_state: 'Show when the state is (several: comma separated)',
    when_state_not: 'Hide when the state is (several: comma separated)',
    when_above: 'Show when the value is above', when_below: 'Show when the value is below',
    after: 'Show from (time)', before: 'Show until (time)', weekdays: 'Only on these weekdays',
    button_label: 'Button text', button_do: 'Button does', button_service: 'Action to run, for example light.turn_off',
    button_path: 'Path to open', button_tone: 'Button emphasis', highlight: 'Highlight this row', show_temperature: 'Show the temperature', temperature: 'Temperature entity',
    statistics: 'Meters (empty: from the energy settings)', show_top: 'Show the largest consumer', zero_text: 'Text when the value is 0',
    warn_entity: 'Warning: entity', warn_state: 'Warning when the state is (comma separated)', warn_text: 'Warning text', warn_label: 'Label in the header while warning',
    mode_entity: 'Show the mode in the header (entity)', mode_label: 'Label in the header otherwise',
    layout: 'Layout', opt_calm: 'Calm screen (centred)', show_hint: 'Show the hint at the bottom', hero_hint: 'Hint text',
    idle_after: 'Seconds without input', idle_path: 'Then open this path', tap_path: 'A tap anywhere opens this path',
    dim_after: 'Dim the screen from', dim_before: 'Dim the screen until', dim_opacity: 'Dimming (0 to 0.9)', users: 'Only for these users (name or id)',
    note_entity: 'Note at the top right: entity', note_text: 'Note text (empty: the state)',
    note_state_not: 'Hide the note when the state is (comma separated)',
    row_columns: 'Columns of a row, {1} {2} … from the pattern',
    opt_normal: 'Normal', opt_large: 'Large (wall display)', opt_greeting: 'Greeting', opt_status: 'Status sentence',
    opt_neutral: 'Neutral', opt_amber: 'Amber', opt_orange: 'Orange', opt_green: 'Green', opt_blue: 'Blue', opt_red: 'Red',
    opt_warm: 'Warm', opt_cool: 'Blue', opt_details: 'Open details', opt_toggle: 'Toggle the entity',
    opt_navigate: 'Open a path', opt_service: 'Run an action',
    show_header_now: 'Show title', chips_position: 'Chips', opt_right: 'Next to the title (wide screens)', opt_below: 'Below the title',
    all_off: 'Button "All lights off" in the header', fill: 'Reach down to the bottom of the window (wide screens)',
    dock: 'Number of cards docked at the bottom', cards: 'Cards in this column',
    entities: 'Calendars', days: 'Days to show', exclude_events: 'Hide events whose title matches (regular expression)',
    parcel_entity: 'Parcel raw shipment data sensor', device_id: 'Parcel device (enables adding parcels)', keep_days: 'Keep delivered parcels for days',
    show_steps: 'Show the progress steps', hide_empty: 'Hide the card when there are no parcels',
  },
  de: {
    size: 'Größe', weather: 'Wetter-Entität', show_date: 'Datum anzeigen', mode: 'Modus', name: 'Name',
    title: 'Titel', hint: 'Hinweis neben dem Titel', max: 'Höchstzahl Zeilen', show_period: 'Tageszeit anzeigen',
    empty_text: 'Text, wenn leer', floor: 'Etage (nimmt alle ihre Bereiche dazu)', areas: 'Bereiche', extra: 'Zusätzliche Kacheln für Entitäten',
    columns: 'Spalten', show_header: 'Kopfzeile anzeigen', area: 'Bereich', entity: 'Entität', icon: 'Icon',
    separator: 'Trennzeichen zwischen Zeilen', pattern: 'Muster zum Zerlegen einer Zeile (regulärer Ausdruck)',
    label: 'Beschriftung', unit: 'Einheit', hours: 'Stunden Verlauf', graph: 'Kurve anzeigen', digits: 'Nachkommastellen',
    chips: 'Status-Chips', watch: 'Zählt als offen, wenn', items: 'Zeilen', color: 'Farbe',
    show_state: 'Zustand anhängen', subtitle: 'Zweite Zeile', value: 'Wert (statt des Zustands)',
    lead: 'Vorangestellter Text, z. B. eine Uhrzeit', tone: 'Hervorhebung', path: 'Pfad, beginnt mit /',
    hold_path: 'Pfad beim Halten', exclude: 'Lichter, die nicht mitzählen',
    when_state: 'Anzeigen, wenn der Zustand ist (mehrere: mit Komma)',
    when_state_not: 'Ausblenden, wenn der Zustand ist (mehrere: mit Komma)',
    when_above: 'Anzeigen, wenn der Wert größer ist als', when_below: 'Anzeigen, wenn der Wert kleiner ist als',
    after: 'Anzeigen ab (Uhrzeit)', before: 'Anzeigen bis (Uhrzeit)', weekdays: 'Nur an diesen Wochentagen',
    button_label: 'Text des Knopfs', button_do: 'Knopf macht', button_service: 'Aktion, z. B. light.turn_off',
    button_path: 'Pfad, der geöffnet wird', button_tone: 'Hervorhebung des Knopfs', highlight: 'Zeile hervorheben', show_temperature: 'Temperatur anzeigen', temperature: 'Temperatur-Entität',
    statistics: 'Zähler (leer: aus den Energie-Einstellungen)', show_top: 'Größten Verbraucher anzeigen', zero_text: 'Text, wenn der Wert 0 ist',
    warn_entity: 'Warnung: Entität', warn_state: 'Warnung, wenn der Zustand ist (mit Komma)', warn_text: 'Text der Warnung', warn_label: 'Beschriftung oben, solange gewarnt wird',
    mode_entity: 'Modus oben anzeigen (Entität)', mode_label: 'Beschriftung oben sonst',
    layout: 'Layout', opt_calm: 'Ruhebild (mittig)', show_hint: 'Hinweis unten anzeigen', hero_hint: 'Text des Hinweises',
    idle_after: 'Sekunden ohne Bedienung', idle_path: 'Dann diesen Pfad öffnen', tap_path: 'Ein Tippen irgendwo öffnet diesen Pfad',
    dim_after: 'Bildschirm dimmen ab', dim_before: 'Bildschirm dimmen bis', dim_opacity: 'Abdunkelung (0 bis 0,9)', users: 'Nur für diese Benutzer (Name oder ID)',
    note_entity: 'Hinweis oben rechts: Entität', note_text: 'Text des Hinweises (leer: der Zustand)',
    note_state_not: 'Hinweis ausblenden, wenn der Zustand ist (mit Komma)',
    row_columns: 'Spalten einer Zeile, {1} {2} … aus dem Muster',
    opt_normal: 'Normal', opt_large: 'Groß (Wand-Display)', opt_greeting: 'Begrüßung', opt_status: 'Lage-Satz',
    opt_neutral: 'Neutral', opt_amber: 'Gelb', opt_orange: 'Orange', opt_green: 'Grün', opt_blue: 'Blau', opt_red: 'Rot',
    opt_warm: 'Warm', opt_cool: 'Blau', opt_details: 'Details öffnen', opt_toggle: 'Entität umschalten',
    opt_navigate: 'Pfad öffnen', opt_service: 'Aktion ausführen',
    show_header_now: 'Titel anzeigen', chips_position: 'Chips', opt_right: 'Neben dem Titel (breite Bildschirme)', opt_below: 'Unter dem Titel',
    all_off: 'Knopf „Alle Lichter aus“ in der Kopfzeile', fill: 'Bis zum unteren Fensterrand reichen (breite Bildschirme)',
    dock: 'Anzahl Karten, die unten angedockt sind', cards: 'Karten in dieser Spalte',
    entities: 'Kalender', days: 'Anzahl Tage', exclude_events: 'Termine ausblenden, deren Titel passt (regulärer Ausdruck)',
    parcel_entity: 'Rohdaten-Sensor der Parcel-Integration', device_id: 'Parcel-Gerät (erlaubt das Hinzufügen)', keep_days: 'Zugestellte Sendungen so viele Tage zeigen',
    show_steps: 'Fortschrittsschritte anzeigen', hide_empty: 'Karte ausblenden, wenn keine Sendungen da sind',
  },
};

export function label(hass, key) {
  const code = locale(hass).slice(0, 2);
  return (LABELS[code] || LABELS.en)[key] || LABELS.en[key] || key;
}

/* ---- selectors ---------------------------------------------------- */

const text = { text: {} };
const bool = { boolean: {} };
const iconSel = { icon: {} };
const time = { time: {} };
const number = (min, max) => ({ number: { mode: 'box', min, max } });
const anyNumber = { number: { mode: 'box', step: 'any' } };
const entity = (domain, multiple) => ({ entity: { ...(domain ? { domain } : {}), ...(multiple ? { multiple: true } : {}) } });
const select = (hass, values, multiple) => ({
  select: { mode: multiple ? 'list' : 'dropdown', multiple: Boolean(multiple), options: values.map((value) => ({ value, label: label(hass, `opt_${value}`) })) },
});

function weekdaySelector(hass) {
  const codes = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  let names = codes;
  try {
    const format = new Intl.DateTimeFormat(locale(hass), { weekday: 'long', timeZone: 'UTC' });
    names = codes.map((code, index) => format.format(new Date(Date.UTC(2024, 0, 1 + index)))); // 1 Jan 2024 is a Monday
  } catch (err) {
    names = codes;
  }
  return { select: { mode: 'list', multiple: true, options: codes.map((value, index) => ({ value, label: names[index] })) } };
}

/** A field of a list entry. */
const sub = (hass, key, selector, required) => ({ label: label(hass, key), selector, required: Boolean(required) });

const ruleFields = (hass) => ({
  when_state: sub(hass, 'when_state', text),
  when_state_not: sub(hass, 'when_state_not', text),
  when_above: sub(hass, 'when_above', anyNumber),
  when_below: sub(hass, 'when_below', anyNumber),
  after: sub(hass, 'after', time),
  before: sub(hass, 'before', time),
  weekdays: sub(hass, 'weekdays', weekdaySelector(hass)),
});

const list = (name, labelField, descriptionField, fields) => ({
  name,
  selector: { object: { multiple: true, label_field: labelField, description_field: descriptionField, fields } },
});

const sizeField = (hass) => ({ name: 'size', selector: select(hass, ['normal', 'large']) });

const chipFields = (hass) => ({
  entity: sub(hass, 'entity', entity(), true),
  label: sub(hass, 'label', text),
  color: sub(hass, 'color', select(hass, ['neutral', 'amber', 'orange', 'green', 'blue', 'red'])),
  show_state: sub(hass, 'show_state', bool),
  ...ruleFields(hass),
});

/* ---- converting list entries -------------------------------------- */

const filled = (value) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0);

function clean(object) {
  const out = {};
  for (const [key, value] of Object.entries(object)) if (filled(value) && value !== false) out[key] = value;
  return out;
}

const joinList = (value) => (Array.isArray(value) ? value.join(', ') : String(value));

function splitList(value) {
  const parts = String(value).split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length === 1 ? parts[0] : parts;
}

const shortTime = (value) => (typeof value === 'string' && /^\d{1,2}:\d{2}/.test(value) ? value.slice(0, 5).padStart(5, '0') : value);

export function flatRule(item) {
  const { when, ...rest } = item;
  const out = { ...rest };
  if (when && typeof when === 'object') {
    if (when.state !== undefined) out.when_state = joinList(when.state);
    if (when.state_not !== undefined) out.when_state_not = joinList(when.state_not);
    if (when.above !== undefined) out.when_above = Number(when.above);
    if (when.below !== undefined) out.when_below = Number(when.below);
  }
  return out;
}

export function nestRule(item) {
  const { when_state: state, when_state_not: stateNot, when_above: above, when_below: below, ...rest } = item;
  const when = {};
  if (filled(state)) when.state = splitList(state);
  if (filled(stateNot)) when.state_not = splitList(stateNot);
  if (filled(above)) when.above = Number(above);
  if (filled(below)) when.below = Number(below);
  const out = clean(rest);
  if (out.after) out.after = shortTime(out.after);
  if (out.before) out.before = shortTime(out.before);
  if (out.color === 'neutral') delete out.color;
  if (out.tone === 'neutral') delete out.tone;
  if (Object.keys(when).length) out.when = when;
  return out;
}

function flatButton(item) {
  const { button, ...rest } = flatRule(item);
  if (!button || typeof button !== 'object') return rest;
  const { label: text_, tone, action, service, path, ...other } = button;
  const kind = action === 'toggle' || action === 'navigate' ? action : service ? 'service' : 'details';
  return clean({ ...rest, button_label: text_, button_do: kind, button_service: service, button_path: path, button_tone: tone === 'warm' ? 'warm' : 'neutral', _button: Object.keys(other).length ? other : undefined });
}

function nestButton(item) {
  const { button_label: text_, button_do: kind, button_service: service, button_path: path, button_tone: tone, _button: other, ...rest } = item;
  const out = nestRule(rest);
  if (filled(text_)) {
    const button = { label: text_ };
    if (tone === 'warm') button.tone = 'warm';
    if (kind === 'toggle') button.action = 'toggle';
    else if (kind === 'navigate' && filled(path)) Object.assign(button, { action: 'navigate', path });
    else if (kind === 'service' && filled(service)) button.service = service;
    // `data` and `target` are not in the form; keep them only while the button still runs an action.
    if (other && typeof other === 'object' && kind === 'service') Object.assign(button, other);
    out.button = button;
  }
  return out;
}

const flatArea = (entry) => (typeof entry === 'string' ? { area: entry } : { ...entry });

function nestArea(entry) {
  const out = clean(entry);
  return Object.keys(out).length === 1 && out.area ? out.area : out;
}

const CONVERT = {
  rule: [flatRule, nestRule],
  button: [flatButton, nestButton],
  area: [flatArea, nestArea],
  plain: [(entry) => ({ ...entry }), (entry) => { const out = clean(entry); if (out.tone === 'cool') delete out.tone; return out; }],
};

/* ---- cards -------------------------------------------------------- */

export const SPECS = {
  'lg-hero': {
    defaults: () => ({ show_date: true, layout: 'normal', show_hint: true, size: 'normal' }),
    lists: { chips: 'rule' },
    schema: (hass) => [
      { name: 'weather', selector: entity('weather') },
      { name: 'layout', selector: select(hass, ['normal', 'calm']) },
      { name: 'show_date', selector: bool },
      { name: 'show_hint', selector: bool },
      { name: 'hint', selector: text, label_key: 'hero_hint' },
      sizeField(hass),
      list('chips', 'label', 'entity', chipFields(hass)),
    ],
  },
  'lg-headline': {
    defaults: () => ({ mode: 'greeting', chips_position: 'right' }),
    lists: { chips: 'rule', watch: 'rule' },
    schema: (hass) => [
      { name: 'mode', selector: select(hass, ['greeting', 'status']) },
      { name: 'chips_position', selector: select(hass, ['right', 'below']) },
      { name: 'name', selector: text },
      { name: 'weather', selector: entity('weather') },
      list('chips', 'label', 'entity', chipFields(hass)),
      list('watch', 'entity', 'when_state', { entity: sub(hass, 'entity', entity(), true), ...ruleFields(hass) }),
    ],
  },
  'lg-now': {
    defaults: (hass) => ({ title: t(hass, 'now'), show_header: true, max: 3, show_period: true, empty_text: t(hass, 'nothing'), size: 'normal' }),
    lists: { items: 'button' },
    schema: (hass) => [
      { name: 'title', selector: text },
      { name: 'show_header', selector: bool, label_key: 'show_header_now' },
      { name: 'hint', selector: text },
      { name: 'max', selector: number(1, 10) },
      { name: 'show_period', selector: bool },
      { name: 'empty_text', selector: text },
      sizeField(hass),
      list('items', 'title', 'entity', {
        title: sub(hass, 'title', text, true),
        subtitle: sub(hass, 'subtitle', text),
        entity: sub(hass, 'entity', entity()),
        highlight: sub(hass, 'highlight', bool),
        ...ruleFields(hass),
        button_label: sub(hass, 'button_label', text),
        button_do: sub(hass, 'button_do', select(hass, ['details', 'toggle', 'navigate', 'service'])),
        button_service: sub(hass, 'button_service', text),
        button_path: sub(hass, 'button_path', text),
        button_tone: sub(hass, 'button_tone', select(hass, ['neutral', 'warm'])),
      }),
    ],
  },
  'lg-rooms': {
    defaults: (hass) => ({ title: t(hass, 'rooms'), hint: t(hass, 'rooms_hint'), columns: 2, show_header: true, all_off: false, size: 'normal' }),
    lists: { areas: 'area', extra: 'plain' },
    schema: (hass) => [
      { name: 'floor', selector: { floor: {} } },
      list('areas', 'area', 'name', {
        area: sub(hass, 'area', { area: {} }, true),
        name: sub(hass, 'name', text),
        icon: sub(hass, 'icon', iconSel),
        exclude: sub(hass, 'exclude', entity('light', true)),
        temperature: sub(hass, 'temperature', entity('sensor')),
        hold_path: sub(hass, 'hold_path', text),
      }),
      list('extra', 'name', 'entity', {
        entity: sub(hass, 'entity', entity(), true),
        name: sub(hass, 'name', text),
        icon: sub(hass, 'icon', iconSel),
        subtitle: sub(hass, 'subtitle', text),
        tone: sub(hass, 'tone', select(hass, ['cool', 'warm'])),
      }),
      { name: 'title', selector: text },
      { name: 'hint', selector: text },
      { name: 'columns', selector: number(1, 6) },
      { name: 'show_header', selector: bool },
      { name: 'all_off', selector: bool },
      sizeField(hass),
    ],
  },
  'lg-room': {
    defaults: () => ({ size: 'normal' }),
    lists: {},
    schema: (hass) => [
      { name: 'area', selector: { area: {} } },
      { name: 'entity', selector: entity() },
      { name: 'name', selector: text },
      { name: 'icon', selector: iconSel },
      { name: 'exclude', selector: entity('light', true) },
      sizeField(hass),
    ],
  },
  'lg-list': {
    defaults: () => ({ separator: ' · ', max: 6, size: 'normal' }),
    lists: { items: 'rule' },
    schema: (hass) => [
      { name: 'title', selector: text },
      { name: 'icon', selector: iconSel },
      { name: 'entity', selector: entity() },
      { name: 'separator', selector: text },
      { name: 'pattern', selector: text },
      { name: 'row_columns', selector: { text: { multiple: true } } },
      { name: 'max', selector: number(1, 20) },
      { name: 'empty_text', selector: text },
      { name: 'note_entity', selector: entity() },
      { name: 'note_text', selector: text },
      { name: 'note_state_not', selector: text },
      { name: 'warn_entity', selector: entity() },
      { name: 'warn_state', selector: text },
      { name: 'warn_text', selector: text },
      { name: 'warn_label', selector: text },
      { name: 'mode_entity', selector: entity() },
      { name: 'mode_label', selector: text },
      list('items', 'label', 'entity', {
        label: sub(hass, 'label', text),
        entity: sub(hass, 'entity', entity()),
        value: sub(hass, 'value', text),
        lead: sub(hass, 'lead', text),
        zero_text: sub(hass, 'zero_text', text),
        tone: sub(hass, 'tone', select(hass, ['neutral', 'green', 'orange', 'red'])),
        ...ruleFields(hass),
      }),
      sizeField(hass),
    ],
  },
  'lg-stat': {
    defaults: () => ({ digits: 1, graph: true, hours: 24 }),
    lists: {},
    schema: () => [
      { name: 'entity', selector: entity() },
      { name: 'label', selector: text },
      { name: 'unit', selector: text },
      { name: 'digits', selector: number(0, 3) },
      { name: 'graph', selector: bool },
      { name: 'hours', selector: number(1, 168) },
    ],
  },
  'lg-agenda': {
    defaults: (hass) => ({ title: t(hass, 'agenda'), show_header: true, days: 2, max: 8, empty_text: t(hass, 'no_events'), size: 'normal' }),
    lists: {},
    schema: (hass) => [
      { name: 'entities', selector: entity('calendar', true) },
      { name: 'title', selector: text },
      { name: 'show_header', selector: bool, label_key: 'show_header_now' },
      { name: 'days', selector: number(1, 14) },
      { name: 'max', selector: number(1, 20) },
      { name: 'exclude', selector: text, label_key: 'exclude_events' },
      { name: 'empty_text', selector: text },
      sizeField(hass),
    ],
  },
  'lg-energy': {
    defaults: (hass) => ({ title: t(hass, 'energy'), show_header: true, show_top: true }),
    lists: {},
    schema: () => [
      { name: 'title', selector: text },
      { name: 'statistics', selector: entity('sensor', true) },
      { name: 'show_header', selector: bool, label_key: 'show_header_now' },
      { name: 'show_top', selector: bool },
    ],
  },
  'lg-parcels': {
    defaults: (hass) => ({ title: parcelText(locale(hass)).title, keep_days: 2, max: 3, show_steps: true, hide_empty: false, empty_text: parcelText(locale(hass)).empty }),
    lists: {},
    schema: () => [
      { name: 'entity', selector: entity('sensor'), label_key: 'parcel_entity' },
      { name: 'device_id', selector: { device: { integration: 'parcelapp' } } },
      { name: 'title', selector: text },
      { name: 'keep_days', selector: number(0, 14) },
      { name: 'max', selector: number(1, 20) },
      { name: 'show_steps', selector: bool },
      { name: 'hide_empty', selector: bool },
      { name: 'empty_text', selector: text },
    ],
  },
  'lg-idle': {
    defaults: () => ({ after: 120, dim_opacity: 0.55 }),
    lists: {},
    schema: () => [
      { name: 'after', selector: number(0, 3600), label_key: 'idle_after' },
      { name: 'path', selector: text, label_key: 'idle_path' },
      { name: 'tap_path', selector: text },
      { name: 'dim_after', selector: time },
      { name: 'dim_before', selector: time },
      { name: 'dim_opacity', selector: { number: { mode: 'slider', min: 0, max: 0.9, step: 0.05 } } },
      { name: 'users', selector: { text: { multiple: true } } },
    ],
  },
  'lg-column': {
    defaults: () => ({ fill: true, dock: 0 }),
    lists: {},
    // The cards themselves are edited with Home Assistant's own card list below the form.
    schema: () => [
      { name: 'dock', selector: number(0, 10) },
      { name: 'fill', selector: bool },
    ],
  },
  'lg-nav': {
    defaults: () => ({}),
    lists: { items: 'plain' },
    schema: (hass) => [
      list('items', 'label', 'path', {
        label: sub(hass, 'label', text, true),
        icon: sub(hass, 'icon', iconSel),
        path: sub(hass, 'path', text, true),
      }),
    ],
  },
};

/** Card configuration -> what the form shows. */
export function toForm(tag, config, hass) {
  const spec = SPECS[tag];
  const data = { ...spec.defaults(hass), ...config };
  for (const [key, kind] of Object.entries(spec.lists)) {
    data[key] = (Array.isArray(config[key]) ? config[key] : []).map((entry) => CONVERT[kind][0](entry));
  }
  if (tag === 'lg-list') {
    const note = config.note && typeof config.note === 'object' ? config.note : {};
    if (note.entity) data.note_entity = note.entity;
    if (note.text !== undefined) data.note_text = note.text;
    if (note.when && note.when.state_not !== undefined) data.note_state_not = joinList(note.when.state_not);
    if (Array.isArray(config.columns)) data.row_columns = config.columns;
    const warn = config.warn && typeof config.warn === 'object' ? config.warn : {};
    if (warn.entity) data.warn_entity = warn.entity;
    if (warn.when && warn.when.state !== undefined) data.warn_state = joinList(warn.when.state);
    if (warn.text !== undefined) data.warn_text = warn.text;
    if (warn.label !== undefined) data.warn_label = warn.label;
    delete data.warn;
    delete data.note;
    delete data.columns;
  }
  return data;
}

/** What the form holds -> card configuration, without values that equal the defaults. */
export function fromForm(tag, data, hass) {
  const spec = SPECS[tag];
  const defaults = spec.defaults(hass);
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (key in spec.lists) {
      const entries = (Array.isArray(value) ? value : []).map((entry) => CONVERT[spec.lists[key]][1](entry)).filter((entry) => typeof entry === 'string' || Object.keys(entry).length);
      if (entries.length) out[key] = entries;
    } else if (key in defaults) {
      if (value !== defaults[key] && value !== undefined && value !== null && value !== '') out[key] = value;
    } else if (filled(value)) {
      out[key] = value;
    }
  }
  if (tag === 'lg-list') {
    const { note_entity: noteEntity, note_text: noteText, note_state_not: noteNot, row_columns: columns, warn_entity: warnEntity, warn_state: warnState, warn_text: warnText, warn_label: warnLabel, ...rest } = out;
    const result = { ...rest };
    if (filled(warnEntity)) {
      result.warn = { entity: warnEntity };
      if (filled(warnState)) result.warn.when = { state: splitList(warnState) };
      if (filled(warnText)) result.warn.text = warnText;
      if (filled(warnLabel)) result.warn.label = warnLabel;
    }
    if (filled(columns)) result.columns = columns;
    if (filled(noteEntity)) {
      result.note = { entity: noteEntity };
      if (filled(noteText)) result.note.text = noteText;
      if (filled(noteNot)) result.note.when = { state_not: splitList(noteNot) };
    }
    return result;
  }
  return out;
}
