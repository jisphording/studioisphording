// Shared helpers for the perf snapshot scripts (scripts/perf.sh).

import { readdirSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

export function walk(dir, { skip = () => false } = {}) {
  const out = []
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry === '.DS_Store') continue
    const full = join(dir, entry)
    if (skip(full)) continue
    const stat = statSync(full)
    if (stat.isDirectory()) {
      out.push(...walk(full, { skip }))
    } else {
      out.push({ path: full, bytes: stat.size })
    }
  }
  return out
}

export function median(values) {
  const nums = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b)
  if (nums.length === 0) return null
  const mid = Math.floor(nums.length / 2)
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
}

export function formatBytes(bytes) {
  if (bytes == null) return 'n/a'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (Math.abs(value) >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

export function formatMs(ms) {
  if (ms == null) return 'n/a'
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`
}

export function gitInfo() {
  const git = (...args) => {
    try {
      return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()
    } catch {
      return null
    }
  }
  return {
    sha: git('rev-parse', '--short', 'HEAD'),
    branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
    // Ignore plan/ and perf/ churn — only source changes make a snapshot "dirty".
    dirty: Boolean(git('status', '--porcelain', '--', '.', ':!plan', ':!perf')),
  }
}

export const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'])
export const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv'])
export const MODEL_EXT = new Set(['glb', 'gltf', 'bin', 'obj', 'fbx', 'drc', 'hdr', 'exr', 'ktx2', 'basis'])

export function kindOf(path) {
  const ext = path.split('?')[0].split('.').pop().toLowerCase()
  if (IMAGE_EXT.has(ext)) return 'image'
  if (VIDEO_EXT.has(ext)) return 'video'
  if (MODEL_EXT.has(ext)) return '3d'
  if (['woff', 'woff2', 'ttf', 'otf'].includes(ext)) return 'font'
  if (ext === 'pdf') return 'pdf'
  if (['js', 'mjs'].includes(ext)) return 'script'
  if (ext === 'css') return 'stylesheet'
  return 'other'
}
