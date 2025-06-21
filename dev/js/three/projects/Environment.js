import * as THREE from 'three'
import { Experience } from '../modules/Experience.mjs'

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

        // this.setTestSetup()
        this.setSunLightA()
        //this.setSunLightB()
        this.setEnvironmentMap()
        //this.setFloor()
        //this.setDebug()

        console.log('Enironment Ready.')
    }

    setMoonLight()
    {
        this.moonLight = new THREE.DirectionalLight( '#b9d5ff', 0.25 )
        this.moonLight.castShadow = true
        this.moonLight.shadow.camera.far = 15
        this.moonLight.shadow.mapSize.set( 1024, 1024 )
        this.moonLight.shadow.normalBias = 0.05
        this.moonLight.position.set( 4, 5, -2 )
        this.scene.add( this.moonLight )
    }

    setSunLightA()
    {
        this.sunLightA = new THREE.DirectionalLight( '#ffffff', 4 )
        this.sunLightA.castShadow = true
        //this.sunLightA.shadow.camera.far = 15
        this.sunLightA.shadow.mapSize.set( 1024, 1024 )
        this.sunLightA.shadow.normalBias = 0.05
        this.sunLightA.position.set( 3.5, 2, -1.25 )
        this.scene.add( this.sunLightA )
    }

    setSunLightB()
    {
        this.sunLightB = new THREE.DirectionalLight( '#ffffff', 3 )
        this.sunLightB.position.set( 0.25, 3, -2.25 )
        this.sunLightB.castShadow = true
        this.sunLightB.shadow.camera.far = 7
        this.sunLightB.shadow.normalBias = 0.05
        this.sunLightB.shadow.mapSize.set( 1024, 1024 )

        this.scene.add( this.sunLightB )
    }

    // A setup to test/develop new light setups
    setTestSetup()
    {
        const testSphere = new THREE.Mesh(
            new THREE.SphereBufferGeometry( 1, 32, 32),
            new THREE.MeshStandardMaterial()
        )

        this.scene.add( testSphere )
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
            if( this.sunLightA )
            {
                // SUNLIGHT A
                /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
                this.debugFolder = this.debug.ui.addFolder('sunLightA')

                // Tweak sun light intensity
                this.debugFolder
                    .add(this.sunLightA, 'intensity')
                    .name('intensity')
                    .min(0)
                    .max(5)
                    .step(0.001)

                // Tweak sun light position
                this.debugFolder
                    .add(this.sunLightA.position, 'x')
                    .name('x')
                    .min(-5)
                    .max(5)
                    .step(0.001)

                this.debugFolder
                    .add(this.sunLightA.position, 'y')
                    .name('y')
                    .min(0.25)
                    .max(5)
                    .step(0.001)

                this.debugFolder
                    .add(this.sunLightA.position, 'z')
                    .name('z')
                    .min(-5)
                    .max(5)
                    .step(0.001)
            }

            if( this.sunLightB )
            {
                // SUNLIGHT B
                /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
                this.debugFolder = this.debug.ui.addFolder('sunLightB')

                // Shadow Helper
                const sunLightBCameraHelper = new THREE.CameraHelper( this.sunLightB.shadow.camera )
                this.scene.add( sunLightBCameraHelper )

                // Tweak sun light intensity
                this.debugFolder
                    .add(this.sunLightB, 'intensity')
                    .name('intensity')
                    .min(0)
                    .max(5)
                    .step(0.001)

                // Tweak sun light position
                this.debugFolder
                    .add(this.sunLightB.position, 'x')
                    .name('x')
                    .min(-5)
                    .max(5)
                    .step(0.001)

                this.debugFolder
                    .add(this.sunLightB.position, 'y')
                    .name('y')
                    .min(0.25)
                    .max(5)
                    .step(0.001)

                this.debugFolder
                    .add(this.sunLightB.position, 'z')
                    .name('z')
                    .min(-5)
                    .max(5)
                    .step(0.001)
            }

            if( this.moonLight )
            {
                // MOONLIGHT
                /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
                this.debugFolder = this.debug.ui.addFolder('moonLight')

                // Tweak moon light intensity
                this.debugFolder
                    .add(this.moonLight, 'intensity')
                    .name('moonLightIntensity')
                    .min(0)
                    .max(1)
                    .step(0.001)

                // Tweak moon light position
                this.debugFolder
                    .add(this.moonLight.position, 'x')
                    .name('moonLightX')
                    .min(-5)
                    .max(5)
                    .step(0.001)

                this.debugFolder
                    .add(this.moonLight.position, 'y')
                    .name('moonLightY')
                    .min(0.25)
                    .max(5)
                    .step(0.001)

                this.debugFolder
                    .add(this.moonLight.position, 'z')
                    .name('moonLightZ')
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