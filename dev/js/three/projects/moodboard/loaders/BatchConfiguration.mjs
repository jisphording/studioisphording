/**
 * BatchConfiguration Module
 * 
 * Manages the configuration settings for progressive batch loading of images.
 * This includes batch sizes and tracking the loading state.
 */
export class BatchConfiguration {
    /**
     * Creates a new BatchConfiguration instance
     * @param {Object} config - Configuration object
     * @param {number} [config.initialBatchSize=10] - Number of images to load in the initial batch
     * @param {number} [config.backgroundBatchSize=8] - Number of images to load in each background batch
     */
    constructor(config = {}) {
        this.initialBatchSize = config.initialBatchSize || 10;
        this.backgroundBatchSize = config.backgroundBatchSize || 8;
        this.isInitialBatchLoaded = false;
    }

    /**
     * Marks the initial batch as loaded
     */
    markInitialBatchLoaded() {
        this.isInitialBatchLoaded = true;
    }

    /**
     * Checks if the initial batch has been loaded
     * @returns {boolean} True if initial batch is loaded
     */
    isInitialLoaded() {
        return this.isInitialBatchLoaded;
    }

    /**
     * Gets the initial batch size
     * @returns {number} The initial batch size
     */
    getInitialBatchSize() {
        return this.initialBatchSize;
    }

    /**
     * Gets the background batch size
     * @returns {number} The background batch size
     */
    getBackgroundBatchSize() {
        return this.backgroundBatchSize;
    }
}
