// ---------- ---------- ---------- ---------- ---------- //
// W O R L D S //
// ---------- ---------- ---------- ---------- ---------- //
//
// Registry of the worlds the Experience can run, keyed by the name
// runExperience() is called with. Adding a world is one entry here.
//
//   load    - lazy import of the world's chunk (projects/<world>/index.mjs),
//             which exports { World, sources }; each world is its own chunk
//   mode    - Resources loading mode: 'batch' | 'progressive'
//   name    - Resources' worldName
//
// Nothing here imports three or a world eagerly, so only the world a page
// actually renders is downloaded.

export const worlds = {
  World_01: { load: () => import('./projects/isphording-inneneinrichtung/index.mjs'), mode: 'batch', name: 'isphording-inneneinrichtung' },
  World_02: { load: () => import('./projects/moodboard/index.mjs'), mode: 'progressive', name: 'moodboard' }
}

/**
 * Resolve a registered world name to { World, sources, mode, name }, or null
 * (with one console.error naming the registered worlds) when it is unknown.
 *
 * @param {string} key - registry name, e.g. 'World_01'
 * @returns {Promise<{ World: Function, sources: Array, mode: string, name: string } | null>}
 */
export async function loadWorld( key ) {
  const entry = Object.hasOwn( worlds, key ) ? worlds[ key ] : null

  if ( !entry ) {
    console.error( `Experience: unknown world "${ key }". Registered worlds: ${ Object.keys( worlds ).join( ', ' ) }` )
    return null
  }

  const { World, sources } = await entry.load()
  return { World, sources, mode: entry.mode, name: entry.name }
}
