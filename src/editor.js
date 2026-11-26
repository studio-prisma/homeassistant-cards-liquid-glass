import { fire } from './core.js';
import { SPECS, label, toForm, fromForm } from './editor-spec.js';

/**
 * The form element of the dashboard is loaded on demand by Home Assistant.
 * Asking a built-in card for its editor pulls it in.
 */
async function ensureForm() {
  if (customElements.get('ha-form')) return;
  try {
    const helpers = typeof window.loadCardHelpers === 'function' ? await window.loadCardHelpers() : undefined;
    if (helpers) {
      const card = await helpers.createCardElement({ type: 'entities', entities: [] });
      if (card && card.constructor && typeof card.constructor.getConfigElement === 'function') {
        await card.constructor.getConfigElement();
      }
    }
  } catch (err) {
    // Fall through: whenDefined below resolves as soon as anything else loads the form.
  }
  await customElements.whenDefined('ha-form');
}

/** One editor element for all cards; `card` selects the specification. */
export class LgEditor extends HTMLElement {
  constructor() {
    super();
    this._hass = undefined;
    this._config = undefined;
    this._card = undefined;
    this._form = undefined;
    this._ready = false;
    this._language = undefined;
  }

  set lovelace(value) {
    this._lovelace = value;
    if (this._stack) this._stack.lovelace = value;
  }

  get lovelace() {
    return this._lovelace;
  }

  set card(tag) {
    this._card = tag;
    this._sync();
  }

  get card() {
    return this._card;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    else this._sync();
  }

  get hass() {
    return this._hass;
  }

  setConfig(config) {
    this._config = config;
    this._sync();
  }

  connectedCallback() {
    if (this._ready) return;
    ensureForm().then(() => {
      this._ready = true;
      this._sync();
    });
  }

  _sync() {
    const spec = SPECS[this._card];
    if (!this._ready || !this._hass || !this._config || !spec) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.addEventListener('value-changed', (event) => {
        event.stopPropagation();
        const config = { type: this._config.type, ...fromForm(this._card, event.detail.value, this._hass) };
        fire(this, 'config-changed', { config });
      });
      this.append(this._form);
    }
    const language = (this._hass.locale && this._hass.locale.language) || 'en';
    if (language !== this._language) {
      this._language = language;
      this._form.schema = spec.schema(this._hass);
      this._form.computeLabel = (field) => label(this._hass, field.label_key || field.name);
    }
    this._form.hass = this._hass;
    const { type, ...rest } = this._config;
    this._form.data = toForm(this._card, rest, this._hass);
    if (this._card === 'lg-column') this._syncStack();
  }

  /** The column's cards are edited with the card list Home Assistant uses for stacks. */
  async _syncStack() {
    if (!this._stackLoading && !this._stack) {
      this._stackLoading = true;
      try {
        const helpers = await window.loadCardHelpers();
        const stack = await helpers.createCardElement({ type: 'vertical-stack', cards: [] });
        const editor = await stack.constructor.getConfigElement();
        editor.addEventListener('config-changed', (event) => {
          event.stopPropagation();
          const cards = (event.detail.config && event.detail.config.cards) || [];
          fire(this, 'config-changed', { config: { ...this._config, cards } });
        });
        const heading = document.createElement('p');
        heading.style.cssText = 'margin: 16px 0 8px; font-weight: 500;';
        heading.textContent = label(this._hass, 'cards');
        this.append(heading, editor);
        this._stack = editor;
      } catch (err) {
        this._stackLoading = false;
        return;
      }
    }
    if (!this._stack) return;
    this._stack.hass = this._hass;
    if (this._lovelace) this._stack.lovelace = this._lovelace;
    this._stack.setConfig({ type: 'vertical-stack', cards: this._config.cards || [] });
  }
}

export function createEditor(tag) {
  const element = document.createElement('lg-card-editor');
  element.card = tag;
  return element;
}
