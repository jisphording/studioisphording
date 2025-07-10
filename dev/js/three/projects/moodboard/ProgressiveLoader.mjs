// Import modules
import sources from './World_Sources.mjs';
import { BatchConfiguration } from './loaders/BatchConfiguration.mjs';
import { BatchLoader } from './loaders/BatchLoader.mjs';

/**
 * ProgressiveLoader Class
 * 
 * Main orchestrator for progressive loading of moodboard images.
 * Coordinates between batch configuration, event management, and texture loading
 * to provide a smooth loading experience where users can interact with initial
 * images while remaining images load in the background.
 */
export class ProgressiveLoader {
    /**
     * Creates a new ProgressiveLoader instance
     * @param {Object} resources - Resources manager instance with event emitter capabilities
     * @param {Object} moodboard - Moodboard instance for updating images
     * @param {Object} experience - Experience instance containing scene and renderer
     */
    constructor(resources, moodboard, experience) {
        this.resources = resources;
        this.moodboard = moodboard;
        this.experience = experience;

        // Initialize batch configuration
        this.batchConfig = new BatchConfiguration({
            initialBatchSize: 10,
            backgroundBatchSize: 8
        });

        // Initialize batch loader
        this.batchLoader = new BatchLoader(resources, moodboard, experience);

        // Track if initial batch has been processed
        this.isInitialBatchProcessed = false;

        // Set up event listeners using the enhanced EventEmitter
        this.setupEventListeners();
        
        // Start loading process
        this.startProgressiveLoading();
    }

    /**
     * Sets up event listeners for batch processing
     * Uses the enhanced EventEmitter's batch processing capabilities
     */
    setupEventListeners() {
        // Register batch processor for handling loaded batches
        this.resources.registerBatchProcessor('batchLoaded', {
            processor: (batchData) => this.processBatchData(batchData),
            onComplete: (result) => {
                // Handle initial batch completion
                if (!this.isInitialBatchProcessed && result) {
                    this.isInitialBatchProcessed = true;
                    this.handleInitialBatchLoaded();
                }
            },
            delay: 200,
            completeEvent: 'batchProcessed'
        });

        // Listen for all resources ready event
        this.resources.on('resourcesReady', () => {
            this.handleAllResourcesReady();
        });
    }

    /**
     * Processes a batch of loaded texture data
     * @param {Array} batchData - Array of objects with name, path, and texture properties
     * @returns {boolean} True if batch was processed successfully
     */
    processBatchData(batchData) {
        if (!Array.isArray(batchData)) {
            return false;
        }

        // Update each moodboard image with its loaded texture
        batchData.forEach(item => {
            if (item.texture && item.name) {
                this.moodboard.updateMoodboardImage(item.name, item.texture);
            }
        });

        // Force scene update
        this.forceSceneUpdate();

        return true;
    }

    /**
     * Forces a scene update and render
     */
    forceSceneUpdate() {
        this.experience.scene.needsUpdate = true;
        this.experience.renderer.update();
    }

    /**
     * Handles the completion of all resource loading
     */
    handleAllResourcesReady() {
        this.forceSceneUpdate();
    }

    /**
     * Handles the completion of initial batch loading
     * Called when the first batch is processed
     */
    handleInitialBatchLoaded() {
        this.batchConfig.markInitialBatchLoaded();
    }

    /**
     * Starts the progressive loading process
     * Checks if Resources class has native support, otherwise uses fallback
     */
    startProgressiveLoading() {
        if (typeof this.resources.startProgressiveLoading === 'function') {
            // Use native Resources class progressive loading
            this.resources.startProgressiveLoading(
                this.batchConfig.getInitialBatchSize(),
                this.batchConfig.getBackgroundBatchSize()
            );
        } else {
            // Use fallback implementation
            this.implementProgressiveLoading();
        }
    }
    
    /**
     * Fallback implementation of progressive loading
     * Used when Resources class doesn't have native progressive loading support
     */
    async implementProgressiveLoading() {
        // Filter moodboard image sources
        const moodboardSources = this.getMoodboardSources();
        
        // Split into initial and remaining batches
        const { initialBatch, remainingSources } = this.splitSources(moodboardSources);
        
        // Load initial batch
        await this.batchLoader.loadBatch(initialBatch, () => {
            this.handleInitialBatchLoaded();
        });
        
        // Load remaining batches in background
        await this.batchLoader.loadRemainingBatches(
            remainingSources,
            this.batchConfig.getBackgroundBatchSize()
        );
    }

    /**
     * Gets all moodboard image sources from the sources configuration
     * @returns {Array} Array of moodboard image sources
     */
    getMoodboardSources() {
        return sources.filter(source => 
            source.type === 'texture' && source.name.startsWith('moodboardImage_')
        );
    }

    /**
     * Splits sources into initial batch and remaining sources
     * @param {Array} allSources - All moodboard sources
     * @returns {Object} Object containing initialBatch and remainingSources arrays
     */
    splitSources(allSources) {
        const initialSize = this.batchConfig.getInitialBatchSize();
        return {
            initialBatch: allSources.slice(0, initialSize),
            remainingSources: allSources.slice(initialSize)
        };
    }
}
