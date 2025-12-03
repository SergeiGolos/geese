/**
 * Container Setup
 * 
 * Central service container configuration for the Geese application.
 * All services are registered here and can be retrieved throughout the application.
 */

const Container = require('./container');
const EventEmitter = require('./events/event-emitter');
const ConfigManager = require('./config-manager');
const ToolRegistry = require('./tool-registry');
const PipeOperations = require('./pipe-operations');
const GeeseParser = require('./geese-parser');
const GeeseFileFinder = require('./geese-file-finder');
const ReportGenerator = require('./report-generator');

/**
 * Create and configure the application container
 * 
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.logDir='./logs'] - Directory for report logs
 * @returns {Container} Configured container instance
 * 
 * @example
 * const container = createContainer({ logDir: './output/logs' });
 * const parser = container.get('parser');
 */
function createContainer(options = {}) {
  const container = new Container();
  
  // Register event emitter as singleton
  container.register('events', () => {
    return new EventEmitter();
  }, { singleton: true });
  
  // Register configuration manager as singleton
  container.register('configManager', () => {
    return new ConfigManager();
  }, { singleton: true });
  
  // Register tool registry as singleton
  container.register('toolRegistry', () => {
    return new ToolRegistry();
  }, { singleton: true });
  
  // Register pipe operations as singleton
  container.register('pipeOperations', () => {
    return new PipeOperations();
  }, { singleton: true });
  
  // Register geese file finder as singleton
  container.register('geeseFileFinder', () => {
    return new GeeseFileFinder();
  }, { singleton: true });
  
  // Register parser with pipe operations dependency
  container.register('parser', (c) => {
    return new GeeseParser(c.get('pipeOperations'));
  }, { singleton: true });
  
  // Register report generator with configurable log directory
  container.register('reportGenerator', () => {
    return new ReportGenerator(options.logDir || './logs');
  }, { singleton: true });
  
  // Register report generator factory for creating instances with custom log directories
  container.register('reportGeneratorFactory', () => 
    (logDir) => new ReportGenerator(logDir)
  , { singleton: true });
  
  return container;
}

module.exports = { createContainer };
