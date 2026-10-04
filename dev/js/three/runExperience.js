// ---------- ---------- ---------- ---------- ---------- //
// R U N   E X P E R I E N C E //
// ---------- ---------- ---------- ---------- ---------- //
//
// This file is used to integrate the Three.js Experience on the portfolio itselft after Page load.
// Everything regarding that integration happens here.
//
// Everything regarding the Experience itself is only concerned with Three.js and self contained in
// The Experience.mjs File and below.  
//

import { Experience } from './modules/Experience.mjs'

/**
 * Initializes and runs the Three.js experience on a specified canvas.
 * It selects the canvas element, sets up the world, and defines the clear color for the renderer.
 * If no clear color is provided, it defaults to 0xf5f4ee.
 *
 * @param {string} canvas - The CSS selector for the canvas element (e.g., '#webgl').
 * @param {string} world - The identifier for the specific 3D world to be loaded (e.g., 'World_01').
 * @param {number} [clearColor] - The hexadecimal color value for clearing the renderer's output.
 * @returns {(() => void) | null} stop - tears the experience down (null when no canvas matched)
 */
export function runExperience( canvas, world, clearColor ) {

    let _canvas = document.querySelector( canvas )
    let _world = world
    let _clearColor = clearColor

    if ( clearColor == undefined ) {
        _clearColor = 0xf5f4ee
    } else {
        _clearColor = clearColor
    }

    if ( import.meta.env.DEV ) console.log( 'runExperience in ' + canvas + ' ' + _world + ' ' + '0x_' + _clearColor )

    if ( !_canvas ) return null

    const experience = new Experience( _canvas, _world, _clearColor )
    return () => experience.destroy()
}

/**
 * Event listener that ensures the Three.js experience starts only after the entire HTML document
 * has been completely loaded and parsed. It calls `runExperience` with the default canvas and world.
 */
