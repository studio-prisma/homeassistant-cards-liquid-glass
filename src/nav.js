import { h, navigate, icon, requireList } from './core.js';
import { createEditor } from './editor.js';
import { LgBase } from './base.js';

export const NAV_CSS = `
  :host { --lg-nav-h: 64px; }
  .spacer { height: calc(var(--lg-nav-h) + 32px); }
  nav {
    position: fixed; left: 16px; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); z-index: 5;
    display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr);
    height: var(--lg-nav-h); border-radius: 26px;
    background: rgba(22, 28, 52, 0.62); border: 1px solid rgba(255, 255, 255, 0.16);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.10);
    /* a floating bar is a thicker material than a card */
    --lg-blur: blur(34px) saturate(1.7);
  }
  a {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    color: rgba(242, 244, 248, 0.66); text-decoration: none; font-size: 11px; font-weight: 500;
  }
  a[aria-current="page"] { color: #ffffff; font-weight: 600; }
  ha-icon { --mdc-icon-size: 22px; display: flex; }
  @media (min-width: 870px) {
    .spacer { display: none; }
    nav {
      position: static; display: inline-flex; gap: 4px; height: auto; padding: 6px; border-radius: 999px; box-shadow: none;
      background: var(--lg-bg);
    }
    a { flex-direction: row; gap: 8px; height: 36px; padding: 0 16px; border-radius: 999px; font-size: 14px; }
    a[aria-current="page"] { background: rgba(255, 255, 255, 0.10); }
    ha-icon { --mdc-icon-size: 18px; }
  }
`;

export class LgNav extends LgBase {
  static getStubConfig() {
    return { items: [] };
  }

  static getConfigElement() {
    return createEditor('lg-nav');
  }

  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
    const items = requireList(config.items, 'items');
    for (const item of items) {
      if (!item || typeof item.label !== 'string' || typeof item.path !== 'string') throw new Error('Every item needs a label and a path');
      if (!item.path.startsWith('/') || item.path.startsWith('//')) throw new Error('path must start with a single /');
    }
    this._setConfig({ ...config, items });
  }

  getCardSize() {
    return 1;
  }

  getGridOptions() {
    return { columns: 'full', rows: 'auto', min_columns: 6 };
  }

  connectedCallback() {
    super.connectedCallback();
    this._onLocation = () => {
      this._key = undefined;
      this._update();
    };
    window.addEventListener('location-changed', this._onLocation);
    window.addEventListener('popstate', this._onLocation);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('location-changed', this._onLocation);
    window.removeEventListener('popstate', this._onLocation);
  }

  _signature() {
    return window.location.pathname;
  }

  _render() {
    const nav = h('nav', { class: 'glass', 'aria-label': this._config.label || 'Navigation' });
    for (const item of this._config.items) {
      const current = window.location.pathname === item.path;
      const link = h('a', { href: item.path, 'aria-current': current ? 'page' : undefined }, item.icon ? icon(item.icon) : null, item.label);
      link.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        navigate(item.path);
      });
      nav.append(link);
    }
    this._mount(NAV_CSS, nav, h('div', { class: 'spacer' }));
  }
}
