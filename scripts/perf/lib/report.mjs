// Render a snapshot (summary.json) as report.md — readable by a human and
// structured so it can be handed to Claude as input for media/loading work.

import { formatBytes as B, formatMs as T } from './util.mjs'

const table = (head, rows) => [
  `| ${head.join(' | ')} |`,
  `| ${head.map(() => '---').join(' | ')} |`,
  ...rows.map((r) => `| ${r.map((c) => String(c ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`),
].join('\n')

const short = (url) => {
  try {
    return decodeURIComponent(new URL(url).pathname)
  } catch {
    return url
  }
}

export function renderReport(s) {
  const out = []
  const push = (...lines) => out.push(...lines, '')

  push(
    `# Perf snapshot: ${s.meta.label}`,
    `- Taken: ${s.meta.timestamp}`,
    `- Git: \`${s.meta.git.sha}\` on \`${s.meta.git.branch}\`${s.meta.git.dirty ? ' (uncommitted changes)' : ''}`,
    `- Target: ${s.meta.baseUrl} (local \`php -S\`, production config, no compression)`,
    `- Lighthouse ${s.meta.lighthouseVersion}: ${s.meta.runs} run(s) per page, form factors: ${s.meta.formFactors.join(', ') || 'skipped'}, throttling: ${s.meta.throttling}`,
    '',
    '> Absolute numbers come from a local single-host setup and will not match production.',
    '> Compare snapshots with `node scripts/perf/compare.mjs` instead of reading them in isolation.',
    '> Browser-probe frame times use software WebGL (SwiftShader) and are only meaningful relative to another snapshot.',
  )

  if (s.lighthouse) {
    push('## Web vitals (Lighthouse, medians)')
    for (const [ff, pages] of Object.entries(s.lighthouse)) {
      push(`### ${ff}`, table(
        ['Page', 'Score', 'LCP', 'FCP', 'TBT', 'CLS', 'Speed Index', 'Transfer', 'Requests', 'Main thread', 'Report'],
        Object.entries(pages).map(([p, r]) => [
          p, `${r.metrics.score} (${r.spread.scoreMin}–${r.spread.scoreMax})`, T(r.metrics.lcpMs), T(r.metrics.fcpMs),
          T(r.metrics.tbtMs), r.metrics.cls?.toFixed(3), T(r.metrics.speedIndexMs), B(r.metrics.totalBytes),
          r.metrics.requests, T(r.metrics.mainThreadMs), `[html](${r.reportFile})`,
        ]),
      ))
    }
  }

  if (s.ttfb) {
    push('## Server response (curl)', table(
      ['Page', 'TTFB median', 'min', 'max', 'HTML size'],
      Object.entries(s.ttfb).map(([p, r]) => [p, T(r.medianTtfbMs), T(r.minTtfbMs), T(r.maxTtfbMs), B(r.htmlBytes)]),
    ))
  }

  // ---- Heavy asset findings -------------------------------------------------
  push(
    '## Heavy assets and loading behaviour',
    'This section is the input for media/loading optimisation. Every URL is real;',
    'flags are heuristics to verify against the template before changing anything.',
  )

  if (s.lighthouse) {
    const ff = Object.keys(s.lighthouse)[0]
    push(`### Heaviest requests during page load (Lighthouse, ${ff})`)
    for (const [p, r] of Object.entries(s.lighthouse[ff])) {
      const lcp = r.lcpElement ? ` — LCP element: \`${r.lcpElement.selector ?? r.lcpElement.snippet}\`` : ''
      push(`#### ${p}${lcp}`, table(
        ['URL', 'Kind', 'Transfer', 'Priority', 'Start', 'Before LCP'],
        r.heaviestRequests.filter((q) => q.transferBytes > 20 * 1024).slice(0, 12)
          .map((q) => [short(q.url), q.kind, B(q.transferBytes), q.priority, T(q.startMs), q.beforeLcp ? 'yes' : '']),
      ))
      if (r.insights.length) {
        push(...r.insights.map((i) => {
          const saved = Object.entries(i.metricSavings ?? {}).filter(([, v]) => v).map(([k, v]) => `${k} ${k === 'CLS' ? v : T(v)}`)
          const savings = saved.length ? ` (metric savings: ${saved.join(', ')})` : ''
          const items = i.items.map((it) => `  - ${[it.url ? short(it.url) : it.label ?? it.node?.selector, it.totalBytes ? `total ${B(it.totalBytes)}` : null, it.wastedBytes ? `wasted ${B(it.wastedBytes)}` : null, it.wastedMs ? `wasted ${T(it.wastedMs)}` : null, it.duration ? T(it.duration) : null].filter(Boolean).join(' · ')}`)
          return [`- **${i.title}**${i.displayValue ? ` — ${i.displayValue}` : ''}${savings}`, ...items].join('\n')
        }))
      }
    }
  }

  if (s.browserProbe) {
    push(
      '### After load and on scroll (browser probe, desktop 1440×900, no throttling)',
      'Bytes by phase: **initial** = until the load event, **idle** = after load with no interaction',
      '(late JS-driven loads, e.g. Three.js assets), **scroll** = requested while scrolling to the bottom.',
    )
    push(table(
      ['Page', 'Initial', 'Idle (late)', 'Scroll', 'Idle fps / p95', 'Scroll fps / long frames', 'JS heap', 'WebGL canvases', 'Errors'],
      Object.entries(s.browserProbe).map(([p, r]) => [
        p,
        B(r.phases.initial?.bytes), B(r.phases.idle?.bytes ?? 0), B(r.phases.scroll?.bytes ?? 0),
        r.frames.idle ? `${r.frames.idle.approxFps} / ${r.frames.idle.p95FrameMs} ms` : '',
        r.frames.scroll ? `${r.frames.scroll.approxFps} / ${r.frames.scroll.longFramesOver50ms}` : '',
        B(r.jsHeapUsedBytes),
        r.webgl.length ? r.webgl.map((c) => `${c.cssSize}→${c.drawingBuffer ?? 'no ctx'}`).join(', ') : 'none',
        r.pageErrors.length,
      ]),
    ))
    for (const [p, r] of Object.entries(s.browserProbe)) {
      const rows = [...r.lateAssets, ...r.scrollTriggeredAssets].filter((a) => a.bytes > 50 * 1024)
      const eager = r.heaviestAssets.filter((a) => a.phase === 'initial' && a.bytes > 500 * 1024)
      if (!rows.length && !eager.length && !r.pageErrors.length) continue
      push(`#### ${p}`)
      if (eager.length) push('Loaded eagerly before the load event (>500 KB):', table(['URL', 'Kind', 'Bytes'], eager.map((a) => [short(a.url), a.kind, B(a.bytes)])))
      if (rows.length) push('Loaded late or on scroll (>50 KB):', table(['URL', 'Kind', 'Bytes', 'Phase'], rows.map((a) => [short(a.url), a.kind, B(a.bytes), a.phase])))
      if (r.pageErrors.length) push('Page errors:', ...r.pageErrors.map((e) => `- \`${e}\``))
    }
  }

  if (s.pageMedia) {
    push(
      '### Media referenced in page markup (static HTML audit)',
      'Flags: `eager-below-fold-candidate` = no `loading="lazy"` on the 3rd+ media element; `lazy-first-media-lcp-risk` = the first media element is lazy; `offscreen-autoplay-candidate` = autoplay video',
      'that is not the first media element on the page (downloads immediately regardless of viewport); `unsized-cls-risk` = no width/height;',
      '`largest-candidate>1MB` = the biggest srcset entry exceeds 1 MB; `legacy-format` = JPEG/PNG src.',
    )
    push(table(
      ['Page', 'Images', 'Image bytes (src)', 'Videos', 'Video bytes', 'Flagged items'],
      Object.entries(s.pageMedia).map(([p, m]) => [p, m.totals.images, B(m.totals.imageBytes), m.totals.videos, B(m.totals.videoBytes), m.totals.flaggedItems]),
    ))
    const flagCounts = {}
    for (const m of Object.values(s.pageMedia)) {
      for (const i of m.items) for (const f of i.flags) {
        const key = f.replace(/\(\d+\)$/, '')
        flagCounts[key] = (flagCounts[key] ?? 0) + 1
      }
    }
    push('Flag counts across all scanned pages:', table(['Flag', 'Occurrences'], Object.entries(flagCounts).sort((a, b) => b[1] - a[1])))

    // Shared blocks (e.g. related-project thumbnails) repeat on many pages;
    // list each URL once, on the first page it appears.
    const listed = new Set()
    for (const [p, m] of Object.entries(s.pageMedia)) {
      const flagged = m.items.filter((i) => i.flags.length)
      const fresh = flagged.filter((i) => !listed.has(i.url))
      fresh.forEach((i) => listed.add(i.url))
      if (!fresh.length) continue
      const repeated = flagged.length - fresh.length
      push(`#### ${p}`, table(
        ['#', 'Tag', 'URL', 'Bytes', 'Largest srcset', 'Attributes', 'Flags'],
        fresh.map((i) => [
          i.index, i.tag, short(i.url), B(i.bytes),
          i.largestCandidate ? `${i.largestCandidate.width}w ${B(i.largestCandidate.bytes)}` : '',
          Object.entries(i.attrs).filter(([k]) => k !== 'sizes' && k !== 'class').map(([k, v]) => (v === true ? k : `${k}=${v}`)).join(' '),
          i.flags.join(', '),
        ]),
      ))
      if (repeated) push(`_${repeated} more flagged item(s) on this page already listed above._`)
    }
  }

  if (s.diskMedia) {
    const d = s.diskMedia
    push(
      `### Heavy files on disk (≥ ${B(d.minBytes)}; ${d.heavyFileCount} total, top ${d.heavyFiles.length} shown)`,
      '"Seen" = the file (or a Kirby thumb of it) was requested somewhere in this run. Unseen files are either',
      'unused, only reachable from pages not scanned, or loaded by interactions the probe does not perform.',
      table(['Tree', 'Files', 'Size'], Object.entries(d.trees).map(([t, v]) => [t, v.files, B(v.bytes)])),
      '',
      table(['Kind', 'Files', 'Size'], Object.entries(d.byKind).sort((a, b) => b[1].bytes - a[1].bytes).map(([k, v]) => [k, v.files, B(v.bytes)])),
      '',
      table(['File', 'Kind', 'Size', 'Formats in folder', 'Page', 'Seen'],
        d.heavyFiles.map((f) => [f.file, f.kind, B(f.bytes), f.formats?.join('/'), f.page ?? '', f.seenThisRun ? 'yes' : 'no'])),
    )
  }

  if (s.bundle) {
    push('## JS/CSS bundle', table(
      ['Total files', 'Raw', 'Gzip', 'Brotli', 'JS', 'CSS', 'Source maps (not downloaded)'],
      [[s.bundle.totals.files, B(s.bundle.totals.bytes), B(s.bundle.totals.gzip), B(s.bundle.totals.brotli), B(s.bundle.totals.jsBytes), B(s.bundle.totals.cssBytes), B(s.bundle.totals.sourceMapBytes)]],
    ), '', table(['File', 'Raw', 'Gzip', 'Brotli'], s.bundle.files.slice(0, 15).map((f) => [f.file, B(f.bytes), B(f.gzip), B(f.brotli)])))
  }

  if (s.code) {
    push('## Code size (navigability)', table(
      ['Area', 'Files', 'Lines'],
      [...Object.entries(s.code.areas).map(([a, v]) => [a, v.files, v.lines]), ['**total**', s.code.totals.files, s.code.totals.lines]],
    ), '', 'Largest files:', '', table(['File', 'Lines'], s.code.largestFiles.map((f) => [f.file, f.lines])))
  }

  return out.join('\n')
}
