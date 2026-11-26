/**
 * Liquid Glass Cards for Home Assistant
 *
 * Plain web components, no build step, no dependencies.
 *
 *   custom:lg-hero      clock, date, weather and status chips
 *   custom:lg-headline  greeting or one-line status, with date
 *   custom:lg-now       "up next" list with one action button per row
 *   custom:lg-rooms     grid of area tiles, tap switches all lights of an area
 *   custom:lg-room      a single area tile
 *   custom:lg-list      glass card with rows (departures, agenda, system facts)
 *   custom:lg-stat      one big number with a history sparkline
 *   custom:lg-nav       bottom bar on phones, pill row on wide screens
 *
 * Every card accepts `size: large` for wall displays.
 * All text that comes from Home Assistant (names, states) is written with
 * textContent, never as markup.
 *
 * @license MIT
 */

export const VERSION = '0.2.0';

export const STRINGS = {
  en: {
    on: 'On', off: 'Off', light: 'light', lights: 'lights', no_lights: 'No lights', unavailable: 'Unavailable',
    tomorrow_up_to: 'tomorrow up to', rooms: 'Rooms', rooms_hint: 'tap switches, hold opens', n_on: 'on', all_off: 'All lights off',
    energy: 'Energy', energy_sum: 'sum of the meters', energy_none: 'No energy meters found.', energy_today: 'Used today',
    energy_vs_yesterday: 'compared with yesterday up to the same time', yesterday: 'yesterday', this_week: 'This week', this_month: 'This month',
    energy_vs_prev: 'Compared with the previous week and', energy_top: 'Largest consumer today', direct: 'direct', with_change: 'with changes',
    tap_to_return: 'Tap to return', agenda: 'Today and tomorrow', today: 'Today', tomorrow: 'Tomorrow', all_day: 'all day', no_events: 'No appointments.',
    now: 'Up next', nothing: 'Nothing to do right now.',
    morning: 'Morning', day: 'Day', evening: 'Evening', night: 'Night',
    good_morning: 'Good morning', good_day: 'Good afternoon', good_evening: 'Good evening', good_night: 'Good night',
    calm: 'All quiet.', one_open: 'All quiet. One thing is open.', n_open: 'things are open.',
  },
  de: {
    on: 'An', off: 'Aus', light: 'Lampe', lights: 'Lampen', no_lights: 'Keine Lampen', unavailable: 'Nicht erreichbar',
    tomorrow_up_to: 'morgen bis', rooms: 'Räume', rooms_hint: 'Tippen schaltet, Halten öffnet', n_on: 'an', all_off: 'Alle Lichter aus',
    energy: 'Energie', energy_sum: 'Summe der Zähler', energy_none: 'Keine Energiezähler gefunden.', energy_today: 'Verbrauch heute',
    energy_vs_yesterday: 'gegenüber gestern bis zur gleichen Uhrzeit', yesterday: 'gestern', this_week: 'Diese Woche', this_month: 'Dieser Monat',
    energy_vs_prev: 'Vergleich mit Vorwoche und', energy_top: 'Größter Verbraucher heute', direct: 'direkt', with_change: 'mit Umstieg',
    tap_to_return: 'Tippen, um zurückzukehren', agenda: 'Heute und morgen', today: 'Heute', tomorrow: 'Morgen', all_day: 'ganztägig', no_events: 'Keine Termine.',
    now: 'Jetzt dran', nothing: 'Gerade ist nichts offen.',
    morning: 'Morgen', day: 'Tag', evening: 'Abend', night: 'Nacht',
    good_morning: 'Guten Morgen', good_day: 'Guten Tag', good_evening: 'Guten Abend', good_night: 'Gute Nacht',
    calm: 'Alles ruhig.', one_open: 'Alles ruhig. Eine Sache ist offen.', n_open: 'Dinge sind offen.',
  },
};

export const COLORS = {
  amber: '#ffcf5c',
  orange: '#ffa45c',
  green: '#5fd39a',
  blue: '#7ab8ff',
  red: '#ff5a6e',
  neutral: 'rgba(242, 244, 248, 0.55)',
};

export const WEATHER_ICONS = {
  'clear-night': 'mdi:weather-night', cloudy: 'mdi:weather-cloudy', exceptional: 'mdi:alert-circle-outline',
  fog: 'mdi:weather-fog', hail: 'mdi:weather-hail', lightning: 'mdi:weather-lightning',
  'lightning-rainy': 'mdi:weather-lightning-rainy', partlycloudy: 'mdi:weather-partly-cloudy',
  pouring: 'mdi:weather-pouring', rainy: 'mdi:weather-rainy', snowy: 'mdi:weather-snowy',
  'snowy-rainy': 'mdi:weather-snowy-rainy', sunny: 'mdi:weather-sunny', windy: 'mdi:weather-windy',
  'windy-variant': 'mdi:weather-windy-variant',
};

export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const BASE_CSS = `
  :host {
    display: block;
    --lg-text: var(--primary-text-color, #f2f4f8);
    --lg-quiet: rgba(242, 244, 248, 0.72);
    --lg-faint: rgba(242, 244, 248, 0.6);
    --lg-bg: var(--glass-bg, rgba(255, 255, 255, 0.06));
    --lg-line: var(--lg-card-line, rgba(255, 255, 255, 0.12));
    --lg-blur: var(--glass-blur, blur(28px) saturate(1.5));
    --lg-solid: var(--glass-solid, #1a2036);
    --lg-warm-rgb: 255, 180, 84;
    --lg-cool-rgb: 122, 184, 255;
    /* type and size scale: phone and desktop values, overridden by size=large */
    --lg-h2: 18px; --lg-h2-now: 18px; --lg-row-title: 16px; --lg-row-sub: 13px; --lg-row-h: 52px;
    --lg-btn-h: 44px; --lg-btn-w: 96px; --lg-btn-font: 14px;
    --lg-tile-h: 72px; --lg-tile-name: 16px; --lg-tile-sub: 13px; --lg-tile-icon: 40px; --lg-tile-glyph: 20px;
    --lg-chip-h: 36px; --lg-chip-font: 14px; --lg-chip-dot: 8px;
    --lg-card-pad: var(--lg-pad-override, 18px); --lg-card-radius: 24px; --lg-list-font: 15px; --lg-list-h: 30px;
    font-family: var(--ha-font-family-body, var(--primary-font-family, 'Inter', system-ui, sans-serif));
    color: var(--lg-text);
    -webkit-font-smoothing: antialiased;
    font-optical-sizing: auto;
  }
  :host([size="large"]) {
    --lg-h2: 22px; --lg-h2-now: 26px; --lg-row-title: 19px; --lg-row-sub: 14px; --lg-row-h: 60px;
    --lg-btn-h: 44px; --lg-btn-w: 132px; --lg-btn-font: 15px;
    --lg-tile-h: 86px; --lg-tile-name: 19px; --lg-tile-sub: 14px; --lg-tile-icon: 46px; --lg-tile-glyph: 24px;
    --lg-chip-h: 48px; --lg-chip-font: 16px; --lg-chip-dot: 10px;
    --lg-card-pad: var(--lg-pad-override, 22px); --lg-card-radius: 28px; --lg-list-font: 17px; --lg-list-h: 34px;
  }
  * { box-sizing: border-box; }
  .glass {
    background: var(--lg-bg);
    border: 1px solid var(--lg-line);
    -webkit-backdrop-filter: var(--lg-blur);
    backdrop-filter: var(--lg-blur);
    box-shadow: var(--lg-glass-edge, inset 0 1px 0 rgba(255, 255, 255, 0.07));
  }
  .card { border-radius: var(--lg-card-radius); padding: var(--lg-card-pad) calc(var(--lg-card-pad) * 1.1); }
  h2 { margin: 0; font-size: var(--lg-h2); font-weight: 600; letter-spacing: -0.012em; }
  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .hint { font-size: calc(var(--lg-row-sub) + 1px); color: var(--lg-faint); text-align: right; }
  button { font: inherit; color: inherit; margin: 0; }
  button:focus-visible, a:focus-visible { outline: 2px solid var(--primary-color, #7ab8ff); outline-offset: 2px; }
  .press { cursor: pointer; transition: transform 120ms ease-out, background-color 240ms ease, border-color 240ms ease; -webkit-tap-highlight-color: transparent; touch-action: manipulation; user-select: none; }
  .press:active { transform: scale(0.97); }
  @media (hover: hover) { .press:hover { filter: brightness(1.12); } }
  .num { font-variant-numeric: tabular-nums; }
  @media (prefers-reduced-transparency: reduce) {
    .glass { background: var(--lg-solid) !important; -webkit-backdrop-filter: none; backdrop-filter: none; }
  }
  @media (prefers-contrast: more) {
    :host { --lg-quiet: var(--lg-text); --lg-faint: var(--lg-text); --lg-line: rgba(255, 255, 255, 0.55); }
    .glass { background: var(--lg-solid) !important; -webkit-backdrop-filter: none; backdrop-filter: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .press { transition: background-color 200ms ease; }
    .press:active { transform: none; }
  }
`;

export const SVG_NS = 'http://www.w3.org/2000/svg';

/** Create an element; children are nodes or strings (set as text). */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'style') el.style.cssText = value;
      else el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  for (const child of children) {
    if (child === undefined || child === null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function locale(hass) {
  return (hass && hass.locale && hass.locale.language) || (hass && hass.language) || 'en';
}

export function t(hass, key) {
  const code = locale(hass).slice(0, 2);
  return (STRINGS[code] || STRINGS.en)[key];
}

export function fire(node, type, detail) {
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

export function navigate(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return;
  history.pushState(null, '', path);
  window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
}

/** Matches a `when` block against an entity state. No block means "always". */
export function matches(when, stateObj) {
  if (!when) return true;
  if (!stateObj) return false;
  const state = stateObj.state;
  const list = (value) => (Array.isArray(value) ? value.map(String) : [String(value)]);
  if (when.state !== undefined && !list(when.state).includes(state)) return false;
  if (when.state_not !== undefined && list(when.state_not).includes(state)) return false;
  if (when.above !== undefined || when.below !== undefined) {
    const num = Number(state);
    if (!Number.isFinite(num)) return false;
    if (when.above !== undefined && !(num > Number(when.above))) return false;
    if (when.below !== undefined && !(num < Number(when.below))) return false;
  }
  return true;
}

export function minutes(value) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value));
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

/** Time window: `after`/`before` as HH:MM (may wrap midnight), `weekdays` as mon..sun. */
export function inWindow(item, now) {
  if (Array.isArray(item.weekdays) && !item.weekdays.includes(WEEKDAYS[now.getDay()])) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const after = item.after !== undefined ? minutes(item.after) : NaN;
  const before = item.before !== undefined ? minutes(item.before) : NaN;
  if (Number.isFinite(after) && Number.isFinite(before)) {
    return after <= before ? cur >= after && cur < before : cur >= after || cur < before;
  }
  if (Number.isFinite(after)) return cur >= after;
  if (Number.isFinite(before)) return cur < before;
  return true;
}

/** A timestamp reads as a clock time today, and as weekday plus time on other days. */
export function formatTimestamp(hass, value, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const zone = { timeZone: hass.config && hass.config.time_zone };
  try {
    const day = new Intl.DateTimeFormat('en-CA', { ...zone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const time = new Intl.DateTimeFormat(locale(hass), { ...zone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
    if (day.format(date) === day.format(now)) return time;
    return `${new Intl.DateTimeFormat(locale(hass), { ...zone, weekday: 'short' }).format(date)} ${time}`;
  } catch (err) {
    return undefined;
  }
}

export function formatState(hass, stateObj) {
  if (!stateObj) return '';
  if (stateObj.attributes && stateObj.attributes.device_class === 'timestamp') {
    const text = formatTimestamp(hass, stateObj.state);
    if (text) return text;
  }
  if (typeof hass.formatEntityState === 'function') return hass.formatEntityState(stateObj);
  return stateObj.state;
}

export function formatNumber(hass, value, digits) {
  try {
    return new Intl.NumberFormat(locale(hass), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
  } catch (err) {
    return String(value);
  }
}

/** Replace {state} and {name} in a configured text. The result is used as text only. */
export function fill(text, hass, stateObj) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\{state\}/g, stateObj ? formatState(hass, stateObj) : '')
    .replace(/\{name\}/g, stateObj ? stateObj.attributes.friendly_name || '' : '');
}

export function dayPart(now) {
  const hour = now.getHours();
  if (hour >= 22 || hour < 5) return 'night';
  if (hour >= 18) return 'evening';
  if (hour >= 11) return 'day';
  return 'morning';
}

export function icon(name) {
  return h('ha-icon', { icon: name });
}

export function isUsable(stateObj) {
  return Boolean(stateObj) && stateObj.state !== 'unavailable' && stateObj.state !== 'unknown';
}

/** Run a configured action. Same trust level as a tap_action in any dashboard card. */
export function runAction(node, hass, action, entityId) {
  if (!action) {
    if (entityId) fire(node, 'hass-more-info', { entityId });
    return;
  }
  const kind = action.action || (action.service ? 'call' : 'more-info');
  if (kind === 'toggle' && entityId) {
    hass.callService('homeassistant', 'toggle', { entity_id: entityId });
  } else if (kind === 'call' && typeof action.service === 'string' && action.service.includes('.')) {
    const [domain, service] = action.service.split('.', 2);
    hass.callService(domain, service, action.data || {}, action.target || (entityId ? { entity_id: entityId } : undefined));
  } else if (kind === 'navigate') {
    navigate(action.path);
  } else if (entityId) {
    fire(node, 'hass-more-info', { entityId });
  }
  fire(node, 'haptic', 'light');
}

export function requireList(value, name) {
  if (value !== undefined && !Array.isArray(value)) throw new Error(`${name} must be a list`);
  return value || [];
}
