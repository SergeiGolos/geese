/**
 * Pipe Operations Module
 * Main entry point - exports PipeRegistry for backward compatibility
 */

const PipeRegistry = require('./pipe-registry');
const PipeArgumentParser = require('./pipe-argument-parser');

// Export PipeRegistry as the main class (backward compatible with PipeOperations)
module.exports = PipeRegistry;

// Also export components for advanced usage
module.exports.PipeRegistry = PipeRegistry;
module.exports.PipeArgumentParser = PipeArgumentParser;
