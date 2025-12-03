/**
 * Dependency Injection Container
 * 
 * Provides a simple dependency injection container for managing services
 * and their dependencies. Supports both singleton and transient instances.
 * 
 * @class Container
 * @example
 * const container = new Container();
 * 
 * // Register a singleton service
 * container.register('configManager', () => new ConfigManager(), { singleton: true });
 * 
 * // Register a transient service with dependencies
 * container.register('parser', (c) => {
 *   return new GeeseParser(c.get('pipeOperations'));
 * });
 * 
 * // Get a service
 * const parser = container.get('parser');
 */
class Container {
  /**
   * Create a new Container
   */
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }
  
  /**
   * Register a service with the container
   * 
   * @param {string} name - Service name identifier
   * @param {Function} factory - Factory function that creates the service instance
   *                             Receives the container as argument for resolving dependencies
   * @param {Object} [options={}] - Registration options
   * @param {boolean} [options.singleton=false] - If true, only one instance is created and reused
   * 
   * @example
   * // Register a singleton
   * container.register('configManager', () => new ConfigManager(), { singleton: true });
   * 
   * // Register with dependency resolution
   * container.register('parser', (c) => new GeeseParser(c.get('pipeOperations')));
   */
  register(name, factory, options = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error('Service name must be a non-empty string');
    }
    
    if (typeof factory !== 'function') {
      throw new Error('Factory must be a function');
    }
    
    this.services.set(name, { factory, options });
  }
  
  /**
   * Get a service instance from the container
   * 
   * @param {string} name - Service name identifier
   * @returns {*} Service instance
   * @throws {Error} If service is not registered
   * 
   * @example
   * const configManager = container.get('configManager');
   * const parser = container.get('parser');
   */
  get(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }
    
    // Return singleton if configured
    if (service.options.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory(this));
      }
      return this.singletons.get(name);
    }
    
    // Create new instance (transient)
    return service.factory(this);
  }
  
  /**
   * Check if a service is registered
   * 
   * @param {string} name - Service name identifier
   * @returns {boolean} True if service is registered
   */
  has(name) {
    return this.services.has(name);
  }
  
  /**
   * Clear all singleton instances
   * Useful for testing to reset state between tests
   */
  clearSingletons() {
    this.singletons.clear();
  }
  
  /**
   * Unregister a service
   * 
   * @param {string} name - Service name identifier
   * @returns {boolean} True if service was unregistered
   */
  unregister(name) {
    this.singletons.delete(name);
    return this.services.delete(name);
  }
  
  /**
   * List all registered service names
   * 
   * @returns {string[]} Array of service names
   */
  listServices() {
    return Array.from(this.services.keys());
  }
}

module.exports = Container;
