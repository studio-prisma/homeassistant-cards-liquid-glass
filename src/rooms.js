import { h, t, fire, navigate, formatState, fill, icon, isUsable, requireList, formatNumber } from './core.js';
import { createEditor } from './editor.js';
import { LgBase } from './base.js';

export const ROOM_CSS = `
  .wrap { display: flex; flex-direction: column; gap: 12px; container-type: inline-size; }
  .head { align-items: center; }
  .alloff {
    flex: none; height: 36px; padding: 0 14px; border-radius: 12px;
    border: 1px solid rgba(255, 190, 110, 0.45); background: rgba(var(--lg-warm-rgb), 0.16);
    font-size: 13px; font-weight: 600;
  }
  @media (pointer: coarse) { .alloff { height: 44px; } }
  .grid { display: grid; grid-template-columns: repeat(var(--lg-cols, 2), minmax(0, 1fr)); gap: 12px; }
  .tile {
    display: flex; align-items: center; gap: 14px;
    width: 100%; height: var(--lg-tile-h); padding: 0 18px;
    border-radius: 22px; text-align: left;
    background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.10);
  }
  .tile.on { background: linear-gradient(135deg, rgba(var(--lg-warm-rgb), 0.28), rgba(255, 200, 140, 0.08)); border-color: rgba(255, 190, 110, 0.45); }
  .tile.on.cool { background: linear-gradient(135deg, rgba(var(--lg-cool-rgb), 0.26), rgba(100, 220, 220, 0.08)); border-color: rgba(var(--lg-cool-rgb), 0.45); }
  .tile[disabled] { cursor: default; opacity: 0.55; }
  .glyph {
    display: grid; place-items: center; flex: none;
    width: var(--lg-tile-icon); height: var(--lg-tile-icon); border-radius: 50%;
    background: rgba(255, 255, 255, 0.07); color: rgba(242, 244, 248, 0.62);
    transition: background-color 240ms ease, color 240ms ease;
  }
  .tile.on .glyph { background: rgba(var(--lg-warm-rgb), 0.22); color: #ffc27a; }
  .tile.on.cool .glyph { background: rgba(var(--lg-cool-rgb), 0.22); color: #a9cfff; }
  ha-icon { --mdc-icon-size: var(--lg-tile-glyph); display: flex; }
  .text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .name { font-size: var(--lg-tile-name); font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: var(--lg-tile-sub); color: rgba(242, 244, 248, 0.72); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* Narrow columns (phone, desktop column): text-only tiles, as names matter more than icons. */
  @container (max-width: 460px) {
    .glyph { display: none; }
    .tile { padding: 0 16px; }
    .hint { display: none; }
  }
  @media (prefers-reduced-transparency: reduce) {
    .tile.on { background: #4a3a22 !important; }
    .tile.on.cool { background: #22344a !important; }
  }
`;

export const HOLD_MS = 500;
export const CONFIRM_MS = 4000;

export function entityInArea(hass, entityId, areaId) {
  const entry = hass.entities && hass.entities[entityId];
  if (!entry || entry.hidden || entry.entity_category) return false;
  if (entry.area_id) return entry.area_id === areaId;
  const device = entry.device_id && hass.devices && hass.devices[entry.device_id];
  return Boolean(device && device.area_id === areaId);
}

/** Lights of an area. A light group is dropped when all its members are listed too. */
/** First temperature sensor of the area, or the configured one. */
export function areaTemperature(hass, spec) {
  const area = hass.areas && hass.areas[spec.area];
  const id = spec.temperature || (area && area.temperature_entity_id) || Object.keys(hass.states).find((key) => key.startsWith('sensor.') && hass.states[key].attributes.device_class === 'temperature' && entityInArea(hass, key, spec.area));
  const value = id && hass.states[id] ? Number(hass.states[id].state) : NaN;
  return Number.isFinite(value) ? value : undefined;
}

export function areaLights(hass, areaId, exclude) {
  const states = hass.states;
  const ids = Object.keys(states).filter((id) => id.startsWith('light.') && !exclude.includes(id) && entityInArea(hass, id, areaId));
  const set = new Set(ids);
  return ids.filter((id) => {
    const members = states[id].attributes.entity_id;
    return !(Array.isArray(members) && members.length && members.every((m) => set.has(m)));
  });
}

/** Normalised description of one tile: an area or a single entity. */
export function tileModel(hass, spec) {
  if (spec.entity) {
    const stateObj = hass.states[spec.entity];
    const usable = isUsable(stateObj);
    const on = usable && stateObj.state === 'on';
    return {
      id: spec.entity,
      key: `${spec.entity}:${stateObj ? stateObj.state : '-'}`,
      name: spec.name || (stateObj && stateObj.attributes.friendly_name) || spec.entity,
      icon: spec.icon || 'mdi:power-plug-outline',
      sub: spec.subtitle ? fill(spec.subtitle, hass, stateObj) : !usable ? t(hass, 'unavailable') : formatState(hass, stateObj),
      on,
      cool: spec.tone !== 'warm',
      disabled: !usable,
      toggle: () => hass.callService('homeassistant', 'toggle', { entity_id: spec.entity }),
      hold: () => ({ entityId: spec.entity }),
    };
  }
  const area = hass.areas && hass.areas[spec.area];
  const lights = areaLights(hass, spec.area, spec.exclude || []);
  const usable = lights.filter((id) => isUsable(hass.states[id]));
  const onCount = usable.filter((id) => hass.states[id].state === 'on').length;
  const count = `${usable.length} ${t(hass, usable.length === 1 ? 'light' : 'lights')}`;
  let sub;
  if (!area) sub = t(hass, 'unavailable');
  else if (!lights.length) sub = t(hass, 'no_lights');
  else if (!usable.length) sub = t(hass, 'unavailable');
  else if (onCount) sub = `${t(hass, 'on')} · ${onCount === usable.length ? count : `${onCount}/${usable.length}`}`;
  else sub = `${t(hass, 'off')} · ${count}`;
  const temperature = spec.show_temperature === false ? undefined : areaTemperature(hass, spec);
  if (temperature !== undefined && area) sub += ` · ${formatNumber(hass, temperature, 1)}°`;
  return {
    id: spec.area,
    key: `${spec.area}:${area ? area.name : '-'}:${lights.map((id) => hass.states[id].state).join('')}:${sub}`,
    name: spec.name || (area ? area.name : spec.area),
    icon: spec.icon || (area && area.icon) || 'mdi:lightbulb-outline',
    sub,
    on: onCount > 0,
    cool: false,
    disabled: !usable.length,
    toggle: () => hass.callService('light', onCount > 0 ? 'turn_off' : 'turn_on', { entity_id: usable }),
    hold: () => ({ path: spec.hold_path || `/config/areas/area/${encodeURIComponent(spec.area)}` }),
  };
}

export function renderTile(node, model) {
  const button = h(
    'button',
    {
      class: `tile glass press${model.on ? ' on' : ''}${model.cool ? ' cool' : ''}`,
      type: 'button',
      'aria-pressed': model.disabled ? undefined : String(model.on),
      disabled: model.disabled,
    },
    h('span', { class: 'glyph' }, icon(model.icon)),
    h('span', { class: 'text' }, h('span', { class: 'name' }, model.name), h('span', { class: 'sub' }, model.sub)),
  );
  // Handlers read the current model, so a tile can be updated without being replaced.
  button._model = model;

  // Tap switches, press and hold opens details. A hold must not also switch.
  let timer;
  let held = false;
  const clear = () => {
    window.clearTimeout(timer);
    timer = undefined;
  };
  button.addEventListener('pointerdown', () => {
    held = false;
    clear();
    timer = window.setTimeout(() => {
      held = true;
      fire(node, 'haptic', 'medium');
      const target = button._model.hold();
      if (target.entityId) fire(node, 'hass-more-info', { entityId: target.entityId });
      else navigate(target.path);
    }, HOLD_MS);
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(type, clear);
  button.addEventListener('contextmenu', (event) => event.preventDefault());
  button.addEventListener('click', () => {
    if (held) {
      held = false;
      return;
    }
    const current = button._model;
    const next = !current.on;
    button.classList.toggle('on', next);
    button.setAttribute('aria-pressed', String(next));
    current.toggle();
    fire(node, 'haptic', 'light');
    // If no state change arrives (call failed, device offline), fall back to the real state.
    window.setTimeout(() => {
      node._key = undefined;
      node._update();
    }, CONFIRM_MS);
  });
  return button;
}

/** Bring an existing tile in line with a new model. Keeps the element, its focus and its icon. */
export function patchTile(button, model) {
  button._model = model;
  button.classList.toggle('on', model.on);
  button.classList.toggle('cool', model.cool);
  button.disabled = model.disabled;
  if (model.disabled) button.removeAttribute('aria-pressed');
  else button.setAttribute('aria-pressed', String(model.on));
  const name = button.querySelector('.name');
  const sub = button.querySelector('.sub');
  if (name.textContent !== model.name) name.textContent = model.name;
  if (sub.textContent !== model.sub) sub.textContent = model.sub;
}

/** Tiles can be patched as long as the same tiles with the same icons are shown. */
export function tileShape(models) {
  return models.map((model) => `${model.id}/${model.icon}`).join(',');
}

export function normaliseTiles(config) {
  const specs = [];
  for (const entry of requireList(config.areas, 'areas')) {
    if (typeof entry === 'string') specs.push({ area: entry });
    else if (entry && typeof entry.area === 'string') specs.push(entry);
    else throw new Error('Every areas entry needs an area id');
  }
  for (const entry of requireList(config.extra, 'extra')) {
    if (!entry || typeof entry.entity !== 'string') throw new Error('Every extra entry needs an entity');
    specs.push(entry);
  }
  return specs;
}

export class LgRooms extends LgBase {
  static getStubConfig(hass) {
    return { areas: hass && hass.areas ? Object.keys(hass.areas).slice(0, 4) : [] };
  }

  static getConfigElement() {
    return createEditor('lg-rooms');
  }

  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
    const specs = normaliseTiles(config);
    if (!specs.length && !config.floor) throw new Error('Set areas, extra or floor');
    this._specs = specs;
    this._setConfig({ columns: 2, show_header: true, all_off: false, ...config });
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { columns: 'full', rows: 'auto', min_columns: 6 };
  }

  /** With `floor`, all areas of that floor come first, in name order. */
  _all() {
    const hass = this._hass;
    if (!this._config.floor || !hass.areas) return this._specs;
    const listed = new Set(this._specs.filter((spec) => spec.area).map((spec) => spec.area));
    const auto = Object.values(hass.areas)
      .filter((area) => area.floor_id === this._config.floor && !listed.has(area.area_id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((area) => ({ area: area.area_id }));
    return [...this._specs.filter((spec) => spec.area), ...auto, ...this._specs.filter((spec) => spec.entity)];
  }

  _models() {
    return this._all().map((spec) => tileModel(this._hass, spec));
  }

  _signature() {
    return this._models().map((model) => `${model.key}/${model.sub}`).join('|');
  }

  _hint(models) {
    const on = models.filter((model) => model.on).length;
    return `${on} ${t(this._hass, 'n_on')} · ${this._config.hint || t(this._hass, 'rooms_hint')}`;
  }

  _render() {
    const hass = this._hass;
    const models = this._models();
    const shape = tileShape(models);
    if (this._shape === shape && this._tiles && this._tiles.length === models.length && this._tiles[0].isConnected) {
      models.forEach((model, index) => patchTile(this._tiles[index], model));
      if (this._hintEl) this._hintEl.textContent = this._hint(models);
      return;
    }
    this._shape = shape;
    this._hintEl = undefined;
    const wrap = h('div', { class: 'wrap', style: `--lg-cols:${Math.min(6, Math.max(1, Number(this._config.columns) || 2))}` });
    if (this._config.show_header) {
      this._hintEl = h('span', { class: 'hint' }, this._hint(models));
      const head = h('div', { class: 'head' }, h('h2', null, this._config.title || t(hass, 'rooms')));
      if (this._config.all_off) {
        const off = h('button', { class: 'alloff press', type: 'button' }, t(hass, 'all_off'));
        off.addEventListener('click', () => {
          const ids = this._all().filter((spec) => spec.area).flatMap((spec) => areaLights(hass, spec.area, spec.exclude || []));
          const on = ids.filter((id) => hass.states[id] && hass.states[id].state === 'on');
          if (on.length) hass.callService('light', 'turn_off', { entity_id: on });
          fire(this, 'haptic', 'light');
        });
        head.append(off);
      } else {
        head.append(this._hintEl);
      }
      wrap.append(head);
    }
    const grid = h('div', { class: 'grid' });
    this._tiles = models.map((model) => renderTile(this, model));
    grid.append(...this._tiles);
    wrap.append(grid);
    this._mount(ROOM_CSS, wrap);
  }
}

export class LgRoom extends LgBase {
  static getStubConfig(hass) {
    return { area: hass && hass.areas ? Object.keys(hass.areas)[0] || '' : '' };
  }

  static getConfigElement() {
    return createEditor('lg-room');
  }

  setConfig(config) {
    if (!config || (typeof config.area !== 'string' && typeof config.entity !== 'string')) throw new Error('area or entity is required');
    if (config.exclude !== undefined && !Array.isArray(config.exclude)) throw new Error('exclude must be a list');
    this._setConfig({ ...config });
  }

  getCardSize() {
    return 2;
  }

  getGridOptions() {
    return { columns: 6, rows: 'auto', min_columns: 3 };
  }

  _signature() {
    const model = tileModel(this._hass, this._config);
    return `${model.key}/${model.sub}`;
  }

  _render() {
    const model = tileModel(this._hass, this._config);
    const shape = tileShape([model]);
    if (this._shape === shape && this._tile && this._tile.isConnected) {
      patchTile(this._tile, model);
      return;
    }
    this._shape = shape;
    this._tile = renderTile(this, model);
    this._mount(ROOM_CSS, this._tile);
  }
}
