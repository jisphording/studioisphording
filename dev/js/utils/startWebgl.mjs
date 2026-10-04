// ---------- ---------- ---------- ---------- ---------- //
// S T A R T   W E B G L //
// ---------- ---------- ---------- ---------- ---------- //
//
// Starts the Three.js Experience only on pages that render a #webgl canvas
// naming a world. The experience (and with it the vendor-three chunk) is a
// dynamic import, so every other route never downloads Three.js.

const loadExperience = () => import('../three/runExperience.js')

/**
 * @param {Document} [doc] - document to look for the #webgl canvas in
 * @param {() => Promise<{ runExperience: Function }>} [load] - experience loader (injectable for tests)
 * @returns {Promise<boolean>} whether the experience was started
 */
export async function startWebgl( doc = document, load = loadExperience ) {
  const webglCanvas = doc.querySelector( '#webgl' )
  if ( !webglCanvas || !webglCanvas.dataset.world ) return false

  try {
    const { runExperience } = await load()
    runExperience( '#webgl', webglCanvas.dataset.world )
    return true
  } catch ( error ) {
    console.error( 'Failed to load the WebGL experience:', error )
    return false
  }
}
