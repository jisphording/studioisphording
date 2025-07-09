import * as THREE from 'three'

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
        
        // Progressive loading properties
        this.moodboardSources = []
        this.otherSources = []
        this.batchProcessing = false
        
        // Separate moodboard image sources from other sources
        for (const source of this.sources) {
            if (source.type === 'texture' && source.name.startsWith('moodboardImage_')) {
                this.moodboardSources.push(source);
            } else {
                this.otherSources.push(source);
            }
        }
        
        this.toLoad = this.sources.length // specify number of resources to be loaded
        this.loaded = 0 // keep track of resources that have been loaded 
                        // to verify that everything is there thats needed
        this.hasLoaded = false // Check if everything has loaded
        this.sceneReady = false // Check if scene is ready

        this.setLoaders()
        
        // We don't start loading automatically anymore
        // The World will call startProgressiveLoading instead
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
                // Access GSAP from global window object (loaded via CDN)
                const gsap = window.gsap;
                
                // Ensure GSAP is available before using it
                if (gsap) {
                    // To wait for CSS transform delay after everything has loaded, we delay half a second
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
                } else {
                    console.warn('GSAP not available from CDN, falling back to direct property setting');
                    // Fallback without GSAP animations
                    setTimeout(() => {
                        this.hasLoaded = true;
                    }, 500);
                    
                    setTimeout(() => {
                        this.sceneReady = true;
                    }, 2000);
                }
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
        this.loaders.dracoLoader.setDecoderPath( '/assets/three/libs/draco/' )

        // Provide the draco loader to the gltf loader
        this.loaders.gltfLoader = new GLTFLoader( this.loadingManager )
        this.loaders.gltfLoader.setDRACOLoader( this.loaders.dracoLoader )

        this.loaders.textureLoader = new THREE.TextureLoader( this.loadingManager )
        this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader( this.loadingManager )
    }

    // START PROGRESSIVE LOADING
    // This is called by World to start the progressive loading process
    startProgressiveLoading(initialBatchSize = 10, backgroundBatchSize = 8) {
        console.log(`Resources: Starting progressive loading with initial batch of ${initialBatchSize} images`);
        
        // Load other resources first (non-moodboard)
        this.loadOtherResources();
        
        // Start batch loading with the initial batch
        this.startBatchLoading(initialBatchSize, backgroundBatchSize);
    }
    
    // LOAD OTHER RESOURCES
    // Load all non-moodboard resources
    loadOtherResources() {
        console.log(`Resources: Loading ${this.otherSources.length} non-moodboard resources`);
        
        // Load each non-moodboard source
        for (const source of this.otherSources) {
            this.loadSource(source);
        }
    }
    
    // Load a single source
    loadSource(source) {
        // Load 3d Model
        if (source.type === 'gltfModel') {
            this.loaders.gltfLoader.load(
                source.path,
                (file) => {
                    this.sourceLoaded(source, file);
                    console.log(source.name + ' loaded');
                }
            );
        }
        // Load textures
        else if (source.type === 'texture') {
            this.loaders.textureLoader.load(
                source.path,
                (file) => {
                    this.sourceLoaded(source, file);
                    console.log(source.name + ' loaded');
                }
            );
        }
        // Load environment textures
        else if (source.type === 'cubeTexture') {
            this.loaders.cubeTextureLoader.load(
                source.path,
                (file) => {
                    this.sourceLoaded(source, file);
                    console.log(source.name + ' loaded');
                }
            );
        }
    }

    // START BATCH LOADING
    startBatchLoading(initialBatchSize, backgroundBatchSize) {
        console.log(`Resources: Starting batch loading with ${this.moodboardSources.length} images remaining`);
        
        // Create a listener for batch processing completion
        const onBatchProcessed = () => {
            console.log('Resources: Batch processing complete, loading next batch...');
            this.batchProcessing = false;
            this.off('batchProcessed', onBatchProcessed); // Remove listener
            
            // Load the next batch with the background batch size
            loadNextBatch(backgroundBatchSize);
        };

        const loadNextBatch = (batchSize) => {
            // If we're already processing a batch or there are no more images, exit
            if (this.batchProcessing || this.moodboardSources.length === 0) {
                if (this.moodboardSources.length === 0) {
                    console.log('Resources: No more images to load, batch loading complete');
                    this.checkOverallLoadCompletion();
                }
                return;
            }

            // Mark that we're processing a batch
            this.batchProcessing = true;

            // Listen for batch processing completion
            this.on('batchProcessed', onBatchProcessed);

            // Get the next batch of images
            const currentBatch = this.moodboardSources.splice(0, batchSize);
            console.log(`Resources: Loading next batch of ${currentBatch.length} images`);
            
            let loadedBatchCount = 0;
            const loadedTexturesInBatch = [];

            if (currentBatch.length > 0) {
                for (const source of currentBatch) {
                    console.log(`Resources: Loading texture for ${source.name} from ${source.path}`);
                    
                    this.loaders.textureLoader.load(
                        source.path,
                        (texture) => {
                            console.log(`Resources: Successfully loaded texture for ${source.name} from ${source.path}`);
                            
                            // Ensure texture is properly initialized
                            texture.needsUpdate = true;
                            
                            // Store the texture in items
                            this.items[source.name] = texture;
                            this.loaded++;
                            loadedBatchCount++;

                            // Store the texture with its corresponding source
                            loadedTexturesInBatch.push({ source: source, texture: texture });

                            console.log(`Resources: Loaded ${loadedBatchCount}/${currentBatch.length} textures in current batch`);
                            if (loadedBatchCount === currentBatch.length) {
                                // All images in the current batch are loaded
                                console.log(`Resources: Batch complete! Triggering batchLoaded with batch of ${loadedTexturesInBatch.length} textures`);

                                // Make sure all textures are properly initialized before triggering the event
                                loadedTexturesInBatch.forEach(item => {
                                    if (item.texture) {
                                        item.texture.needsUpdate = true;
                                    }
                                });

                                
                                // Create a new array with only the name and path
                                const batchDataForEvent = loadedTexturesInBatch.map(item => {
                                    return [item.source.name, item.source.path];
                                });
                                
                                // Trigger a single batchLoaded event with the new array structure
                                try {
                                    console.log(`Resources: Triggering batchLoaded with transformed data for ${batchDataForEvent.length} textures`);
                                    this.trigger('batchLoaded', [batchDataForEvent]);
                                } catch (err) {
                                    console.error('Resources: Error triggering batchLoaded event:', err);
                                    // If there's an error, still signal batch processed to continue loading
                                    setTimeout(() => this.trigger('batchProcessed'), 100);
                                }
                                
                                console.log(`Resources: Batch of ${currentBatch.length} moodboard images loaded.`);
                                console.log(`Resources: ${this.moodboardSources.length} images remaining to load`);
                                
                                // The World will trigger 'batchProcessed' when it's done processing this batch
                                // We'll wait for that event before loading the next batch
                                this.checkOverallLoadCompletion();
                            }
                        },
                        // Progress callback
                        undefined,
                        // Error callback
                        (error) => {
                            console.error(`Resources: Failed to load texture ${source.name}:`, error);
                            this.loaded++;
                            loadedBatchCount++;
                            
                            if (loadedBatchCount === currentBatch.length) {
                                // Continue even if some textures failed to load
                                if (loadedTexturesInBatch.length > 0) {
                                    console.log(`Resources: Triggering batchLoaded with ${loadedTexturesInBatch.length} textures (some failed to load)`);
                                    
                                    // Make sure all textures are properly initialized before triggering the event
                                    loadedTexturesInBatch.forEach(item => {
                                        if (item.texture) {
                                            item.texture.needsUpdate = true;
                                        }
                                    });
                                    
                                    // Create a new array with only the name and path
                                    const batchDataForEvent = loadedTexturesInBatch.map(item => {
                                        return [item.source.name, item.source.path];
                                    });

                                    // Trigger a single batchLoaded event with the new array structure
                                    try {
                                        console.log(`Resources: Triggering batchLoaded with transformed data for ${batchDataForEvent.length} textures (some failed to load)`);
                                        this.trigger('batchLoaded', [batchDataForEvent]);
                                    } catch (err) {
                                        console.error('Resources: Error triggering batchLoaded event:', err);
                                        // If there's an error, still signal batch processed to continue loading
                                        setTimeout(() => this.trigger('batchProcessed'), 100);
                                    }
                                } else {
                                    console.log('Resources: All textures in batch failed to load, proceeding to next batch');
                                    // Trigger batchProcessed directly since there's nothing to process
                                    this.trigger('batchProcessed');
                                }
                                
                                console.log(`Resources: Batch of ${currentBatch.length} moodboard images processed (some may have failed).`);
                                console.log(`Resources: ${this.moodboardSources.length} images remaining to load`);
                                this.checkOverallLoadCompletion();
                            }
                        }
                    );
                }
            } else {
                // No images in this batch, mark as processed and check completion
                this.batchProcessing = false;
                this.checkOverallLoadCompletion();
            }
        };

        // Start with the initial batch
        loadNextBatch(initialBatchSize);
    }

    // Legacy method for backward compatibility
    startLoading() {
        console.log('Resources: Using legacy loading method. This should ideally not be called for progressive loading.');
        this.loadOtherResources();
        
        // Load all moodboard sources at once
        for (const source of this.moodboardSources) {
            this.loadSource(source);
        }
    }

    sourceLoaded(source, file) {
        this.items[source.name] = file;
        this.loaded++;
        // Do not trigger any event here. Let the batch loader handle it.
        this.checkOverallLoadCompletion();
    }
    
    checkOverallLoadCompletion() {
        if (this.loaded === this.toLoad) {
            console.log('Resources: All resources have been loaded.');

            // NOTIFY LEVEL
            this.trigger('resourcesReady');
        }
    }
}
