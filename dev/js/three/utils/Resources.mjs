import * as THREE from 'three'
import { gsap } from 'gsap' // Used for HUD animations

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

import { Experience } from './../modules/Experience.mjs'
import EventEmitter from './EventEmitter.mjs'

// R E S O U R C E S
/* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */

export class Resources extends EventEmitter
{
    constructor( sources )
    {
        super()

        // Options
        this.sources = sources

        // Setup
        this.experience = new Experience
        this.renderer = this.experience.renderer
        this.hud = null
        this.items = {} // this will hold all loaded resources
        this.toLoad = this.sources.length // specifiy number of resources to be loaded
        this.loaded = 0 // keep track of resources that have been loaded 
                        // to verify that everything is there thats needed
        this.hasLoaded = false // Check if everything has loaded
        this.sceneReady = false // Check if scene is ready

        this.setLoaders()
        this.startLoading()
    }

    // SET LOADERS
    setLoaders()
    {
        
        // Get loading bar
        const loadingBarElement = document.querySelector( '.loading-bar' )

        // Set Loading Manager
        this.loaders = {}
        this.loadingManager = new THREE.LoadingManager(
            // Loaded
            () =>
            {
                // To wait for CSS transform delay after eferything has loaded, we delay half a second
                gsap.delayedCall( 0.5, () =>
                {
                    //this.hud = this.renderer.instance.hud
                    //gsap.to(this.hud.materials.overlayMaterial.uniforms.uAlpha, { duration: 3, value: 0 })

                    // Animate Loading Bar 'finished'
                    //loadingBarElement.classList.add('ended')
                    //loadingBarElement.style.transform = '' // remove js induced scaleX property
                    this.hasLoaded = true
                })

                // Wait a little after everything has loaded until all load animations have finished
                gsap.delayedCall( 2, () =>
                {
                    this.sceneReady = true
                }) 
            },

            // Progress
            ( itemUrl, itemsLoaded, itemsTotal ) =>
            {
                //const progressRatio = itemsLoaded / itemsTotal
                
                // Animate Loading Bar 'loading'
                //loadingBarElement.style.transform = `scaleX( ${ progressRatio } )`
            }
        )

        // The Draco Loader can be run inside of another thread via webworkers.
        // To enable this the draco folder from the three js example libs folder
        // Has to be copied to the project assets to be available there
        this.loaders.dracoLoader = new DRACOLoader( this.loadingManager )
        this.loaders.dracoLoader.setDecoderPath( '../../assets/three/libs/draco/' )

        // Provide the draco loader to the gltf loader
        this.loaders.gltfLoader = new GLTFLoader( this.loadingManager )
        this.loaders.gltfLoader.setDRACOLoader( this.loaders.dracoLoader )

        this.loaders.textureLoader = new THREE.TextureLoader( this.loadingManager )
        this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader( this.loadingManager )
    }

    // START LOADING
    // Here we loop through and load all the resources that are needed for the scene
    startLoading()
    {
        // Load each source
        for( const source of this.sources )
        {
            // Load 3d Model
            if( source.type === 'gltfModel' )
            {
                this.loaders.gltfLoader.load(
                    source.path,
                    ( file ) =>
                    {
                        this.sourceLoaded( source, file )
                        console.log( source.name + ' loaded')
                    }
                )
            }

            // Load textures
            else if( source.type === 'texture' )
            {
                this.loaders.textureLoader.load(
                    source.path,
                    ( file ) =>
                    {
                        this.sourceLoaded( source, file )
                        console.log( source.name + ' loaded')
                    }
                )
            }

            // Load environment textures
            else if( source.type === 'cubeTexture' )
            {
                this.loaders.cubeTextureLoader.load(
                    source.path,
                    ( file ) =>
                    {
                        this.sourceLoaded( source, file )
                        console.log( source.name + ' loaded')
                    }
                )
            }
        }
    }

    sourceLoaded( source, file )
    {
        this.items[ source.name ] = file

        // keep track of how many sourcers have been loaded
        this.loaded++

        // check if all needed sources have been loaded
        if( this.loaded === this.toLoad )
        {
            console.log('Resources: All resources have been loaded.')

            // NOTIFY LEVEL
            this.trigger( 'resourcesReady' )
        }
    }
    
}