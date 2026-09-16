// Server response time per page via curl, which reports connect/TTFB/total
// separately and adds no JS-side timing overhead.

import { execFileSync } from 'node:child_process'
import { median } from './util.mjs'

export function measureTtfb(baseUrl, paths, { samples = 10 } = {}) {
  const results = {}
  for (const path of paths) {
    const ttfb = []
    const total = []
    let bytes = null
    for (let i = 0; i < samples; i++) {
      const out = execFileSync('curl', [
        '-s', '-o', '/dev/null',
        '-w', '%{time_starttransfer} %{time_total} %{size_download} %{http_code}',
        `${baseUrl}${path}`,
      ], { encoding: 'utf8' })
      const [start, end, size, status] = out.trim().split(' ')
      if (status !== '200') throw new Error(`TTFB: ${path} returned HTTP ${status}`)
      ttfb.push(Number(start) * 1000)
      total.push(Number(end) * 1000)
      bytes = Number(size)
    }
    results[path] = {
      medianTtfbMs: median(ttfb),
      minTtfbMs: Math.min(...ttfb),
      maxTtfbMs: Math.max(...ttfb),
      medianTotalMs: median(total),
      htmlBytes: bytes,
    }
  }
  return results
}
