// ---------- ---------- ---------- ---------- ---------- //
// E V E N T   E M I T T E R //
// ---------- ---------- ---------- ---------- ---------- //

/**
 * EventEmitter Class
 * 
 * A flexible event management system based on Bruno Simon's EventEmitter
 * Enhanced with batch processing capabilities
 * 
 * @see https://gist.github.com/brunosimon/120acda915e6629e3a4d497935b16bdf
 */
export default class EventEmitter {
    constructor() {
        this.callbacks = {}
        this.callbacks.base = {}
        this.processingHandlers = {}
    }

    /**
     * Register an event listener
     * @param {string} _names - Event name(s) to listen for
     * @param {Function} callback - Callback function to execute
     * @returns {EventEmitter} This instance for chaining
     */
    on(_names, callback) {
        // Errors
        if (typeof _names === 'undefined' || _names === '') {
            console.warn('wrong names')
            return false
        }

        if (typeof callback === 'undefined') {
            console.warn('wrong callback')
            return false
        }

        // Resolve names
        const names = this.resolveNames(_names)

        // Each name
        names.forEach((_name) => {
            // Resolve name
            const name = this.resolveName(_name)

            // Create namespace if not exist
            if (!(this.callbacks[name.namespace] instanceof Object))
                this.callbacks[name.namespace] = {}

            // Create callback if not exist
            if (!(this.callbacks[name.namespace][name.value] instanceof Array))
                this.callbacks[name.namespace][name.value] = []

            // Add callback
            this.callbacks[name.namespace][name.value].push(callback)
        })

        return this
    }

    /**
     * Remove event listener(s)
     * @param {string} _names - Event name(s) to remove
     * @param {Function} [callback] - Remove only this callback; omit to remove every listener for the name
     * @returns {EventEmitter} This instance for chaining
     */
    off(_names, callback) {
        // Errors
        if (typeof _names === 'undefined' || _names === '') {
            console.warn('wrong name')
            return false
        }

        // Resolve names
        const names = this.resolveNames(_names)

        // Each name
        names.forEach((_name) => {
            // Resolve name
            const name = this.resolveName(_name)

            // Remove namespace
            if (name.namespace !== 'base' && name.value === '') {
                delete this.callbacks[name.namespace]
            }

            // Remove specific callback in namespace
            else {
                // Default: try each namespace
                const namespaces = name.namespace === 'base'
                    ? Object.keys(this.callbacks)
                    : [name.namespace]

                namespaces.forEach((namespace) => {
                    const listeners = this.callbacks[namespace]

                    if (!(listeners instanceof Object) || !(listeners[name.value] instanceof Array))
                        return

                    if (typeof callback === 'function') {
                        const index = listeners[name.value].indexOf(callback)
                        if (index > -1)
                            listeners[name.value].splice(index, 1)

                        // Prune the name once its last callback is gone
                        if (listeners[name.value].length === 0)
                            delete listeners[name.value]
                    }
                    else {
                        delete listeners[name.value]
                    }

                    // Remove namespace if empty
                    if (Object.keys(listeners).length === 0)
                        delete this.callbacks[namespace]
                })
            }
        })

        return this
    }

    /**
     * Trigger an event
     * @param {string} _name - Event name to trigger
     * @param {*} _args - Arguments to pass to callbacks
     * @returns {*} Result of the first callback that ran, or null if none did
     */
    trigger(_name, _args) {
        // Errors
        if (typeof _name === 'undefined' || _name === '') {
            console.warn('wrong name')
            return false
        }

        let finalResult = null
        let hasResult = false

        const run = (callback) => {
            const result = callback.apply(this, args)

            if (!hasResult) {
                finalResult = result
                hasResult = true
            }
        }

        // Default args
        const args = !(_args instanceof Array) ? [_args] : _args

        // Resolve names (should only have one event)
        let name = this.resolveNames(_name)

        // Resolve name
        name = this.resolveName(name[0])

        // Default namespace
        if (name.namespace === 'base') {
            // Try to find callback in each namespace
            for (const namespace in this.callbacks) {
                if (this.callbacks[namespace] instanceof Object && this.callbacks[namespace][name.value] instanceof Array) {
                    this.callbacks[namespace][name.value].slice().forEach(run)
                }
            }
        }

        // Specified namespace
        else if (this.callbacks[name.namespace] instanceof Object) {
            if (name.value === '') {
                console.warn('wrong name')
                return this
            }

            if (this.callbacks[name.namespace][name.value]) {
                this.callbacks[name.namespace][name.value].slice().forEach(run)
            }
        }

        return finalResult
    }

    /**
     * Register a batch processing handler
     * Useful for handling batch events with automatic completion signaling
     * @param {string} eventName - Event name to process
     * @param {Object} config - Configuration object
     * @param {Function} config.processor - Function to process the batch data
     * @param {Function} [config.onComplete] - Optional completion callback
     * @param {number} [config.delay=200] - Delay before signaling completion
     * @param {string} [config.completeEvent] - Event to trigger on completion
     * @returns {EventEmitter} This instance for chaining
     */
    registerBatchProcessor(eventName, config) {
        const {
            processor,
            onComplete,
            delay = 200,
            completeEvent
        } = config

        this.processingHandlers[eventName] = {
            processor,
            onComplete,
            delay,
            completeEvent
        }

        // Set up the event listener
        this.on(eventName, (data) => {
            const handler = this.processingHandlers[eventName]
            
            // Process the data
            const result = handler.processor(data)
            
            // Call completion callback if provided
            if (handler.onComplete) {
                handler.onComplete(result)
            }
            
            // Trigger completion event after delay if specified
            if (handler.completeEvent) {
                setTimeout(() => {
                    this.trigger(handler.completeEvent, result)
                }, handler.delay)
            }
        })

        return this
    }

    /**
     * Resolve event names from string
     * @param {string} _names - Event names string
     * @returns {Array} Array of event names
     */
    resolveNames(_names) {
        let names = _names
        names = names.replace(/[^a-zA-Z0-9 ,/.]/g, '')
        names = names.replace(/[,/]+/g, ' ')
        names = names.split(' ')

        return names
    }

    /**
     * Resolve individual event name
     * @param {string} name - Event name
     * @returns {Object} Resolved name object
     */
    resolveName(name) {
        const newName = {}
        const parts = name.split('.')

        newName.original = name
        newName.value = parts[0]
        newName.namespace = 'base' // Base namespace

        // Specified namespace
        if (parts.length > 1 && parts[1] !== '') {
            newName.namespace = parts[1]
        }

        return newName
    }
}
