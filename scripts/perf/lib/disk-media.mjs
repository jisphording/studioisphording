// Inventory of heavy media on disk (read-only): the largest source files,
// totals per tree and per kind, and whether this run actually saw each file
// requested — "not seen" files are candidates for cleanup or lazy loading.

import { relative, join, basename, dirname } from 'node:path'
import { repoRoot, walk, kindOf } from './util.mjs'

const TREES = ['app/content', 'app/video', 'app/assets/three', 'app/assets/pdf', 'app/assets/fonts']
const GENERATED_TREES = ['app/media']

// Kirby thumbs are named <stem>-<w>x<h>-q<nn>.<ext>; strip that to match originals.
export function stemOf(url) {
  const name = basename(decodeURIComponent(url.split('?')[0]))
  return name.replace(/\.[a-z0-9]+$/i, '').replace(/-\d+x\d*(-q\d+)?$/i, '').toLowerCase()
}

// Stem plus extension, so x.gif is not "seen" just because x.mp4 was requested.
export function fileKey(url) {
  const ext = basename(url.split('?')[0]).split('.').pop().toLowerCase()
  return `${stemOf(url)}.${ext}`
}

export function collectDiskMedia({ minBytes = 1024 ** 2, top = 40, seenUrls = [] } = {}) {
  const seen = new Set(seenUrls.map(fileKey))
  const trees = {}
  const byKind = {}
  const heavy = []

  for (const tree of TREES) {
    const files = walk(join(repoRoot, tree)).filter((f) => !f.path.endsWith('.md') && !f.path.endsWith('.txt'))
    trees[tree] = { files: files.length, bytes: files.reduce((a, f) => a + f.bytes, 0) }

    // Same stem in several formats in one folder (e.g. x.jpg + x.webp).
    const formatsByStem = new Map()
    for (const f of files) {
      const key = join(dirname(f.path), stemOf(f.path))
      formatsByStem.set(key, [...(formatsByStem.get(key) ?? []), f.path.split('.').pop().toLowerCase()])
    }

    for (const f of files) {
      const kind = kindOf(f.path)
      byKind[kind] = byKind[kind] ?? { files: 0, bytes: 0 }
      byKind[kind].files++
      byKind[kind].bytes += f.bytes
      if (f.bytes < minBytes) continue
      heavy.push({
        file: relative(repoRoot, f.path),
        bytes: f.bytes,
        kind,
        formats: formatsByStem.get(join(dirname(f.path), stemOf(f.path))),
        page: pageFor(f.path),
        seenThisRun: seen.has(fileKey(f.path)),
      })
    }
  }

  for (const tree of GENERATED_TREES) {
    const files = walk(join(repoRoot, tree))
    trees[`${tree} (generated thumbs)`] = { files: files.length, bytes: files.reduce((a, f) => a + f.bytes, 0) }
  }

  heavy.sort((a, b) => b.bytes - a.bytes)
  return { minBytes, trees, byKind, heavyFiles: heavy.slice(0, top), heavyFileCount: heavy.length }
}

// app/content/projects/01-foo/x.jpg -> /projects/01-foo (Kirby drops a "<num>_" prefix).
function pageFor(path) {
  const rel = relative(join(repoRoot, 'app/content'), dirname(path))
  if (rel.startsWith('..')) return null
  return '/' + rel.split('/').map((seg) => seg.replace(/^\d+_/, '')).join('/')
}
