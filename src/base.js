import { BASE_CSS } from './core.js';

export class LgBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = undefined;
    this._config = undefined;
    this._key = undefined;
    this._timer = undefined;
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  get hass() {
    return this._hass;
  }

  _setConfig(config) {
    this._config = config;
    if (config.size === 'large') this.setAttribute('size', 'large');
    else this.removeAttribute('size');
    this._key = undefined;
    this._shape = undefined;
    this._update();
  }

  /** Re-render only when the values the card shows have changed. */
  _update() {
    if (!this._hass || !this._config || !this.isConnected) return;
    const key = this._signature();
    if (key === this._key) return;
    this._key = key;
    this._render();
  }

  /** Cards that depend on the clock re-check every `tick` milliseconds. */
  get tick() {
    return 0;
  }

  connectedCallback() {
    this._key = undefined;
    this._update();
    if (this.tick && !this._timer) this._timer = window.setInterval(() => this._update(), this.tick);
  }

  disconnectedCallback() {
    window.clearInterval(this._timer);
    this._timer = undefined;
  }

  _mount(css, ...nodes) {
    const style = document.createElement('style');
    style.textContent = BASE_CSS + css;
    this.shadowRoot.replaceChildren(style, ...nodes);
  }

  _minute() {
    const now = new Date();
    return `${now.getDay()}-${now.getHours()}-${now.getMinutes()}`;
  }
}
