/** Pure calendar helpers for lg-agenda: no DOM, so they can be tested directly. */

export function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** An event's start as a Date; all-day events carry a plain date. */
export function startOf(event) {
  const value = event.start && (event.start.dateTime || event.start.date || event.start);
  if (typeof value !== 'string') return undefined;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function endOf(event) {
  const value = event.end && (event.end.dateTime || event.end.date || event.end);
  if (typeof value !== 'string') return undefined;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function isAllDay(event) {
  return Boolean(event.start && typeof event.start === 'object' && event.start.date && !event.start.dateTime);
}

/** Merge, filter and sort events of several calendars. Pure, so it can be tested. */
export function arrange(lists, { exclude, now = new Date(), max = 8 } = {}) {
  const pattern = exclude ? safePattern(exclude) : undefined;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const seen = new Set();
  const events = [];
  lists.forEach((list, index) => {
    for (const event of list || []) {
      const start = startOf(event);
      if (!start || typeof event.summary !== 'string') continue;
      if (pattern && pattern.test(event.summary)) continue;
      const end = endOf(event) || start;
      if (!isAllDay(event) && end < now) continue;
      // All-day end dates are exclusive: an event ending today at 00:00 is over.
      if (end <= today && end.getTime() !== start.getTime()) continue;
      const key = `${event.summary}|${start.getTime()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Something that started before today and still runs belongs to today, shown like an all-day entry.
      const ongoing = start < today;
      events.push({ summary: event.summary, start: ongoing ? today : start, end, allDay: isAllDay(event) || ongoing, source: index });
    }
  });
  const midnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  events.sort((a, b) => midnight(a.start) - midnight(b.start) || Number(b.allDay) - Number(a.allDay) || a.start - b.start);
  return events.slice(0, max);
}

export function safePattern(source) {
  if (typeof source !== 'string' || source.length > 200) return undefined;
  try {
    return new RegExp(source);
  } catch (err) {
    return undefined;
  }
}
