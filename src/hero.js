import { WEATHER_ICONS, h, locale, t, fire, formatState, formatNumber, icon, requireList } from './core.js';
import { createEditor } from './editor.js';
import { LgBase } from './base.js';
import { CHIP_CSS, validateChips, chipSignature, renderChips } from './chips.js';

export const HERO_CSS = `
  :host { container-type: inline-size; }
  .hero { display: flex; flex-direction: column; gap: 22px; }
  .top { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
  .clock { font-size: clamp(72px, 20.5cqw, 148px); font-weight: 200; letter-spacing: -0.045em; line-height: 0.92; }
  .date { margin-top: 6px; font-size: clamp(15px, 3cqw, 22px); letter-spacing: -0.005em; color: rgba(242, 244, 248, 0.78); }
  .weather { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; padding-bottom: 6px; }
  .now { display: flex; align-items: center; gap: 14px; }
  .now ha-icon { --mdc-icon-size: clamp(30px, 7cqw, 52px); color: #dfe7ff; }
  .temp { font-size: clamp(34px, 9cqw, 64px); font-weight: 200; letter-spacing: -0.03em; line-height: 1; }
  .cond { font-size: clamp(13px, 2.4cqw, 17px); color: rgba(242, 244, 248, 0.74); text-align: right; }
  @container (max-width: 420px) {
    .top { flex-direction: column; align-items: flex-start; gap: 14px; }
    .weather { align-items: flex-start; padding: 0; }
  }
  /* Calm layout: clock and weather in the optical centre, a little above the geometric one. */
  .calm { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .calm .stack { display: flex; flex-direction: column; align-items: center; gap: 18px; transform: translateY(-4%); }
  .calm .clock { font-size: clamp(96px, 30cqw, 236px); line-height: 0.9; letter-spacing: -0.05em; }
  .calm .date { margin: 0; font-size: clamp(17px, 3.3cqw, 26px); color: rgba(242, 244, 248, 0.7); }
  .pill {
    margin-top: clamp(16px, 4cqw, 34px); display: inline-flex; align-items: center; gap: 14px;
    padding: 14px 26px 14px 20px; border-radius: 999px;
    background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.10);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }
  .pill ha-icon { --mdc-icon-size: 34px; color: #dfe7ff; display: flex; }
  .pill .temp { font-size: 34px; font-weight: 300; letter-spacing: -0.02em; }
  .pill .sep { width: 1px; height: 26px; background: rgba(255, 255, 255, 0.14); }
  .pill .cond { font-size: 19px; text-align: left; }
  .calm .hint { position: absolute; left: 0; right: 0; bottom: 40px; text-align: center; font-size: 15px; letter-spacing: 0.02em; color: rgba(242, 244, 248, 0.55); animation: breathe 9s ease-in-out infinite; }
  @keyframes breathe { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.85; } }
  @media (prefers-reduced-motion: reduce) { .hint { animation: none; } }
  @container (max-width: 520px) { .pill .sep, .pill .cond { display: none; } }
`;

const CALM_GAP_BELOW = 16;

export class LgHero extends LgBase {
  static getStubConfig() {
    return { weather: '', chips: [] };
  }

  static getConfigElement() {
    return createEditor('lg-hero');
  }

  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
    const chips = requireList(config.chips, 'chips');
    validateChips(chips);
    this._forecast = undefined;
    if (config.layout !== undefined && !['normal', 'calm'].includes(config.layout)) throw new Error('layout must be normal or calm');
    this._setConfig({ show_date: true, layout: 'normal', show_hint: true, ...config, chips });
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return { columns: 'full', rows: 'auto', min_columns: 6 };
  }

  get tick() {
    return 1000;
  }

  connectedCallback() {
    super.connectedCallback();
    this._subscribe();
    this._onResize = () => this._fit();
    window.addEventListener('resize', this._onResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this._unsub) this._unsub.then((unsub) => unsub()).catch(() => undefined);
    this._unsub = undefined;
  }

  /** Daily forecast for the "tomorrow up to" line. Failing quietly is fine. */
  _subscribe() {
    const hass = this._hass;
    const id = this._config && this._config.weather;
    if (this._unsub || !hass || !id || !hass.connection || !hass.states[id]) return;
    this._unsub = hass.connection
      .subscribeMessage(
        (message) => {
          this._forecast = Array.isArray(message.forecast) ? message.forecast : undefined;
          this._update();
        },
        { type: 'weather/subscribe_forecast', forecast_type: 'daily', entity_id: id },
      )
      .catch(() => () => undefined);
  }

  set hass(hass) {
    super.hass = hass;
    this._subscribe();
  }

  get hass() {
    return this._hass;
  }

  _clock() {
    const now = new Date();
    const zone = { timeZone: this._hass.config && this._hass.config.time_zone };
    try {
      return {
        time: new Intl.DateTimeFormat(locale(this._hass), { ...zone, hour: '2-digit', minute: '2-digit', hour12: false }).format(now),
        date: new Intl.DateTimeFormat(locale(this._hass), { ...zone, weekday: 'long', day: 'numeric', month: 'long' }).format(now),
      };
    } catch (err) {
      return { time: now.toTimeString().slice(0, 5), date: now.toDateString() };
    }
  }

  _tomorrowHigh() {
    if (!this._forecast || this._forecast.length < 2) return undefined;
    const value = Number(this._forecast[1].temperature);
    return Number.isFinite(value) ? value : undefined;
  }

  _signature() {
    const weather = this._config.weather && this._hass.states[this._config.weather];
    return [
      this._clock().time,
      weather ? `${weather.state}/${weather.attributes.temperature}` : '-',
      this._tomorrowHigh(),
      chipSignature(this._hass, this._config.chips),
    ].join('|');
  }

  _render() {
    const hass = this._hass;
    const { time, date } = this._clock();
    const shape = this._key.slice(this._key.indexOf('|'));
    if (this._shape === shape && this._clockEl && this._clockEl.isConnected) {
      this._clockEl.textContent = time;
      if (this._dateEl) this._dateEl.textContent = date;
      return;
    }
    this._shape = shape;
    this._clockEl = h('div', { class: 'clock num' }, time);
    this._dateEl = this._config.show_date ? h('div', { class: 'date' }, date) : undefined;
    const left = h('div', null, this._clockEl, this._dateEl);
    const top = h('div', { class: 'top' }, left);

    const weather = this._config.weather && hass.states[this._config.weather];
    if (weather) {
      const temp = Number(weather.attributes.temperature);
      const high = this._tomorrowHigh();
      let cond = formatState(hass, weather);
      if (high !== undefined) cond += ` · ${t(hass, 'tomorrow_up_to')} ${formatNumber(hass, high, 0)}°`;
      const block = h(
        'button',
        { class: 'weather press', type: 'button', style: 'background:none;border:0;padding-left:0;padding-right:0;' },
        h(
          'div',
          { class: 'now' },
          icon(WEATHER_ICONS[weather.state] || 'mdi:weather-cloudy'),
          h('div', { class: 'temp num' }, Number.isFinite(temp) ? `${formatNumber(hass, temp, 1).replace('-', '−')}°` : '–'),
        ),
        h('div', { class: 'cond' }, cond),
      );
      block.addEventListener('click', () => fire(this, 'hass-more-info', { entityId: this._config.weather }));
      top.append(block);
    }

    if (this._config.layout === 'calm') {
      this._renderCalm(weather);
      return;
    }
    const hero = h('div', { class: 'hero' }, top);
    const chips = renderChips(this, hass, this._config.chips);
    if (chips) hero.append(chips);
    this._mount(HERO_CSS + CHIP_CSS, hero);
  }

  _renderCalm(weather) {
    const hass = this._hass;
    const stack = h('div', { class: 'stack' }, this._clockEl, this._dateEl);
    if (weather) {
      const temp = Number(weather.attributes.temperature);
      const high = this._tomorrowHigh();
      let cond = formatState(hass, weather);
      if (high !== undefined) cond += ` · ${t(hass, 'tomorrow_up_to')} ${formatNumber(hass, high, 0)}°`;
      stack.append(h('div', { class: 'pill' },
        icon(WEATHER_ICONS[weather.state] || 'mdi:weather-cloudy'),
        h('span', { class: 'temp num' }, Number.isFinite(temp) ? `${formatNumber(hass, temp, 1).replace('-', '−')}°` : '–'),
        h('span', { class: 'sep' }),
        h('span', { class: 'cond' }, cond)));
    }
    const chips = renderChips(this, hass, this._config.chips);
    if (chips) stack.append(chips);
    const calm = h('div', { class: 'calm' }, stack);
    if (this._config.show_hint) calm.append(h('div', { class: 'hint' }, this._config.hint || t(hass, 'tap_to_return')));
    this._calmEl = calm;
    this._mount(HERO_CSS + CHIP_CSS, calm);
    window.requestAnimationFrame(() => this._fit());
  }

  /** The calm layout fills the window below its own top edge. */
  _fit() {
    const calm = this._calmEl;
    if (!calm || !calm.isConnected) return;
    const scroller = document.scrollingElement || document.documentElement;
    const top = this.getBoundingClientRect().top + (scroller ? scroller.scrollTop : 0);
    const height = Math.round(window.innerHeight - top - CALM_GAP_BELOW);
    calm.style.minHeight = height > 320 ? `${height}px` : '';
  }
}
