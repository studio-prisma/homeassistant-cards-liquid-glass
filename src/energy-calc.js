/**
 * Pure energy maths for lg-energy: no DOM, so it can be tested directly.
 *
 * Inputs are recorder statistics of type "change" (kWh per period) for one or
 * more meters. Comparisons are always made to the same point of the previous
 * period, so a morning is never compared with a whole day.
 */

const HOUR = 3600 * 1000;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Sum the "change" rows of several statistics per period start (ms). */
export function sumByStart(result) {
  const totals = new Map();
  for (const rows of Object.values(result || {})) {
    for (const row of rows || []) {
      const start = typeof row.start === 'number' ? row.start : Date.parse(row.start);
      const value = Number(row.change);
      if (!Number.isFinite(start) || !Number.isFinite(value)) continue;
      totals.set(start, (totals.get(start) || 0) + value);
    }
  }
  return totals;
}

/** Per statistic total over all rows, for "largest consumer". */
export function totalsByStatistic(result) {
  const out = {};
  for (const [id, rows] of Object.entries(result || {})) {
    out[id] = (rows || []).reduce((sum, row) => sum + (Number.isFinite(Number(row.change)) ? Number(row.change) : 0), 0);
  }
  return out;
}

export function trend(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return undefined;
  return Math.round(((current - previous) / previous) * 100);
}

/** Sum of the periods starting in [from, to). */
function between(totals, from, to) {
  let sum = 0;
  for (const [start, value] of totals) if (start >= from && start < to) sum += value;
  return sum;
}

/**
 * Today against yesterday up to the same time, with cumulative curves per hour.
 * `hourly` is a Map start(ms) -> kWh covering yesterday and today.
 */
export function compareDays(hourly, now = new Date()) {
  const today = startOfDay(now).getTime();
  const yesterday = addDays(startOfDay(now), -1).getTime();
  const elapsed = now.getTime() - today;
  const fullHours = Math.floor(elapsed / HOUR);
  const fraction = (elapsed - fullHours * HOUR) / HOUR;
  const todayValue = between(hourly, today, now.getTime() + 1);
  const yesterdaySame = between(hourly, yesterday, yesterday + fullHours * HOUR) + (hourly.get(yesterday + fullHours * HOUR) || 0) * fraction;
  const curve = (base, hours) => {
    const points = [];
    let sum = 0;
    for (let h = 0; h < hours; h += 1) {
      sum += hourly.get(base + h * HOUR) || 0;
      points.push({ x: h + 1, y: sum });
    }
    return points;
  };
  return {
    today: todayValue,
    yesterdaySame,
    trend: trend(todayValue, yesterdaySame),
    todayCurve: curve(today, Math.min(24, fullHours + 1)),
    yesterdayCurve: curve(yesterday, 24),
  };
}

/** This week and this month against the previous ones up to the same point. `daily`: Map start(ms) -> kWh. */
export function comparePeriods(daily, todayValue, now = new Date()) {
  const day0 = startOfDay(now);
  const fraction = (now.getTime() - day0.getTime()) / (24 * HOUR);

  const weekday = (day0.getDay() + 6) % 7; // Monday = 0
  const weekStart = addDays(day0, -weekday);
  const prevWeekStart = addDays(weekStart, -7);
  const week = between(daily, weekStart.getTime(), day0.getTime()) + todayValue;
  const prevWeek = between(daily, prevWeekStart.getTime(), addDays(prevWeekStart, weekday).getTime()) + (daily.get(addDays(prevWeekStart, weekday).getTime()) || 0) * fraction;

  const monthStart = new Date(day0.getFullYear(), day0.getMonth(), 1);
  const prevMonthStart = new Date(day0.getFullYear(), day0.getMonth() - 1, 1);
  const prevMonthDays = new Date(day0.getFullYear(), day0.getMonth(), 0).getDate();
  const dayIndex = Math.min(day0.getDate() - 1, prevMonthDays - 1);
  const month = between(daily, monthStart.getTime(), day0.getTime()) + todayValue;
  const prevSameDay = new Date(prevMonthStart.getFullYear(), prevMonthStart.getMonth(), dayIndex + 1);
  const prevMonth = between(daily, prevMonthStart.getTime(), prevSameDay.getTime()) + (daily.get(prevSameDay.getTime()) || 0) * fraction;

  return {
    week, prevWeek, weekTrend: trend(week, prevWeek),
    month, prevMonth, monthTrend: trend(month, prevMonth),
    prevMonthStart,
  };
}

/** Meters to add up: explicit list, else the top-level devices of the energy settings, else the grid meter. */
export function pickStatistics(prefs, explicit) {
  if (Array.isArray(explicit) && explicit.length) return explicit.map((id) => ({ id, name: undefined }));
  const devices = ((prefs && prefs.device_consumption) || []).filter((device) => device.stat_consumption && !device.included_in_stat);
  if (devices.length) return devices.map((device) => ({ id: device.stat_consumption, name: device.name }));
  const grid = ((prefs && prefs.energy_sources) || []).find((source) => source.type === 'grid' && source.stat_energy_from);
  return grid ? [{ id: grid.stat_energy_from, name: undefined }] : [];
}
