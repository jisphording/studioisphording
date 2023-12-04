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

export function runExperience( canvas, world, clearColor ) {

    let _canvas = document.querySelector( canvas )
    let _world = world
    let _clearColor = clearColor

    if ( clearColor == undefined ) {
        _clearColor = 0x0f0e0e
    } else {
        _clearColor = clearColor
    }

    console.log( 'runExperience in ' + canvas + ' ' + _world + ' ' + '0x_' + _clearColor )

    if ( _canvas ) {
        new Experience( _canvas, _world, _clearColor )
    }
}

// Run Everything
window.addEventListener( "DOMContentLoaded", ( event ) => {
    runExperience( '#webgl', 'World_01' )
});