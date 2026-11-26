import test from 'node:test';
import assert from 'node:assert/strict';
import { matches, inWindow, minutes, dayPart, fill, formatState, formatTimestamp } from '../src/core.js';

const state = (value, attributes = {}) => ({ state: String(value), attributes });

test('matches: no rule always matches, a rule never matches a missing entity', () => {
  assert.equal(matches(undefined, undefined), true);
  assert.equal(matches({ state: 'on' }, undefined), false);
});

test('matches: state and state_not accept one value or a list', () => {
  assert.equal(matches({ state: 'on' }, state('on')), true);
  assert.equal(matches({ state: ['on', 'open'] }, state('open')), true);
  assert.equal(matches({ state: 'on' }, state('off')), false);
  assert.equal(matches({ state_not: ['unknown', 'unavailable'] }, state('unknown')), false);
  assert.equal(matches({ state_not: 'ok' }, state('fault')), true);
});

test('matches: numeric rules are strict and reject non-numbers', () => {
  assert.equal(matches({ above: 0 }, state(2)), true);
  assert.equal(matches({ above: 2 }, state(2)), false);
  assert.equal(matches({ below: 100 }, state(99.5)), true);
  assert.equal(matches({ above: 0, below: 10 }, state(10)), false);
  assert.equal(matches({ above: 0 }, state('unavailable')), false);
});

test('minutes parses HH:MM and rejects anything else', () => {
  assert.equal(minutes('05:30'), 330);
  assert.equal(minutes('22:00:00'), 1320);
  assert.ok(Number.isNaN(minutes('soon')));
});

test('inWindow: plain windows, windows across midnight, weekdays', () => {
  const at = (hour, minute, day = 1) => new Date(2026, 5, day, hour, minute); // 1 June 2026 is a Monday
  assert.equal(inWindow({}, at(3, 0)), true);
  assert.equal(inWindow({ after: '05:30', before: '10:00' }, at(7, 0)), true);
  assert.equal(inWindow({ after: '05:30', before: '10:00' }, at(10, 0)), false);
  assert.equal(inWindow({ after: '22:00', before: '05:00' }, at(23, 30)), true);
  assert.equal(inWindow({ after: '22:00', before: '05:00' }, at(4, 59)), true);
  assert.equal(inWindow({ after: '22:00', before: '05:00' }, at(12, 0)), false);
  assert.equal(inWindow({ after: '16:00' }, at(15, 59)), false);
  assert.equal(inWindow({ weekdays: ['sat', 'sun'] }, at(12, 0, 1)), false);
  assert.equal(inWindow({ weekdays: ['sat', 'sun'] }, at(12, 0, 6)), true);
});

test('dayPart covers the whole day', () => {
  const at = (hour) => dayPart(new Date(2026, 0, 1, hour));
  assert.deepEqual([4, 5, 10, 11, 17, 18, 21, 22].map(at), ['night', 'morning', 'morning', 'day', 'day', 'evening', 'evening', 'night']);
});

test('fill replaces placeholders and tolerates a missing entity', () => {
  const hass = { formatEntityState: (s) => `<${s.state}>` };
  assert.equal(fill('{state} plants', hass, state(2)), '<2> plants');
  assert.equal(fill('{name}: {state}', hass, state('on', { friendly_name: 'Lamp' })), 'Lamp: <on>');
  assert.equal(fill('{state}', hass, undefined), '');
  assert.equal(fill(undefined, hass, undefined), '');
});

test('timestamps read as a time today and as weekday plus time otherwise', () => {
  const hass = { locale: { language: 'de' }, config: { time_zone: 'Europe/Berlin' }, formatEntityState: () => 'raw' };
  const now = new Date('2026-11-26T06:00:00+00:00');
  assert.equal(formatTimestamp(hass, '2026-11-26T07:08:00+00:00', now), '08:08');
  assert.equal(formatTimestamp(hass, '2026-11-27T07:08:00+00:00', now), 'Fr 08:08');
  assert.equal(formatTimestamp(hass, 'unknown', now), undefined);
  assert.equal(formatState(hass, { state: 'unknown', attributes: { device_class: 'timestamp' } }), 'raw');
  assert.equal(formatState(hass, { state: 'on', attributes: {} }), 'raw');
});
test('agenda arrange: sorts by day, all-day first, drops finished timed events and duplicates', async () => {
  const { arrange } = await import('../src/calendar.js');
  const now = new Date(2026, 10, 26, 12, 0);
  const at = (d, h) => new Date(2026, 10, d, h, 0).toISOString();
  const lists = [
    [
      { summary: 'Late', start: { dateTime: at(26, 18) }, end: { dateTime: at(26, 19) } },
      { summary: 'Done', start: { dateTime: at(26, 8) }, end: { dateTime: at(26, 9) } },
      { summary: 'Tomorrow', start: { dateTime: at(27, 9) }, end: { dateTime: at(27, 10) } },
    ],
    [
      { summary: 'Holiday', start: { date: '2026-11-27' }, end: { date: '2026-11-28' } },
      { summary: 'Late', start: { dateTime: at(26, 18) }, end: { dateTime: at(26, 19) } },
    ],
  ];
  assert.deepEqual(arrange(lists, { now }).map((event) => event.summary), ['Late', 'Holiday', 'Tomorrow']);
  assert.deepEqual(arrange(lists, { now, exclude: '^Hol' }).map((event) => event.summary), ['Late', 'Tomorrow']);
  assert.equal(arrange(lists, { now, max: 1 }).length, 1);
});

test('agenda arrange: running multi-day events show under today, finished all-day events are gone', async () => {
  const { arrange } = await import('../src/calendar.js');
  const now = new Date(2026, 10, 26, 12, 0);
  const list = [
    { summary: 'Vacation', start: { date: '2026-11-23' }, end: { date: '2026-11-28' } },
    { summary: 'Yesterday', start: { date: '2026-11-25' }, end: { date: '2026-11-26' } },
    { summary: 'Meeting', start: { dateTime: new Date(2026, 10, 26, 15).toISOString() }, end: { dateTime: new Date(2026, 10, 26, 16).toISOString() } },
  ];
  const events = arrange([list], { now });
  assert.deepEqual(events.map((event) => event.summary), ['Vacation', 'Meeting']);
  assert.equal(events[0].allDay, true);
  assert.equal(events[0].start.getDate(), 26);
});
test('sparkline: buckets average the history and the path is smooth and inside the box', async () => {
  const { bucket, smoothPath } = await import('../src/spark.js');
  const noisy = Array.from({ length: 500 }, (_, i) => ({ x: i, y: 50 + (i % 2 ? 5 : -5) }));
  const slots = bucket(noisy, 20);
  assert.equal(slots.length, 20);
  assert.ok(slots.every((point) => Math.abs(point.y - 50) < 1), 'noise averaged out');
  const d = smoothPath([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 2 }]);
  assert.match(d, /^M0\.0,/);
  assert.equal((d.match(/C/g) || []).length, 2);
  assert.deepEqual(bucket([{ x: 0, y: 1 }]), []);
});
test('energy maths: same-time comparisons for day, week and month; meter choice', async () => {
  const { compareDays, comparePeriods, pickStatistics, trend } = await import('../src/energy-calc.js');
  const now = new Date(2026, 10, 26, 12, 30); // Thursday
  const hourly = new Map();
  const y0 = new Date(2026, 10, 25).getTime();
  const t0 = new Date(2026, 10, 26).getTime();
  for (let h = 0; h < 24; h += 1) hourly.set(y0 + h * 3600e3, 0.1);
  for (let h = 0; h <= 12; h += 1) hourly.set(t0 + h * 3600e3, 0.2);
  const days = compareDays(hourly, now);
  assert.equal(Math.round(days.today * 10) / 10, 2.6);
  assert.equal(Math.round(days.yesterdaySame * 100) / 100, 1.25);
  assert.equal(days.trend, 108);
  assert.equal(days.todayCurve.length, 13);
  assert.equal(days.yesterdayCurve.length, 24);

  const daily = new Map();
  for (let d = 1; d <= 30; d += 1) daily.set(new Date(2026, 9, d).getTime(), 2); // October
  for (let d = 1; d <= 25; d += 1) daily.set(new Date(2026, 10, d).getTime(), 1); // November before today
  const periods = comparePeriods(daily, 0.5, now);
  assert.equal(periods.week, 3 + 0.5); // Mon to Wed + today
  assert.equal(periods.month, 25 + 0.5);
  assert.equal(Math.round(periods.prevMonth * 100) / 100, 51.04); // 25 days + 52% of the 26th
  assert.ok(periods.monthTrend < 0);

  assert.equal(trend(2, 0), undefined);
  assert.deepEqual(pickStatistics({ device_consumption: [{ stat_consumption: 'sensor.a', name: 'A' }, { stat_consumption: 'sensor.b', included_in_stat: 'sensor.a' }], energy_sources: [{ type: 'grid', stat_energy_from: 'sensor.grid' }] }), [{ id: 'sensor.a', name: 'A' }]);
  assert.deepEqual(pickStatistics({ energy_sources: [{ type: 'grid', stat_energy_from: 'sensor.grid' }] }), [{ id: 'sensor.grid', name: undefined }]);
  assert.deepEqual(pickStatistics({}, ['sensor.x']), [{ id: 'sensor.x', name: undefined }]);
});
