import { TextureConfigurator } from './TextureConfigurator.mjs';

/**
 * BatchLoader Module
 * 
 * Handles the loading of texture batches, including both initial and background batches.
 * Manages the sequential loading process and error handling.
 */
export class BatchLoader {
    /**
     * Creates a new BatchLoader instance
     * @param {Object} resources - The resources instance for storing loaded textures
     * @param {Object} moodboard - The moodboard instance for updating images
     * @param {Object} experience - The experience instance for scene updates
     */
    constructor(resources, moodboard, experience) {
        this.resources = resources;
        this.moodboard = moodboard;
        this.experience = experience;
        this.loader = TextureConfigurator.createLoader();
    }

    /**
     * Loads a batch of textures
     * @param {Array} sources - Array of source objects with name and path properties
     * @param {Function} [callback] - Optional callback to execute when batch is complete
     * @returns {Promise} Promise that resolves when the batch is loaded
     */
    async loadBatch(sources, callback) {
        if (!sources || sources.length === 0) {
            if (callback) callback();
            return;
        }

        const loadPromises = sources.map(source => this.loadSingleTexture(source));
        
        try {
            await Promise.all(loadPromises);
            this.forceRender();
            if (callback) callback();
        } catch (error) {
            // Even if some textures fail, we still complete the batch
            this.forceRender();
            if (callback) callback();
        }
    }

    /**
     * Loads a single texture
     * @param {Object} source - Source object with name and path properties
     * @returns {Promise} Promise that resolves with the loaded texture or rejects on error
     */
    loadSingleTexture(source) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                source.path,
                // Success callback
                (texture) => {
                    // Configure the texture
                    const configuredTexture = TextureConfigurator.configure(texture);
                    
                    // Update the moodboard
                    this.moodboard.updateMoodboardImage(source.name, configuredTexture);
                    
                    // Store in resources
                    this.resources.items[source.name] = configuredTexture;
                    
                    resolve(configuredTexture);
                },
                // Progress callback (not used)
                undefined,
                // Error callback
                (error) => {
                    reject(error);
                }
            );
        });
    }

    /**
     * Loads remaining batches sequentially
     * @param {Array} sources - Array of all remaining sources to load
     * @param {number} batchSize - Size of each batch
     * @param {number} [delay=200] - Delay between batches in milliseconds
     */
    async loadRemainingBatches(sources, batchSize, delay = 200) {
        if (!sources || sources.length === 0) {
            return;
        }

        // Get the next batch
        const nextBatch = sources.slice(0, batchSize);
        const remainingSources = sources.slice(batchSize);

        // Load the batch
        await this.loadBatch(nextBatch);

        // Continue with remaining batches after delay
        if (remainingSources.length > 0) {
            await this.delay(delay);
            await this.loadRemainingBatches(remainingSources, batchSize, delay);
        }
    }

    /**
     * Forces a render update
     */
    forceRender() {
        this.experience.scene.needsUpdate = true;
        this.experience.renderer.update();
    }

    /**
     * Creates a delay promise
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after the delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
