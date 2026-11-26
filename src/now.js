import { h, t, matches, inWindow, fill, dayPart, runAction, requireList } from './core.js';
import { createEditor } from './editor.js';
import { LgBase } from './base.js';

export const NOW_CSS = `
  .card { display: flex; flex-direction: column; gap: 12px; background: var(--lg-now-bg, linear-gradient(135deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03))); container-type: inline-size; }
  @container (max-width: 460px) { .hint { display: none; } }
  .item { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: var(--lg-row-h); padding: 10px 2px 0; border-top: 1px solid rgba(255, 255, 255, 0.07); }
  .text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .title { font-size: var(--lg-row-title); font-weight: 500; }
  .sub { font-size: var(--lg-row-sub); color: rgba(242, 244, 248, 0.66); }
  .item.highlight {
    padding: 12px 14px; margin: 2px 0; border-top: 0; border-radius: 16px;
    background: rgba(255, 207, 92, 0.12); border: 1px solid rgba(255, 207, 92, 0.30);
  }
  .item.highlight + .item { border-top: 0; }
  .act {
    flex: none; min-width: var(--lg-btn-w); height: var(--lg-btn-h); padding: 0 16px;
    border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.18); background: rgba(255, 255, 255, 0.10);
    font-size: var(--lg-btn-font); font-weight: 600;
  }
  .act.warm { border-color: rgba(255, 190, 110, 0.45); background: rgba(var(--lg-warm-rgb), 0.18); }
  h2 { font-size: var(--lg-h2-now); letter-spacing: -0.015em; }
  .empty { font-size: var(--lg-row-sub); color: var(--lg-faint); padding: 2px; }
`;

export class LgNow extends LgBase {
  static getStubConfig() {
    return { items: [] };
  }

  static getConfigElement() {
    return createEditor('lg-now');
  }

  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
    const items = requireList(config.items, 'items');
    for (const item of items) {
      if (!item || typeof item.title !== 'string') throw new Error('Every item needs a title');
      if (item.entity !== undefined && typeof item.entity !== 'string') throw new Error('entity must be a string');
    }
    this._setConfig({ max: 3, show_period: true, show_header: true, ...config, items });
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 'full', rows: 'auto', min_columns: 6 };
  }

  get tick() {
    return 30000;
  }

  _active() {
    const now = new Date();
    const max = Math.max(1, Number(this._config.max) || 3);
    return this._config.items
      .filter((item) => (item.entity ? matches(item.when, this._hass.states[item.entity]) : true) && inWindow(item, now))
      .slice(0, max);
  }

  _signature() {
    return [
      dayPart(new Date()),
      this._active().map((item) => `${item.title}:${item.entity && this._hass.states[item.entity] ? this._hass.states[item.entity].state : ''}`).join(','),
    ].join('|');
  }

  _render() {
    const hass = this._hass;
    const title = this._config.title || t(hass, 'now');
    const period = this._config.show_period ? ` · ${t(hass, dayPart(new Date()))}` : '';
    const head = h('div', { class: 'head' }, h('h2', null, title + period));
    if (this._config.hint) head.append(h('span', { class: 'hint' }, this._config.hint));
    const card = h('section', { class: 'card glass' }, this._config.show_header ? head : null);

    const items = this._active();
    for (const item of items) {
      const stateObj = item.entity ? hass.states[item.entity] : undefined;
      const text = h('div', { class: 'text' }, h('span', { class: 'title' }, fill(item.title, hass, stateObj)));
      if (item.subtitle) text.append(h('span', { class: 'sub' }, fill(item.subtitle, hass, stateObj)));
      const row = h('div', { class: `item${item.highlight ? ' highlight' : ''}` }, text);
      if (item.button && typeof item.button.label === 'string') {
        const button = h('button', { class: `act press${item.button.tone === 'warm' ? ' warm' : ''}`, type: 'button' }, item.button.label);
        button.addEventListener('click', () => runAction(this, hass, item.button, item.entity));
        row.append(button);
      }
      card.append(row);
    }
    if (!items.length) card.append(h('div', { class: 'empty' }, this._config.empty_text || t(hass, 'nothing')));
    this._mount(NOW_CSS, card);
  }
}
