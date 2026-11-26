import { h, t, locale, fire, requireList } from './core.js';
import { createEditor } from './editor.js';
import { LgBase } from './base.js';
import { arrange, dayKey } from './calendar.js';

/**
 * Upcoming calendar events, grouped by day: "today and tomorrow" at a glance.
 * Events are read through Home Assistant's calendar API with the user's session.
 */

export const AGENDA_CSS = `
  .card { display: flex; flex-direction: column; gap: 8px; background: var(--lg-panel-bg, rgba(255, 255, 255, 0.05)); }
  .day { margin-top: 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--lg-faint); }
  .day:first-of-type { margin-top: 0; }
  .row { display: flex; align-items: baseline; gap: 14px; min-height: var(--lg-list-h); font-size: var(--lg-list-font); }
  .lead { flex: none; width: 5.2em; white-space: nowrap; color: var(--lg-faint); font-variant-numeric: tabular-nums; }
  .what { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dot { flex: none; width: 6px; height: 6px; border-radius: 50%; align-self: center; }
  .past { opacity: 0.45; }
  .empty { font-size: var(--lg-row-sub); color: var(--lg-faint); }
  button.row { width: 100%; background: none; border: 0; padding: 0; text-align: left; cursor: pointer; }
  @media (pointer: coarse) { button.row { min-height: 44px; } }
`;

const REFRESH_MS = 5 * 60 * 1000;
const RETRY_MS = 5000;
const PALETTE = ['#7ab8ff', '#5fd39a', '#ffa45c', '#ff7aa8', '#b49cff', '#64dcdc'];

export class LgAgenda extends LgBase {
  static getStubConfig(hass) {
    const first = hass && hass.states ? Object.keys(hass.states).find((id) => id.startsWith('calendar.')) : undefined;
    return { entities: first ? [first] : [] };
  }

  static getConfigElement() {
    return createEditor('lg-agenda');
  }

  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
    const entities = requireList(config.entities, 'entities');
    for (const id of entities) if (typeof id !== 'string' || !id.startsWith('calendar.')) throw new Error('entities must be calendar entities');
    if (!entities.length) throw new Error('entities is required');
    this._events = undefined;
    this._loaded = 0;
    this._setConfig({ days: 2, max: 8, show_header: true, ...config, entities });
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 'full', rows: 'auto', min_columns: 6 };
  }

  get tick() {
    return 60000;
  }

  _load() {
    const hass = this._hass;
    if (!hass || typeof hass.callApi !== 'function' || Date.now() - this._loaded < REFRESH_MS) return;
    this._loaded = Date.now();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + Math.min(14, Math.max(1, Number(this._config.days) || 2)));
    const query = `start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
    Promise.all(
      this._config.entities.map((id) => hass.callApi('GET', `calendars/${encodeURIComponent(id)}?${query}`).catch(() => null)),
    )
      .then((lists) => {
        // Nothing answered (frontend still connecting): try again soon instead of showing an empty day.
        if (lists.every((list) => list === null)) {
          this._loaded = 0;
          window.setTimeout(() => this._update(), RETRY_MS);
          return;
        }
        this._events = arrange(lists, { exclude: this._config.exclude, max: Math.max(1, Number(this._config.max) || 8) });
        this._key = undefined;
        this._update();
      })
      .catch(() => {
        this._loaded = 0;
      });
  }

  _signature() {
    this._load();
    const now = new Date();
    return [now.getHours(), Math.floor(now.getMinutes() / 5), this._events ? this._events.map((e) => `${e.summary}${e.start.getTime()}`).join(',') : 'x'].join('|');
  }

  _render() {
    const hass = this._hass;
    const card = h('section', { class: 'card glass' });
    if (this._config.show_header) card.append(h('div', { class: 'head' }, h('h2', null, this._config.title || t(hass, 'agenda'))));
    const events = this._events || [];
    const now = new Date();
    const today = dayKey(now);
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrow = dayKey(tomorrowDate);
    const time = new Intl.DateTimeFormat(locale(hass), { hour: '2-digit', minute: '2-digit', hour12: false });
    const weekday = new Intl.DateTimeFormat(locale(hass), { weekday: 'long', day: 'numeric', month: 'long' });
    let current;
    for (const event of events) {
      const key = dayKey(event.start);
      if (key !== current) {
        current = key;
        const name = key === today ? t(hass, 'today') : key === tomorrow ? t(hass, 'tomorrow') : weekday.format(event.start);
        card.append(h('div', { class: 'day' }, name));
      }
      const color = PALETTE[event.source % PALETTE.length];
      const row = h(
        'button',
        { class: `row press${!event.allDay && event.end < now ? ' past' : ''}`, type: 'button' },
        h('span', { class: 'lead' }, event.allDay ? t(hass, 'all_day') : time.format(event.start)),
        this._config.entities.length > 1 ? h('span', { class: 'dot', style: `background:${color}` }) : null,
        h('span', { class: 'what' }, event.summary),
      );
      row.addEventListener('click', () => fire(this, 'hass-more-info', { entityId: this._config.entities[event.source] }));
      card.append(row);
    }
    if (this._events && !events.length) card.append(h('div', { class: 'empty' }, this._config.empty_text || t(hass, 'no_events')));
    this._mount(AGENDA_CSS, card);
  }
}
