// Static audit of the media each rendered page references in its HTML:
// <img>, <video>/<source> and preload links, with byte sizes and heuristic
// flags (missing lazy loading, autoplaying videos, unsized images, ...).
// Complements Lighthouse, which only sees what loads during one page load.

import { statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { repoRoot, kindOf } from './util.mjs'

const TAG_ATTRS = '((?:[^>"\']|"[^"]*"|\'[^\']*\')*)'

export function parseAttrs(raw) {
  const attrs = {}
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
  let m
  while ((m = re.exec(raw))) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ''
  }
  return attrs
}

export function parseSrcset(srcset) {
  if (!srcset) return []
  return srcset.split(',').map((s) => s.trim()).filter(Boolean).map((candidate) => {
    const [url, descriptor = ''] = candidate.split(/\s+/)
    return { url, width: parseInt(descriptor, 10) || null }
  })
}

// Resolve a served URL to its file on disk (static trees and generated Kirby
// thumbs); php -S sends no Content-Length on HEAD, so disk is the reliable source.
function localPathFor(pathname) {
  const decoded = decodeURIComponent(pathname)
  for (const prefix of ['/media/', '/assets/', '/video/']) {
    if (decoded.startsWith(prefix)) return join(repoRoot, 'app', decoded)
  }
  return null
}

async function sizeOf(url, baseUrl) {
  const absolute = new URL(url, baseUrl)
  const local = localPathFor(absolute.pathname)
  if (local && existsSync(local)) return statSync(local).size
  // Not on disk yet (e.g. a Kirby thumb generated on first request): ask the server.
  try {
    const res = await fetch(absolute, { headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(30000) })
    const range = res.headers.get('content-range')
    await res.body?.cancel()
    if (range) return Number(range.split('/').pop())
    const length = res.headers.get('content-length')
    return length ? Number(length) : null
  } catch {
    return null
  }
}

export async function discoverPages(baseUrl, lang) {
  const seeds = [`/${lang}`, `/${lang}/projects`]
  const found = new Set(seeds)
  const origin = new URL(baseUrl).origin
  for (const seed of seeds) {
    const html = await (await fetch(`${baseUrl}${seed}`)).text()
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      const url = new URL(href, `${baseUrl}${seed}`)
      if (url.origin !== origin) continue
      if (!url.pathname.startsWith(`/${lang}/`)) continue
      if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) continue
      found.add(url.pathname.replace(/\/$/, ''))
    }
  }
  return [...found].sort()
}

export async function scanPageMedia(baseUrl, path) {
  const html = await (await fetch(`${baseUrl}${path}`)).text()
  const items = []

  for (const m of html.matchAll(new RegExp(`<video\\b${TAG_ATTRS}>([\\s\\S]*?)</video>`, 'gi'))) {
    const attrs = parseAttrs(m[1])
    const sources = [...m[2].matchAll(new RegExp(`<source\\b${TAG_ATTRS}>`, 'gi'))]
      .map((s) => parseAttrs(s[1]))
      .filter((s) => s.src)
    const sized = []
    for (const s of sources) {
      sized.push({ url: s.src, type: s.type || null, bytes: await sizeOf(s.src, baseUrl) })
    }
    // The browser plays the first source it supports; Chrome supports all of these.
    const played = sized[0] ?? (attrs.src ? { url: attrs.src, bytes: await sizeOf(attrs.src, baseUrl) } : null)
    items.push({
      tag: 'video',
      pos: m.index,
      url: played?.url ?? null,
      bytes: played?.bytes ?? null,
      sources: sized,
      poster: attrs.poster || null,
      attrs: pick(attrs, ['autoplay', 'preload', 'muted', 'loop', 'playsinline', 'class']),
    })
  }

  for (const m of html.matchAll(new RegExp(`<img\\b${TAG_ATTRS}>`, 'gi'))) {
    const attrs = parseAttrs(m[1])
    const src = attrs.src || attrs['data-src']
    if (!src) continue
    const candidates = parseSrcset(attrs.srcset || attrs['data-srcset'])
    const largest = candidates.reduce((a, c) => ((c.width ?? 0) > (a?.width ?? 0) ? c : a), null)
    items.push({
      tag: 'img',
      pos: m.index,
      url: src,
      bytes: await sizeOf(src, baseUrl),
      srcsetCount: candidates.length,
      largestCandidate: largest ? { url: largest.url, width: largest.width, bytes: await sizeOf(largest.url, baseUrl) } : null,
      attrs: pick(attrs, ['loading', 'decoding', 'fetchpriority', 'width', 'height', 'sizes']),
    })
  }

  // Flags depend on document order across images and videos together.
  items.sort((a, b) => a.pos - b.pos)
  items.forEach((item, index) => {
    delete item.pos
    item.index = index
    item.flags = item.tag === 'video' ? videoFlags(item, index) : imageFlags(item, index)
  })

  for (const m of html.matchAll(new RegExp(`<link\\b${TAG_ATTRS}>`, 'gi'))) {
    const attrs = parseAttrs(m[1])
    if (!['preload', 'modulepreload'].includes(attrs.rel)) continue
    items.push({
      tag: 'link',
      url: attrs.href,
      bytes: await sizeOf(attrs.href, baseUrl),
      attrs: pick(attrs, ['rel', 'as', 'type']),
      kind: kindOf(attrs.href),
      flags: [],
    })
  }

  const media = items.filter((i) => i.tag !== 'link')
  const sum = (list) => list.reduce((acc, i) => acc + (i.bytes ?? 0), 0)
  return {
    html: html.length,
    // 3D assets referenced straight from markup (e.g. data attributes); most
    // scenes load them from JS, which the browser probe catches instead.
    inlineModelRefs: [...new Set([...html.matchAll(/["'(]([^"'()\s]+\.(?:glb|gltf|hdr|ktx2|drc))["')]/gi)].map((m) => m[1]))],
    totals: {
      images: items.filter((i) => i.tag === 'img').length,
      videos: items.filter((i) => i.tag === 'video').length,
      imageBytes: sum(items.filter((i) => i.tag === 'img')),
      videoBytes: sum(items.filter((i) => i.tag === 'video')),
      flaggedItems: media.filter((i) => i.flags.length).length,
    },
    items,
  }
}

export function videoFlags(v, index) {
  const flags = []
  if ('autoplay' in v.attrs) flags.push(index === 0 ? 'autoplay-downloads-eagerly' : 'offscreen-autoplay-candidate')
  if (!v.poster) flags.push('no-poster')
  if (!('preload' in v.attrs) && !('autoplay' in v.attrs)) flags.push('no-preload-attr')
  if (v.bytes > 5 * 1024 ** 2) flags.push('heavy-video>5MB')
  return flags
}

export function imageFlags(img, index) {
  const flags = []
  const ext = img.url.split('?')[0].split('.').pop().toLowerCase()
  // Heuristic: the first two media elements are treated as potentially above the fold.
  if (img.attrs.loading !== 'lazy' && index >= 2) flags.push('eager-below-fold-candidate')
  if (img.attrs.loading === 'lazy' && index === 0) flags.push('lazy-first-media-lcp-risk')
  if (!img.attrs.width || !img.attrs.height) flags.push('unsized-cls-risk')
  if (img.srcsetCount === 0) flags.push('no-srcset')
  if (img.srcsetCount > 6) flags.push(`many-srcset-candidates(${img.srcsetCount})`)
  if (img.largestCandidate?.bytes > 1024 ** 2) flags.push('largest-candidate>1MB')
  if (['jpg', 'jpeg', 'png'].includes(ext)) flags.push('legacy-format')
  if (img.bytes > 300 * 1024) flags.push('src>300KB')
  return flags
}

function pick(obj, keys) {
  const out = {}
  for (const k of keys) if (k in obj) out[k] = obj[k] === '' ? true : obj[k]
  return out
}
