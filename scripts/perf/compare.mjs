#!/usr/bin/env node
// Compare two perf snapshots and print a before/after markdown table.
//
// Usage:
//   node scripts/perf/compare.mjs                      # two most recent snapshots
//   node scripts/perf/compare.mjs <before> <after>     # dirs under perf/ (name or path)
//
// Also writes compare-vs-<before>.md into the "after" snapshot folder.

import { readFileSync, readdirSync, existsSync, writeFileSync, statSync } from 'node:fs'
import { join, basename, isAbsolute } from 'node:path'
import { repoRoot } from './lib/util.mjs'
import { row, NOISE } from './lib/delta.mjs'

const perfDir = join(repoRoot, 'perf')
const resolveSnapshot = (arg) => {
  const dir = isAbsolute(arg) ? arg : existsSync(arg) ? arg : join(perfDir, arg)
  if (!existsSync(join(dir, 'summary.json'))) {
    console.error(`compare: no summary.json in ${dir}`)
    process.exit(1)
  }
  return dir
}

let [beforeArg, afterArg] = process.argv.slice(2)
if (!beforeArg) {
  const snapshots = existsSync(perfDir)
    ? readdirSync(perfDir).filter((d) => existsSync(join(perfDir, d, 'summary.json')) && statSync(join(perfDir, d)).isDirectory()).sort()
    : []
  if (snapshots.length < 2) {
    console.error('compare: need at least two snapshots in perf/ (run scripts/perf.sh twice)')
    process.exit(1)
  }
  ;[beforeArg, afterArg] = snapshots.slice(-2)
}
if (!afterArg) {
  console.error('compare: pass both <before> and <after>, or neither')
  process.exit(1)
}

const beforeDir = resolveSnapshot(beforeArg)
const afterDir = resolveSnapshot(afterArg)
const a = JSON.parse(readFileSync(join(beforeDir, 'summary.json'), 'utf8'))
const b = JSON.parse(readFileSync(join(afterDir, 'summary.json'), 'utf8'))

const out = []
const tally = { better: 0, worse: 0, same: 0 }
function section(title, rows) {
  rows = rows.filter(Boolean)
  if (!rows.length) return
  for (const r of rows) {
    if (r[5].includes('better')) tally.better++
    else if (r[5].includes('worse')) tally.worse++
    else tally.same++
  }
  out.push(`## ${title}`, '', '| Metric | Before | After | Δ | Δ% | |', '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) => `| ${r.join(' | ')} |`), '')
}

out.push(
  `# Perf comparison`,
  '',
  `- **Before:** ${basename(beforeDir)} — \`${a.meta.git.sha}\`${a.meta.git.dirty ? ' (dirty)' : ''}`,
  `- **After:** ${basename(afterDir)} — \`${b.meta.git.sha}\`${b.meta.git.dirty ? ' (dirty)' : ''}`,
  `- Changes under ${NOISE * 100}% are marked "same" (run-to-run noise).`,
  '- "Bytes until load" on pages with autoplay video depends on how much video streamed before the load event; expect ±20% there without any code change.',
  '',
)

const settingsDiffer = a.lighthouse && b.lighthouse
  ? ['runs', 'throttling', 'lighthouseVersion'].filter((k) => a.meta[k] !== b.meta[k])
  : []
if (settingsDiffer.length) {
  out.push(`> ⚠️ Snapshots were taken with different settings (${settingsDiffer.join(', ')}); treat Lighthouse deltas with caution.`, '')
}

for (const ff of Object.keys(b.lighthouse ?? {})) {
  for (const page of Object.keys(b.lighthouse[ff])) {
    const x = a.lighthouse?.[ff]?.[page]?.metrics ?? {}
    const y = b.lighthouse[ff][page].metrics
    section(`Lighthouse ${ff} — ${page}`, [
      row('Score', x.score, y.score, 'score', { higherIsBetter: true, absNoise: 2 }),
      row('LCP', x.lcpMs, y.lcpMs, 'ms', { absNoise: 50 }),
      row('FCP', x.fcpMs, y.fcpMs, 'ms', { absNoise: 50 }),
      row('TBT', x.tbtMs, y.tbtMs, 'ms', { absNoise: 20 }),
      row('CLS', x.cls, y.cls, 'cls', { absNoise: 0.01 }),
      row('Speed Index', x.speedIndexMs, y.speedIndexMs, 'ms', { absNoise: 50 }),
      row('Transfer size', x.totalBytes, y.totalBytes, 'bytes'),
      row('Requests', x.requests, y.requests, 'count', { absNoise: 0 }),
      row('Main-thread work', x.mainThreadMs, y.mainThreadMs, 'ms', { absNoise: 50 }),
      row('JS boot-up', x.jsBootupMs, y.jsBootupMs, 'ms', { absNoise: 20 }),
    ])
  }
}

for (const page of Object.keys(b.browserProbe ?? {})) {
  const x = a.browserProbe?.[page]
  const y = b.browserProbe[page]
  section(`Browser probe — ${page}`, [
    row('Bytes until load', x?.phases.initial?.bytes, y.phases.initial?.bytes, 'bytes'),
    row('Bytes after load (idle)', x?.phases.idle?.bytes ?? 0, y.phases.idle?.bytes ?? 0, 'bytes'),
    row('Bytes on scroll', x?.phases.scroll?.bytes ?? 0, y.phases.scroll?.bytes ?? 0, 'bytes'),
    row('Idle fps (software GL)', x?.frames.idle?.approxFps, y.frames.idle?.approxFps, 'count', { higherIsBetter: true, absNoise: 2 }),
    row('Scroll long frames', x?.frames.scroll?.longFramesOver50ms, y.frames.scroll?.longFramesOver50ms, 'count', { absNoise: 1 }),
    row('JS heap', x?.jsHeapUsedBytes, y.jsHeapUsedBytes, 'bytes'),
    row('Page errors', x?.pageErrors.length, y.pageErrors.length, 'count'),
  ])
}

section('Server response (median TTFB)', Object.keys(b.ttfb ?? {}).map((p) =>
  row(p, a.ttfb?.[p]?.medianTtfbMs, b.ttfb[p].medianTtfbMs, 'ms', { absNoise: 5 })))

section('Page media (static markup audit)', Object.keys(b.pageMedia ?? {}).flatMap((p) => {
  const x = a.pageMedia?.[p]?.totals
  const y = b.pageMedia[p].totals
  return [
    row(`${p} image bytes`, x?.imageBytes, y.imageBytes, 'bytes'),
    row(`${p} video bytes`, x?.videoBytes, y.videoBytes, 'bytes'),
    row(`${p} flagged items`, x?.flaggedItems, y.flaggedItems, 'count'),
  ]
}).filter((r) => r && !(r[1] === r[2])))

section('JS/CSS bundle', [
  row('Total raw', a.bundle?.totals.bytes, b.bundle?.totals.bytes, 'bytes'),
  row('Total gzip', a.bundle?.totals.gzip, b.bundle?.totals.gzip, 'bytes'),
  row('JS raw', a.bundle?.totals.jsBytes, b.bundle?.totals.jsBytes, 'bytes'),
  row('CSS raw', a.bundle?.totals.cssBytes, b.bundle?.totals.cssBytes, 'bytes'),
  row('Files', a.bundle?.totals.files, b.bundle?.totals.files, 'count'),
])

section('Disk media', Object.keys(b.diskMedia?.trees ?? {}).map((t) =>
  row(t, a.diskMedia?.trees[t]?.bytes, b.diskMedia.trees[t].bytes, 'bytes')))

// Code size is exact (no noise), so report every change.
const codeRows = Object.keys(b.code?.areas ?? {}).map((area) => {
  const x = a.code?.areas[area]
  const y = b.code.areas[area]
  return [`${area} lines (${x?.files ?? 0}→${y.files} files)`, x?.lines, y.lines]
})
codeRows.push(['**total lines**', a.code?.totals.lines, b.code?.totals.lines])
out.push('## Code size', '', '| Area | Before | After | Δ |', '| --- | --- | --- | --- |',
  ...codeRows.map(([n, x, y]) => `| ${n} | ${x ?? 'n/a'} | ${y} | ${x == null ? '' : (y - x > 0 ? '+' : '') + (y - x)} |`), '')

const largestBefore = new Map((a.code?.largestFiles ?? []).map((f) => [f.file, f.lines]))
out.push('Largest files now:', '', '| File | Lines | Before |', '| --- | --- | --- |',
  ...(b.code?.largestFiles ?? []).slice(0, 10).map((f) => `| ${f.file} | ${f.lines} | ${largestBefore.get(f.file) ?? '—'} |`), '')

out.splice(7, 0, `**Summary:** ${tally.better} better · ${tally.worse} worse · ${tally.same} unchanged/within noise`, '')

const md = out.join('\n')
const target = join(afterDir, `compare-vs-${basename(beforeDir)}.md`)
writeFileSync(target, md)
console.log(md)
console.error(`\ncompare: written to ${target.replace(repoRoot + '/', '')}`)
