import { h, requireList } from './core.js';
import { createEditor } from './editor.js';

/**
 * A tall glass panel that holds other cards, as one column of a desktop layout.
 *
 * - On wide screens the panel reaches down to the bottom of the window, so the
 *   columns of one row end on the same line.
 * - The last `dock` cards sit at the bottom of the panel.
 * - Cards inside lose their own glass: the panel is the material, they are content.
 * - On narrow screens the panel disappears and every card keeps its own glass.
 */

export const BREAKPOINT = 870;

export const COLUMN_CSS = `
  :host { display: block; }
  .panel { display: flex; flex-direction: column; gap: var(--lg-col-gap, 18px); }
  .top, .dock { display: flex; flex-direction: column; gap: var(--lg-col-gap, 18px); }
  .top > [hidden], .dock > [hidden] { display: none; }
  .dock:empty, .dock:not(:has(> :not([hidden]))) { display: none; }
  @media (min-width: ${BREAKPOINT}px) {
    .panel {
      box-sizing: border-box;
      padding: 22px;
      border-radius: var(--glass-radius-lg, 26px);
      background: var(--glass-bg, rgba(255, 255, 255, 0.06));
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), var(--glass-shadow, 0 8px 32px rgba(0, 0, 0, 0.25));
      -webkit-backdrop-filter: var(--glass-blur, blur(28px) saturate(1.5));
      backdrop-filter: var(--glass-blur, blur(28px) saturate(1.5));
      /* What the cards inside read: no glass of their own, no outer padding. */
      --glass-bg: transparent;
      --glass-bg-hover: transparent;
      --glass-border: none;
      --glass-shadow: none;
      --glass-blur: none;
      --ha-card-background: transparent;
      --ha-card-border-width: 0;
      --ha-card-box-shadow: none;
      --lg-card-line: transparent;
      --lg-pad-override: 0px;
      --lg-panel-bg: transparent;
      --lg-now-bg: transparent;
      --lg-glass-edge: none;
    }
    .dock { margin-top: auto; padding-top: 18px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
  }
  @media (prefers-reduced-transparency: reduce) and (min-width: ${BREAKPOINT}px) {
    .panel { background: var(--glass-solid, #1a2036); -webkit-backdrop-filter: none; backdrop-filter: none; }
  }
`;

const GAP_BELOW = 24;

export class LgColumn extends HTMLElement {
  static getStubConfig() {
    return { cards: [], dock: 0 };
  }

  static getConfigElement() {
    return createEditor('lg-column');
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._cards = [];
    this._hass = undefined;
    this._config = undefined;
    this._build = 0;
    this._onResize = () => this._fit();
    this._observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this._fit()) : undefined;
  }

  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
    const cards = requireList(config.cards, 'cards');
    for (const card of cards) if (!card || typeof card.type !== 'string') throw new Error('Every card needs a type');
    const dock = Number(config.dock || 0);
    if (!Number.isInteger(dock) || dock < 0) throw new Error('dock must be a whole number');
    this._config = { fill: true, ...config, cards, dock: Math.min(dock, cards.length) };
    this._create();
  }

  set hass(hass) {
    this._hass = hass;
    for (const card of this._cards) card.hass = hass;
  }

  get hass() {
    return this._hass;
  }

  getCardSize() {
    return this._cards.reduce((sum, card) => sum + (typeof card.getCardSize === 'function' ? Number(card.getCardSize()) || 1 : 1), 0) || 1;
  }

  getGridOptions() {
    return { columns: 'full', rows: 'auto', min_columns: 6 };
  }

  connectedCallback() {
    window.addEventListener('resize', this._onResize);
    if (this._observer) this._observer.observe(document.documentElement);
    this._fitSoon();
  }

  /** Layout settles in steps (fonts, sibling cards, history); measure again after each. */
  _fitSoon() {
    window.requestAnimationFrame(() => this._fit());
    for (const delay of [250, 1000, 2500]) window.setTimeout(() => this._fit(), delay);
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this._onResize);
    if (this._observer) this._observer.disconnect();
  }

  /**
   * Child cards are wrapped in Home Assistant's own card element where it exists,
   * so their isibility conditions and error cards work as in a section.
   * Older frontends fall back to the card factory.
   */
  async _create() {
    const build = ++this._build;
    const config = this._config;
    let elements;
    if (customElements.get('hui-card')) {
      elements = config.cards.map((card) => {
        const wrapper = document.createElement('hui-card');
        wrapper.preview = false;
        wrapper.config = card;
        return wrapper;
      });
    } else if (typeof window.loadCardHelpers === 'function') {
      const helpers = await window.loadCardHelpers();
      elements = config.cards.map((card) => helpers.createCardElement(card));
    } else {
      elements = config.cards.map(() => h('div'));
    }
    if (build !== this._build) return;
    this._cards = elements;
    for (const card of elements) if (this._hass) card.hass = this._hass;
    const split = elements.length - config.dock;
    const panel = h('div', { class: 'panel' }, h('div', { class: 'top' }, ...elements.slice(0, split)), h('div', { class: 'dock' }, ...elements.slice(split)));
    const style = document.createElement('style');
    style.textContent = COLUMN_CSS;
    this.shadowRoot.replaceChildren(style, panel);
    this._panel = panel;
    this._fitSoon();
  }

  /** Reach down to the bottom of the window on wide screens. */
  _fit() {
    const panel = this._panel;
    if (!panel || !this.isConnected) return;
    if (!this._config.fill || window.innerWidth < BREAKPOINT) {
      panel.style.minHeight = '';
      return;
    }
    const scroller = document.scrollingElement || document.documentElement;
    const top = this.getBoundingClientRect().top + (scroller ? scroller.scrollTop : 0);
    const height = Math.round(window.innerHeight - top - GAP_BELOW);
    const value = height > 240 ? `${height}px` : '';
    if (panel.style.minHeight !== value) panel.style.minHeight = value;
  }
}
