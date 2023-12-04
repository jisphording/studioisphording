// ---------- ---------- ---------- ---------- ---------- //
// R E N D E R E R //
// ---------- ---------- ---------- ---------- ---------- //

// Import external libraries
import * as THREE from 'three'
import { Color } from 'three'
// import * as dat from 'dat.gui'
// import gsap from 'gsap'

// Import modules
import { Experience } from './Experience.mjs'

export class Renderer
{
    constructor( clearColor )
    {
        // SETUP
        // Here we connect everything with the data of the experience.
        this.experience = new Experience()
        // But do I really need the following three?
        // Seems to me like doppelt hält besser.
        this.sizes = this.experience.sizes
        this.scene = this.experience.scene
        this.canvas = this.experience.canvas
        this.camera = this.experience.camera
        this.clearColor = new THREE.Color( clearColor )

        this.setInstance()
    }

    // S E T   R E N D E R E R   I N S T A N C E
	/* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */

    setInstance()
    {
        this.instance = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        })

        this.instance.setSize( this.sizes.width, this.sizes.height )
        this.instance.setPixelRatio( this.sizes.pixelRatio )
        this.instance.setClearColor( this.clearColor )
    }

    // R E S I Z E
    /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
    
    resize()
    {
        this.instance.setSize( this.sizes.width, this.sizes.height )
        this.instance.setPixelRatio( this.sizes.pixelRatio )
    }

    // U P D A T E
    /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
    
    update()
    {
        this.instance.render( this.scene, this.camera.instance )
    }
}