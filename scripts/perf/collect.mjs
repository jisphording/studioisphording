#!/usr/bin/env node
// Collect one perf snapshot against an already running server and write
// perf/<timestamp>-<label>/{summary.json,report.md,lighthouse/*.html}.
// Normally invoked by scripts/perf.sh, which builds and boots the server.

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parseArgs } from 'node:util'
import { repoRoot, gitInfo } from './lib/util.mjs'
import { collectCodeStats } from './lib/code-stats.mjs'
import { collectBundleStats } from './lib/bundle.mjs'
import { measureTtfb } from './lib/ttfb.mjs'
import { discoverPages, scanPageMedia } from './lib/page-media.mjs'
import { collectDiskMedia } from './lib/disk-media.mjs'
import { runLighthouse } from './lib/lighthouse.mjs'
import { probePages } from './lib/browser-probe.mjs'
import { renderReport } from './lib/report.mjs'

const DEFAULT_PAGES = [
  '/de',
  '/de/projects',
  '/de/about',
  '/de/projects/01-phenotype-agency',
  '/de/projects/isphording-inneneinrichtung',
]

const { values: args } = parseArgs({
  options: {
    'base-url': { type: 'string' },
    label: { type: 'string', default: 'snapshot' },
    pages: { type: 'string' },
    'form-factors': { type: 'string', default: 'mobile,desktop' },
    runs: { type: 'string', default: '3' },
    throttling: { type: 'string', default: 'simulate' },
    'ttfb-samples': { type: 'string', default: '10' },
    lang: { type: 'string', default: 'de' },
    'skip-lighthouse': { type: 'boolean', default: false },
    'skip-probe': { type: 'boolean', default: false },
  },
})

if (!args['base-url']) {
  console.error('collect: --base-url is required (run scripts/perf.sh instead of calling this directly)')
  process.exit(1)
}

const baseUrl = args['base-url'].replace(/\/$/, '')
const label = args.label.replace(/[^a-zA-Z0-9._-]+/g, '-')
const pages = args.pages ? args.pages.split(/[\s,]+/).filter(Boolean) : DEFAULT_PAGES
const formFactors = args['skip-lighthouse'] ? [] : args['form-factors'].split(',').map((s) => s.trim()).filter(Boolean)
const runs = Number(args.runs)
const stamp = new Date().toISOString().replace(/[:T]/g, '-').replace(/\..+$/, '')
const outDir = join(repoRoot, 'perf', `${stamp}-${label}`)
mkdirSync(outDir, { recursive: true })

const log = (msg) => console.log(`perf: ${msg}`)
const lighthouseVersion = JSON.parse(readFileSync(join(repoRoot, 'node_modules/lighthouse/package.json'), 'utf8')).version

const summary = {
  meta: {
    label,
    timestamp: new Date().toISOString(),
    git: gitInfo(),
    baseUrl,
    pages,
    formFactors,
    runs,
    throttling: args.throttling,
    lighthouseVersion,
  },
}

log('code stats')
summary.code = collectCodeStats()

log('bundle stats')
summary.bundle = collectBundleStats()

// Static media scan runs over every page reachable from the seeds. It goes
// first on purpose: its requests also warm Kirby's thumb generation, so the
// timed steps below do not pay for first-request image processing.
const allPages = await discoverPages(baseUrl, args.lang)
log(`media scan over ${allPages.length} pages`)
summary.pageMedia = {}
for (const path of allPages) summary.pageMedia[path] = await scanPageMedia(baseUrl, path)

log(`ttfb (${args['ttfb-samples']} samples per page)`)
summary.ttfb = measureTtfb(baseUrl, allPages, { samples: Number(args['ttfb-samples']) })

if (formFactors.length) {
  summary.lighthouse = await runLighthouse(baseUrl, pages, {
    formFactors,
    runs,
    throttling: args.throttling,
    reportDir: join(outDir, 'lighthouse'),
    log,
  })
}

if (!args['skip-probe']) {
  summary.browserProbe = await probePages(baseUrl, pages, { log })
}

log('disk media inventory')
const seenUrls = [
  ...Object.values(summary.pageMedia).flatMap((m) => m.items.flatMap((i) => [i.url, i.poster, i.largestCandidate?.url, ...(i.sources ?? []).map((s) => s.url)])),
  ...Object.values(summary.lighthouse ?? {}).flatMap((ff) => Object.values(ff).flatMap((r) => r.heaviestRequests.map((q) => q.url))),
  ...Object.values(summary.browserProbe ?? {}).flatMap((r) => r.heaviestAssets.concat(r.lateAssets, r.scrollTriggeredAssets).map((a) => a.url)),
].filter(Boolean)
summary.diskMedia = collectDiskMedia({ seenUrls })

writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2))
writeFileSync(join(outDir, 'report.md'), renderReport(summary))
log(`done → ${relative(repoRoot, outDir)}/report.md`)
