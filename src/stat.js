import { SVG_NS, h, fire, formatState, formatNumber, fill } from './core.js';
import { bucket, smoothPath, SPARK_W, SPARK_H } from './spark.js';
import { createEditor } from './editor.js';
import { LgBase } from './base.js';

export const STAT_CSS = `
  .card { display: flex; flex-direction: column; gap: 6px; background: var(--lg-panel-bg, rgba(255, 255, 255, 0.05)); }
  .label { font-size: 13px; color: rgba(242, 244, 248, 0.68); }
  .value { font-size: 40px; font-weight: 300; letter-spacing: -0.02em; line-height: 1.1; }
  .unit { font-size: 18px; color: rgba(242, 244, 248, 0.7); margin-left: 6px; }
  svg { width: 100%; height: 64px; display: block; margin-top: 4px; }
  button.card { width: 100%; text-align: left; }
`;

export const HISTORY_REFRESH_MS = 10 * 60 * 1000;

export class LgStat extends LgBase {
  static getStubConfig() {
    return { entity: '' };
  }

  static getConfigElement() {
    return createEditor('lg-stat');
  }

  setConfig(config) {
    if (!config || typeof config.entity !== 'string' || !config.entity) throw new Error('entity is required');
    this._points = undefined;
    this._loaded = 0;
    this._setConfig({ hours: 24, graph: true, ...config });
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

  /** History for the sparkline, read over the authenticated websocket. */
  _load() {
    const hass = this._hass;
    if (!this._config.graph || !hass || typeof hass.callWS !== 'function') return;
    if (Date.now() - this._loaded < HISTORY_REFRESH_MS) return;
    this._loaded = Date.now();
    const hours = Math.min(168, Math.max(1, Number(this._config.hours) || 24));
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3600 * 1000);
    hass
      .callWS({
        type: 'history/history_during_period',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: [this._config.entity],
        minimal_response: true,
        no_attributes: true,
      })
      .then((result) => {
        const raw = (result && result[this._config.entity]) || [];
        this._points = raw
          .map((entry) => ({ x: Number(entry.lu || entry.lc) * 1000, y: Number(entry.s) }))
          .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
        this._key = undefined;
        this._update();
      })
      .catch(() => {
        this._points = [];
      });
  }

  _signature() {
    this._load();
    const stateObj = this._hass.states[this._config.entity];
    return [stateObj ? stateObj.state : '-', this._points ? this._points.length : 'x'].join('|');
  }

  _spark() {
    const path = smoothPath(bucket(this._points || [], 36));
    if (!path) return null;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${SPARK_W} ${SPARK_H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const line = document.createElementNS(SVG_NS, 'path');
    line.setAttribute('d', path);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#a9cfff');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-linejoin', 'round');
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(line);
    return svg;
  }

  _render() {
    const hass = this._hass;
    const stateObj = hass.states[this._config.entity];
    const number = stateObj ? Number(stateObj.state) : NaN;
    const digits = this._config.digits !== undefined ? Number(this._config.digits) : 1;
    const value = Number.isFinite(number) ? formatNumber(hass, number, digits) : stateObj ? formatState(hass, stateObj) : '–';
    const unit = this._config.unit !== undefined ? this._config.unit : (stateObj && stateObj.attributes.unit_of_measurement) || '';
    const label = this._config.label || (stateObj && stateObj.attributes.friendly_name) || this._config.entity;

    const big = h('div', { class: 'value num' }, value);
    if (unit && Number.isFinite(number)) big.append(h('span', { class: 'unit' }, unit));
    const card = h('button', { class: 'card glass press', type: 'button' }, h('div', { class: 'label' }, label), big);
    const spark = this._config.graph ? this._spark() : null;
    if (spark) card.append(spark);
    card.addEventListener('click', () => fire(this, 'hass-more-info', { entityId: this._config.entity }));
    this._mount(STAT_CSS, card);
  }
}
