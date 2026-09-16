// Before/after delta rows for scripts/perf/compare.mjs.

import { formatBytes, formatMs } from './util.mjs'

// Differences below this share of the baseline are treated as run-to-run noise.
export const NOISE = 0.05

const fmt = {
  bytes: formatBytes,
  ms: formatMs,
  count: (v) => (v == null ? 'n/a' : String(Math.round(v))),
  cls: (v) => (v == null ? 'n/a' : v.toFixed(3)),
  score: (v) => (v == null ? 'n/a' : String(v)),
}

// Returns [name, before, after, delta, delta%, verdict], or null when both
// sides are missing. higherIsBetter only for the Lighthouse score and fps.
export function row(name, before, after, unit, { higherIsBetter = false, absNoise = 0 } = {}) {
  if (before == null && after == null) return null
  const f = fmt[unit]
  if (before == null || after == null) return [name, f(before), f(after), '', '', 'new/removed']
  const delta = after - before
  const pct = before === 0 ? (after === 0 ? 0 : Infinity) : delta / Math.abs(before)
  const noise = Math.abs(pct) < NOISE || Math.abs(delta) <= absNoise
  const better = higherIsBetter ? delta > 0 : delta < 0
  const verdict = delta === 0 || noise ? '· same' : better ? '✅ better' : '❌ worse'
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
  const deltaText = unit === 'bytes' ? formatBytes(Math.abs(delta)) : unit === 'ms' ? formatMs(Math.abs(delta)) : unit === 'cls' ? Math.abs(delta).toFixed(3) : String(Math.abs(Math.round(delta * 10) / 10))
  return [name, f(before), f(after), `${sign}${deltaText}`, Number.isFinite(pct) ? `${sign}${Math.abs(pct * 100).toFixed(1)}%` : 'n/a', verdict]
}
