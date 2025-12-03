/**
 * Wizard Module
 * Main entry point - exports Wizard class
 */

const Wizard = require('./wizard');

// Export Wizard as the main class
module.exports = Wizard;

// Also export components for advanced usage
module.exports.Wizard = Wizard;
module.exports.PropertyMetadata = require('./property-metadata');
module.exports.PromptBuilder = require('./prompt-builder');
