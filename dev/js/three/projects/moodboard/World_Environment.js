import * as THREE from 'three'
import { Experience } from '../../modules/Experience.mjs'

// E N V I R O N M E N T
/* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
//
// This file sets up a basic, flat-lighted 3D environment for viewing images.

export class Environment
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene

        this.setAmbientLight()

        console.log('Moodboard Environment Ready.')
    }

    setAmbientLight()
    {
        this.ambientLight = new THREE.AmbientLight( '#ffffff', 1.0 ) // White light, full intensity
        this.scene.add( this.ambientLight )
    }
}
