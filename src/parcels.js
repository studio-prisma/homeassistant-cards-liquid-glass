import { h, locale, fire, isUsable, SVG_NS } from './core.js';
import { createEditor } from './editor.js';
import { LgBase } from './base.js';
import { parcelText, parcelModel, parcelSummary, relativeDate, expectedText, addError, PARCEL_CARRIERS, PARCEL_NEEDS_POSTCODE, guessCarrier, carrierName } from './parcels-calc.js';
import { translateEvent } from './parcel-phrases.js';

/**
 * Parcels from the Parcel integration: one sentence on what is going on, a
 * four-step track per parcel, the history on tap, and adding a parcel in place.
 * Reads the raw shipment sensor; adding calls parcelapp.add_parcel.
 */

const PARCEL_FRESH_MS = 90 * 1000;
// The wall tablet is left alone for long stretches; an expanded list folds back on its own.
const PARCEL_COLLAPSE_MS = 2 * 60 * 1000;

export const PARCELS_CSS = `
  .card { display: flex; flex-direction: column; gap: 12px; background: var(--lg-panel-bg, rgba(255, 255, 255, 0.05)); }
  .head { align-items: center; }
  .plus { width: 36px; height: 36px; flex: none; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.14); background: rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: center; padding: 0; transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1), background-color 200ms ease, border-color 200ms ease; }
  .plus svg { width: 16px; height: 16px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
  .plus[aria-expanded="true"] { transform: rotate(45deg); background: rgba(var(--lg-cool-rgb), 0.22); border-color: rgba(var(--lg-cool-rgb), 0.5); }
  .plus[aria-expanded="true"]:active { transform: rotate(45deg) scale(0.94); }
  .sum { margin: -4px 0 0; font-size: 14px; line-height: 1.45; color: var(--lg-quiet); }
  .sum b { color: var(--lg-text); font-weight: 500; }
  .list { display: flex; flex-direction: column; gap: 10px; }
  .p { display: flex; flex-direction: column; gap: 10px; width: 100%; padding: 13px 14px; border-radius: 18px; background: rgba(255, 255, 255, 0.045); border: 1px solid rgba(255, 255, 255, 0.08); text-align: left; }
  .p.amber { background: linear-gradient(135deg, rgba(255, 196, 92, 0.16), rgba(255, 196, 92, 0.05)); border-color: rgba(255, 196, 92, 0.38); }
  .p.orange { background: rgba(255, 150, 90, 0.08); border-color: rgba(255, 150, 90, 0.42); }
  .p.green { opacity: 0.55; padding: 9px 14px; }
  .p.fresh { box-shadow: 0 0 0 1px rgba(var(--lg-cool-rgb), 0.45), 0 10px 30px rgba(var(--lg-cool-rgb), 0.18); animation: lg-parcel-in 520ms cubic-bezier(0.2, 0.9, 0.25, 1.1) both; }
  @keyframes lg-parcel-in { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: none; } }
  .top { display: flex; align-items: center; gap: 12px; }
  .badge { flex: none; width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; letter-spacing: 0.02em; background: rgba(255, 255, 255, 0.1); color: rgba(242, 244, 248, 0.9); }
  .p.amber .badge { background: rgba(255, 196, 92, 0.22); }
  .p.green .badge { width: 30px; height: 30px; border-radius: 10px; font-size: 10px; }
  .grow { flex: 1; min-width: 0; }
  .name { font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta { font-size: 12.5px; color: var(--lg-faint); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tag { flex: none; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); color: rgba(242, 244, 248, 0.85); white-space: nowrap; }
  .tag.amber { background: rgba(255, 196, 92, 0.22); color: #ffd690; }
  .tag.orange { background: rgba(255, 150, 90, 0.2); color: #ffb48a; }
  .tag.green { background: rgba(110, 214, 150, 0.18); color: #9be3b6; }
  .tag.blue { background: rgba(var(--lg-cool-rgb), 0.2); color: #b4d6ff; }
  .track { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
  .track i { height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.1); }
  .track i.f { background: rgba(var(--lg-cool-rgb), 0.75); }
  .track i.c { background: linear-gradient(90deg, rgba(var(--lg-cool-rgb), 0.75), rgba(var(--lg-cool-rgb), 0.35)); box-shadow: 0 0 10px rgba(var(--lg-cool-rgb), 0.55); }
  .p.amber .track i.f { background: rgba(255, 196, 92, 0.8); }
  .p.amber .track i.c { background: linear-gradient(90deg, rgba(255, 196, 92, 0.9), rgba(255, 196, 92, 0.4)); box-shadow: 0 0 12px rgba(255, 196, 92, 0.6); }
  .p.orange .track i.f, .p.orange .track i.c { background: rgba(255, 150, 90, 0.7); box-shadow: none; }
  .steps { display: grid; grid-template-columns: repeat(4, 1fr); font-size: 11px; color: rgba(242, 244, 248, 0.45); }
  .steps span.c { color: rgba(242, 244, 248, 0.9); font-weight: 500; }
  .tl { display: flex; flex-direction: column; gap: 8px; padding: 2px 0 0 6px; border-left: 1px solid rgba(255, 255, 255, 0.12); margin-left: 17px; }
  .tl div { font-size: 12.5px; line-height: 1.4; color: rgba(242, 244, 248, 0.72); padding-left: 12px; position: relative; }
  .tl div::before { content: ""; position: absolute; left: -4px; top: 6px; width: 7px; height: 7px; border-radius: 50%; background: rgba(255, 255, 255, 0.3); }
  .tl div:first-child::before { background: rgba(var(--lg-cool-rgb), 0.9); }
  .p.orange .tl div:first-child::before { background: #ffb48a; }
  .tl small { display: block; color: rgba(242, 244, 248, 0.45); font-size: 11.5px; }
  .empty { font-size: 14px; color: var(--lg-faint); }
  .p.compact { padding: 10px 14px; }
  .more { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 40px; border-radius: 13px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.05); color: rgba(242, 244, 248, 0.85); font-size: 13.5px; font-weight: 500; }
  .more svg { width: 10px; height: 10px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; opacity: 0.7; transition: transform 240ms ease; }
  .more[aria-expanded="true"] svg { transform: rotate(180deg); }
  @media (pointer: coarse) { .more { height: 44px; } }
  .sheet { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 320ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 220ms ease; opacity: 0; }
  .sheet.open { grid-template-rows: 1fr; opacity: 1; }
  .sheet > div { overflow: hidden; }
  .form { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 18px; background: rgba(255, 255, 255, 0.07); border: 1px solid rgba(255, 255, 255, 0.12); }
  label.field { display: flex; flex-direction: column; gap: 3px; padding: 9px 13px; border-radius: 13px; background: rgba(0, 0, 0, 0.18); border: 1px solid rgba(255, 255, 255, 0.1); transition: border-color 160ms ease, box-shadow 160ms ease; }
  label.field:focus-within { border-color: rgba(var(--lg-cool-rgb), 0.55); box-shadow: 0 0 0 3px rgba(var(--lg-cool-rgb), 0.15); }
  label.field span { font-size: 11.5px; color: rgba(242, 244, 248, 0.55); }
  input { font: inherit; font-size: 16px; color: var(--lg-text); background: none; border: 0; outline: none; padding: 0; width: 100%; min-width: 0; }
  input::placeholder { color: rgba(242, 244, 248, 0.3); }
  select { font: inherit; font-size: 16px; color: var(--lg-text); background: none; border: 0; outline: none; padding: 0; width: 100%; min-width: 0; color-scheme: dark; appearance: auto; }
  select option { color: #111; background: #fff; }
  .hintline.warn { color: #ffb48a; }
  .actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .hintline { font-size: 12px; color: rgba(242, 244, 248, 0.55); }
  .go { height: 44px; padding: 0 20px; border-radius: 13px; border: 1px solid rgba(var(--lg-cool-rgb), 0.45); background: rgba(var(--lg-cool-rgb), 0.2); font-weight: 600; font-size: 14px; flex: none; }
  .go[disabled] { opacity: 0.55; cursor: default; }
  .msg { font-size: 12.5px; line-height: 1.4; }
  .msg.ok { color: #9be3b6; }
  .msg.err { color: #ffb48a; }
  @media (prefers-reduced-motion: reduce) {
    .plus, .sheet { transition: opacity 200ms ease; }
    .p.fresh { animation: none; }
  }
`;

const PLUS_ICON = 'M8 2v12M2 8h12';

export class LgParcels extends LgBase {
  static getStubConfig(hass) {
    const states = (hass && hass.states) || {};
    const entity = Object.keys(states).find((id) => id.startsWith('sensor.') && Array.isArray(states[id].attributes && states[id].attributes.deliveries));
    return entity ? { entity } : { entity: 'sensor.parcel_raw_shipment_data' };
  }

  static getConfigElement() {
    return createEditor('lg-parcels');
  }

  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
    if (typeof config.entity !== 'string' || !config.entity.startsWith('sensor.')) throw new Error('entity is required: the raw shipment data sensor of the Parcel integration');
    if (config.device_id !== undefined && (typeof config.device_id !== 'string' || !/^[a-f0-9]{16,64}$/i.test(config.device_id))) throw new Error('device_id must be the id of the Parcel device');
    if (config.keep_days !== undefined && !(Number(config.keep_days) >= 0)) throw new Error('keep_days must be 0 or more');
    if (config.max !== undefined && !(Number(config.max) >= 1)) throw new Error('max must be 1 or more');
    this._built = false;
    this._open = new Set();
    this._expanded = false;
    this._setConfig({ keep_days: 2, max: 3, show_steps: true, hide_empty: false, ...config });
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return { columns: 'full', rows: 'auto', min_columns: 6 };
  }

  get tick() {
    return 60000;
  }

  get _text() {
    return parcelText(locale(this._hass));
  }

  _signature() {
    const stateObj = this._hass.states[this._config.entity];
    const now = new Date();
    return [stateObj ? stateObj.state : '-', stateObj ? stateObj.last_updated : '', now.toDateString(), [...this._open].join(','), this._fresh ? this._fresh.number : '', this._expanded ? 1 : 0].join('|');
  }

  _deliveries() {
    const stateObj = this._hass.states[this._config.entity];
    if (!isUsable(stateObj)) return [];
    return stateObj.attributes.deliveries;
  }

  _build() {
    const text = this._text;
    this._title = h('h2', null, this._config.title || text.title);
    const head = h('div', { class: 'head' }, this._title);
    if (this._config.device_id) {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 16 16');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', PLUS_ICON);
      svg.append(path);
      this._plus = h('button', { class: 'plus press', type: 'button', 'aria-expanded': 'false', 'aria-label': text.add_title }, svg);
      this._plus.addEventListener('click', () => this._toggleSheet());
      head.append(this._plus);
    }
    this._sum = h('p', { class: 'sum', 'aria-live': 'polite' });
    this._list = h('div', { class: 'list' });
    this._card = h('section', { class: 'card glass' }, head);
    if (this._config.device_id) this._card.append(this._buildSheet(text));
    this._moreBtn = h('button', { class: 'more press', type: 'button', 'aria-expanded': 'false' });
    this._moreBtn.addEventListener('click', () => this._setExpanded(!this._expanded));
    this._card.addEventListener('pointerdown', () => this._armCollapse());
    this._card.append(this._sum, this._list, this._moreBtn);
    this._mount(PARCELS_CSS, this._card);
    this._built = true;
  }

  _buildSheet(text) {
    const field = (labelText, attrs) => {
      const input = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'send', ...attrs });
      input.addEventListener('keydown', (event) => { if (event.key === 'Enter') this._submit(); });
      return { input, node: h('label', { class: 'field' }, h('span', null, labelText), input) };
    };
    const number = field(text.number, { maxlength: '60', placeholder: '1Z…' });
    const name = field(text.label, { maxlength: '60', autocapitalize: 'sentences' });
    this._inNumber = number.input;
    this._inName = name.input;
    this._inNumber.addEventListener('input', () => this._detectSoon());
    // Parcel cannot tell every number's carrier (DHL Paket "JJD…" for one); then the carrier is chosen here.
    this._inCarrier = h('select', null, h('option', { value: '' }, text.carrier_auto), ...PARCEL_CARRIERS.map(([key, label]) => h('option', { value: key }, label)));
    this._inCarrier.addEventListener('change', () => {
      const code = this._inCarrier.value;
      this._carrierTouched = Boolean(code);
      if (PARCEL_NEEDS_POSTCODE.includes(code)) {
        this._hintLine.textContent = text.needs_postcode;
        this._hintLine.className = 'hintline warn';
      } else if (code) {
        this._hintLine.textContent = `${text.chosen} ${carrierName(code)}`;
        this._hintLine.className = 'tag blue';
      } else {
        this._detectSoon();
      }
    });
    const carrier = h('label', { class: 'field' }, h('span', null, text.carrier), this._inCarrier);
    this._hintLine = h('span', { class: 'hintline' }, text.unknown_carrier);
    this._go = h('button', { class: 'go press', type: 'button' }, text.add);
    this._go.addEventListener('click', () => this._submit());
    this._msg = h('div', { class: 'msg', role: 'status' });
    const form = h('div', { class: 'form' }, number.node, name.node, carrier, h('div', { class: 'actions' }, this._hintLine, this._go), this._msg);
    this._sheet = h('div', { class: 'sheet', 'aria-hidden': 'true' }, h('div', null, form));
    this._setInert(true);
    return this._sheet;
  }

  _setInert(value) {
    for (const el of [this._inNumber, this._inName, this._inCarrier, this._go]) if (el) el.tabIndex = value ? -1 : 0;
  }

  _toggleSheet(force) {
    const open = force !== undefined ? force : !this._sheet.classList.contains('open');
    this._sheet.classList.toggle('open', open);
    this._sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
    this._plus.setAttribute('aria-expanded', open ? 'true' : 'false');
    this._plus.setAttribute('aria-label', open ? this._text.close : this._text.add_title);
    this._setInert(!open);
    if (open) window.setTimeout(() => this._inNumber.focus({ preventScroll: true }), 60);
    fire(this, 'haptic', 'light');
  }

  _detectSoon() {
    window.clearTimeout(this._detectTimer);
    const value = this._inNumber.value.trim();
    if (value.length < 8) {
      this._hintLine.textContent = this._text.unknown_carrier;
      this._hintLine.className = 'hintline';
      if (!this._carrierTouched) this._inCarrier.value = '';
      return;
    }
    this._detectTimer = window.setTimeout(() => this._detect(value), 500);
  }

  async _detect(value) {
    try {
      const result = await this._hass.callService('parcelapp', 'detect_carrier', { tracking_number: value }, undefined, false, true);
      if (this._inNumber.value.trim() !== value) return;
      const response = (result && result.response) || {};
      const best = Array.isArray(response.matches) ? response.matches.find((m) => m && m.carrier_code === response.best_match) || response.matches[0] : undefined;
      if (best && best.carrier_name) {
        this._hintLine.textContent = `${this._text.detected} ${String(best.carrier_name).slice(0, 40)}`;
        this._hintLine.className = 'tag blue';
        if (!this._carrierTouched) this._inCarrier.value = '';
        return;
      }
    } catch (err) {
      // Detection is only a hint; fall through to the local guess.
    }
    if (this._inNumber.value.trim() !== value) return;
    this._showGuess(value);
  }

  /** Parcel found nothing: preselect a carrier from known number formats, or ask for one. */
  _showGuess(value) {
    const guess = guessCarrier(value);
    if (guess && !this._carrierTouched) this._inCarrier.value = guess;
    if (PARCEL_NEEDS_POSTCODE.includes(this._inCarrier.value)) {
      this._hintLine.textContent = this._text.needs_postcode;
      this._hintLine.className = 'hintline warn';
    } else if (this._inCarrier.value) {
      this._hintLine.textContent = `${this._carrierTouched ? this._text.chosen : this._text.guessed} ${carrierName(this._inCarrier.value)}`;
      this._hintLine.className = 'tag blue';
    } else {
      this._hintLine.textContent = this._text.not_detected;
      this._hintLine.className = 'hintline warn';
    }
  }

  async _submit() {
    if (this._busy || !this._config.device_id) return;
    const text = this._text;
    const number = this._inNumber.value.trim();
    const name = this._inName.value.trim() || number;
    if (!number) {
      this._inNumber.focus();
      return;
    }
    this._busy = true;
    this._go.disabled = true;
    this._go.textContent = text.adding;
    this._msg.textContent = '';
    this._msg.className = 'msg';
    let error;
    // A chosen carrier wins; otherwise a known number format; otherwise Parcel detects it.
    const courier = this._inCarrier.value || guessCarrier(number);
    const data = { device_id: this._config.device_id, tracking_number: number, parcel_name: name, language: locale(this._hass).slice(0, 2) };
    if (courier) data.courier = courier;
    try {
      const result = await this._hass.callService('parcelapp', 'add_parcel', data, undefined, false, true);
      error = addError(result, text);
    } catch (err) {
      error = addError(err instanceof Error ? err : new Error(String((err && err.message) || '')), text);
    }
    this._busy = false;
    this._go.disabled = false;
    this._go.textContent = text.add;
    if (error) {
      this._msg.textContent = `${text.failed} ${error}`;
      this._msg.className = 'msg err';
      if (error === text.not_detected) this._inCarrier.focus();
      fire(this, 'haptic', 'failure');
      return;
    }
    this._msg.textContent = `${name} ${text.added}`;
    this._msg.className = 'msg ok';
    this._inNumber.value = '';
    this._inName.value = '';
    this._inCarrier.value = '';
    this._carrierTouched = false;
    this._detectSoon();
    this._fresh = { number, name, carrier: '', at: Date.now() };
    fire(this, 'haptic', 'success');
    this._key = undefined;
    this._update();
    // The integration polls; ask it once for the new list so the parcel shows up soon.
    window.setTimeout(() => {
      if (this._hass) this._hass.callService('homeassistant', 'update_entity', { entity_id: this._config.entity }).catch(() => undefined);
    }, 4000);
    window.setTimeout(() => {
      this._msg.textContent = '';
      this._fresh = undefined;
      this._key = undefined;
      this._update();
    }, PARCEL_FRESH_MS);
  }

  _setExpanded(value) {
    this._expanded = value;
    this._armCollapse();
    fire(this, 'haptic', 'selection');
    this._update();
  }

  _armCollapse() {
    window.clearTimeout(this._collapseTimer);
    if (!this._expanded) return;
    this._collapseTimer = window.setTimeout(() => {
      this._expanded = false;
      this._update();
    }, PARCEL_COLLAPSE_MS);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearTimeout(this._collapseTimer);
    this._expanded = false;
  }

  _row(parcel, now, text) {
    const open = this._open.has(parcel.id);
    const fresh = this._fresh && this._fresh.number === parcel.number;
    const status = parcel.key === 'delivered' && parcel.delivered ? `✓ ${relativeDate(parcel.delivered, now, text)}` : text.status[parcel.key];
    const tagTone = fresh ? 'blue' : parcel.tone === 'neutral' ? '' : parcel.tone === 'blue' ? '' : parcel.tone;
    const compact = this._expanded && !open && parcel.key !== 'delivered';
    const row = h('button', { class: `p press ${parcel.tone}${fresh ? ' fresh' : ''}${compact ? ' compact' : ''}`, type: 'button', 'aria-expanded': open ? 'true' : 'false' });
    const meta = parcel.key === 'delivered'
      ? ''
      : fresh && !parcel.last
        ? text.just_added
        : expectedText(parcel.expected, now, text, locale(this._hass)) || (parcel.last ? [translateEvent(parcel.last.text, locale(this._hass)).text.slice(0, 80), relativeDate(parcel.last.date, now, text)].filter(Boolean).join(' · ') : '');
    const info = h('div', { class: 'grow' }, h('div', { class: 'name' }, parcel.name));
    if (meta && !compact) info.append(h('div', { class: 'meta' }, meta));
    row.append(h('div', { class: 'top' }, h('div', { class: 'badge' }, parcel.carrier), info, h('span', { class: `tag ${tagTone}` }, fresh ? text.new : status)));
    if (parcel.key !== 'delivered' && this._config.show_steps !== false && !compact) {
      const track = h('div', { class: 'track', 'aria-hidden': 'true' });
      const steps = h('div', { class: 'steps' });
      text.steps.forEach((label, index) => {
        track.append(h('i', { class: index < parcel.step ? 'f' : index === parcel.step ? 'c' : '' }));
        steps.append(h('span', { class: index === parcel.step ? 'c' : '' }, label));
      });
      row.append(track, steps);
    }
    if (open && parcel.events.length) {
      const tl = h('div', { class: 'tl' });
      for (const event of parcel.events.slice(0, 5)) {
        const when = [relativeDate(event.date, now, text), event.location].filter(Boolean).join(' · ');
        const shown = translateEvent(event.text, locale(this._hass));
        // The carrier's own wording stays available on hover when the line is translated.
        tl.append(h('div', { title: shown.translated ? event.text.slice(0, 200) : undefined }, shown.text.slice(0, 140), when ? h('small', null, when) : undefined));
      }
      row.append(tl);
    }
    row.addEventListener('click', () => {
      if (this._open.has(parcel.id)) this._open.delete(parcel.id);
      else this._open.add(parcel.id);
      fire(this, 'haptic', 'selection');
      this._update();
    });
    return row;
  }

  _render() {
    if (!this._built) this._build();
    const text = this._text;
    const now = new Date();
    let model = parcelModel(this._deliveries(), now, this._config);
    if (this._fresh && !model.some((p) => p.number === this._fresh.number)) {
      model = [{ id: `fresh:${this._fresh.number}`, number: this._fresh.number, name: this._fresh.name, carrier: '…', key: 'info_received', tone: 'blue', step: 0, rank: -1, events: [], last: undefined }, ...model];
    }
    const limit = Math.max(1, Number(this._config.max) || 3);
    const shown = this._expanded ? model : model.slice(0, limit);
    const hidden = model.length - limit;
    this._sum.replaceChildren();
    for (const [index, sentence] of parcelSummary(model, now, text).entries()) {
      if (index) this._sum.append(' ');
      for (const part of sentence) this._sum.append(part.bold ? h('b', null, part.text) : part.text);
    }
    this._sum.hidden = !this._sum.childNodes.length;
    this._list.replaceChildren(...shown.map((parcel) => this._row(parcel, now, text)));
    if (!shown.length) this._list.append(h('div', { class: 'empty' }, this._config.empty_text || text.empty));
    this._moreBtn.hidden = hidden <= 0;
    if (hidden > 0) {
      const chevron = document.createElementNS(SVG_NS, 'svg');
      chevron.setAttribute('viewBox', '0 0 10 10');
      chevron.setAttribute('aria-hidden', 'true');
      const line = document.createElementNS(SVG_NS, 'path');
      line.setAttribute('d', 'M2 3.5l3 3 3-3');
      chevron.append(line);
      this._moreBtn.replaceChildren(this._expanded ? text.less : text.more.replace('{n}', String(hidden)), chevron);
      this._moreBtn.setAttribute('aria-expanded', this._expanded ? 'true' : 'false');
    } else if (this._expanded) {
      this._expanded = false;
    }
    this.style.display = !shown.length && this._config.hide_empty && !(this._sheet && this._sheet.classList.contains('open')) ? 'none' : '';
  }
}
