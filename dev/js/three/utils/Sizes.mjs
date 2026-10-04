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
        // Named so destroy() can remove it again.
        this.onResize = () =>
        {
            this.width = canvas.parentNode.offsetWidth
            this.height = canvas.parentNode.offsetHeight
            this.pixelRatio = Math.min( window.devicePixelRatio, 2 )

            // NOTIFY EXPERIENCE
            this.trigger( 'resize' )
        }
        window.addEventListener( 'resize', this.onResize, { passive: true })
    }

    // D E S T R O Y
    // Stop listening to window resizes. Safe to call more than once.
    destroy()
    {
        if ( !this.onResize ) return

        window.removeEventListener( 'resize', this.onResize )
        this.onResize = null
    }
}
