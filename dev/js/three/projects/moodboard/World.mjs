// Import external Libraries
import * as THREE from 'three'

// MODULES
import { Experience } from '../../modules/Experience.mjs'
import { PanControls } from './PanControls.mjs'
import { ImageZoom } from './ImageZoom.mjs'
import sources from './World_Sources.mjs'

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
        this.canvas = this.experience.canvas

        this.moodboardImages = []
        this.panControls = null
        this.ImageZoom = null
        this.moodboardImageMeshes = {}; // Store meshes by source name for easy access
        this.initialBatchSize = 10; // Number of images to load in the initial batch
        this.backgroundBatchSize = 8; // Number of images to load in each background batch
        this.isInitialBatchLoaded = false; // Flag to track if initial batch is loaded

        // Set up event listeners for batch loading
        this.setupEventListeners();

        // WORLD CREATION SETUP
        /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
        // Create the moodboard layout with placeholder textures immediately
        this.initializeMoodboardLayout();
        
        // RENDERER & CAMERA SETUP
        /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
        this.sceneRenderSettings();

        // Initialize PanControls immediately so user can interact
        this.panControls = new PanControls(this.camera, this.canvas, this.moodboardWidth, this.moodboardHeight);
        this.panControls.enable();

        // Initialize ImageZoom
        this.ImageZoom = new ImageZoom(this.camera, this.scene, this.canvas, this.moodboardImages, this.panControls);
        
        // Start loading the initial batch of images
        this.startProgressiveLoading();
    }

    createCheckerboardTexture() {
        const size = 16; // Size of each checkerboard square
        const canvas = document.createElement('canvas');
        canvas.width = size * 2;
        canvas.height = size * 2;
        const context = canvas.getContext('2d');

        context.fillStyle = '#e0e0e0'; // Light grey 1
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = '#c0c0c0'; // Light grey 2
        context.fillRect(0, 0, size, size);
        context.fillRect(size, size, size, size);

        return new THREE.CanvasTexture(canvas);
    }

    setupEventListeners() {
        // Listen for batch loaded event
        this.resources.on('batchLoaded', (batchData) => {
            console.log('World: Received batchLoaded event with batch data'); // Debug log
            
            // Process the batch data, which is now always an array
            if (Array.isArray(batchData)) {
                console.log(`World: Processing batch of ${batchData.length} images`);
                
                // Track successful updates for validation
                let successfulUpdates = 0;
                
                // Process each item in the batch
                batchData.forEach(item => {
                    if (item && item.source && item.texture) {
                        try {
                            console.log(`World: Processing image: ${item.source.name}`); // Debug log
                            this.updateMoodboardImage(item.source.name, item.texture);
                            successfulUpdates++;
                        } catch (err) {
                            console.error(`World: Error updating image ${item.source.name}:`, err);
                        }
                    } else {
                        console.warn('World: Invalid batch item:', item);
                    }
                });
                
                console.log(`World: Batch of images processed (${successfulUpdates}/${batchData.length} successful) and added to scene.`);
                
                // Force scene update flag
                this.scene.needsUpdate = true;
                
                // Force a render after batch update
                console.log('World: Forcing renderer update after batch processing');
                this.experience.renderer.update();
                
                // If this was the initial batch, mark it as loaded
                if (!this.isInitialBatchLoaded) {
                    this.isInitialBatchLoaded = true;
                    console.log('World: Initial batch loaded, user can now interact with the moodboard');
                }
                
                // Signal that this batch has been processed and the next batch can be loaded
                setTimeout(() => {
                    console.log('World: Signaling batch processing complete');
                    this.resources.trigger('batchProcessed');
                }, 200); // Slightly longer delay to ensure rendering completes
            } else {
                console.error('World: Cannot process batch, invalid format (expected array):', batchData);
                // Signal batch processed even on error to continue loading
                setTimeout(() => {
                    this.resources.trigger('batchProcessed');
                }, 100);
            }
        });

        // Listen for all resources ready event
        this.resources.on('resourcesReady', () => {
            console.log('World: All resources have been loaded and displayed.');
            
            // Final render to ensure everything is displayed
            this.scene.needsUpdate = true;
            this.experience.renderer.update();
        });
    }

    initializeMoodboardLayout()
    {
        const imageSources = sources.filter(source => source.type === 'texture' && source.name.startsWith('moodboardImage_'));
        const maxImageHeight = 6; // Max height for images to maintain visual consistency
        const padding = 1; // Padding between images
        const imagesPerRow = 5;

        let currentX = 0;
        let currentY = 0;

        // Calculate total width and height of the moodboard
        let totalWidth = 0;
        let totalHeight = 0;

        const rows = [];
        let currentRowImages = [];

        imageSources.forEach((source, index) => {
            if (source.width && source.height) { // Use source.width and source.height
                const aspectRatio = source.width / source.height;
                let imageHeight = maxImageHeight;
                let imageWidth = imageHeight * aspectRatio;

                // If image is wider than tall, adjust width to fit maxImageHeight
                if (imageWidth > maxImageHeight * 2) { // Arbitrary limit to prevent excessively wide images
                    imageWidth = maxImageHeight * 2;
                    imageHeight = imageWidth / aspectRatio;
                }

                if (currentRowImages.length === imagesPerRow) {
                    rows.push(currentRowImages);
                    currentRowImages = [];
                }
                currentRowImages.push({ source, imageWidth, imageHeight });
            }
        });
        if (currentRowImages.length > 0) {
            rows.push(currentRowImages);
        }

        rows.forEach((rowImages, rowIndex) => {
            let rowWidth = 0;
            let rowHeight = 0;
            rowImages.forEach(img => {
                rowWidth += img.imageWidth + padding;
                if (img.imageHeight > rowHeight) {
                    rowHeight = img.imageHeight;
                }
            });
            rowWidth -= padding; // Remove last padding

            if (rowWidth > totalWidth) {
                totalWidth = rowWidth;
            }
            totalHeight += rowHeight + padding;
        });
        if (rows.length > 0) {
            totalHeight -= padding; // Remove last padding only if there are rows
        }

        // Center the moodboard
        const startX = -totalWidth / 2;
        const startY = totalHeight / 2;

        currentY = startY;

        const placeholderTexture = this.createCheckerboardTexture();
        const placeholderMaterial = new THREE.MeshBasicMaterial({ map: placeholderTexture, side: THREE.DoubleSide });

        rows.forEach(rowImages => {
            let rowMaxHeight = 0;
            rowImages.forEach(img => {
                if (img.imageHeight > rowMaxHeight) {
                    rowMaxHeight = img.imageHeight;
                }
            });

            currentX = startX;
            rowImages.forEach(img => {
                const geometry = new THREE.PlaneGeometry(img.imageWidth, img.imageHeight);
                const mesh = new THREE.Mesh(geometry, placeholderMaterial.clone()); // Clone material for each mesh

                mesh.position.x = currentX + img.imageWidth / 2;
                mesh.position.y = currentY - img.imageHeight / 2;
                mesh.position.z = 0;
                mesh.name = img.source.name; // Assign name for easy lookup

                this.scene.add(mesh);
                this.moodboardImages.push(mesh); // Still push to this array for ImageZoom
                this.moodboardImageMeshes[img.source.name] = mesh; // Store by name
                
                currentX += img.imageWidth + padding;
            });
            currentY -= (rowMaxHeight + padding);
        });

        this.moodboardWidth = totalWidth;
        this.moodboardHeight = totalHeight;
    }

    updateMoodboardImage(imageName, texture) {
        const mesh = this.moodboardImageMeshes[imageName];
        if (mesh) {
            console.log(`World: Found mesh for ${imageName}. Updating material.`); // Debug log
            
            try {
                // Validate texture
                if (!texture || !texture.isTexture) {
                    console.error(`World: Invalid texture for ${imageName}`);
                    return false;
                }
                
                // Configure texture properly
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.flipY = true; // For web textures, typically true is needed
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.needsUpdate = true;
                
                // Create a new material with the loaded texture
                const newMaterial = new THREE.MeshBasicMaterial({ 
                    map: texture, 
                    side: THREE.DoubleSide 
                });
                
                // Dispose of the old material to prevent memory leaks
                if (mesh.material && mesh.material.map !== texture) {
                    mesh.material.dispose();
                }
                
                // Apply the new material
                mesh.material = newMaterial;
                
                console.log(`World: Successfully updated texture for ${imageName}`); // Debug log
                return true;
            } catch (err) {
                console.error(`World: Error updating material for ${imageName}:`, err);
                return false;
            }
        } else {
            console.warn(`World: Mesh not found for image: ${imageName}`); // Debug log
            return false;
        }
    }

    startProgressiveLoading() {
        // Check if the Resources class has the startProgressiveLoading method
        if (typeof this.resources.startProgressiveLoading === 'function') {
            // Use the Resources class method if available
            console.log(`World: Using Resources.startProgressiveLoading with initial batch of ${this.initialBatchSize} images`);
            this.resources.startProgressiveLoading(this.initialBatchSize, this.backgroundBatchSize);
        } else {
            // Fallback: Implement progressive loading directly in World class
            console.log(`World: Resources.startProgressiveLoading not available, using fallback implementation`);
            this.implementProgressiveLoading();
        }
    }
    
    // Fallback implementation of progressive loading
    implementProgressiveLoading() {
        console.log('World: Starting fallback progressive loading');
        
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
        console.log(`World: Loading initial batch of ${initialBatch.length} images`);
        this.loadBatch(textureLoader, initialBatch, () => {
            // Initial batch loaded callback
            console.log('World: Initial batch loaded, user can now interact with the moodboard');
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
                    console.log(`World: Loaded texture for ${source.name}`);
                    
                    // Configure texture
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.flipY = true;
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.needsUpdate = true;
                    
                    // Update the mesh with the new texture
                    this.updateMoodboardImage(source.name, texture);
                    
                    // Store in resources items
                    this.resources.items[source.name] = texture;
                    
                    // Track loaded count
                    loadedCount++;
                    loadedTextures.push({ source, texture });
                    
                    // If all textures in this batch are loaded
                    if (loadedCount === batchSize) {
                        console.log(`World: Batch of ${batchSize} images loaded`);
                        
                        // Force render
                        this.scene.needsUpdate = true;
                        this.experience.renderer.update();
                        
                        // Call the callback
                        if (callback) callback();
                    }
                },
                // Progress callback
                undefined,
                // Error callback
                (error) => {
                    console.error(`World: Error loading texture ${source.name}:`, error);
                    loadedCount++;
                    
                    // If all textures in this batch are loaded (even with errors)
                    if (loadedCount === batchSize) {
                        console.log(`World: Batch of ${batchSize} images processed (some with errors)`);
                        
                        // Force render
                        this.scene.needsUpdate = true;
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
            console.log('World: All images loaded');
            return;
        }
        
        // Get the next batch
        const nextBatch = sources.slice(0, this.backgroundBatchSize);
        const remainingSources = sources.slice(this.backgroundBatchSize);
        
        console.log(`World: Loading next batch of ${nextBatch.length} images (${remainingSources.length} remaining)`);
        
        // Load the batch
        this.loadBatch(loader, nextBatch, () => {
            // Continue with the next batch after a short delay
            setTimeout(() => {
                this.loadRemainingBatches(loader, remainingSources);
            }, 200);
        });
    }

    sceneRenderSettings()
    {
        // Renderer
        let rendererInstance = this.experience.renderer.instance

        rendererInstance.outputColorSpace = THREE.SRGBColorSpace; // Set renderer output color space
        rendererInstance.setClearColor( 0xdfe1e3, 1 )
    }

    // U P D A T E
    /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
    
    update()
    {
        // Update PanControls
        if (this.panControls) {
            this.panControls.update();
        }

        // Update ImageZoom
        if (this.ImageZoom) {
            this.ImageZoom.update();
        }
    }
}
