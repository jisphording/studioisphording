import * as THREE from 'three'
import { Experience } from '../../modules/Experience.mjs'

// E N V I R O N M E N T
/* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
//
// This file sets up the 3d environment and lights that are used
// in the experience.

export class Environment
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.debug = this.experience.debug

        this.setSunLight()
        this.setEnvironmentMap()
        //this.setDebug()

        console.log('Enironment Ready.')
    }

    setSunLight()
    {
        this.sunLight = new THREE.DirectionalLight( '#ffffff', 4 )
        this.sunLight.castShadow = true
        //this.sunLight.shadow.camera.far = 15
        this.sunLight.shadow.mapSize.set( 1024, 1024 )
        this.sunLight.shadow.normalBias = 0.05
        this.sunLight.position.set( 3.5, 2, -1.25 )
        this.scene.add( this.sunLight )
    }

    setEnvironmentMap()
    {
        // Setup the environment map
        this.environmentMap = {}
        this.environmentMap.intensity = 0.9575
        this.environmentMap.texture = this.resources.items.environmentMapTexture
        this.environmentMap.texture.colorSpace = THREE.SRGBColorSpace
        
        // Apply the environment map to a texture
        this.scene.environment = this.environmentMap.texture

        // Update the scene to "tell it" that the resource has been loaded and is ready
        // This may be necessary when someone visits from a slower connection.
        // So we traverse the scene to the env Material and "reapply" it's settings
        this.environmentMap.updateMaterials = () =>
        {
            this.scene.traverse(( child ) =>
            {
                if( child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial )
                {
                     child.material.envMap = this.environmentMap.texture
                     child.material.envMapIntensity = this.environmentMap.intensity
                     child.material.needsUpdate = true
                     child.castShadow = true
                     child.receiveShadow = true
                }
            })
        } 

        this.environmentMap.updateMaterials()
    }

    setDebug()
    {
        console.log(this.debug)

        if( this.debug.active )
        {
            if( this.sunLight )
            {
                // SUNLIGHT
                /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
                this.debugFolder = this.debug.ui.addFolder('sunLight')

                // Tweak sun light intensity
                this.debugFolder
                    .add(this.sunLight, 'intensity')
                    .name('intensity')
                    .min(0)
                    .max(5)
                    .step(0.001)

                // Tweak sun light position
                this.debugFolder
                    .add(this.sunLight.position, 'x')
                    .name('x')
                    .min(-5)
                    .max(5)
                    .step(0.001)

                this.debugFolder
                    .add(this.sunLight.position, 'y')
                    .name('y')
                    .min(0.25)
                    .max(5)
                    .step(0.001)

                this.debugFolder
                    .add(this.sunLight.position, 'z')
                    .name('z')
                    .min(-5)
                    .max(5)
                    .step(0.001)
            }

            if ( this.environmentMap )
            {
                // ENVIRONMENT
                /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
                this.debugFolder = this.debug.ui.addFolder( 'environment' )

                // Tweak environment map intensity
                this.debugFolder
                    .add( this.environmentMap, 'intensity' )
                    .name( 'envMapIntensity' )
                    .min( 0 )
                    .max( 4 )
                    .step( 0.001 )
                    .onChange( this.environmentMap.updateMaterials )
            }
        }
    }
}