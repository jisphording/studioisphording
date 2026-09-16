// Built Vite bundle size: raw, gzip and brotli per file. Source maps are
// counted separately because browsers never download them.

import { readFileSync } from 'node:fs'
import { relative, join } from 'node:path'
import { gzipSync, brotliCompressSync } from 'node:zlib'
import { repoRoot, walk } from './util.mjs'

export function collectBundleStats() {
  const dir = join(repoRoot, 'app/assets/bundle')
  const files = []
  let mapBytes = 0

  for (const f of walk(dir)) {
    if (f.path.endsWith('.map')) {
      mapBytes += f.bytes
      continue
    }
    const buf = readFileSync(f.path)
    files.push({
      file: relative(dir, f.path),
      bytes: f.bytes,
      gzip: gzipSync(buf, { level: 9 }).length,
      brotli: brotliCompressSync(buf).length,
    })
  }

  files.sort((a, b) => b.bytes - a.bytes)
  const sum = (key) => files.reduce((acc, f) => acc + f[key], 0)
  const byExt = (ext) => files.filter((f) => f.file.endsWith(ext))

  return {
    totals: {
      files: files.length,
      bytes: sum('bytes'),
      gzip: sum('gzip'),
      brotli: sum('brotli'),
      jsBytes: byExt('.js').reduce((a, f) => a + f.bytes, 0),
      cssBytes: byExt('.css').reduce((a, f) => a + f.bytes, 0),
      sourceMapBytes: mapBytes,
    },
    files,
  }
}
