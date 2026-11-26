import test from 'node:test';
import assert from 'node:assert/strict';
import { parcelText, parcelModel, parcelSummary, parseParcelDate, relativeDate, carrierShort, expectedText, addError } from '../src/parcels-calc.js';

const de = parcelText('de');
const NOW = new Date(2026, 10, 26, 10, 0);
const words = (sentences) => sentences.map((s) => s.map((p) => p.text).join('')).join(' ');

const DELIVERIES = [
  { carrier_code: 'it', description: 'Vinted', status_code: 0, tracking_number: 'A1', events: [{ event: 'Consegnata', date: '25.11.2026 19:56', location: 'GERMANIA' }] },
  { carrier_code: 'ups', description: 'Boggi', status_code: 8, tracking_number: 'B2', events: [{ event: 'Label erstellt', date: '2026-11-26 09:46' }] },
  { carrier_code: 'dhl', description: 'Old', status_code: 0, tracking_number: 'C3', events: [{ event: 'Zugestellt', date: '20.11.2026 12:00' }] },
];

test('dates in both formats of the integration are read as local time', () => {
  assert.deepEqual(parseParcelDate('25.11.2026 19:56'), new Date(2026, 10, 25, 19, 56));
  assert.deepEqual(parseParcelDate('2026-11-26 09:46'), new Date(2026, 10, 26, 9, 46));
  assert.equal(parseParcelDate('soon'), undefined);
  assert.equal(parseParcelDate(undefined), undefined);
  assert.equal(relativeDate(new Date(2026, 10, 26, 9, 46), NOW, de), 'heute 09:46');
  assert.equal(relativeDate(new Date(2026, 10, 25, 19, 56), NOW, de), 'gestern 19:56');
  assert.equal(relativeDate(new Date(2026, 10, 20, 8, 5), NOW, de, false), '20.11.');
});

test('model: urgent first, delivered after, old deliveries dropped, unknown codes tolerated', () => {
  const model = parcelModel([...DELIVERIES, { description: 'Odd', status_code: 99 }, null, 'x'], NOW);
  assert.deepEqual(model.map((p) => p.name), ['Boggi', 'Odd', 'Vinted']);
  assert.deepEqual([model[0].key, model[0].step, model[0].carrier], ['info_received', 0, 'UPS']);
  assert.equal(model[2].key, 'delivered');
  assert.equal(parcelModel(DELIVERIES, NOW, { keep_days: 0 }).some((p) => p.key === 'delivered'), false);
  assert.deepEqual(parcelModel(undefined, NOW), []);
  assert.equal(carrierShort('it'), 'PI');
  assert.equal(carrierShort('royal-mail'), 'ROY');
  assert.equal(carrierShort(''), '?');
});

test('summary: one plain sentence for the usual case, never a bare count with a unit', () => {
  const model = parcelModel(DELIVERIES, NOW);
  assert.equal(words(parcelSummary(model, NOW, de)), 'Boggi ist angekündigt. Vinted kam gestern.');
  const bold = parcelSummary(model, NOW, de)[0].find((p) => p.bold);
  assert.equal(bold.text, 'Boggi');
});

test('summary: delivery today and problems come first, at most two sentences', () => {
  const list = [
    { description: 'Boggi', status_code: 4, tracking_number: '1' },
    { description: 'Zalando', status_code: 3, tracking_number: '2' },
    { description: 'Other', status_code: 2, tracking_number: '3' },
    ...DELIVERIES.slice(0, 1),
  ];
  const sentences = parcelSummary(parcelModel(list, NOW), NOW, de);
  assert.equal(words(sentences), 'Heute kommt was: Boggi ist in der Zustellung. Zalando liegt zur Abholung bereit.');
  const many = parcelSummary(parcelModel([{ status_code: 2 }, { status_code: 2 }], NOW), NOW, de);
  assert.equal(words(many), '2 Pakete sind unterwegs.');
  assert.deepEqual(parcelSummary([], NOW, de), []);
});

test('expected window reads as a time range today', () => {
  const start = new Date(2026, 10, 26, 12, 0).getTime() / 1000;
  const model = parcelModel([{ status_code: 4, timestamp_expected: start, timestamp_expected_end: start + 3 * 3600 }], NOW);
  assert.equal(expectedText(model[0].expected, NOW, de, 'de'), 'Voraussichtlich 12–15 Uhr');
  assert.equal(expectedText(undefined, NOW, de, 'de'), '');
  const byDate = parcelModel([{ status_code: 2, date_expected: '2026-11-27 10:00:00', date_expected_end: '2026-11-27 14:00:00' }], NOW);
  assert.equal(expectedText(byDate[0].expected, NOW, de, 'de'), 'Voraussichtlich morgen 10–14 Uhr');
  assert.equal(carrierShort('dp'), 'DHL');
});

test('add result: thrown errors and refusing responses become a message, success does not', () => {
  assert.equal(addError({ context: {}, response: { success: true } }, de), undefined);
  assert.equal(addError({ context: {} }, de), undefined);
  assert.equal(addError({ response: { success: false, error_message: 'Daily limit reached' } }, de), 'Daily limit reached');
  assert.equal(addError({ response: { success: false } }, de), de.failed_default);
  assert.equal(addError(new Error('Service failed'), de), 'Service failed');
  assert.equal(addError({ code: 'home_assistant_error', message: 'Bad number' }, de), 'Bad number');
});

test('dates in words without a year get the year closest to now; dates without a time show no time', async () => {
  const d = parseParcelDate('Thursday, 26 November 7:19 am', NOW);
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()], [2026, 10, 26, 7, 19]);
  assert.equal(relativeDate(d, NOW, de), 'heute 07:19');
  const noTime = parseParcelDate('Thursday, 26 November ', NOW);
  assert.equal(noTime.noTime, true);
  assert.equal(relativeDate(noTime, NOW, de), 'heute');
  assert.equal(parseParcelDate('November 26, 2026 7:05 PM', NOW).getHours(), 19);
  assert.equal(parseParcelDate('12 am', NOW), undefined);
  const january = parseParcelDate('Friday, 2 January', new Date(2026, 11, 30));
  assert.equal(january.getFullYear(), 2027, 'early January seen in late December is next year');
  const december = parseParcelDate('Monday, 29 December 9:00 am', new Date(2027, 0, 2));
  assert.equal(december.getFullYear(), 2026);
  assert.equal(parseParcelDate('26. November 2026', NOW).getDate(), 26);
  assert.equal(parseParcelDate('Blursday, 40 Smarch', NOW), undefined);
});

test('event texts: known carrier phrases are translated, the rest stays as sent', async () => {
  const { translateEvent } = await import('../src/parcel-phrases.js');
  const tr = (text, lang = 'de') => translateEvent(text, lang).text;
  assert.equal(tr('Package arrived at an Amazon facility'), 'Im Amazon-Logistikzentrum angekommen');
  assert.equal(tr('Package left the courier facility'), 'Hat das Verteilzentrum verlassen');
  assert.equal(tr('La spedizione è stata consegnata'), 'Zugestellt');
  assert.equal(tr('consegna non andata a buon fine per destinatario assente'), 'Zustellung nicht möglich');
  assert.equal(tr('cambio disposizioni di consegna'), 'Zustellwunsch geändert');
  assert.equal(tr('la spedizione è stata presa in carico presso il Punto Poste'), 'Vom Paketdienst übernommen');
  assert.equal(tr('Versender hat einen Aufkleber erstellt, UPS hat das Paket noch nicht erhalten.'), 'Label erstellt, noch nicht beim Paketdienst');
  assert.equal(tr('Out for delivery'), 'In Zustellung');
  assert.equal(tr('Your package will be delivered tomorrow'), 'Zustellung geplant', 'a future delivery is not "delivered"');
  assert.equal(tr('Die Sendung konnte nicht zugestellt werden'), 'Zustellung nicht möglich');
  assert.equal(tr('Die Sendung wurde erfolgreich zugestellt.', 'en'), 'Delivered');
  assert.equal(tr('Something only this carrier says'), 'Something only this carrier says');
  assert.equal(translateEvent('Something only this carrier says', 'de').translated, false);
  assert.equal(translateEvent('', 'de').text, '');
  assert.equal(translateEvent(undefined, 'de').text, '');
});