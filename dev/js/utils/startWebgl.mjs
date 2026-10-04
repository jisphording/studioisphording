// ---------- ---------- ---------- ---------- ---------- //
// S T A R T   W E B G L //
// ---------- ---------- ---------- ---------- ---------- //
//
// Starts the Three.js Experience only on pages that render a #webgl canvas
// naming a world. The experience (and with it the vendor-three chunk) is a
// dynamic import, so every other route never downloads Three.js.
//
// Barba swaps pages without reloading, so the running experience is kept here
// with the stop handle runExperience returns: stopWebgl() tears it down when a
// WebGL page is left, and startWebgl() runs it for the next page's canvas.

const loadExperience = () => import('../three/runExperience.js')

// { canvas, stop, stopped } of the experience started last, or null
let current = null

/**
 * @param {Document|Element} [root] - where to look for the #webgl canvas (the
 *   document, or the container Barba swapped in)
 * @param {() => Promise<{ runExperience: Function }>} [load] - experience loader (injectable for tests)
 * @returns {Promise<boolean>} whether the experience is running for that canvas
 */
export async function startWebgl( root = document, load = loadExperience ) {
  const webglCanvas = root.querySelector( '#webgl' )
  if ( !webglCanvas || !webglCanvas.dataset.world ) return false

  // Already started for this canvas (initial load and Barba's first afterEnter)
  if ( current && current.canvas === webglCanvas ) return true

  stopWebgl()
  const run = { canvas: webglCanvas, stop: null, stopped: false }
  current = run

  try {
    const { runExperience } = await load()
    // stopWebgl() ran while the chunk was loading: the page is gone
    if ( run.stopped ) return false
    run.stop = runExperience( '#webgl', webglCanvas.dataset.world ) ?? null
    return true
  } catch ( error ) {
    if ( current === run ) current = null
    console.error( 'Failed to load the WebGL experience:', error )
    return false
  }
}

/**
 * Tear down the running experience, if any. Safe to call when none runs.
 *
 * @returns {boolean} whether an experience was stopped
 */
export function stopWebgl() {
  const run = current
  if ( !run ) return false

  current = null
  run.stopped = true
  if ( run.stop ) run.stop()
  return true
}
