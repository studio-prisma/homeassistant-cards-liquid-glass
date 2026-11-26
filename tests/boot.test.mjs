/**
 * Boots the built file in a DOM and drives every card once.
 * Run `node tools/build.mjs` first; `npm test` does that through `pretest`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const code = readFileSync(new URL('../dist/liquid-glass-cards.js', import.meta.url), 'utf8');

// Values created inside the jsdom window belong to another realm; compare them as plain data.
const plain = (value) => JSON.parse(JSON.stringify(value));

const HOSTILE = '<img src=x onerror="window.__pwned = true">';

// Cards run timers (clock, refresh). Close every window so the test process can exit.
const windows = [];
test.after(() => {
  for (const window of windows) window.close();
});

function boot() {
  const errors = [];
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://homeassistant.test/dash/home',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  windows.push(window);
  window.addEventListener('error', (event) => errors.push(event.message));
  window.console.info = () => undefined;
  window.eval(code);
  return { window, errors };
}

function makeHass(calls) {
  const light = (state, extra = {}) => ({ state, attributes: { friendly_name: 'Light', ...extra } });
  return {
    locale: { language: 'en' },
    config: { time_zone: 'Europe/Berlin' },
    areas: {
      living: { area_id: 'living', name: HOSTILE, icon: 'mdi:sofa', floor_id: 'ground' },
      kitchen: { area_id: 'kitchen', name: 'Kitchen', floor_id: 'ground' },
      empty: { area_id: 'empty', name: 'Empty', floor_id: 'ground' },
    },
    devices: { dev1: { area_id: 'kitchen' } },
    entities: {
      'light.living_a': { area_id: 'living' },
      'light.living_b': { area_id: 'living' },
      'light.living_group': { area_id: 'living' },
      'light.kitchen': { device_id: 'dev1' },
      'light.kitchen_diag': { device_id: 'dev1', entity_category: 'diagnostic' },
      'light.hidden': { area_id: 'kitchen', hidden: true },
    },
    states: {
      'light.living_a': light('on'),
      'light.living_b': light('off'),
      'light.living_group': light('on', { entity_id: ['light.living_a', 'light.living_b'] }),
      'light.kitchen': light('off'),
      'light.kitchen_diag': light('on'),
      'light.hidden': light('on'),
      'weather.home': { state: 'cloudy', attributes: { temperature: -1.5 } },
      'sensor.trips': { state: '23:29 23:56 S9 (27 Min.) · 23:35 00:07 S8 (32 Min.)', attributes: {} },
      'sensor.note': { state: HOSTILE, attributes: { friendly_name: HOSTILE } },
      'sensor.power': { state: '6.8', attributes: { unit_of_measurement: 'kWh', friendly_name: 'Energy' } },
      'binary_sensor.bin': { state: 'on', attributes: { friendly_name: 'Bin' } },
      'switch.plug': { state: 'on', attributes: { friendly_name: 'Plug' } },
    },
    formatEntityState: (stateObj) => stateObj.state,
    callService: (...args) => calls.push(args),
    callApi: (method, path) => Promise.resolve(path.startsWith('calendars/calendar.home') ? [
      { summary: 'Weekly', start: { dateTime: new Date(Date.now() + 3600e3).toISOString() }, end: { dateTime: new Date(Date.now() + 7200e3).toISOString() } },
      { summary: 'Private', start: { dateTime: new Date(Date.now() + 3600e3).toISOString() }, end: { dateTime: new Date(Date.now() + 7200e3).toISOString() } },
    ] : [{ summary: HOSTILE, start: { date: new Date().toISOString().slice(0, 10) }, end: { date: new Date(Date.now() + 86400e3).toISOString().slice(0, 10) } }]),
    callWS: (message) => message.type === 'recorder/statistics_during_period'
      ? Promise.resolve({ 'sensor.meter_a': [{ start: Date.now() - 3600e3, change: 0.4 }], 'sensor.meter_b': [{ start: Date.now() - 3600e3, change: 0.2 }] })
      : Promise.resolve({ 'sensor.power': [{ s: '1', lu: 1 }, { s: '3', lu: 2 }, { s: '2', lu: 3 }] }),
    connection: { subscribeMessage: () => Promise.resolve(() => undefined) },
  };
}

function mount(window, tag, config, hass) {
  const el = window.document.createElement(tag);
  el.setConfig(config);
  el.hass = hass;
  window.document.body.append(el);
  return el;
}

const CONFIGS = {
  'lg-hero': { weather: 'weather.home', size: 'large', chips: [{ entity: 'binary_sensor.bin', label: 'Bin {state}', color: 'amber', when: { state: 'on' } }, { entity: 'sensor.missing' }] },
  'lg-headline': { name: HOSTILE, weather: 'weather.home', chips: [{ entity: 'sensor.note' }] },
  'lg-now': { hint: 'hint', items: [{ title: 'Take out the bin', subtitle: '{state}', entity: 'binary_sensor.bin', when: { state: 'on' }, button: { label: 'Off', service: 'light.turn_off' } }, { title: 'Hidden', entity: 'binary_sensor.bin', when: { state: 'off' } }] },
  'lg-rooms': { areas: ['living', { area: 'kitchen', name: 'Cook' }, 'empty', 'nowhere'], extra: [{ entity: 'switch.plug', name: 'Devices' }] },
  'lg-room': { area: 'kitchen' },
  'lg-list': { title: 'Trips', icon: 'mdi:train', entity: 'sensor.trips', pattern: '^(\\S+) (\\S+) (.+) \\((.+)\\)$', columns: ['{1} → {2}', '{3}', '{4}'], note: { entity: 'sensor.note' }, items: [{ label: 'Energy', entity: 'sensor.power' }, { lead: '09:00', label: 'Weekly' }] },
  'lg-stat': { entity: 'sensor.power', label: 'Today' },
  'lg-nav': { items: [{ label: 'Home', icon: 'mdi:home', path: '/dash/home' }, { label: 'Other', path: '/dash/other' }] },
  'lg-column': { dock: 1, cards: [{ type: 'custom:lg-now', items: [] }, { type: 'custom:lg-list', title: 'Bottom' }] },
  'lg-agenda': { entities: ['calendar.home', 'calendar.work'], exclude: '^Private$' },
  'lg-idle': { after: 120, path: '/dash/calm' },
  'lg-energy': { statistics: ['sensor.meter_a', 'sensor.meter_b'] },
  'lg-parcels': { entity: 'sensor.parcels_raw', device_id: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4' },
};

function parcelHass(calls, respond) {
  const hass = makeHass(calls);
  const today = new Date();
  const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 08:12`;
  hass.states['sensor.parcels_raw'] = {
    state: '2026-11-26 09:55', last_updated: 'x',
    attributes: {
      deliveries: [
        { carrier_code: 'dhl', description: HOSTILE, status_code: 3, tracking_number: 'Z1', events: [{ event: 'In der Filiale', date: stamp, location: 'Filiale' }, { event: 'Empfänger abwesend', date: stamp }] },
        { carrier_code: 'ups', description: 'Shirt', status_code: 4, tracking_number: 'U1', events: [{ event: 'In Zustellung', date: stamp }] },
      ],
    },
  };
  hass.callService = (...args) => {
    calls.push(args);
    return respond ? respond(args) : Promise.resolve({ context: {} });
  };
  return hass;
}

test('every card registers, renders and announces itself to the card picker', () => {
  const { window, errors } = boot();
  const hass = parcelHass([]);
  for (const [tag, config] of Object.entries(CONFIGS)) {
    assert.ok(window.customElements.get(tag), `${tag} is defined`);
    const el = mount(window, tag, config, hass);
    if (tag !== 'lg-idle') assert.ok(el.shadowRoot.textContent.replace(/\s+/g, '').length > 0, `${tag} rendered something`);
    assert.equal(typeof el.getCardSize(), 'number');
    assert.ok(el.getGridOptions().columns);
    assert.equal(window.customElements.get(tag).getConfigElement().card, tag, `${tag} has an editor`);
    assert.ok(window.customElements.get(tag).getStubConfig(hass));
    el.remove();
  }
  assert.deepEqual(plain(window.customCards.map((card) => card.type).sort()), Object.keys(CONFIGS).sort());
  assert.deepEqual(errors, []);
});

test('names and states from Home Assistant are rendered as text, never as markup', () => {
  const { window } = boot();
  const hass = makeHass([]);
  for (const tag of ['lg-headline', 'lg-rooms', 'lg-list', 'lg-hero']) {
    const el = mount(window, tag, CONFIGS[tag], hass);
    assert.equal(el.shadowRoot.querySelector('img'), null, `${tag} created no element from data`);
  }
  assert.equal(window.__pwned, undefined);
  const rooms = mount(window, 'lg-rooms', CONFIGS['lg-rooms'], hass);
  assert.equal(rooms.shadowRoot.querySelector('.name').textContent, HOSTILE);
});

test('invalid configuration is rejected with a clear error', () => {
  const { window } = boot();
  const make = (tag) => window.document.createElement(tag);
  assert.throws(() => make('lg-room').setConfig({}), /area or entity/);
  assert.throws(() => make('lg-rooms').setConfig({}), /areas, extra or floor/);
  assert.throws(() => make('lg-hero').setConfig({ chips: 'x' }), /chips must be a list/);
  assert.throws(() => make('lg-now').setConfig({ items: [{}] }), /title/);
  assert.throws(() => make('lg-stat').setConfig({}), /entity is required/);
  assert.throws(() => make('lg-nav').setConfig({ items: [{ label: 'x', path: 'https://example.com' }] }), /path must start/);
  assert.throws(() => make('lg-nav').setConfig({ items: [{ label: 'x', path: '//example.com' }] }), /path must start/);
});

test('room tile: counts usable lights, drops covered groups, tap switches the area', () => {
  const { window } = boot();
  const calls = [];
  const rooms = mount(window, 'lg-rooms', CONFIGS['lg-rooms'], makeHass(calls));
  const tiles = [...rooms.shadowRoot.querySelectorAll('.tile')];
  assert.equal(tiles.length, 5);
  assert.match(tiles[0].querySelector('.sub').textContent, /On · 1\/2/);
  assert.ok(tiles[0].classList.contains('on'));
  assert.equal(tiles[1].querySelector('.name').textContent, 'Cook');
  assert.match(tiles[1].querySelector('.sub').textContent, /Off · 1 light$/);
  assert.equal(tiles[2].disabled, true);
  assert.equal(tiles[3].disabled, true);
  assert.ok(tiles[4].classList.contains('cool'));

  tiles[0].click();
  assert.deepEqual(plain(calls.pop()), ['light', 'turn_off', { entity_id: ['light.living_a', 'light.living_b'] }]);
  tiles[1].click();
  assert.deepEqual(plain(calls.pop()), ['light', 'turn_on', { entity_id: ['light.kitchen'] }]);
  tiles[4].click();
  assert.deepEqual(plain(calls.pop()), ['homeassistant', 'toggle', { entity_id: 'switch.plug' }]);
});

test('room tile: press and hold opens the area and does not switch', async () => {
  const { window } = boot();
  const calls = [];
  const room = mount(window, 'lg-room', { area: 'kitchen' }, makeHass(calls));
  const tile = room.shadowRoot.querySelector('.tile');
  tile.dispatchEvent(new window.Event('pointerdown'));
  await new Promise((resolve) => setTimeout(resolve, 650));
  assert.equal(window.location.pathname, '/config/areas/area/kitchen');
  tile.dispatchEvent(new window.Event('pointerup'));
  tile.click();
  assert.equal(calls.length, 0);
});

test('now card: shows only matching rows and runs the configured action', () => {
  const { window } = boot();
  const calls = [];
  const now = mount(window, 'lg-now', CONFIGS['lg-now'], makeHass(calls));
  const rows = [...now.shadowRoot.querySelectorAll('.item')];
  assert.equal(rows.length, 1);
  assert.equal(rows[0].querySelector('.sub').textContent, 'on');
  rows[0].querySelector('button').click();
  assert.deepEqual(plain(calls.pop()), ['light', 'turn_off', {}, { entity_id: 'binary_sensor.bin' }]);
});

test('list card: splits an entity state into columns and shows the note', () => {
  const { window } = boot();
  const list = mount(window, 'lg-list', CONFIGS['lg-list'], makeHass([]));
  const rows = [...list.shadowRoot.querySelectorAll('.row')];
  assert.equal(rows.length, 4);
  assert.deepEqual([...rows[0].children].map((cell) => cell.textContent), ['23:29 → 23:56', 'S9', '27 Min.']);
  assert.equal(list.shadowRoot.querySelector('.note').textContent, HOSTILE);
});

test('nav card: marks the current page and navigates without a reload', () => {
  const { window } = boot();
  const nav = mount(window, 'lg-nav', CONFIGS['lg-nav'], makeHass([]));
  const links = [...nav.shadowRoot.querySelectorAll('a')];
  assert.equal(links[0].getAttribute('aria-current'), 'page');
  links[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.equal(window.location.pathname, '/dash/other');
  assert.equal(nav.shadowRoot.querySelectorAll('a')[1].getAttribute('aria-current'), 'page');
});

test('stat card: draws a sparkline once history arrives', async () => {
  const { window } = boot();
  const stat = mount(window, 'lg-stat', CONFIGS['lg-stat'], makeHass([]));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(stat.shadowRoot.querySelector('svg path'));
  assert.match(stat.shadowRoot.querySelector('.value').textContent, /6\.8/);
});

test('state changes patch existing tiles and the clock in place instead of rebuilding them', () => {
  const { window } = boot();
  const hass = makeHass([]);
  const rooms = mount(window, 'lg-rooms', CONFIGS['lg-rooms'], hass);
  const before = [...rooms.shadowRoot.querySelectorAll('.tile')];
  const next = { ...hass, states: { ...hass.states, 'light.kitchen': { state: 'on', attributes: {} } } };
  rooms.hass = next;
  const after = [...rooms.shadowRoot.querySelectorAll('.tile')];
  assert.ok(after.every((tile, index) => tile === before[index]), 'same tile elements');
  assert.ok(after[1].classList.contains('on'));
  assert.equal(after[1].getAttribute('aria-pressed'), 'true');
  assert.match(rooms.shadowRoot.querySelector('.hint').textContent, /^3 on/);

  const hero = mount(window, 'lg-hero', CONFIGS['lg-hero'], hass);
  const clock = hero.shadowRoot.querySelector('.clock');
  hero._key = `changed${hero._key.slice(hero._key.indexOf('|'))}`;
  hero._render();
  assert.equal(hero.shadowRoot.querySelector('.clock'), clock, 'same clock element');
});
test('column: renders its cards through the card factory, splits off the docked ones, rejects bad config', async () => {
  const { window } = boot();
  const created = [];
  window.loadCardHelpers = async () => ({
    createCardElement: (config) => {
      created.push(config.type);
      const el = window.document.createElement('div');
      el.className = 'child';
      el.textContent = config.type;
      return el;
    },
  });
  const column = mount(window, 'lg-column', { dock: 1, cards: [{ type: 'a' }, { type: 'b' }, { type: 'c' }] }, makeHass([]));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(plain(created), ['a', 'b', 'c']);
  assert.deepEqual([...column.shadowRoot.querySelectorAll('.top > .child')].map((el) => el.textContent), ['a', 'b']);
  assert.deepEqual([...column.shadowRoot.querySelectorAll('.dock > .child')].map((el) => el.textContent), ['c']);
  assert.ok(column.shadowRoot.querySelector('style').textContent.includes('--glass-bg: transparent'));
  const make = () => window.document.createElement('lg-column');
  assert.throws(() => make().setConfig({ cards: [{}] }), /type/);
  assert.throws(() => make().setConfig({ cards: [], dock: -1 }), /whole number/);
});

test('rooms: the all-off button turns off every light that is on, and only those', () => {
  const { window } = boot();
  const calls = [];
  const rooms = mount(window, 'lg-rooms', { areas: ['living', 'kitchen'], all_off: true }, makeHass(calls));
  const button = rooms.shadowRoot.querySelector('.alloff');
  assert.ok(button);
  button.click();
  assert.deepEqual(plain(calls.pop()), ['light', 'turn_off', { entity_id: ['light.living_a'] }]);
});

test('headline: chips sit next to the title unless configured below; now card can hide its title', () => {
  const { window } = boot();
  const hass = makeHass([]);
  const side = mount(window, 'lg-headline', { chips: [{ entity: 'binary_sensor.bin' }] }, hass);
  assert.ok(side.shadowRoot.querySelector('.wrap.side'));
  const below = mount(window, 'lg-headline', { chips_position: 'below', chips: [{ entity: 'binary_sensor.bin' }] }, hass);
  assert.equal(below.shadowRoot.querySelector('.wrap.side'), null);
  const now = mount(window, 'lg-now', { show_header: false, items: [{ title: 'A' }] }, hass);
  assert.equal(now.shadowRoot.querySelector('h2'), null);
});

test('agenda: merges calendars, hides excluded titles, shows all-day first and data as text', async () => {
  const { window } = boot();
  const agenda = mount(window, 'lg-agenda', CONFIGS['lg-agenda'], makeHass([]));
  await new Promise((resolve) => setTimeout(resolve, 30));
  const rows = [...agenda.shadowRoot.querySelectorAll('.row')];
  assert.equal(rows.length, 2);
  assert.equal(rows[0].querySelector('.what').textContent, HOSTILE);
  assert.equal(rows[0].querySelector('.lead').textContent, 'all day');
  assert.equal(rows[1].querySelector('.what').textContent, 'Weekly');
  assert.equal(agenda.shadowRoot.querySelector('img'), null);
  assert.throws(() => window.document.createElement('lg-agenda').setConfig({ entities: ['sensor.x'] }), /calendar/);
});

test('idle: opens the calm view after inactivity, input resets the timer, other users are left alone', async () => {
  const { window } = boot();
  const hass = { ...makeHass([]), user: { id: 'u1', name: 'Wall' } };
  mount(window, 'lg-idle', { after: 0.15, path: '/dash/calm', users: ['wall'] }, hass);
  await new Promise((resolve) => setTimeout(resolve, 100));
  window.dispatchEvent(new window.Event('pointerdown'));
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(window.location.pathname, '/dash/home', 'input reset the timer');
  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.equal(window.location.pathname, '/dash/calm');

  const other = boot();
  mount(other.window, 'lg-idle', { after: 0.05, path: '/dash/calm', users: ['wall'] }, { ...makeHass([]), user: { id: 'u2', name: 'Alex' } });
  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.equal(other.window.location.pathname, '/dash/home');
});

test('idle: a tap anywhere returns and is swallowed; dimming follows the time window; bad paths are rejected', async () => {
  const { window } = boot();
  const idle = mount(window, 'lg-idle', { tap_path: '/dash/home2', dim_after: '00:00', dim_before: '23:59', dim_opacity: 0.6 }, makeHass([]));
  assert.equal(idle.shadowRoot.querySelector('.dim').style.opacity, '0.6');
  const button = window.document.createElement('button');
  let clicked = false;
  button.addEventListener('click', () => { clicked = true; });
  window.document.body.append(button);
  button.click();
  assert.equal(window.location.pathname, '/dash/home', 'within the grace period a tap does not navigate');
  await new Promise((resolve) => setTimeout(resolve, 850));
  clicked = false;
  button.click();
  assert.equal(window.location.pathname, '/dash/home2');
  assert.equal(clicked, false, 'the tap was swallowed');
  const make = () => window.document.createElement('lg-idle');
  assert.throws(() => make().setConfig({ path: 'https://example.com' }), /single \//);
  assert.throws(() => make().setConfig({ after: -1 }), /seconds/);
});

test('hero calm layout: centred stack with clock, date, weather pill and hint; the clock ticks in place', () => {
  const { window } = boot();
  const hero = mount(window, 'lg-hero', { weather: 'weather.home', layout: 'calm' }, makeHass([]));
  const calm = hero.shadowRoot.querySelector('.calm');
  assert.ok(calm);
  assert.ok(calm.querySelector('.stack .clock'));
  assert.ok(calm.querySelector('.pill .temp'));
  assert.equal(calm.querySelector('.hint').textContent, 'Tap to return');
  const clock = calm.querySelector('.clock');
  hero._key = `changed${hero._key.slice(hero._key.indexOf('|'))}`;
  hero._render();
  assert.equal(hero.shadowRoot.querySelector('.clock'), clock);
  assert.throws(() => window.document.createElement('lg-hero').setConfig({ layout: 'big' }), /layout/);
  const quiet = mount(window, 'lg-hero', { weather: 'weather.home', layout: 'calm', show_hint: false }, makeHass([]));
  assert.equal(quiet.shadowRoot.querySelector('.hint'), null);
});

test('energy card: shows today, week and month and the largest consumer from recorder statistics', async () => {
  const { window } = boot();
  const energy = mount(window, 'lg-energy', CONFIGS['lg-energy'], makeHass([]));
  await new Promise((resolve) => setTimeout(resolve, 30));
  const text = energy.shadowRoot.textContent;
  assert.match(energy.shadowRoot.querySelector('.value').textContent, /0\.6/);
  assert.match(text, /This week/);
  assert.match(text, /This month/);
  assert.match(energy.shadowRoot.querySelector('.top strong').textContent, /meter_a|0\.4/);
  assert.throws(() => window.document.createElement('lg-energy').setConfig({ statistics: 'x' }), /statistic/);
});

test('list: warning banner and amber card when the rule matches; zero text instead of "0 parcels"', () => {
  const { window } = boot();
  const hass = makeHass([]);
  hass.states['sensor.kind'] = { state: 'umstieg', attributes: {} };
  hass.states['sensor.parcels'] = { state: '0', attributes: { unit_of_measurement: 'parcels' } };
  const list = mount(window, 'lg-list', { title: 'Trips', mode_entity: 'sensor.kind', warn: { entity: 'sensor.kind', when: { state: 'umstieg' }, text: 'No direct train' }, items: [{ label: 'Parcels', entity: 'sensor.parcels', zero_text: 'none' }] }, hass);
  assert.ok(list.shadowRoot.querySelector('.card.warn'));
  assert.equal(list.shadowRoot.querySelector('.banner').textContent, 'No direct train');
  assert.equal(list.shadowRoot.querySelector('.mode').textContent, 'with changes');
  assert.equal(list.shadowRoot.querySelector('.row span:last-child').textContent, 'none');
  hass.states['sensor.kind'] = { state: 'direkt', attributes: {} };
  list.hass = { ...hass };
  assert.equal(list.shadowRoot.querySelector('.banner'), null);
  assert.equal(list.shadowRoot.querySelector('.mode').textContent, 'direct');
});

test('parcels: sentence, urgent rows first, names as text, history on tap', () => {
  const { window, errors } = boot();
  const card = mount(window, 'lg-parcels', CONFIGS['lg-parcels'], parcelHass([]));
  const root = card.shadowRoot;
  assert.equal(root.querySelector('.sum').textContent, 'Arriving today: Shirt is out for delivery. ' + HOSTILE + ' is ready for pick-up.');
  const rows = [...root.querySelectorAll('.p')];
  assert.deepEqual(rows.map((row) => row.querySelector('.name').textContent), ['Shirt', HOSTILE]);
  assert.ok(rows[0].classList.contains('amber'));
  assert.ok(rows[1].classList.contains('orange'));
  assert.equal(rows[0].querySelectorAll('.track i.f').length, 2);
  assert.equal(root.querySelector('img'), null);
  assert.equal(window.__pwned, undefined);
  assert.equal(root.querySelector('.tl'), null);
  rows[1].click();
  const tl = root.querySelectorAll('.p')[1].querySelector('.tl');
  assert.ok(tl);
  assert.equal(tl.children.length, 2);
  assert.match(tl.children[0].textContent, /In der Filiale.*Filiale/);
  assert.deepEqual(errors, []);
});

test('parcels: adding calls the integration, clears the fields and shows the new parcel; a refusal shows the reason', async () => {
  const { window } = boot();
  const calls = [];
  const card = mount(window, 'lg-parcels', CONFIGS['lg-parcels'], parcelHass(calls, ([domain, service]) => {
    if (service === 'detect_carrier') return Promise.resolve({ response: { best_match: 'ups', matches: [{ carrier_code: 'ups', carrier_name: 'UPS' }] } });
    return Promise.resolve({ context: {}, response: { success: true } });
  }));
  const root = card.shadowRoot;
  const plus = root.querySelector('.plus');
  plus.click();
  assert.equal(plus.getAttribute('aria-expanded'), 'true');
  assert.ok(root.querySelector('.sheet.open'));
  const [number, name] = root.querySelectorAll('input');
  number.value = '1ZTEST000000000001';
  number.dispatchEvent(new window.Event('input'));
  await new Promise((resolve) => setTimeout(resolve, 600));
  assert.equal(root.querySelector('.hintline, .tag.blue').textContent, 'Detected: UPS');
  name.value = 'Shoes';
  root.querySelector('.go').click();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const add = calls.find((call) => call[1] === 'add_parcel');
  assert.deepEqual(plain(add.slice(0, 3)), ['parcelapp', 'add_parcel', { device_id: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', tracking_number: '1ZTEST000000000001', parcel_name: 'Shoes', language: 'en' }]);
  assert.equal(add[5], true, 'asks for the response');
  assert.equal(number.value, '');
  assert.equal(root.querySelector('.msg').textContent, 'Shoes added.');
  const first = root.querySelector('.p');
  assert.ok(first.classList.contains('fresh'));
  assert.equal(first.querySelector('.name').textContent, 'Shoes');

  const refused = boot();
  const card2 = mount(refused.window, 'lg-parcels', CONFIGS['lg-parcels'], parcelHass([], ([, service]) => (service === 'add_parcel' ? Promise.reject({ code: 'home_assistant_error', message: 'Daily limit reached' }) : Promise.resolve({ response: {} }))));
  const r2 = card2.shadowRoot;
  r2.querySelector('.plus').click();
  r2.querySelector('input').value = 'X123456789';
  r2.querySelector('.go').click();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(r2.querySelector('.msg.err').textContent, 'Not added: Daily limit reached');
  assert.equal(r2.querySelector('input').value, 'X123456789', 'the number stays for a retry');
});

test('parcels: no device means no add button; bad configuration is rejected; empty list can hide the card', () => {
  const { window } = boot();
  const hass = parcelHass([]);
  const card = mount(window, 'lg-parcels', { entity: 'sensor.parcels_raw' }, hass);
  assert.equal(card.shadowRoot.querySelector('.plus'), null);
  const make = () => window.document.createElement('lg-parcels');
  assert.throws(() => make().setConfig({}), /entity is required/);
  assert.throws(() => make().setConfig({ entity: 'sensor.x', device_id: '../x' }), /device_id/);
  assert.throws(() => make().setConfig({ entity: 'sensor.x', keep_days: -1 }), /keep_days/);
  const empty = mount(window, 'lg-parcels', { entity: 'sensor.missing', hide_empty: true }, hass);
  assert.equal(empty.style.display, 'none');
  const shown = mount(window, 'lg-parcels', { entity: 'sensor.missing' }, hass);
  assert.equal(shown.shadowRoot.querySelector('.empty').textContent, 'No parcels.');
});