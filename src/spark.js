/** Sparkline geometry without DOM: bucket averages and a smooth SVG path. */

export const SPARK_W = 300;
export const SPARK_H = 64;

/** Average the points into at most `buckets` time slots; empty slots are skipped. */
export function bucket(points, buckets = 36) {
  if (!points || points.length < 2) return [];
  const minX = points[0].x;
  const maxX = points[points.length - 1].x;
  const span = maxX - minX || 1;
  const sums = new Map();
  for (const point of points) {
    const slot = Math.min(buckets - 1, Math.floor(((point.x - minX) / span) * buckets));
    const entry = sums.get(slot) || { x: 0, y: 0, n: 0 };
    entry.x += point.x;
    entry.y += point.y;
    entry.n += 1;
    sums.set(slot, entry);
  }
  return [...sums.keys()].sort((a, b) => a - b).map((slot) => {
    const entry = sums.get(slot);
    return { x: entry.x / entry.n, y: entry.y / entry.n };
  });
}

/** Catmull-Rom spline through the points, scaled to their own extent. */
export function smoothPath(points, width = SPARK_W, height = SPARK_H) {
  if (points.length < 2) return '';
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return smoothPathIn(points, { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }, width, height);
}

/** Same, inside a fixed box, so several curves share one scale. */
export function smoothPathIn(points, box, width = SPARK_W, height = SPARK_H) {
  if (points.length < 2) return '';
  const spanX = box.maxX - box.minX || 1;
  const spanY = box.maxY - box.minY || 1;
  const pad = 6;
  const p = points.map((point) => [((point.x - box.minX) / spanX) * width, height - pad - ((point.y - box.minY) / spanY) * (height - pad * 2)]);
  const f = (n) => n.toFixed(1);
  let d = `M${f(p[0][0])},${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i += 1) {
    const p0 = p[i - 1] || p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}