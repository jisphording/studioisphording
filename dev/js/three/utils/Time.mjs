// ---------- ---------- ---------- ---------- ---------- //
// T I M E //
// ---------- ---------- ---------- ---------- ---------- //
//
// Handling timing of the experience.
// This is a custom class that allows me to get a little bit more specific than
// the Clock class available in Three accounts for.

import EventEmitter from './EventEmitter.mjs'

export class Time extends EventEmitter
{
    constructor()
    {
        super()

        // SETUP
        this.start = Date.now()
        this.current = this.start
        this.elapsed = 0
        // On a typical 60Hz monitor the delta between two frames is roughly 16ms.
        // This is the reason for this default delta value.
        this.delta = 16 

        // START ANIMATION LOOP
        window.requestAnimationFrame(() =>
        {
            this.tick()
        })
    }

    tick()
    {
        // SETUP
        
        // Get the current time
        const currentTime = Date.now()        
        // Calculate Delta. 
        // How long since the last frame?
        this.delta = currentTime - this.current
        this.current = currentTime
        // How long since the experience was started?
        this.elapsed = this.current - this.start
        // Elapsed Seconds
        this.elapsed = this.elapsed / 1000

        // NOTIFY EXPERIENCE
        this.trigger( 'tick' )

        window.requestAnimationFrame(() =>
        {
            this.tick()
        })
    }
}