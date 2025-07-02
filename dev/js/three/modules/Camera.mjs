// ---------- ---------- ---------- ---------- ---------- //
// C A M E R A //
// ---------- ---------- ---------- ---------- ---------- //

// Import external libraries
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// Import modules
import { Experience } from './Experience.mjs'

export class Camera
{
    constructor()
    {
        // SETUP
        // Here we connect everything with the data of the experience.
        this.experience = new Experience()
        // But do I really need the following three?
        // Seems to me like doppelt hält besser.
        this.sizes = this.experience.sizes
        this.scene = this.experience.scene
        this.canvas = this.experience.canvas

        this.setInstance()
        this.setOrbitControls()
    }

    // S E T   C A M E R A   I N S T A N C E
	/* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */

    setInstance()
    {
        // SETUP
        this.instance = new THREE.PerspectiveCamera(
            10,
            this.sizes.width / this.sizes.height,
            0.1,
            1000
        )

        this.instance.position.set( 0, 0, 50 )
        this.scene.add( this.instance )
    }

    // S E T   O R B I T   C O N T R O L S
    /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
    
    setOrbitControls()
    {
        this.controls = new OrbitControls( this.instance, this.canvas )
        this.controls.enableDamping = true
        this.controls.minDistance = 8
        this.controls.maxDistance = 20
    }

    // R E S I Z E
    /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
    
    resize()
    {
        this.instance.aspect = this.sizes.width / this.sizes.height
        this.instance.updateProjectionMatrix()
    }

    // U P D A T E
    /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
    
    update()
    {
        this.controls.update()
    }
}
