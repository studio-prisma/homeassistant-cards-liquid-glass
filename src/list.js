import { h, matches, inWindow, formatState, fill, icon, isUsable, runAction, requireList, t } from './core.js';
import { createEditor } from './editor.js';
import { LgBase } from './base.js';

export const LIST_CSS = `
  .card { display: flex; flex-direction: column; gap: 8px; background: var(--lg-panel-bg, rgba(255, 255, 255, 0.05)); }
  .head { align-items: center; flex-wrap: wrap; row-gap: 4px; }
  h2 { display: flex; align-items: center; gap: 10px; font-size: calc(var(--lg-h2) - 2px); white-space: nowrap; }
  h2 ha-icon { --mdc-icon-size: 22px; color: #dfe7ff; display: flex; }
  .note { display: flex; align-items: center; gap: 8px; font-size: var(--lg-row-sub); color: #ffcf9e; text-align: right; }
  .note .dot { width: 8px; height: 8px; border-radius: 50%; background: #ffa45c; flex: none; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: var(--lg-list-h); font-size: var(--lg-list-font); }
  .row > :first-child { font-weight: 500; }
  .row > :nth-child(2) { color: rgba(242, 244, 248, 0.8); }
  .row > :last-child:not(:first-child) { color: rgba(242, 244, 248, 0.72); text-align: right; }
  .row.plain > :first-child { font-weight: 400; }
  .tone-green { color: #5fd39a !important; font-weight: 600; }
  .tone-orange { color: #ffcf9e !important; }
  .tone-red { color: #ff8b98 !important; font-weight: 600; }
  .lead { width: 52px; flex: none; color: var(--lg-faint) !important; font-weight: 400 !important; }
  .grow { flex: 1; text-align: left !important; color: var(--lg-text) !important; }
  button.row { width: 100%; background: none; border: 0; padding: 0; text-align: left; }
  .card.warn { border-color: rgba(255, 190, 110, 0.45); background: linear-gradient(135deg, rgba(255, 164, 92, 0.12), rgba(255, 255, 255, 0.04)); }
  .banner { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: rgba(255, 164, 92, 0.14); font-size: var(--lg-row-sub); color: #ffd2a6; }
  .banner .dot { width: 8px; height: 8px; border-radius: 50%; background: #ffa45c; flex: none; }
  .card.warn .row > :nth-child(2) { color: #ffcf9e; }
  .mode { font-size: var(--lg-row-sub); color: var(--lg-faint); }
  @media (pointer: coarse) { button.row { min-height: 44px; } }
`;

export function safeRegExp(source) {
  if (typeof source !== 'string' || source.length > 200) return undefined;
  try {
    return new RegExp(source);
  } catch (err) {
    return undefined;
  }
}

export class LgList extends LgBase {
  static getStubConfig() {
    return { title: 'List', items: [] };
  }

  static getConfigElement() {
    return createEditor('lg-list');
  }

  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
    const items = requireList(config.items, 'items');
    for (const item of items) if (!item || (typeof item.label !== 'string' && typeof item.entity !== 'string')) throw new Error('Every item needs a label or an entity');
    if (config.entity !== undefined && typeof config.entity !== 'string') throw new Error('entity must be a string');
    this._pattern = safeRegExp(config.pattern);
    this._setConfig({ separator: ' · ', max: 6, ...config, items });
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

  _note() {
    const note = this._config.note;
    if (!note || typeof note.entity !== 'string') return undefined;
    const stateObj = this._hass.states[note.entity];
    if (!stateObj || !matches(note.when, stateObj)) return undefined;
    return note.text !== undefined ? fill(note.text, this._hass, stateObj) : formatState(this._hass, stateObj);
  }

  /** Warning text when the warning rule matches, '' for a warning without text, undefined otherwise. */
  _warn() {
    const warn = this._config.warn;
    if (!warn || typeof warn.entity !== 'string') return undefined;
    const stateObj = this._hass.states[warn.entity];
    if (!stateObj || !matches(warn.when, stateObj)) return undefined;
    return warn.text !== undefined ? fill(warn.text, this._hass, stateObj) : '';
  }

  _signature() {
    const states = this._hass.states;
    const now = new Date();
    const parts = [this._config.items.map((item) => (inWindow(item, now) ? 1 : 0)).join(''), this._note(), this._warn()];
    if (this._config.entity) parts.push(states[this._config.entity] ? states[this._config.entity].state : '-');
    for (const item of this._config.items) parts.push(item.entity && states[item.entity] ? states[item.entity].state : '-');
    return parts.join('|');
  }

  /** Rows read from one entity whose state is a separated list. */
  _entityRows() {
    const stateObj = this._config.entity && this._hass.states[this._config.entity];
    if (!isUsable(stateObj)) return [];
    const columns = Array.isArray(this._config.columns) ? this._config.columns : undefined;
    return String(stateObj.state)
      .split(this._config.separator)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, Math.max(1, Number(this._config.max) || 6))
      .map((part) => {
        const match = this._pattern && columns ? this._pattern.exec(part) : undefined;
        if (!match) return h('div', { class: 'row plain' }, h('span', null, part));
        const row = h('div', { class: 'row' });
        for (const column of columns) {
          row.append(h('span', { class: 'num' }, String(column).replace(/\{(\d)\}/g, (all, index) => match[Number(index)] || '')));
        }
        return row;
      });
  }

  _itemRows() {
    const hass = this._hass;
    const now = new Date();
    const rows = [];
    for (const item of this._config.items) {
      const stateObj = item.entity ? hass.states[item.entity] : undefined;
      if (item.entity && item.when && !matches(item.when, stateObj)) continue;
      if (!inWindow(item, now)) continue;
      const label = item.label !== undefined ? fill(item.label, hass, stateObj) : (stateObj && stateObj.attributes.friendly_name) || item.entity;
      const zero = item.zero_text !== undefined && stateObj && Number(stateObj.state) === 0;
      const value = zero ? item.zero_text : item.value !== undefined ? fill(item.value, hass, stateObj) : stateObj ? formatState(hass, stateObj) : '';
      const tag = item.entity || item.tap ? 'button' : 'div';
      const row = h(tag, { class: `row plain${tag === 'button' ? ' press' : ''}`, type: tag === 'button' ? 'button' : undefined });
      if (item.lead !== undefined) row.append(h('span', { class: 'lead num' }, item.lead));
      row.append(h('span', { class: item.lead !== undefined ? 'grow' : undefined }, label));
      if (value) row.append(h('span', { class: `num${item.tone ? ` tone-${item.tone}` : ''}` }, value));
      if (tag === 'button') row.addEventListener('click', () => runAction(this, hass, item.tap, item.entity));
      rows.push(row);
    }
    return rows;
  }

  _render() {
    const warn = this._warn();
    const card = h('section', { class: `card glass${warn !== undefined ? ' warn' : ''}` });
    if (this._config.title) {
      const title = h('h2', null);
      if (this._config.icon) title.append(icon(this._config.icon));
      title.append(this._config.title);
      const head = h('div', { class: 'head' }, title);
      const note = this._note();
      if (note) head.append(h('span', { class: 'note' }, h('span', { class: 'dot' }), note));
      else if (this._config.mode_entity) head.append(h('span', { class: 'mode' }, warn !== undefined ? (this._config.warn && this._config.warn.label) || t(this._hass, 'with_change') : (this._config.mode_label || t(this._hass, 'direct'))));
      card.append(head);
    }
    if (warn) card.append(h('div', { class: 'banner', role: 'status' }, h('span', { class: 'dot' }), warn));
    const rows = [...this._entityRows(), ...this._itemRows()];
    for (const row of rows) card.append(row);
    if (!rows.length && this._config.empty_text) card.append(h('div', { class: 'row plain' }, h('span', { style: 'color:var(--lg-faint)' }, this._config.empty_text)));
    this._mount(LIST_CSS, card);
  }
}
