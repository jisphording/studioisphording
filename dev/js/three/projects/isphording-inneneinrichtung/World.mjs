// Import external Libraries
import * as THREE from 'three'

// MODULES
import { Experience } from '../../modules/Experience.mjs'
import { Environment } from './World_Environment.js'

// MODELS
import { DisplayAppleXDR } from './DisplayAppleXDR.mjs'

// ---------- ---------- ---------- ---------- ---------- //
// W O R L D //
// ---------- ---------- ---------- ---------- ---------- //
//
// Building and managing the world that is used by the Experience and all it's assets.

export class World
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.camera = this.experience.camera

        this.display = undefined

        // Wait until resources have been loaded and are ready
        this.resources.on( 'resourcesReady', () =>
        {
            // WORLD CREATION SETUP
            /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
            // Gathering all the files needed to assemble the game world
            // None
            
            // ENTITIES & ACTORS SETUP
            /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
            // Gathering all models that live in the environment
            this.display = new DisplayAppleXDR()

            // ENVIRONMENT & LIGHT SETUP
            /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
            // The environment has to added last, because it receives additional
            // settings that have to be applied to the whole scene and all it's entities.
            // Alas, its important that the environment is loaded/updated last
            this.environment = new Environment()

            // RENDERER & CAMERA SETUP
            /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
            //this.experience.renderer.setInstance()
            this.sceneRenderSettings()

            console.log('World: All resources have been loaded.')
        })

        //this.init()
    }

    init()
    {
        this.testMesh = this.createTestMesh()
        this.scene.add( this.testMesh )
    }

    sceneRenderSettings()
    {
        // Renderer
        let rendererInstance = this.experience.renderer.instance

        rendererInstance.setClearColor( 0xdfe1e3, 1 )

        // Camera
        this.camera.instance.position.set( 0, 0, 10 )
        this.camera.controls.minDistance = 10
        this.camera.controls.maxDistance = 10
    }

    createTestMesh() {
        // Test mesh
        let testMesh = new THREE.Mesh(
            new THREE.BoxGeometry( 2, 2, 2 ),
            new THREE.MeshStandardMaterial()
        )
        return testMesh
    }

    // U P D A T E
    /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
    
    update()
    {
        if ( this.display != undefined )
        {
            this.display.model.rotation.y -= 0.005
        }
    }
}