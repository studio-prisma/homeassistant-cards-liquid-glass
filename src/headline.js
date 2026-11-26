import { h, locale, t, matches, inWindow, formatNumber, dayPart, requireList } from './core.js';
import { createEditor } from './editor.js';
import { LgBase } from './base.js';
import { CHIP_CSS, validateChips, chipSignature, renderChips } from './chips.js';

export const HEADLINE_CSS = `
  :host { container-type: inline-size; }
  .wrap { display: flex; flex-direction: column; gap: 14px; }
  @container (min-width: 860px) {
    .wrap.side { flex-direction: row; align-items: flex-end; justify-content: space-between; gap: 24px; }
    .wrap.side .chips { justify-content: flex-end; max-width: 60%; }
  }
  .row { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .over { font-size: 14px; color: var(--lg-quiet); }
  h1 { margin: 4px 0 0; font-size: clamp(28px, 3.2vw, 34px); font-weight: 600; letter-spacing: -0.02em; line-height: 1.1; }
`;

export class LgHeadline extends LgBase {
  static getStubConfig() {
    return { mode: 'greeting' };
  }

  static getConfigElement() {
    return createEditor('lg-headline');
  }

  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
    const chips = requireList(config.chips, 'chips');
    validateChips(chips);
    const watch = requireList(config.watch, 'watch');
    for (const item of watch) if (!item || typeof item.entity !== 'string') throw new Error('Every watch item needs an entity');
    this._setConfig({ mode: 'greeting', chips_position: 'right', ...config, chips, watch });
  }

  getCardSize() {
    return 2;
  }

  getGridOptions() {
    return { columns: 'full', rows: 'auto', min_columns: 6 };
  }

  get tick() {
    return 30000;
  }

  _open() {
    const now = new Date();
    return this._config.watch.filter((item) => matches(item.when, this._hass.states[item.entity]) && inWindow(item, now)).length;
  }

  _signature() {
    const weather = this._config.weather && this._hass.states[this._config.weather];
    return [new Date().toDateString(), dayPart(new Date()), this._open(), weather ? weather.attributes.temperature : '-', chipSignature(this._hass, this._config.chips)].join('|');
  }

  _render() {
    const hass = this._hass;
    const now = new Date();
    let over;
    try {
      over = new Intl.DateTimeFormat(locale(hass), { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
    } catch (err) {
      over = now.toDateString();
    }
    const weather = this._config.weather && hass.states[this._config.weather];
    const temp = weather ? Number(weather.attributes.temperature) : NaN;
    if (Number.isFinite(temp)) over += ` · ${formatNumber(hass, temp, 1).replace('-', '−')}°`;

    let title;
    if (this._config.mode === 'status') {
      const open = this._open();
      title = open === 0 ? t(hass, 'calm') : open === 1 ? t(hass, 'one_open') : `${open} ${t(hass, 'n_open')}`;
    } else {
      const part = dayPart(now);
      const key = { morning: 'good_morning', day: 'good_day', evening: 'good_evening', night: 'good_night' }[part];
      title = t(hass, key) + (this._config.name ? `, ${this._config.name}` : '');
    }

    const row = h('div', { class: 'row' }, h('div', null, h('div', { class: 'over' }, over), h('h1', null, title)));
    const wrap = h('div', { class: `wrap${this._config.chips_position === 'right' ? ' side' : ''}` }, row);
    const chips = renderChips(this, hass, this._config.chips);
    if (chips) wrap.append(chips);
    this._mount(HEADLINE_CSS + CHIP_CSS, wrap);
  }
}
