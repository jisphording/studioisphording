// Real-browser probe for what Lighthouse misses on this site: assets that load
// after the load event or only once the visitor scrolls (lazy media, Three.js
// meshes/textures), frame times while a WebGL scene runs, and memory.
//
// Headless Chrome renders WebGL in software (SwiftShader), so frame times are
// far slower than on a real GPU — compare them between snapshots, never
// against real-device expectations.

import puppeteer from 'puppeteer-core'
import * as chromeLauncher from 'chrome-launcher'
import { CHROME_FLAGS } from './lighthouse.mjs'
import { median, kindOf } from './util.mjs'

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 }
const SETTLE_MS = 3000
const FRAME_SAMPLE_MS = 4000

export async function probePages(baseUrl, paths, { log }) {
  const chrome = await chromeLauncher.launch({ chromeFlags: CHROME_FLAGS })
  const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}`, defaultViewport: VIEWPORT })
  const results = {}
  try {
    for (const path of paths) {
      log(`browser probe ${path}`)
      results[path] = await probe(browser, `${baseUrl}${path}`)
    }
  } finally {
    await browser.disconnect()
    await chrome.kill()
  }
  return results
}

async function probe(browser, url) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  const cdp = await page.createCDPSession()
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })

  const requests = new Map()
  let phase = 'initial'
  cdp.on('Network.requestWillBeSent', (e) => {
    if (!requests.has(e.requestId)) requests.set(e.requestId, { url: e.request.url, phase, bytes: 0 })
  })
  cdp.on('Network.dataReceived', (e) => {
    const r = requests.get(e.requestId)
    if (r) r.bytes += e.encodedDataLength
  })
  cdp.on('Network.loadingFinished', (e) => {
    const r = requests.get(e.requestId)
    if (r) r.bytes = Math.max(r.bytes, e.encodedDataLength)
  })
  const errors = []
  page.on('pageerror', (err) => errors.push(String(err.message ?? err).slice(0, 300)))

  const started = Date.now()
  await page.goto(url, { waitUntil: 'load', timeout: 90000 })
  const loadMs = Date.now() - started
  await sleep(SETTLE_MS)

  phase = 'idle'
  const idleFrames = await sampleFrames(page, FRAME_SAMPLE_MS)

  phase = 'scroll'
  const scrollFrames = await scrollThrough(page)
  await sleep(2000)

  const webgl = await page.evaluate(() => [...document.querySelectorAll('canvas')].map((c) => {
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    return {
      id: c.id || c.className || null,
      cssSize: `${c.clientWidth}x${c.clientHeight}`,
      drawingBuffer: gl ? `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}` : null,
      hasContext: Boolean(gl),
    }
  }))
  const metrics = await page.metrics()
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  await context.close()

  const list = [...requests.values()].filter((r) => r.url.startsWith('http'))
  const byPhase = {}
  for (const r of list) {
    const p = (byPhase[r.phase] = byPhase[r.phase] ?? { requests: 0, bytes: 0, byKind: {} })
    p.requests++
    p.bytes += r.bytes
    const kind = kindOf(r.url)
    p.byKind[kind] = (p.byKind[kind] ?? 0) + r.bytes
  }

  return {
    loadEventMs: loadMs,
    scrollHeight,
    phases: byPhase,
    // Loaded after the load event without any interaction — often 3D assets.
    lateAssets: top(list.filter((r) => r.phase === 'idle'), 15),
    // Only requested once scrolled into view — lazy loading is working for these.
    scrollTriggeredAssets: top(list.filter((r) => r.phase === 'scroll'), 15),
    heaviestAssets: top(list, 20),
    frames: { idle: idleFrames, scroll: scrollFrames },
    webgl,
    jsHeapUsedBytes: metrics.JSHeapUsedSize,
    domNodes: metrics.Nodes,
    pageErrors: errors.slice(0, 10),
  }
}

function top(list, n) {
  return [...list]
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, n)
    .map((r) => ({ url: r.url, kind: kindOf(r.url), bytes: r.bytes, phase: r.phase }))
}

async function sampleFrames(page, durationMs) {
  const deltas = await page.evaluate((ms) => new Promise((resolve) => {
    const out = []
    let last = performance.now()
    const end = last + ms
    function tick(now) {
      out.push(now - last)
      last = now
      if (now < end) requestAnimationFrame(tick)
      else resolve(out)
    }
    requestAnimationFrame(tick)
  }), durationMs)
  return frameStats(deltas)
}

async function scrollThrough(page) {
  const deltas = await page.evaluate(() => new Promise((resolve) => {
    const out = []
    let last = performance.now()
    let recording = true
    function tick(now) {
      out.push(now - last)
      last = now
      if (recording) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    const step = () => {
      const before = window.scrollY
      window.scrollBy(0, window.innerHeight * 0.8)
      if (window.scrollY === before) {
        recording = false
        resolve(out)
      } else {
        setTimeout(step, 400)
      }
    }
    setTimeout(step, 400)
  }))
  return frameStats(deltas)
}

function frameStats(deltas) {
  const d = deltas.slice(1)
  if (d.length === 0) return null
  const sorted = [...d].sort((a, b) => a - b)
  const medianMs = median(d)
  return {
    frames: d.length,
    medianFrameMs: round(medianMs),
    p95FrameMs: round(sorted[Math.floor(sorted.length * 0.95)]),
    approxFps: round(1000 / medianMs),
    longFramesOver50ms: d.filter((x) => x > 50).length,
  }
}

const round = (n) => Math.round(n * 10) / 10
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
