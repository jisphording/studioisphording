// Source-code size per area — a rough "is this easier to navigate?" signal
// for housekeeping refactors (fewer giant files, less total code).

import { readFileSync } from 'node:fs'
import { relative, join } from 'node:path'
import { repoRoot, walk } from './util.mjs'

const AREAS = {
  'dev/js': ['.js', '.mjs'],
  'dev/css': ['.scss', '.css'],
  'app/site/templates': ['.php'],
  'app/site/snippets': ['.php'],
  'app/site/plugins': ['.php', '.js'],
  'app/site/config': ['.php'],
  scripts: ['.sh', '.mjs', '.js', '.py'],
}

export function collectCodeStats({ largest = 15 } = {}) {
  const areas = {}
  const allFiles = []

  for (const [area, exts] of Object.entries(AREAS)) {
    const files = walk(join(repoRoot, area), {
      // scripts/perf is measurement tooling, not app code — keep it out of the totals.
      skip: (p) => p.includes('node_modules') || p.includes('/libs/') || p.endsWith('scripts/perf'),
    }).filter((f) => exts.some((ext) => f.path.endsWith(ext)))
      // config.localhost.php etc. are machine-local, not part of the codebase
      .filter((f) => !/config\.(localhost|127\.0\.0\.1)\.php$/.test(f.path))

    let lines = 0
    for (const f of files) {
      const count = readFileSync(f.path, 'utf8').split('\n').length
      lines += count
      allFiles.push({ file: relative(repoRoot, f.path), lines: count })
    }
    areas[area] = { files: files.length, lines }
  }

  const totals = Object.values(areas).reduce(
    (acc, a) => ({ files: acc.files + a.files, lines: acc.lines + a.lines }),
    { files: 0, lines: 0 },
  )

  return {
    areas,
    totals,
    largestFiles: allFiles.sort((a, b) => b.lines - a.lines).slice(0, largest),
  }
}
