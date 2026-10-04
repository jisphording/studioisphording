// Master discovery: walk app/content for image masters.
//
// Strictly read-only — this module imports no write API from node:fs, and
// the discoverMasters tests in tests/js/media/encode-images.test.mjs cover it. Returns content-relative
// paths (forward slashes, no leading slash), the keys the manifest uses.

import { readdir } from 'node:fs/promises'
import { join, posix } from 'node:path'

export const MASTER_EXTENSIONS = ['.jpg', '.jpeg', '.png']

// Video masters. A sibling .webm is an old hand-made derivative, not a master.
export const VIDEO_MASTER_EXTENSIONS = ['.mp4', '.mov']

/**
 * @param {string} contentRoot absolute path of app/content
 * @param {object} [options]
 * @param {string} [options.prefix] only masters whose content path starts with this
 * @param {string[]} [options.extensions] master extensions to match (default: image masters)
 * @returns {Promise<string[]>} sorted content-relative master paths
 */
export const discoverMasters = async (contentRoot, { prefix = '', extensions = MASTER_EXTENSIONS } = {}) => {
  const found = []

  const walk = async (relDir) => {
    const entries = await readdir(join(contentRoot, relDir), { withFileTypes: true })
    for (const entry of entries) {
      const rel = relDir === '' ? entry.name : posix.join(relDir, entry.name)
      if (entry.isDirectory()) {
        await walk(rel)
      } else if (
        entry.isFile() &&
        extensions.includes(posix.extname(entry.name).toLowerCase()) &&
        rel.startsWith(prefix)
      ) {
        found.push(rel)
      }
    }
  }

  await walk('')
  return found.sort()
}
