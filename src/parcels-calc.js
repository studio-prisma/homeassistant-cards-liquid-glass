/**
 * Pure parcel helpers for lg-parcels: no DOM, so they can be tested directly.
 * Input is the `deliveries` list of the Parcel integration's raw shipment sensor.
 */

export const PARCEL_TEXT = {
  en: {
    title: 'Parcels', add: 'Add', adding: 'Adding…', add_title: 'Add parcel', close: 'Close',
    number: 'Tracking number', label: 'Name', detected: 'Detected:', unknown_carrier: 'Carrier is detected from the number',
    added: 'added.', failed: 'Not added:', failed_default: 'Parcel refused it (daily limit or unknown number).',
    more: 'Show {n} more', less: 'Show less', empty: 'No parcels.', just_added: 'Just added', new: 'New', expected: 'Expected', today_word: 'today', yesterday_word: 'yesterday',
    steps: ['Announced', 'On the way', 'Delivery', 'Here'],
    status: { delivered: 'Delivered', frozen: 'Paused', in_transit: 'On the way', pickup: 'Pick up', out_for_delivery: 'Today', failed: 'Missed', exception: 'Problem', not_found: 'Not found', info_received: 'Announced' },
    s_today_one: ['Arriving today: ', '{name}', ' is out for delivery.'], s_today_many: ['{n} parcels arrive today.'],
    s_pickup: ['{name}', ' is ready for pick-up.'], s_failed: ['{name}', ' could not be delivered.'], s_exception: ['{name}', ' has a problem.'],
    s_problems: ['{n} parcels need you.'],
    s_transit_one: ['{name}', ' is on the way.'], s_info_one: ['{name}', ' is announced.'], s_transit_many: ['{n} parcels are on the way.'],
    s_came_today: ['{name}', ' arrived today.'], s_came_yesterday: ['{name}', ' arrived yesterday.'], s_came_on: ['{name}', ' arrived on {date}.'],
  },
  de: {
    title: 'Pakete', add: 'Hinzufügen', adding: 'Wird hinzugefügt …', add_title: 'Sendung hinzufügen', close: 'Schließen',
    number: 'Sendungsnummer', label: 'Bezeichnung', detected: 'Erkannt:', unknown_carrier: 'Paketdienst wird aus der Nummer erkannt',
    added: 'hinzugefügt.', failed: 'Nicht hinzugefügt:', failed_default: 'Parcel hat abgelehnt (Tageslimit oder Nummer unbekannt).',
    more: '{n} weitere anzeigen', less: 'Weniger anzeigen', empty: 'Keine Sendungen.', just_added: 'Gerade hinzugefügt', new: 'Neu', expected: 'Voraussichtlich', today_word: 'heute', yesterday_word: 'gestern',
    steps: ['Angekündigt', 'Unterwegs', 'Zustellung', 'Da'],
    status: { delivered: 'Zugestellt', frozen: 'Pausiert', in_transit: 'Unterwegs', pickup: 'Abholen', out_for_delivery: 'Heute', failed: 'Nicht angetroffen', exception: 'Problem', not_found: 'Nicht gefunden', info_received: 'Angekündigt' },
    s_today_one: ['Heute kommt was: ', '{name}', ' ist in der Zustellung.'], s_today_many: ['Heute kommen {n} Pakete.'],
    s_pickup: ['{name}', ' liegt zur Abholung bereit.'], s_failed: ['{name}', ' konnte nicht zugestellt werden.'], s_exception: ['Bei ', '{name}', ' gibt es ein Problem.'],
    s_problems: ['{n} Sendungen brauchen dich.'],
    s_transit_one: ['{name}', ' ist unterwegs.'], s_info_one: ['{name}', ' ist angekündigt.'], s_transit_many: ['{n} Pakete sind unterwegs.'],
    s_came_today: ['{name}', ' kam heute.'], s_came_yesterday: ['{name}', ' kam gestern.'], s_came_on: ['{name}', ' kam am {date}.'],
  },
};

export function parcelText(lang) {
  return PARCEL_TEXT[String(lang || 'en').slice(0, 2)] || PARCEL_TEXT.en;
}

/** Parcel status codes: step on the four-step track, colour, text key, sort rank. */
export const PARCEL_STATUS = {
  0: { step: 3, tone: 'green', key: 'delivered', rank: 9 },
  1: { step: 1, tone: 'neutral', key: 'frozen', rank: 6 },
  2: { step: 1, tone: 'blue', key: 'in_transit', rank: 3 },
  3: { step: 2, tone: 'orange', key: 'pickup', rank: 1 },
  4: { step: 2, tone: 'amber', key: 'out_for_delivery', rank: 0 },
  5: { step: 0, tone: 'neutral', key: 'not_found', rank: 7 },
  6: { step: 2, tone: 'orange', key: 'failed', rank: 1 },
  7: { step: 1, tone: 'orange', key: 'exception', rank: 2 },
  8: { step: 0, tone: 'blue', key: 'info_received', rank: 4 },
};

const CARRIER_SHORT = { dp: 'DHL', it: 'PI', amzlde: 'AMZ', amzluk: 'AMZ', amazon: 'AMZ', hermes: 'HRM', fedex: 'FDX', dhl: 'DHL', dpd: 'DPD', ups: 'UPS', gls: 'GLS', usps: 'USPS', pholder: '?' };

export function carrierShort(code) {
  const key = String(code || '').toLowerCase();
  if (CARRIER_SHORT[key]) return CARRIER_SHORT[key];
  return key.replace(/[^a-z0-9]/g, '').slice(0, 3).toUpperCase() || '?';
}

const PARCEL_MONTHS = {
  jan: 0, january: 0, januar: 0, feb: 1, february: 1, februar: 1, mar: 2, march: 2, märz: 2, maerz: 2, apr: 3, april: 3,
  may: 4, mai: 4, jun: 5, june: 5, juni: 5, jul: 6, july: 6, juli: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, okt: 9, oktober: 9, nov: 10, november: 10, dec: 11, december: 11, dez: 11, dezember: 11,
};

/** A date without a time of day; the card then shows no time. */
function parcelDay(year, month, day, hour, minute) {
  const date = new Date(year, month, day, hour === undefined ? 0 : hour, minute || 0);
  if (hour === undefined) date.noTime = true;
  return date;
}

function parcelHour(hour, minute, half) {
  let h = Number(hour);
  const ampm = String(half || '').toLowerCase();
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  return { h, m: Number(minute || 0) };
}

/**
 * Event dates come as "25.11.2026 19:56", "2026-11-26 09:46", ISO, or in words
 * without a year ("Thursday, 26 November 7:19 am", "November 26, 2026"). Read as
 * local time; a missing year is the one that puts the date closest to now.
 */
export function parseParcelDate(value, now = new Date()) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const text = value.trim();
  let m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ T,]+(\d{1,2}):(\d{2}))?/.exec(text);
  if (m) return parcelDay(Number(m[3]), Number(m[2]) - 1, Number(m[1]), m[4] === undefined ? undefined : Number(m[4]), Number(m[5] || 0));
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?$/.exec(text);
  if (m) return parcelDay(Number(m[1]), Number(m[2]) - 1, Number(m[3]), m[4] === undefined ? undefined : Number(m[4]), Number(m[5] || 0));
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const iso = new Date(text);
    return Number.isNaN(iso.getTime()) ? undefined : iso;
  }
  // Words: optional weekday, then "26 November" or "November 26", optional year, optional time.
  const words = text.toLowerCase().replace(/^([a-zäöü]+),?\s+(?=\d|[a-zäöü]+\s+\d)/, (all, word) => (PARCEL_MONTHS[word] === undefined ? '' : all));
  m = /^(?:(\d{1,2})\.?\s+([a-zäöü]+)\.?|([a-zäöü]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?),?(?:\s+(\d{4}))?(?:,?\s+(?:at\s+|um\s+)?(\d{1,2}):(\d{2})\s*(am|pm)?)?/.exec(words);
  if (!m) return undefined;
  const month = PARCEL_MONTHS[m[2] || m[3]];
  if (month === undefined) return undefined;
  const day = Number(m[1] || m[4]);
  const time = m[6] !== undefined ? parcelHour(m[6], m[7], m[8]) : undefined;
  if (m[5]) return parcelDay(Number(m[5]), month, day, time && time.h, time && time.m);
  let best;
  for (const year of [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]) {
    const candidate = parcelDay(year, month, day, time && time.h, time && time.m);
    if (!best || Math.abs(candidate - now) < Math.abs(best - now)) best = candidate;
  }
  return best;
}

function dayIndex(date) {
  return Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000);
}

/** 0 = today, 1 = yesterday, -1 = tomorrow. */
export function daysAgo(date, now) {
  return dayIndex(now) - dayIndex(date);
}

const pad = (n) => String(n).padStart(2, '0');

/** "heute 09:46", "gestern 19:56", "24.11. 08:00". */
export function relativeDate(date, now, text, withTime = true) {
  if (!date) return '';
  const time = withTime && !date.noTime ? ` ${pad(date.getHours())}:${pad(date.getMinutes())}` : '';
  const ago = daysAgo(date, now);
  if (ago === 0) return `${text.today_word}${time}`;
  if (ago === 1) return `${text.yesterday_word}${time}`;
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${time}`;
}

/** Normalise the integration's deliveries into what the card shows, sorted by urgency. */
export function parcelModel(deliveries, now, options = {}) {
  const keepDays = Number.isFinite(Number(options.keep_days)) ? Number(options.keep_days) : 2;
  const list = Array.isArray(deliveries) ? deliveries : [];
  const out = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const status = PARCEL_STATUS[Number(raw.status_code)] || PARCEL_STATUS[1];
    const events = (Array.isArray(raw.events) ? raw.events : [])
      .filter((event) => event && typeof event === 'object')
      .map((event) => ({ text: String(event.event || ''), date: parseParcelDate(event.date, now), location: typeof event.location === 'string' ? event.location : '' }));
    const last = events[0];
    const number = String(raw.tracking_number || '');
    const parcel = {
      id: `${raw.carrier_code || ''}:${number}`,
      number,
      name: String(raw.description || number || '?'),
      carrier: carrierShort(raw.carrier_code),
      key: status.key,
      tone: status.tone,
      step: status.step,
      rank: status.rank,
      events,
      last,
      expected: expectedWindow(raw, now),
    };
    if (status.key === 'delivered') {
      const when = last && last.date;
      if (when && daysAgo(when, now) >= keepDays) continue;
      parcel.delivered = when;
    }
    out.push(parcel);
  }
  out.sort((a, b) => a.rank - b.rank || ((b.last && b.last.date ? b.last.date.getTime() : 0) - (a.last && a.last.date ? a.last.date.getTime() : 0)));
  return out;
}

/** Expected delivery: unix timestamps when the carrier gives them, otherwise the date strings. */
function expectedWindow(raw, now) {
  const start = Number(raw.timestamp_expected);
  if (Number.isFinite(start) && start > 0) {
    const end = Number(raw.timestamp_expected_end);
    return { start: new Date(start * 1000), end: Number.isFinite(end) && end > start ? new Date(end * 1000) : undefined };
  }
  const from = parseParcelDate(raw.date_expected, now);
  if (!from) return undefined;
  const to = parseParcelDate(raw.date_expected_end, now);
  return { start: from, end: to && to > from ? to : undefined };
}

/** "Voraussichtlich 12–15 Uhr" style text for a parcel with an expected window. */
export function expectedText(expected, now, text, lang) {
  if (!expected) return '';
  const hour = (date) => date.getHours();
  const de = String(lang || '').startsWith('de');
  const ago = daysAgo(expected.start, now);
  const day = ago === 0 ? '' : ago === -1 ? (de ? 'morgen ' : 'tomorrow ') : `${pad(expected.start.getDate())}.${pad(expected.start.getMonth() + 1)}. `;
  if (expected.end && daysAgo(expected.end, now) === ago) {
    const range = `${hour(expected.start)}–${hour(expected.end)}`;
    return `${text.expected} ${day}${de ? `${range} Uhr` : range}`;
  }
  return `${text.expected} ${day}`.trim();
}

/**
 * At most two short sentences describing the situation, as segments:
 * [{ text, bold }]. Names stay segments so the card writes them as text.
 */
export function parcelSummary(model, now, text) {
  const fill = (template, values) => template.map((part) => {
    if (part === '{name}') return { text: values.name, bold: true };
    return { text: part.replace('{n}', String(values.n)).replace('{date}', values.date || ''), bold: false };
  });
  const sentences = [];
  const by = (keys) => model.filter((p) => keys.includes(p.key));
  const today = by(['out_for_delivery']);
  const problems = by(['pickup', 'failed', 'exception']);
  const moving = by(['in_transit', 'info_received']);
  const delivered = by(['delivered']);
  if (today.length === 1) sentences.push(fill(text.s_today_one, { name: today[0].name }));
  else if (today.length > 1) sentences.push(fill(text.s_today_many, { n: today.length }));
  if (problems.length === 1) sentences.push(fill(text[`s_${problems[0].key}`], { name: problems[0].name }));
  else if (problems.length > 1) sentences.push(fill(text.s_problems, { n: problems.length }));
  if (!today.length && !problems.length) {
    if (moving.length === 1) sentences.push(fill(moving[0].key === 'info_received' ? text.s_info_one : text.s_transit_one, { name: moving[0].name }));
    else if (moving.length > 1) sentences.push(fill(text.s_transit_many, { n: moving.length }));
  }
  const recent = delivered.filter((p) => p.delivered).sort((a, b) => b.delivered - a.delivered)[0];
  if (recent && sentences.length < 2) {
    const ago = daysAgo(recent.delivered, now);
    const key = ago === 0 ? 's_came_today' : ago === 1 ? 's_came_yesterday' : 's_came_on';
    sentences.push(fill(text[key], { name: recent.name, date: relativeDate(recent.delivered, now, text, false) }));
  }
  return sentences.slice(0, 2);
}

/** Error text of a failed add, from a thrown error or a response that says it failed. */
export function addError(result, text) {
  if (result instanceof Error || (result && typeof result.message === 'string' && !('response' in result))) {
    return String(result.message || '').slice(0, 120) || text.failed_default;
  }
  const response = result && result.response;
  if (response && typeof response === 'object') {
    if (response.success === false || response.error_message || response.error) {
      return String(response.error_message || response.error || text.failed_default).slice(0, 120);
    }
  }
  return undefined;
}
