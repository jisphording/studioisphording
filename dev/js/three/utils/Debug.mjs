import * as dat from 'dat.gui'

// ---------- ---------- ---------- ---------- ---------- //
// D E B U G //
// ---------- ---------- ---------- ---------- ---------- //
//
// Utility Class that manages debugging

export class Debug
{
    constructor()
    {
        // Make debug available on site with a hash behind domain name
        this.active = window.location.hash === '#debug'

        if( this.active )
        {
            this.ui = new dat.GUI({ width: 400 })
        }
    }
}