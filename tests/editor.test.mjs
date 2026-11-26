import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECS, toForm, fromForm, flatRule, nestRule, label } from '../src/editor-spec.js';

const hass = { locale: { language: 'de' } };

test('the form shows the defaults that are in effect', () => {
  assert.equal(toForm('lg-hero', {}, hass).show_date, true);
  assert.equal(toForm('lg-hero', { show_date: false }, hass).show_date, false);
  const now = toForm('lg-now', {}, hass);
  assert.deepEqual([now.title, now.max, now.show_period, now.size], ['Jetzt dran', 3, true, 'normal']);
  const rooms = toForm('lg-rooms', { areas: ['living'] }, hass);
  assert.deepEqual([rooms.columns, rooms.show_header, rooms.title], [2, true, 'Räume']);
  assert.deepEqual(toForm('lg-stat', { entity: 'sensor.x' }, hass), { digits: 1, graph: true, hours: 24, entity: 'sensor.x' });
});

test('values equal to the defaults are not written back', () => {
  const data = toForm('lg-now', { items: [] }, hass);
  assert.deepEqual(fromForm('lg-now', data, hass), {});
  assert.deepEqual(fromForm('lg-now', { ...data, max: 5, show_period: false, title: 'Heute' }, hass), { max: 5, show_period: false, title: 'Heute' });
  assert.deepEqual(fromForm('lg-hero', { show_date: true, size: 'large', weather: '' }, hass), { size: 'large' });
});

test('a rule is edited flat and stored nested', () => {
  const chip = { entity: 'sensor.a', label: 'A', color: 'amber', when: { state_not: ['unknown', 'unavailable'], above: 0 }, after: '05:30', weekdays: ['mon'] };
  const flat = flatRule(chip);
  assert.equal(flat.when_state_not, 'unknown, unavailable');
  assert.equal(flat.when_above, 0);
  assert.equal(flat.when, undefined);
  assert.deepEqual(nestRule(flat), chip);
  assert.deepEqual(nestRule({ entity: 'sensor.a', when_state: 'on', color: 'neutral', show_state: false, after: '22:00:00', label: '' }), { entity: 'sensor.a', when: { state: 'on' }, after: '22:00' });
});

const ROUND_TRIPS = {
  'lg-hero': { weather: 'weather.home', size: 'large', chips: [{ entity: 'binary_sensor.bin', label: 'Bin', color: 'amber', when: { state: 'on' } }, { entity: 'sensor.next', label: 'Train {state}', after: '05:30', before: '10:00', weekdays: ['mon', 'tue'] }] },
  'lg-headline': { mode: 'status', name: 'Alex', watch: [{ entity: 'sensor.plants', when: { above: 0 }, after: '16:00' }], chips: [{ entity: 'sensor.a' }] },
  'lg-now': {
    hint: 'changes', max: 2,
    items: [
      { title: 'Lights', subtitle: '{state}', entity: 'light.all', when: { state: 'on' }, after: '22:00', before: '05:00', button: { label: 'All off', tone: 'warm', service: 'light.turn_off', data: { transition: 2 } } },
      { title: 'Plants', entity: 'sensor.plants', when: { above: 0 }, button: { label: 'Open', action: 'navigate', path: '/dash/plants' } },
      { title: 'Alarm', entity: 'alarm_control_panel.home', button: { label: 'Open' } },
      { title: 'Info only' },
    ],
  },
  'lg-rooms': { floor: 'ground', columns: 3, areas: ['living', { area: 'kitchen', name: 'Cook', icon: 'mdi:stove', exclude: ['light.led'] }], extra: [{ entity: 'switch.plug', name: 'Devices', tone: 'warm' }, { entity: 'switch.other' }] },
  'lg-room': { area: 'kitchen', name: 'Cook', size: 'large' },
  'lg-list': { title: 'Trips', icon: 'mdi:train', entity: 'sensor.trips', pattern: '^(\\S+) (.+)$', columns: ['{1}', '{2}'], note: { entity: 'sensor.note', when: { state_not: ['none', 'unknown'] } }, items: [{ label: 'Backup', entity: 'sensor.backup' }, { lead: '09:00', label: 'Weekly' }, { label: 'System', value: 'good', tone: 'green' }] },
  'lg-stat': { entity: 'sensor.energy', label: 'Today', hours: 48 },
  'lg-nav': { items: [{ label: 'Home', icon: 'mdi:home', path: '/dash/home' }, { label: 'Other', path: '/dash/other' }] },
  'lg-agenda': { entities: ['calendar.a', 'calendar.b'], days: 3, exclude: '^Private$', title: 'Week' },
  'lg-energy': { statistics: ['sensor.a', 'sensor.b'], show_top: false, title: 'Strom' },
  'lg-idle': { after: 90, path: '/dash/calm', dim_after: '22:00', dim_before: '06:00', dim_opacity: 0.4, users: ['wall'] },
  'lg-column': { dock: 1, fill: false, cards: [{ type: 'custom:lg-now', show_header: false, items: [{ title: 'A' }] }, { type: 'custom:lg-rooms', all_off: true, areas: ['living'] }, { type: 'custom:lg-headline', chips_position: 'below' }] },
};

test('every card configuration survives the editor unchanged', () => {
  for (const [tag, config] of Object.entries(ROUND_TRIPS)) {
    assert.deepEqual(fromForm(tag, toForm(tag, config, hass), hass), config, tag);
  }
});

test('keys the form does not know are kept', () => {
  const config = { entity: 'sensor.energy', future_option: { a: 1 } };
  assert.deepEqual(fromForm('lg-stat', toForm('lg-stat', config, hass), hass), config);
});

test('every field has a label in both languages and every card has a schema', () => {
  const names = (schema) => schema.flatMap((field) => [field.name, ...Object.keys((field.selector.object && field.selector.object.fields) || {})]);
  for (const [tag, spec] of Object.entries(SPECS)) {
    for (const language of ['en', 'de']) {
      const h = { locale: { language } };
      for (const field of spec.schema(h)) assert.notEqual(label(h, field.label_key || field.name), field.label_key || field.name, `${tag}: ${field.name} (${language})`);
      for (const name of names(spec.schema(h))) assert.notEqual(label(h, name), name, `${tag}: ${name} (${language})`);
    }
  }
});

test('calm hero settings survive the editor', () => {
  const config = { weather: 'weather.home', layout: 'calm', show_hint: false, size: 'large' };
  assert.deepEqual(fromForm('lg-hero', toForm('lg-hero', config, hass), hass), config);
});

test('list warning, mode and zero text survive the editor', () => {
  const config = { title: 'Trips', entity: 'sensor.trips', warn: { entity: 'sensor.kind', when: { state: 'umstieg' }, text: 'No direct train', label: 'with changes' }, mode_entity: 'sensor.kind', items: [{ label: 'Parcels', entity: 'sensor.p', zero_text: 'none' }] };
  assert.deepEqual(fromForm('lg-list', toForm('lg-list', config, hass), hass), config);
});
