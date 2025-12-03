/**
 * Event Emitter for Cross-Cutting Concerns
 * 
 * Provides a simple event emitter for decoupling cross-cutting concerns
 * like logging, progress updates, and error handling from core business logic.
 * 
 * @class EventEmitter
 * @example
 * const events = new EventEmitter();
 * 
 * // Register a listener
 * events.on('file:processing', (data) => {
 *   console.log(`Processing ${data.file}...`);
 * });
 * 
 * // Emit an event
 * events.emit('file:processing', { file: 'review.geese' });
 */
class EventEmitter {
  /**
   * Create a new EventEmitter
   * 
   * @param {Object} [options={}] - Configuration options
   * @param {Function} [options.errorLogger] - Custom error logger function (defaults to console.error)
   */
  constructor(options = {}) {
    this.listeners = new Map();
    this.errorLogger = options.errorLogger || console.error.bind(console);
  }
  
  /**
   * Register an event listener
   * 
   * @param {string} event - Event name
   * @param {Function} listener - Callback function to invoke when event is emitted
   * @returns {Function} Function to remove this listener
   * 
   * @example
   * const removeListener = events.on('file:processed', (data) => {
   *   console.log(`✓ Processed ${data.file}`);
   * });
   * 
   * // Later, remove the listener
   * removeListener();
   */
  on(event, listener) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event).push(listener);
    
    // Return a function to remove this listener
    return () => this.off(event, listener);
  }
  
  /**
   * Register a one-time event listener
   * Listener is automatically removed after first invocation
   * 
   * @param {string} event - Event name
   * @param {Function} listener - Callback function to invoke when event is emitted
   * @returns {Function} Function to remove this listener
   * 
   * @example
   * events.once('startup:complete', () => {
   *   console.log('Application started successfully');
   * });
   */
  once(event, listener) {
    const onceWrapper = (...args) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    
    return this.on(event, onceWrapper);
  }
  
  /**
   * Remove an event listener
   * 
   * @param {string} event - Event name
   * @param {Function} listener - Listener function to remove
   * @returns {boolean} True if listener was removed
   * 
   * @example
   * const listener = (data) => console.log(data);
   * events.on('file:processing', listener);
   * 
   * // Later, remove the listener
   * events.off('file:processing', listener);
   */
  off(event, listener) {
    const listeners = this.listeners.get(event);
    if (!listeners) {
      return false;
    }
    
    const index = listeners.indexOf(listener);
    if (index === -1) {
      return false;
    }
    
    listeners.splice(index, 1);
    
    // Clean up empty listener arrays
    if (listeners.length === 0) {
      this.listeners.delete(event);
    }
    
    return true;
  }
  
  /**
   * Emit an event to all registered listeners
   * 
   * @param {string} event - Event name
   * @param {*} data - Data to pass to listeners
   * @returns {boolean} True if event had listeners
   * 
   * @example
   * events.emit('file:processing', { 
   *   file: 'review.geese',
   *   startTime: Date.now() 
   * });
   */
  emit(event, data) {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.length === 0) {
      return false;
    }
    
    // Create a copy of listeners array to prevent issues if listeners are removed during emit
    const listenersCopy = [...listeners];
    
    for (const listener of listenersCopy) {
      try {
        listener(data);
      } catch (error) {
        // Emit error event if listener throws
        // Prevent one failing listener from stopping others
        // Guard against infinite recursion if error listener also throws
        if (event !== 'error') {
          this.emit('error', { event, error, data });
        } else {
          // If we're already handling an error event and the listener throws,
          // log using error logger to avoid infinite recursion
          this.errorLogger('Error in error event listener:', error);
        }
      }
    }
    
    return true;
  }
  
  /**
   * Remove all listeners for an event, or all listeners if no event specified
   * 
   * @param {string} [event] - Event name, or omit to remove all listeners
   * 
   * @example
   * // Remove all listeners for a specific event
   * events.removeAllListeners('file:processing');
   * 
   * // Remove all listeners
   * events.removeAllListeners();
   */
  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
  
  /**
   * Get the number of listeners for an event
   * 
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   * 
   * @example
   * const count = events.listenerCount('file:processing');
   * console.log(`${count} listeners registered`);
   */
  listenerCount(event) {
    const listeners = this.listeners.get(event);
    return listeners ? listeners.length : 0;
  }
  
  /**
   * Get all event names that have listeners
   * 
   * @returns {string[]} Array of event names
   * 
   * @example
   * const events = emitter.eventNames();
   * console.log('Active events:', events);
   */
  eventNames() {
    return Array.from(this.listeners.keys());
  }
}

module.exports = EventEmitter;
