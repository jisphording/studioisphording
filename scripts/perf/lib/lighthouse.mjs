// Lighthouse (performance category only), repeated per page and form factor.
// Metrics are reported as the median across runs; request lists, insights and
// the saved HTML report come from the run closest to that median.

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import lighthouse, { desktopConfig, generateReport } from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import { median, kindOf } from './util.mjs'

const METRICS = {
  fcpMs: 'first-contentful-paint',
  lcpMs: 'largest-contentful-paint',
  tbtMs: 'total-blocking-time',
  cls: 'cumulative-layout-shift',
  speedIndexMs: 'speed-index',
  ttiMs: 'interactive',
  totalBytes: 'total-byte-weight',
  mainThreadMs: 'mainthread-work-breakdown',
  jsBootupMs: 'bootup-time',
}

// Insights and diagnostics that point at concrete, fixable assets.
const INSIGHTS = [
  'image-delivery-insight',
  'lcp-breakdown-insight',
  'lcp-discovery-insight',
  'render-blocking-insight',
  'network-dependency-tree-insight',
  'cls-culprits-insight',
  'font-display-insight',
  'dom-size-insight',
  'forced-reflow-insight',
  'duplicated-javascript-insight',
  'unused-javascript',
  'unused-css-rules',
  'unsized-images',
  'non-composited-animations',
  'long-tasks',
]

export const CHROME_FLAGS = [
  '--headless=new',
  '--no-first-run',
  '--disable-extensions',
  // Headless Chrome renders WebGL through SwiftShader; without this flag the
  // Three.js scenes get no context at all.
  '--enable-unsafe-swiftshader',
]

export async function runLighthouse(baseUrl, paths, { formFactors, runs, throttling, reportDir, log }) {
  const results = {}
  mkdirSync(reportDir, { recursive: true })

  for (const formFactor of formFactors) {
    results[formFactor] = {}
    for (const path of paths) {
      const lhrs = []
      for (let i = 0; i < runs; i++) {
        log(`lighthouse ${formFactor} ${path} run ${i + 1}/${runs}`)
        // Fresh browser per run: no warm HTTP cache or JIT state carried over.
        const chrome = await chromeLauncher.launch({ chromeFlags: CHROME_FLAGS })
        try {
          const flags = {
            port: chrome.port,
            output: 'json',
            logLevel: 'error',
            onlyCategories: ['performance'],
            throttlingMethod: throttling,
          }
          const config = formFactor === 'desktop' ? desktopConfig : undefined
          const result = await lighthouse(`${baseUrl}${path}`, flags, config)
          if (result.lhr.runtimeError) {
            log(`  runtime error: ${result.lhr.runtimeError.message}`)
          }
          lhrs.push(result.lhr)
        } finally {
          await chrome.kill()
        }
      }
      const summary = summarize(lhrs)
      const slug = path.replace(/^\//, '').replace(/\//g, '_') || 'root'
      const reportFile = `${formFactor}-${slug}.html`
      writeFileSync(join(reportDir, reportFile), generateReport(lhrs[summary.representativeRun], 'html'))
      summary.reportFile = `lighthouse/${reportFile}`
      results[formFactor][path] = summary
    }
  }
  return results
}

function summarize(lhrs) {
  const perRun = lhrs.map((lhr) => {
    const m = { score: lhr.categories.performance.score == null ? null : Math.round(lhr.categories.performance.score * 100) }
    for (const [key, id] of Object.entries(METRICS)) m[key] = lhr.audits[id]?.numericValue ?? null
    m.requests = lhr.audits['network-requests']?.details?.items?.length ?? null
    return m
  })

  const metrics = {}
  for (const key of Object.keys(perRun[0])) metrics[key] = median(perRun.map((r) => r[key]))

  // The run whose LCP sits closest to the median stands in for "typical".
  let representativeRun = 0
  perRun.forEach((r, i) => {
    if (Math.abs((r.lcpMs ?? 0) - metrics.lcpMs) < Math.abs((perRun[representativeRun].lcpMs ?? 0) - metrics.lcpMs)) {
      representativeRun = i
    }
  })
  const lhr = lhrs[representativeRun]

  return {
    metrics,
    spread: {
      scoreMin: Math.min(...perRun.map((r) => r.score ?? 0)),
      scoreMax: Math.max(...perRun.map((r) => r.score ?? 0)),
      lcpMinMs: Math.min(...perRun.map((r) => r.lcpMs ?? 0)),
      lcpMaxMs: Math.max(...perRun.map((r) => r.lcpMs ?? 0)),
    },
    runs: lhrs.length,
    representativeRun,
    runtimeError: lhr.runtimeError?.message ?? null,
    lcpElement: findNodes(lhr.audits['lcp-breakdown-insight']?.details)[0] ?? null,
    byResourceType: resourceSummary(lhr),
    heaviestRequests: heaviestRequests(lhr),
    insights: insights(lhr),
  }
}

function resourceSummary(lhr) {
  const out = {}
  for (const item of lhr.audits['resource-summary']?.details?.items ?? []) {
    out[item.resourceType] = { requests: item.requestCount, bytes: item.transferSize }
  }
  return out
}

function heaviestRequests(lhr, top = 20) {
  const items = lhr.audits['network-requests']?.details?.items ?? []
  const lcp = lhr.audits['largest-contentful-paint']?.numericValue ?? null
  return items
    .map((r) => ({
      url: r.url,
      kind: kindOf(r.url),
      resourceType: r.resourceType,
      mimeType: r.mimeType,
      transferBytes: r.transferSize,
      resourceBytes: r.resourceSize,
      priority: r.priority,
      startMs: Math.round(r.networkRequestTime ?? 0),
      endMs: Math.round(r.networkEndTime ?? 0),
      // Requested before LCP but not the LCP resource: competes with the first paint.
      beforeLcp: lcp != null && (r.networkRequestTime ?? 0) < lcp,
    }))
    .sort((a, b) => b.transferBytes - a.transferBytes)
    .slice(0, top)
}

function insights(lhr) {
  const out = []
  for (const id of INSIGHTS) {
    const audit = lhr.audits[id]
    if (!audit || audit.scoreDisplayMode === 'notApplicable') continue
    const passed = audit.score === 1 || audit.scoreDisplayMode === 'informative' && !audit.details
    if (passed) continue
    out.push({
      id,
      title: audit.title,
      score: audit.score,
      displayValue: audit.displayValue ?? null,
      metricSavings: audit.metricSavings ?? null,
      items: tableItems(audit.details).slice(0, 8),
    })
  }
  return out
}

// Flatten table/list details (insights nest tables inside lists) into rows
// that keep only the fields useful for acting on a finding.
function tableItems(details) {
  if (!details) return []
  if (details.type === 'list') return details.items.flatMap(tableItems)
  if (!Array.isArray(details.items)) return []
  return details.items.map((item) => {
    const row = {}
    for (const key of ['url', 'totalBytes', 'wastedBytes', 'wastedMs', 'duration', 'label', 'reason', 'value', 'group']) {
      const v = item[key]
      if (v == null) continue
      row[key] = typeof v === 'object' ? (v.value ?? v.text ?? v.url ?? v.snippet ?? JSON.stringify(v)) : v
    }
    const node = findNodes(item)[0]
    if (node) row.node = node
    return row
  }).filter((row) => Object.keys(row).length)
}

function findNodes(value, out = []) {
  if (!value || typeof value !== 'object') return out
  if (value.type === 'node') {
    out.push({ selector: value.selector ?? null, snippet: value.snippet ?? null })
    return out
  }
  for (const v of Object.values(value)) findNodes(v, out)
  return out
}
