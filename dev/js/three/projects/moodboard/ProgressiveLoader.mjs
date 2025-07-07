// Import external Libraries
import * as THREE from 'three'

// MODULES
import sources from './World_Sources.mjs'

// ---------- ---------- ---------- ---------- ---------- //
// P R O G R E S S I V E L O A D E R //
// ---------- ---------- ---------- ---------- ---------- //
//
// Manages the progressive loading of moodboard images.

export class ProgressiveLoader
{
    constructor(resources, moodboard, experience)
    {
        this.resources = resources
        this.moodboard = moodboard
        this.experience = experience
        this.initialBatchSize = 10; // Number of images to load in the initial batch
        this.backgroundBatchSize = 8; // Number of images to load in each background batch
        this.isInitialBatchLoaded = false; // Flag to track if initial batch is loaded

        // Set up event listeners for batch loading
        this.setupEventListeners();
        
        // Start loading the initial batch of images
        this.startProgressiveLoading();
    }

    setupEventListeners() {
        // Listen for batch loaded event
        this.resources.on('batchLoaded', (batchData) => {
            console.log('ProgressiveLoader: Received batchLoaded event with batch data'); // Debug log
            
            // Process the batch data, which is now always an array
            if (Array.isArray(batchData)) {
                console.log(`ProgressiveLoader: Processing batch of ${batchData.length} images`);
                
                // Track successful updates for validation
                let successfulUpdates = 0;
                
                // Process each item in the batch
                batchData.forEach(item => {
                    if (item && item.source && item.texture) {
                        try {
                            console.log(`ProgressiveLoader: Processing image: ${item.source.name}`); // Debug log
                            this.moodboard.updateMoodboardImage(item.source.name, item.texture);
                            successfulUpdates++;
                        } catch (err) {
                            console.error(`ProgressiveLoader: Error updating image ${item.source.name}:`, err);
                        }
                    } else {
                        console.warn('ProgressiveLoader: Invalid batch item:', item);
                    }
                });
                
                console.log(`ProgressiveLoader: Batch of images processed (${successfulUpdates}/${batchData.length} successful) and added to scene.`);
                
                // Force scene update flag
                this.experience.scene.needsUpdate = true;
                
                // Force a render after batch update
                console.log('ProgressiveLoader: Forcing renderer update after batch processing');
                this.experience.renderer.update();
                
                // If this was the initial batch, mark it as loaded
                if (!this.isInitialBatchLoaded) {
                    this.isInitialBatchLoaded = true;
                    console.log('ProgressiveLoader: Initial batch loaded, user can now interact with the moodboard');
                }
                
                // Signal that this batch has been processed and the next batch can be loaded
                setTimeout(() => {
                    console.log('ProgressiveLoader: Signaling batch processing complete');
                    this.resources.trigger('batchProcessed');
                }, 200); // Slightly longer delay to ensure rendering completes
            } else {
                console.error('ProgressiveLoader: Cannot process batch, invalid format (expected array):', batchData);
                // Signal batch processed even on error to continue loading
                setTimeout(() => {
                    this.resources.trigger('batchProcessed');
                }, 100);
            }
        });

        // Listen for all resources ready event
        this.resources.on('resourcesReady', () => {
            console.log('ProgressiveLoader: All resources have been loaded and displayed.');
            
            // Final render to ensure everything is displayed
            this.experience.scene.needsUpdate = true;
            this.experience.renderer.update();
        });
    }

    startProgressiveLoading() {
        // Check if the Resources class has the startProgressiveLoading method
        if (typeof this.resources.startProgressiveLoading === 'function') {
            // Use the Resources class method if available
            console.log(`ProgressiveLoader: Using Resources.startProgressiveLoading with initial batch of ${this.initialBatchSize} images`);
            this.resources.startProgressiveLoading(this.initialBatchSize, this.backgroundBatchSize);
        } else {
            // Fallback: Implement progressive loading directly in ProgressiveLoader class
            console.log(`ProgressiveLoader: Resources.startProgressiveLoading not available, using fallback implementation`);
            this.implementProgressiveLoading();
        }
    }
    
    // Fallback implementation of progressive loading
    implementProgressiveLoading() {
        console.log('ProgressiveLoader: Starting fallback progressive loading');
        
        // Get all moodboard image sources
        const moodboardSources = sources.filter(source => 
            source.type === 'texture' && source.name.startsWith('moodboardImage_')
        );
        
        // Split into initial batch and remaining batches
        const initialBatch = moodboardSources.slice(0, this.initialBatchSize);
        const remainingSources = moodboardSources.slice(this.initialBatchSize);
        
        // Create a TextureLoader
        const textureLoader = new THREE.TextureLoader();
        
        // Load the initial batch
        console.log(`ProgressiveLoader: Loading initial batch of ${initialBatch.length} images`);
        this.loadBatch(textureLoader, initialBatch, () => {
            // Initial batch loaded callback
            console.log('ProgressiveLoader: Initial batch loaded, user can now interact with the moodboard');
            this.isInitialBatchLoaded = true;
            
            // Start loading remaining batches
            this.loadRemainingBatches(textureLoader, remainingSources);
        });
    }
    
    // Load a batch of textures
    loadBatch(loader, sources, callback) {
        let loadedCount = 0;
        const batchSize = sources.length;
        const loadedTextures = [];
        
        if (batchSize === 0) {
            if (callback) callback();
            return;
        }
        
        // Load each texture in the batch
        sources.forEach(source => {
            loader.load(
                source.path,
                // Success callback
                (texture) => {
                    console.log(`ProgressiveLoader: Loaded texture for ${source.name}`);
                    
                    // Configure texture
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.flipY = true;
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.needsUpdate = true;
                    
                    // Update the mesh with the new texture
                    this.moodboard.updateMoodboardImage(source.name, texture);
                    
                    // Store in resources items
                    this.resources.items[source.name] = texture;
                    
                    // Track loaded count
                    loadedCount++;
                    loadedTextures.push({ source, texture });
                    
                    // If all textures in this batch are loaded
                    if (loadedCount === batchSize) {
                        console.log(`ProgressiveLoader: Batch of ${batchSize} images loaded`);
                        
                        // Force render
                        this.experience.scene.needsUpdate = true;
                        this.experience.renderer.update();
                        
                        // Call the callback
                        if (callback) callback();
                    }
                },
                // Progress callback
                undefined,
                // Error callback
                (error) => {
                    console.error(`ProgressiveLoader: Error loading texture ${source.name}:`, error);
                    loadedCount++;
                    
                    // If all textures in this batch are loaded (even with errors)
                    if (loadedCount === batchSize) {
                        console.log(`ProgressiveLoader: Batch of ${batchSize} images processed (some with errors)`);
                        
                        // Force render
                        this.experience.scene.needsUpdate = true;
                        this.experience.renderer.update();
                        
                        // Call the callback
                        if (callback) callback();
                    }
                }
            );
        });
    }
    
    // Load remaining batches sequentially
    loadRemainingBatches(loader, sources) {
        if (sources.length === 0) {
            console.log('ProgressiveLoader: All images loaded');
            return;
        }
        
        // Get the next batch
        const nextBatch = sources.slice(0, this.backgroundBatchSize);
        const remainingSources = sources.slice(this.backgroundBatchSize);
        
        console.log(`ProgressiveLoader: Loading next batch of ${nextBatch.length} images (${remainingSources.length} remaining)`);
        
        // Load the batch
        this.loadBatch(loader, nextBatch, () => {
            // Continue with the next batch after a short delay
            setTimeout(() => {
                this.loadRemainingBatches(loader, remainingSources);
            }, 200);
        });
    }
}
