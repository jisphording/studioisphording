// Orphan pruner: lists (and, on request, deletes) files under the media root
// that the manifest no longer references.
//
// Derivative names are content-hashed, so a changed master, width, format or
// encoder setting leaves the old file behind and it keeps shipping through the
// deploy's rsync mirror. The manifest is the source of truth for what is live:
// image variants, video variants and the poster images videos point at (those
// are `images` entries) all carry a `url`.
//
// Safety: planning never deletes. It refuses without a readable manifest that
// references at least one file, so an aborted or empty run can never wipe the
// tree. Only regular files strictly inside the media root are ever listed;
// symlinks are not followed.

import { lstat, readdir, rm, rmdir } from 'node:fs/promises'
import { join, posix, sep } from 'node:path'
import { readManifest } from './manifest.mjs'
import { MANIFEST_NAME, MEDIA_DIR } from './paths.mjs'

const URL_PREFIX = `${MEDIA_DIR}/`

/** Media-root-relative path for a manifest url, or throws if it escapes the root. */
const relativeFromUrl = (url) => {
  if (typeof url !== 'string' || !url.startsWith(URL_PREFIX)) {
    throw new Error(`prune: manifest url ${JSON.stringify(url)} is outside ${URL_PREFIX}.`)
  }
  const relative = posix.normalize(url.slice(URL_PREFIX.length))
  if (relative.startsWith('..') || posix.isAbsolute(relative) || relative === '.') {
    throw new Error(`prune: manifest url ${JSON.stringify(url)} is outside ${URL_PREFIX}.`)
  }
  return relative
}

/** Every media-root-relative path (forward slashes) a manifest references, plus manifest.json. */
export const referencedPaths = (manifest) => {
  const paths = new Set([MANIFEST_NAME])
  for (const group of [manifest?.images, manifest?.videos]) {
    for (const entry of Object.values(group ?? {})) {
      for (const variant of entry?.variants ?? []) paths.add(relativeFromUrl(variant.url))
    }
  }
  return paths
}

const walk = async (dir, base = '') => {
  const files = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = base === '' ? entry.name : `${base}/${entry.name}`
    // Dirent types do not follow symlinks, so a link is neither dir nor file here.
    if (entry.isDirectory()) files.push(...(await walk(join(dir, entry.name), relative)))
    else if (entry.isFile()) files.push(relative)
  }
  return files
}

/**
 * @returns {Promise<{orphans: {path: string, bytes: number}[], bytes: number, kept: number}>}
 * @throws when the manifest is missing, unparseable or references nothing
 */
export const planPrune = async (mediaRoot) => {
  let manifest
  try {
    manifest = await readManifest(mediaRoot)
  } catch (error) {
    throw new Error(`prune: manifest.json is unreadable (${error.message}); nothing was deleted.`)
  }
  if (manifest === null) {
    throw new Error(`prune: ${MANIFEST_NAME} is missing from ${mediaRoot}; refusing to run, nothing was deleted.`)
  }

  const referenced = referencedPaths(manifest)
  if (referenced.size <= 1) {
    throw new Error('prune: the manifest references no files; refusing to run, nothing was deleted.')
  }

  const orphans = []
  let kept = 0
  for (const path of (await walk(mediaRoot)).sort()) {
    if (referenced.has(path)) {
      kept += 1
      continue
    }
    orphans.push({ path, bytes: (await lstat(join(mediaRoot, path))).size })
  }

  return { orphans, bytes: orphans.reduce((sum, o) => sum + o.bytes, 0), kept }
}

/** Delete a plan's orphans, then any directories that deletion left empty (never the root). */
export const applyPrune = async (mediaRoot, plan) => {
  const dirs = new Set()
  for (const { path } of plan.orphans) {
    await rm(join(mediaRoot, path), { force: true })
    for (let dir = posix.dirname(path); dir !== '.'; dir = posix.dirname(dir)) dirs.add(dir)
  }
  // Deepest first, so a parent is only tried once its children are gone.
  for (const dir of [...dirs].sort((a, b) => b.split('/').length - a.split('/').length)) {
    try {
      await rmdir(join(mediaRoot, dir.split('/').join(sep)))
    } catch (error) {
      if (error.code !== 'ENOTEMPTY' && error.code !== 'ENOENT') throw error
    }
  }
  return { deleted: plan.orphans.length, bytes: plan.bytes }
}
