import { h, inWindow, navigate } from './core.js';
import { createEditor } from './editor.js';

/**
 * Behaviour for wall displays, without any visible card:
 *   - after `after` seconds without touch, mouse or key input, open `path` (a calm view);
 *   - with `tap_path`, the first tap anywhere opens that path (back from the calm view);
 *   - with `dim_after`/`dim_before`, the screen is dimmed by an overlay in that time window.
 * `users` limits all of it to certain Home Assistant users (id or name).
 */

const ACTIVITY = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
const TAP_GRACE_MS = 800;

export const IDLE_CSS = `
  :host { display: block; height: 0; overflow: visible; }
  .dim { position: fixed; inset: 0; z-index: 9; pointer-events: none; background: #000; transition: opacity 1.2s ease; }
  @media (prefers-reduced-motion: reduce) { .dim { transition: none; } }
`;

export class LgIdle extends HTMLElement {
  static getStubConfig() {
    return { after: 120, path: '' };
  }

  static getConfigElement() {
    return createEditor('lg-idle');
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = undefined;
    this._config = undefined;
    this._timer = undefined;
    this._clock = undefined;
    this._shownAt = 0;
    this._onActivity = () => this._arm();
    this._onTap = (event) => this._tap(event);
  }

  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
    for (const key of ['path', 'tap_path']) {
      const value = config[key];
      if (value !== undefined && value !== '' && (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//'))) {
        throw new Error(`${key} must start with a single /`);
      }
    }
    const after = config.after === undefined ? 120 : Number(config.after);
    if (!Number.isFinite(after) || after < 0) throw new Error('after must be a number of seconds');
    if (config.users !== undefined && !Array.isArray(config.users)) throw new Error('users must be a list');
    this._config = { dim_opacity: 0.55, ...config, after };
    this._render();
    if (this.isConnected) this._start();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first && this.isConnected) this._start();
  }

  get hass() {
    return this._hass;
  }

  getCardSize() {
    return 0;
  }

  getGridOptions() {
    return { columns: 'full', rows: 'auto' };
  }

  connectedCallback() {
    this._start();
  }

  disconnectedCallback() {
    this._stop();
  }

  /** Applies to this user? Without `users`, to everyone. */
  _applies() {
    const users = this._config && this._config.users;
    if (!users || !users.length) return true;
    const user = this._hass && this._hass.user;
    if (!user) return false;
    const names = users.map((entry) => String(entry).toLowerCase());
    return names.includes(String(user.id).toLowerCase()) || names.includes(String(user.name || '').toLowerCase());
  }

  _start() {
    this._stop();
    if (!this._config || !this._hass || !this._applies()) return;
    this._shownAt = Date.now();
    if (this._config.path) {
      for (const type of ACTIVITY) window.addEventListener(type, this._onActivity, { capture: true, passive: true });
      this._arm();
    }
    if (this._config.tap_path) window.addEventListener('click', this._onTap, { capture: true });
    this._dim();
    this._clock = window.setInterval(() => this._dim(), 30000);
  }

  _stop() {
    window.clearTimeout(this._timer);
    window.clearInterval(this._clock);
    this._timer = undefined;
    this._clock = undefined;
    for (const type of ACTIVITY) window.removeEventListener(type, this._onActivity, { capture: true });
    window.removeEventListener('click', this._onTap, { capture: true });
  }

  _arm() {
    window.clearTimeout(this._timer);
    if (!this._config.path || !this.isConnected) return;
    this._timer = window.setTimeout(() => {
      if (this.isConnected && window.location.pathname !== this._config.path) navigate(this._config.path);
    }, this._config.after * 1000);
  }

  /** The first tap leaves the calm view and does nothing else. */
  _tap(event) {
    if (!this.isConnected || Date.now() - this._shownAt < TAP_GRACE_MS) return;
    event.preventDefault();
    event.stopPropagation();
    navigate(this._config.tap_path);
  }

  _dim() {
    const overlay = this.shadowRoot.querySelector('.dim');
    if (!overlay) return;
    const config = this._config;
    const active = Boolean(config.dim_after || config.dim_before) && this._applies() && inWindow({ after: config.dim_after, before: config.dim_before }, new Date());
    const opacity = Math.min(0.9, Math.max(0, Number(config.dim_opacity) || 0));
    overlay.style.opacity = active ? String(opacity) : '0';
  }

  _render() {
    const style = document.createElement('style');
    style.textContent = IDLE_CSS;
    this.shadowRoot.replaceChildren(style, h('div', { class: 'dim', style: 'opacity:0' }));
    this._dim();
  }
}
