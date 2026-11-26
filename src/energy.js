import { h, t, locale, fire, formatNumber, SVG_NS } from './core.js';
import { createEditor } from './editor.js';
import { LgBase } from './base.js';
import { smoothPathIn, SPARK_W } from './spark.js';
import { sumByStart, totalsByStatistic, compareDays, comparePeriods, pickStatistics } from './energy-calc.js';

/**
 * Energy use today, this week and this month, each against the previous period
 * up to the same point, with today's curve over yesterday's.
 * Reads recorder statistics over the authenticated websocket; nothing else.
 */

const ENERGY_REFRESH_MS = 10 * 60 * 1000;
const CHART_H = 110;

export const ENERGY_CSS = `
  .card { display: flex; flex-direction: column; gap: 14px; background: var(--lg-panel-bg, rgba(255, 255, 255, 0.05)); }
  .label { font-size: 13px; color: rgba(242, 244, 248, 0.68); }
  .big { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .value { font-size: 44px; font-weight: 300; letter-spacing: -0.02em; line-height: 1.05; }
  .unit { font-size: 19px; color: rgba(242, 244, 248, 0.7); margin-left: 6px; }
  .chip { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 10px; border-radius: 999px; font-size: 13px; font-weight: 600; }
  .down { background: rgba(95, 211, 154, 0.14); border: 1px solid rgba(95, 211, 154, 0.35); color: #8fe3b8; }
  .up { background: rgba(255, 164, 92, 0.14); border: 1px solid rgba(255, 164, 92, 0.38); color: #ffcf9e; }
  .note { font-size: 12px; color: rgba(242, 244, 248, 0.58); }
  svg { width: 100%; height: ${CHART_H}px; display: block; }
  .legend { display: flex; gap: 18px; font-size: 12px; color: rgba(242, 244, 248, 0.6); }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .swatch { width: 14px; height: 2px; background: #a9cfff; }
  .swatch.dash { height: 0; background: none; border-top: 2px dashed rgba(242, 244, 248, 0.45); }
  .rows { display: flex; flex-direction: column; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
  .row { display: flex; justify-content: space-between; align-items: center; min-height: 38px; font-size: 15px; }
  .row .right { display: flex; gap: 14px; align-items: center; }
  .t-up { color: #ffcf9e; font-weight: 600; font-size: 13px; }
  .t-down { color: #8fe3b8; font-weight: 600; font-size: 13px; }
  .top { display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border-radius: 16px; border: 1px solid transparent; background: rgba(255, 255, 255, 0.04); text-align: left; }
  .top .label { margin: 0; }
  .top strong { font-size: 15px; font-weight: 500; }
  .empty { font-size: 13px; color: var(--lg-faint); }
  button.card { width: 100%; text-align: left; }
`;

export class LgEnergy extends LgBase {
  static getStubConfig() {
    return {};
  }

  static getConfigElement() {
    return createEditor('lg-energy');
  }

  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
    if (config.statistics !== undefined && (!Array.isArray(config.statistics) || config.statistics.some((id) => typeof id !== 'string'))) {
      throw new Error('statistics must be a list of statistic ids');
    }
    this._data = undefined;
    this._loaded = 0;
    this._setConfig({ show_header: true, show_top: true, ...config });
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { columns: 'full', rows: 'auto', min_columns: 6 };
  }

  get tick() {
    return 60000;
  }

  async _fetch() {
    const hass = this._hass;
    let prefs;
    if (!this._config.statistics) prefs = await hass.callWS({ type: 'energy/get_prefs' }).catch(() => undefined);
    const stats = pickStatistics(prefs, this._config.statistics);
    if (!stats.length) return { stats };
    const ids = stats.map((stat) => stat.id);
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
    const from = prevMonth < weekAgo ? prevMonth : weekAgo;
    const [hourly, daily] = await Promise.all([
      hass.callWS({ type: 'recorder/statistics_during_period', start_time: yesterday.toISOString(), end_time: now.toISOString(), statistic_ids: ids, period: 'hour', types: ['change'] }),
      hass.callWS({ type: 'recorder/statistics_during_period', start_time: from.toISOString(), end_time: now.toISOString(), statistic_ids: ids, period: 'day', types: ['change'] }),
    ]);
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayOnly = {};
    for (const [id, rows] of Object.entries(hourly || {})) {
      todayOnly[id] = (rows || []).filter((row) => (typeof row.start === 'number' ? row.start : Date.parse(row.start)) >= today0);
    }
    const days = compareDays(sumByStart(hourly), now);
    return { stats, days, periods: comparePeriods(sumByStart(daily), days.today, now), perStat: totalsByStatistic(todayOnly) };
  }

  _load() {
    if (!this._hass || typeof this._hass.callWS !== 'function' || Date.now() - this._loaded < ENERGY_REFRESH_MS) return;
    this._loaded = Date.now();
    this._fetch()
      .then((data) => {
        this._data = data;
        this._key = undefined;
        this._update();
      })
      .catch(() => {
        this._loaded = Date.now() - ENERGY_REFRESH_MS + 30000; // try again in half a minute
      });
  }

  _signature() {
    this._load();
    const data = this._data;
    return data && data.days ? `${data.days.today.toFixed(3)}|${data.periods.week.toFixed(2)}|${data.periods.month.toFixed(2)}` : String(Boolean(data));
  }

  _chart(days) {
    const today = days.todayCurve;
    const yesterday = days.yesterdayCurve;
    if (!yesterday.length) return null;
    const box = { minX: 0, maxX: 24, minY: 0, maxY: Math.max(...yesterday.map((p) => p.y), ...today.map((p) => p.y), 0.001) };
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${SPARK_W} ${CHART_H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const line = (points, dashed) => {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', smoothPathIn([{ x: 0, y: 0 }, ...points], box, SPARK_W, CHART_H));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', dashed ? 'rgba(242, 244, 248, 0.38)' : '#a9cfff');
      path.setAttribute('stroke-width', dashed ? '1.5' : '2.5');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      if (dashed) path.setAttribute('stroke-dasharray', '4 5');
      return path;
    };
    svg.append(line(yesterday, true));
    if (today.length) svg.append(line(today, false));
    return svg;
  }
  _render() {
    const hass = this._hass;
    const card = h('section', { class: 'card glass' });
    if (this._config.show_header) {
      card.append(h('div', { class: 'head' }, h('h2', null, this._config.title || t(hass, 'energy')), h('span', { class: 'hint' }, t(hass, 'energy_sum'))));
    }
    const data = this._data;
    if (!data) {
      this._mount(ENERGY_CSS, card);
      return;
    }
    if (!data.days) {
      card.append(h('div', { class: 'empty' }, t(hass, 'energy_none')));
      this._mount(ENERGY_CSS, card);
      return;
    }
    const kwh = (value) => formatNumber(hass, value, value >= 100 ? 0 : 1);
    const trendChip = (value) => (value === undefined ? null : h('span', { class: `chip ${value > 0 ? 'up' : 'down'}` }, `${value > 0 ? '▲' : '▼'} ${Math.abs(value)} %`));
    const trendText = (value) => (value === undefined ? null : h('span', { class: value > 0 ? 't-up' : 't-down' }, `${value > 0 ? '▲' : '▼'} ${Math.abs(value)} %`));

    const big = h('div', { class: 'value num' }, kwh(data.days.today), h('span', { class: 'unit' }, 'kWh'));
    card.append(
      h('div', null,
        h('div', { class: 'label' }, t(hass, 'energy_today')),
        h('div', { class: 'big' }, big, trendChip(data.days.trend)),
        h('div', { class: 'note' }, t(hass, 'energy_vs_yesterday'))),
    );
    const chart = this._chart(data.days);
    if (chart) {
      card.append(chart, h('div', { class: 'legend' },
        h('span', null, h('span', { class: 'swatch' }), t(hass, 'today').toLowerCase()),
        h('span', null, h('span', { class: 'swatch dash' }), t(hass, 'yesterday'))));
    }
    let monthName;
    try {
      monthName = new Intl.DateTimeFormat(locale(hass), { month: 'long' }).format(data.periods.prevMonthStart);
    } catch (err) {
      monthName = '';
    }
    card.append(
      h('div', { class: 'rows' },
        h('div', { class: 'row' }, h('span', null, t(hass, 'this_week')), h('span', { class: 'right num' }, `${kwh(data.periods.week)} kWh`, trendText(data.periods.weekTrend))),
        h('div', { class: 'row' }, h('span', null, t(hass, 'this_month')), h('span', { class: 'right num' }, `${kwh(data.periods.month)} kWh`, trendText(data.periods.monthTrend))),
        h('div', { class: 'note' }, `${t(hass, 'energy_vs_prev')} ${monthName}`.trim())),
    );
    if (this._config.show_top && data.stats.length > 1 && data.perStat) {
      const [topId, topValue] = Object.entries(data.perStat).sort((a, b) => b[1] - a[1])[0] || [];
      if (topId && topValue > 0) {
        const stat = data.stats.find((s) => s.id === topId);
        const name = (stat && stat.name) || (hass.states[topId] && hass.states[topId].attributes.friendly_name) || topId;
        const top = h('button', { class: 'top press', type: 'button' }, h('span', { class: 'label' }, t(hass, 'energy_top')), h('strong', null, `${name} · ${kwh(topValue)} kWh`));
        top.addEventListener('click', () => fire(this, 'hass-more-info', { entityId: topId }));
        card.append(top);
      }
    }
    this._mount(ENERGY_CSS, card);
  }
}
