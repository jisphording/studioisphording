// ---------- ---------- ---------- ---------- ---------- //
// E V E N T   E M I T T E R //
// ---------- ---------- ---------- ---------- ---------- //

/**
 * EventEmitter Class
 * 
 * A flexible event management system based on Bruno Simon's EventEmitter
 * Enhanced with batch processing capabilities and middleware support
 * 
 * @see https://gist.github.com/brunosimon/120acda915e6629e3a4d497935b16bdf
 */
export default class EventEmitter {
    constructor() {
        this.callbacks = {}
        this.callbacks.base = {}
        this.middleware = {}
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
     * @returns {EventEmitter} This instance for chaining
     */
    off(_names) {
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
                // Default
                if (name.namespace === 'base') {
                    // Try to remove from each namespace
                    for (const namespace in this.callbacks) {
                        if (this.callbacks[namespace] instanceof Object && this.callbacks[namespace][name.value] instanceof Array) {
                            delete this.callbacks[namespace][name.value]

                            // Remove namespace if empty
                            if (Object.keys(this.callbacks[namespace]).length === 0)
                                delete this.callbacks[namespace]
                        }
                    }
                }

                // Specified namespace
                else if (this.callbacks[name.namespace] instanceof Object && this.callbacks[name.namespace][name.value] instanceof Array) {
                    delete this.callbacks[name.namespace][name.value]

                    // Remove namespace if empty
                    if (Object.keys(this.callbacks[name.namespace]).length === 0)
                        delete this.callbacks[name.namespace]
                }
            }
        })

        return this
    }

    /**
     * Trigger an event
     * @param {string} _name - Event name to trigger
     * @param {*} _args - Arguments to pass to callbacks
     * @returns {*} Result from callbacks
     */
    trigger(_name, _args) {
        // Errors
        if (typeof _name === 'undefined' || _name === '') {
            console.warn('wrong name')
            return false
        }

        let finalResult = null
        let result = null

        // Default args
        const args = !(_args instanceof Array) ? [_args] : _args

        // Apply middleware if exists
        const middlewareResult = this.applyMiddleware(_name, args)
        if (middlewareResult !== undefined) {
            args[0] = middlewareResult
        }

        // Resolve names (should only have one event)
        let name = this.resolveNames(_name)

        // Resolve name
        name = this.resolveName(name[0])

        // Default namespace
        if (name.namespace === 'base') {
            // Try to find callback in each namespace
            for (const namespace in this.callbacks) {
                if (this.callbacks[namespace] instanceof Object && this.callbacks[namespace][name.value] instanceof Array) {
                    this.callbacks[namespace][name.value].forEach(function(callback) {
                        result = callback.apply(this, args)

                        if (typeof finalResult === 'undefined') {
                            finalResult = result
                        }
                    })
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
                this.callbacks[name.namespace][name.value].forEach(function(callback) {
                    result = callback.apply(this, args)

                    if (typeof finalResult === 'undefined')
                        finalResult = result
                })
            }
        }

        return finalResult
    }

    /**
     * Register middleware for an event
     * Middleware can transform data before it reaches event handlers
     * @param {string} eventName - Event name to add middleware for
     * @param {Function} middleware - Middleware function
     * @returns {EventEmitter} This instance for chaining
     */
    use(eventName, middleware) {
        if (!this.middleware[eventName]) {
            this.middleware[eventName] = []
        }
        this.middleware[eventName].push(middleware)
        return this
    }

    /**
     * Apply middleware to event data
     * @param {string} eventName - Event name
     * @param {Array} args - Event arguments
     * @returns {*} Transformed data or undefined
     */
    applyMiddleware(eventName, args) {
        if (!this.middleware[eventName] || this.middleware[eventName].length === 0) {
            return undefined
        }

        let data = args[0]
        for (const middleware of this.middleware[eventName]) {
            data = middleware(data)
        }
        return data
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
     * Create a scoped event handler with automatic cleanup
     * @param {Object} context - Context object containing dependencies
     * @returns {Object} Scoped event handler methods
     */
    createScopedHandler(context) {
        const registeredEvents = []
        
        return {
            on: (eventName, callback) => {
                this.on(eventName, callback)
                registeredEvents.push({ name: eventName, callback })
            },
            
            off: (eventName) => {
                this.off(eventName)
                const index = registeredEvents.findIndex(e => e.name === eventName)
                if (index > -1) {
                    registeredEvents.splice(index, 1)
                }
            },
            
            cleanup: () => {
                registeredEvents.forEach(event => {
                    this.off(event.name)
                })
                registeredEvents.length = 0
            },
            
            context
        }
    }

    /**
     * Wait for an event to occur (Promise-based)
     * @param {string} eventName - Event name to wait for
     * @param {number} [timeout] - Optional timeout in milliseconds
     * @returns {Promise} Promise that resolves when event occurs
     */
    waitFor(eventName, timeout) {
        return new Promise((resolve, reject) => {
            let timeoutId
            
            const handler = (data) => {
                if (timeoutId) clearTimeout(timeoutId)
                this.off(eventName, handler)
                resolve(data)
            }
            
            this.on(eventName, handler)
            
            if (timeout) {
                timeoutId = setTimeout(() => {
                    this.off(eventName, handler)
                    reject(new Error(`Timeout waiting for event: ${eventName}`))
                }, timeout)
            }
        })
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
