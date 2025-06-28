// ---------- ---------- ---------- ---------- ---------- //
// S I Z E S //
// ---------- ---------- ---------- ---------- ---------- //
//
// Handling the resizing of the threejs canvas.

import EventEmitter from './EventEmitter.mjs'

export class Sizes extends EventEmitter
{
    constructor( canvas )
    {
        super()

        // SETUP
        this.width = canvas.offsetWidth
        this.height = canvas.offsetHeight
        
        // Limiting the pixel ratio for performance reasons
        this.pixelRatio = Math.min( window.devicePixelRatio, 2 )

        // RESIZE EVENT
        window.addEventListener( 'resize', () =>
        {
            this.width = canvas.parentNode.offsetWidth
            this.height = canvas.parentNode.offsetHeight
            this.pixelRatio = Math.min( window.devicePixelRatio, 2 )

            // NOTIFY EXPERIENCE
            this.trigger( 'resize' )
        }, { passive: true })
    }
}
